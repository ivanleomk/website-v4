---
title: "Building our FSM"
date: 2026-02-08
description: Going beyond a simple regex to an FSM for quick lookups
authors:
  - ivanleomk
series:
  - Structured Outputs From Scratch
---

In the previous article, we compiled our Pydantic model into a regex that can validate a JSON string. This helps validate a final response, but it can't really be used at each step of the decoding process.

For instance, given a prefix like `{"name":"Iv`, how do we know which tokens we're allowed to emit next so that we stay on a valid path? To do so, we'll need a finite-state machine (FSM). We'll do so in three stages in this post.

1. First, we'll convert our regex into an intermediate representation (IR)
2. Then we'll compile that IR into a graph-based state machine
3. Lastly, we'll optimize that graph into a deterministic lookup structure for fast "what can come next?" checks

This will come in handy in our third article when we use our FSM to determine a token mask from a model's vocabulary.

## Why can't we just use regex?

For constrained decoding, what we need is a way to answer the question - **from this state, where can I legally go next**.

To make things simple, we'll first define an intermediate representation that breaks our regex into a set of explicit node types. This also helps us deal with the fact that regex syntax is intentionally flexible: the same criteria can be written in many different ways.

For instance, let's say we want multiple instances of the letter `a`. We can represent it as seen below with the following 3 different patterns.

```py
import re

patterns = [
    r"a+",
    r"aa*",
    r"a(a)*",
]

tests = ["aaaaaa", "a"]

for s in tests:
    print(f"\nTesting: {s!r}")
    for p in patterns:
        ok = re.fullmatch(p, s) is not None
        print(f"  {p:<8} -> {ok}")
```

When you run this code snippet, you get the following output

```bash
Testing: 'aaaaaa'
  a+       -> True
  aa*      -> True
  a(a)*    -> True

Testing: 'a'
  a+       -> True
  aa*      -> True
  a(a)*    -> True
```

To get around this, we'll use an intermediate representation which consists of the following explicit nodes. This converts our regex string into an unambiguous nested object that we can compile into a graph-based state machine and then optimize for fast lookup.

## Creating an IR

The goal of the IR is not to be compact — it’s to be clear and executable. Regex syntax packs a lot of meaning into punctuation, precedence rules, and implicit behavior, which makes it hard to answer local questions like “what can I emit next?”. Instead, we lower everything into a small set of explicit node types that each represent a single kind of decision during generation.

At this level, there are really only a few things that can happen: we either emit fixed text (Lit), emit one character from a known set (CharClass), emit things in sequence (Seq), branch (Alt), or loop (Repeat). Optional is just syntactic sugar for a local epsilon branch. This feature set is intentionally minimal: it is expressive enough to represent all regex structure we care about, while being small enough to reason about and compile into an efficient state machine.

Let's see a clearer example. Let's see this in action with a simple `User` pydantic object, we can use our `kosoku` package to convert it to the equivalent regex. Here we're using a `from_json_schema` method that is exported from the package which wraps our original implementation.

```py
import hashlib
import json

_SCHEMA_REGEX_CACHE: dict[str, str] = {}

def _hash_schema(schema: dict[str, Any]) -> str:
    canonical = json.dumps(schema, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

def from_json_schema(schema: dict) -> str:
    schema_hash = _hash_schema(schema)
    regex = _SCHEMA_REGEX_CACHE.get(schema_hash)
    if regex is None:
        regex = schema_to_regex(schema)
        _SCHEMA_REGEX_CACHE[schema_hash] = regex
    return regex
```

This comes in useful later because it lets us cache these transformations. We then run the following code and get the regex shown below.

```py
from kosoku import from_json_schema
from pydantic import BaseModel


class User(BaseModel):
    name: str


regex_string = from_json_schema(User.model_json_schema())
print(regex_string)
#\{[ \t\n\r]*"name"[ \t\n\r]*:[ \t\n\r]*"([^"\\]|\\.)*"[ \t\n\r]*\}
```

How might this look in the IR we defined for a valid input?

```py
Seq(
    parts=(
        Lit(text='{'),
        Repeat(node=CharClass(name='CLASS[ \t\n\r]'), min_times=0, max_times=None),
        Lit(text='"name"'),
        Repeat(node=CharClass(name='CLASS[ \t\n\r]'), min_times=0, max_times=None),
        Lit(text=':'),
        Repeat(node=CharClass(name='CLASS[ \t\n\r]'), min_times=0, max_times=None),
        Lit(text='"'),
        Repeat(node=Alt(options=(CharClass(name='NEG_CLASS["\\]'), Seq(parts=(Lit(text='\\'), CharClass(name='ANY'))))), min_times=0, max_times=None),
        Lit(text='"'),
        Repeat(node=CharClass(name='CLASS[ \t\n\r]'), min_times=0, max_times=None),
        Lit(text='}')
    )
)
```

One thing here that might look a bit strange is the following snippet which has these strange exclusion types.

```py
Repeat(node=Alt(options=(CharClass(name='NEG_CLASS["\\]'), Seq(parts=(Lit(text='\\'), CharClass(name='ANY'))))), min_times=0, max_times=None),
```

But this directly derives from our flexible regex `([^"\\]|\\.)*`, which allows us to support characters such as ASCII letters and digits, non-English characters, and even emojis. Let's now see how we can automate this process so we can go from regex to this IR.

## Starting Small

Let's start small by implementing support for literals. For instance, given the following regex `user` which will only match the literal value of `user`, we can write a simple parser as seen below.

```py
def regex_to_ir(pattern:str)->Node:
  return Lit(pattern)
```

We can verify that this works with our tests below

```py
from kosoku.fsm_ir import Lit, regex_to_ir


def test_literals():
    assert regex_to_ir("user") == Lit("user")
    assert regex_to_ir("") == Lit("")
```

Now that that's working nicely, let's move on to something more complicated: parsing our regex into its top-level forms. More concretely, we want to break down terms like `a|b|c` and `(a|b)|c` into their top-level components. There are a few cases we need to handle.

1. We want to handle escaped strings (for example, `a\||b` should be parsed as `a\|, b`, which are two separate top-level components).
2. We need to handle nested groups (for example, `((a|b)c)|d` should be parsed as `((a|b)c),d`).

I've written some tests below to show you what this looks like.

```py
def test_split_top_level_alternation():
    assert split_top_level_alternation("a|b|c") == ["a", "b", "c"]
    assert split_top_level_alternation("(a|(b|c))|c") == ["(a|(b|c))", "c"]
    assert split_top_level_alternation(r"a\|b|c") == [r"a\|b", "c"]
    assert split_top_level_alternation("a\||b|c") == ["a\|", "b", "c"]


@pytest.mark.parametrize(
    ("pattern", "group_start", "expected"),
    [
        ("(a)", 0, ("a", 2)),
        ("(a|(b|c))|d", 0, ("a|(b|c)", 8)),
        ("x(a|b)y", 1, ("a|b", 5)),
    ],
)
def test_extract_group(pattern: str, group_start: int, expected: tuple[str, int]):
    assert _extract_group(pattern, group_start) == expected

```

You can see that there are two functions here that we’ll implement:

1. `extract_group` : This handles nested groups and escaped characters and returns the complete text and the next index to process.
2. `split_top_level_alternation` : This scans the full regex and splits the string into its top-level components.

So `_extract_group` does local structural extraction, and `split_top_level_alternation` uses that primitive to produce top-level branches.

```py
def test_alternation_and_grouping():
    assert regex_to_ir("a|b|c") == Alt((Lit("a"), Lit("b"), Lit("c")))
    assert regex_to_ir("(a|b)c") == Seq((Alt((Lit("a"), Lit("b"))), Lit("c")))
    assert regex_to_ir("(a|b)|c") == Alt((Lit("a"), Lit("b"), Lit("c")))
```

Let's start implementing these functions. Extract group is relatively simple to do since we keep iterating until we see a closing `)` parenthesis that matches our opening parenthesis.

```py
def _extract_group(pattern: str, group_start: int) -> tuple[str, int]:
    """Extract group inner text and return (inner, end_index_of_closing_paren)."""

    if group_start < 0 or group_start >= len(pattern) or pattern[group_start] != "(":
        raise ValueError("group_start must point at '('")

    depth = 1
    i = group_start + 1
    n = len(pattern)

    while i < n:
        ch = pattern[i]

        if ch == "\\":
            i += 2
            continue

        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return pattern[group_start + 1 : i], i
        i += 1

    raise ValueError("Unclosed group in pattern")

```

We can then use this in a `split_top_level_alternation` function, as shown below. Since Python doesn't have good support for tail recursion, most of our functions end up being iterative scans from left to right.

```py
def split_top_level_alternation(pattern: str) -> list[str]:
    """Split pattern by top-level `|`, ignoring nested groups and escapes."""

    parts: list[str] = []
    start = 0
    i = 0
    n = len(pattern)

    while i < n:
        ch = pattern[i]

        if ch == "\\":
            # Skip escaped char so a literal '\|' does not split.
            i += 2
            continue

        if ch == "(":
            _, end = _extract_group(pattern, i)
            i = end + 1
            continue

        if ch == ")":
            raise ValueError("Unbalanced ')' in pattern")

        if ch == "|":
            parts.append(pattern[start:i])
            start = i + 1
        i += 1

    if n > 0 and pattern[-1] == "\\":
        raise ValueError("Dangling escape at end of pattern")

    parts.append(pattern[start:])
    return parts
```

With this, we're now able to split strings like `a|b|c` into their constituent top-level parts like `a,b,c`. However, we still need to convert these strings into valid `Node` types (see the type definition above). To do so, we'll define three more functions: `parse_term`, which operates on the high-level parts we've created; `parse_atom_at`, which operates on individual characters inside those terms; and `_normalize_term`, which handles merging and normalization of the nodes created in `parse_term`.

Let's start by defining some tests for these three functions to see how they might work. We want to ensure that individual atoms (characters or groups) are parsed correctly, that sequences of atoms are collected into terms, and finally, that adjacent literals are merged for efficiency.

```py
@pytest.mark.parametrize(
    ("pattern", "expected"),
    [
        ("abc", Lit("abc")),
        ("(a|b)c", Seq((Alt((Lit("a"), Lit("b"))), Lit("c")))),
        (r"\|x", Lit("|x")),
        ("", Lit("")),
    ],
)
def test_parse_term(pattern: str, expected):
    assert parse_term(pattern) == expected


@pytest.mark.parametrize(
    ("pattern", "index", "expected_node", "expected_next_i"),
    [
        ("abc", 0, Lit("a"), 1),
        ("(a|b)c", 0, Alt((Lit("a"), Lit("b"))), 5),
        (r"\|x", 0, Lit("|"), 2),
    ],
)
def test_parse_atom_at(pattern: str, index: int, expected_node, expected_next_i: int):
    node, next_i = parse_atom_at(pattern, index)
    assert node == expected_node
    assert next_i == expected_next_i


@pytest.mark.parametrize(
    ("atoms", "expected"),
    [
        ([], Lit("")),
        ([Lit("a"), Lit("b"), Lit("c")], Lit("abc")),
        ([Alt((Lit("a"), Lit("b")))], Alt((Lit("a"), Lit("b")))),
        (
            [Lit("x"), Alt((Lit("a"), Lit("b"))), Lit("y")],
            Seq((Lit("x"), Alt((Lit("a"), Lit("b"))), Lit("y"))),
        ),
    ],
)
def test_normalize_term(atoms: list, expected):
    assert _normalize_term(atoms) == expected
```

Now let's implement the logic.

`parse_atom_at` is responsible for looking at the character at the current index and deciding if it is a simple literal, an escaped character, or the start of a new group. If it sees a group, it recursively calls `regex_to_ir`.

`parse_term` acts as the loop driver, calling `parse_atom_at` until the string is consumed, collecting the results into a list. Finally, `_normalize_term` takes that list and merges adjacent `Lit` nodes—so `Lit("a"), Lit("b")` becomes `Lit("ab")`—before wrapping the result in a `Seq` if necessary.

```py
def parse_atom_at(pattern: str, index: int) -> tuple[Node, int]:
    """Parse one atom at a given index and return (node, next_index)."""

    if index < 0 or index >= len(pattern):
        raise ValueError("index out of bounds for parse_atom_at")

    ch = pattern[index]

    if ch == "\\":
        if index + 1 >= len(pattern):
            raise ValueError("Dangling escape at end of pattern")
        return Lit(pattern[index + 1]), index + 2

    if ch == "(":
        inner, end = _extract_group(pattern, index)
        return regex_to_ir(inner), end + 1

    if ch == ")":
        raise ValueError("Unexpected ')' while parsing atom")

    return Lit(ch), index + 1


def parse_term(pattern: str) -> Node:
    """Parse a term by reading consecutive atoms and normalizing literals."""

    if pattern == "":
        raise ValueError("Empty literals are not allowed")

    atoms: list[Node] = []
    i = 0
    n = len(pattern)

    while i < n:
        node, i = parse_atom_at(pattern, i)
        atoms.append(node)

    return _normalize_term(atoms)


def _normalize_term(atoms: list[Node]) -> Node:
    if not atoms:
        raise ValueError("Invalid empty atom sequence")


    merged: list[Node] = []
    lit_buf: list[str] = []

    def flush_lit() -> None:
        if lit_buf:
            merged.append(Lit("".join(lit_buf)))
            lit_buf.clear()

    for node in atoms:
        if isinstance(node, Lit):
            lit_buf.append(node.text)
            continue
        flush_lit()
        merged.append(node)

    flush_lit()

    if len(merged) == 1:
        return merged[0]
    return Seq(tuple(merged))
```

Finally, we need to update our entry point, `regex_to_ir`. Instead of blindly wrapping the input in a `Lit`, it now uses our splitter to handle top-level alternations and passes the pieces to `parse_term`.

```py
def regex_to_ir(pattern: str) -> Node:
    parts = split_top_level_alternation(pattern)
    if len(parts) == 1:
        return parse_term(parts[0])

    # If we have multiple parts, parse each independently and wrap in Alt
    options = tuple(parse_term(p) for p in parts)
    return Alt(options)
```

With these pieces in place, we can now parse complex nested structures like `(a|b)c` into a proper tree of `Seq` and `Alt` nodes. However, we are still missing one crucial component of regex: **repetition**. We need to handle quantifiers like `*`, `+`, `?`, and `{m,n}`.

## Supporting Quantifiers

With `Lit`, `Seq`, and `Alt` implemented, we can represent static structures. However, JSON is rarely static. Strings vary in length, numbers have optional decimal places, and arrays can contain any number of items. To handle this, we need quantifiers.

In the context of our JSON Schema compiler, quantifiers are the engine that translates flexible schema constraints into rigid regex rules. We rely on four main types of repetition:

- Zero or more (`*`): Used for the body of strings (`chars*`).
- Zero or one (?): Used for optional object properties and number signs (-?).
- One or more (+): Used for parts of numbers (digits).
- Bounded Range ({m,n}): Used for arrays with minItems and maxItems.

The first three can be seen in the patterns we use in `json_schema.py`.

```py
STRING_PATTERN = r'"([^"\\]|\\.)*"'
INTEGER_PATTERN = r"-?(0|[1-9][0-9]*)"
NUMBER_PATTERN = r"-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?"
BOOLEAN_PATTERN = r"(true|false)"
NULL_PATTERN = r"null"
WS = r"[ \t\n\r]*"
```

Luckily we can go back to our original `parse_term` and modify it slightly to support this new requirement.

```py
def parse_term(pattern: str) -> Node:
    """Parse a term by reading consecutive atoms and normalizing literals."""

    if pattern == "":
        return Lit("")

    atoms: list[Node] = []
    i = 0
    n = len(pattern)

    while i < n:
        node, i = parse_atom_at(pattern, i)
        # Check whether there is an additional quantifier after the parsed node (e.g., a{2,4}).
        node, i = _apply_quantifier_at(node, pattern, i)
        atoms.append(node)

    return _normalize_term(atoms)
```

Since there are only a few characters that we need to support for quantifiers, we can simply iterate through this known list of characters as seen below.

```py
# `i` here is already incremented to point to the next value (e.g., after parsing `a{2,4}`, `i` points to `{`).
def _apply_quantifier_at(node: Node, pattern: str, index: int) -> tuple[Node, int]:
    if index >= len(pattern):
        return node, index

    ch = pattern[index]
    if ch == "?":
        return Optional(node), index + 1
    if ch == "*":
        return Repeat(node, min_times=0, max_times=None), index + 1
    if ch == "+":
        return Repeat(node, min_times=1, max_times=None), index + 1
    if ch == "{":
        quant = _parse_brace_quantifier(pattern, index)
        return Repeat(node, min_times=quant.min_times, max_times=quant.max_times), quant.next_index
    return node, index
```

The only thing that's a bit complicated is just to parse the brace quantifiers. Here we have three possible forms

1. `{m}` : Repeat `m` times
2. `{m,}` : Repeat at least `m` times
3. `{m,n}` : Repeat anywhere between `m` and `n` times inclusive (for example, `a{2,4}` matches `aa`, `aaa`, `aaaa`)

Funnily enough, this is the perfect job for a regex inside a Regex-to-IR parser.

```py
def _parse_brace_quantifier(pattern: str, index: int) -> BraceQuantifier:
    """Parse '{m}', '{m,}', or '{m,n}' starting at index of '{'."""

    if index + 1 >= len(pattern):
        raise ValueError("Unclosed brace quantifier")

    close = pattern.find("}", index + 1)
    if close == -1:
        raise ValueError("Unclosed brace quantifier")

    inner = pattern[index + 1 : close]
    m = re.fullmatch(r"(\d+)(?:,(\d*))?", inner)
    if m is None:
        raise ValueError("Invalid brace quantifier format")

    min_times = int(m.group(1))
    g2 = m.group(2)
    if g2 is None:
        return BraceQuantifier(min_times=min_times, max_times=min_times, next_index=close + 1)
    if g2 == "":
        return BraceQuantifier(min_times=min_times, max_times=None, next_index=close + 1)

    max_times = int(g2)
    if max_times < min_times:
        raise ValueError("Brace quantifier max bound must be >= min bound")
    return BraceQuantifier(min_times=min_times, max_times=max_times, next_index=close + 1)
```

We can verify that this works by writing some simple tests as seen below.

```py
@pytest.mark.parametrize(
    ("node", "pattern", "index", "expected_node", "expected_next_i"),
    [
        (Lit("a"), "a?", 1, Optional(Lit("a")), 2),
        (Lit("b"), "b*", 1, Repeat(Lit("b"), min_times=0, max_times=None), 2),
        (Lit("c"), "c+", 1, Repeat(Lit("c"), min_times=1, max_times=None), 2),
        (Lit("d"), "d{2,4}", 1, Repeat(Lit("d"), min_times=2, max_times=4), 6),
        (Lit("x"), "xyz", 1, Lit("x"), 1),
    ],
)
def test_apply_quantifier_at(
    node, pattern: str, index: int, expected_node, expected_next_i: int
):
    next_node, next_i = _apply_quantifier_at(node, pattern, index)
    assert next_node == expected_node
    assert next_i == expected_next_i

@pytest.mark.parametrize(
    ("pattern", "index", "expected"),
    [
        ("a{2}", 1, BraceQuantifier(min_times=2, max_times=2, next_index=4)),
        ("a{2,}", 1, BraceQuantifier(min_times=2, max_times=None, next_index=5)),
        ("a{2,4}", 1, BraceQuantifier(min_times=2, max_times=4, next_index=6)),
    ],
)
def test_parse_brace_quantifier(pattern: str, index: int, expected: BraceQuantifier):
    assert _parse_brace_quantifier(pattern, index) == expected
```

Now that we've got support for quantifiers, let's now work towards adding support for our Character Classes.

## Character Classes

Character classes are essential for defining the lexical tokens of structured data formats efficiently. In our JSON schema parsing, they drastically reduce pattern complexity compared to explicit alternations. We've used these implicitly in our `json_schema` implementation where

1. INTEGER_PATTERN: Uses `[1-9]` and `[0-9]` to define numeric ranges without listing every digit.
2. STRING_PATTERN: Relies on the negated class `[^"\\]` to efficiently consume string content until a quote or escape is hit, avoiding complex lookaheads.
3. WS: Uses `[ \t\n\r]` to handle variable whitespace types in a single node.

Without native `CharClass` nodes, a simple concept like "any digit" would require an Alt chain of 10 literals (0|1|2...), bloating the IR and slowing down FSM compilation. Let's start by defining some tests to see how we expect these to be parsed.

```py


@dataclass(frozen=True, slots=True)
class CharClass:
    """Character category resolved by the compiler/runtime matcher."""

    kind: CharClassKind
    pattern: str | None = None
    negated: bool = False

    def __post_init__(self) -> None:
        if self.kind == "BRACKET":
            if self.pattern is None:
                raise ValueError("pattern is required for BRACKET")
            return
        if self.pattern is not None:
            raise ValueError("pattern is only valid for BRACKET")
        if self.negated:
            raise ValueError("negated is only valid for BRACKET")


@pytest.mark.parametrize(
    ("pattern", "index", "expected_node", "expected_next_i"),
    [
        (r"\d", 0, CharClass("DIGIT"), 2),
        (".x", 0, CharClass("ANY"), 1),
        (r"[a-z_]", 0, CharClass("BRACKET", pattern="a-z_"), 6),
        (r"[^\"\n]", 0, CharClass("BRACKET", pattern=r"\"\n", negated=True), 7),
    ],
)
def test_parse_atom_at_char_classes(
    pattern: str, index: int, expected_node, expected_next_i: int
):
    node, next_i = parse_atom_at(pattern, index)
    assert node == expected_node
    assert next_i == expected_next_i
```

To implement this, we handle character classes within parse_atom_at through three distinct paths.

1. Wildcards: The . literal is detected immediately and emitted as CharClass("ANY").
2. Shorthand Escapes: Backslash sequences like `\d` or `\w` are routed to `_parse_escape_atom_at`, which maps them to specific kinds (e.g., DIGIT, WORD).
3. Bracket Expressions: When `[` is encountered, we delegate to `_extract_char_class`.

The bracket extraction logic is slightly more involved than a simple scan. We need to handle negation by checking for a leading `^` (e.g., `[^"\n]`), which sets the `negated=True` flag. We also validate escaping inside the class so malformed patterns like a dangling trailing backslash are rejected early.

One design decision here is important: for bracket classes we preserve the raw class body text exactly as the user wrote it (for example `\d`, `\n`, ranges like `a-z`). We do not rewrite these into internal marker tokens. This keeps the IR closer to source regex and makes the NFA matcher straightforward, because we can evaluate bracket classes directly as regex character classes later.

```py

def _parse_escape_atom_at(pattern: str, index: int) -> tuple[Node, int]:
    if index + 1 >= len(pattern):
        raise ValueError("Dangling escape at end of pattern")

    esc = pattern[index + 1]
    if esc == "d":
        return CharClass("DIGIT"), index + 2
    if esc == "D":
        return CharClass("NOT_DIGIT"), index + 2
    if esc == "s":
        return CharClass("WHITESPACE"), index + 2
    if esc == "S":
        return CharClass("NOT_WHITESPACE"), index + 2
    if esc == "w":
        return CharClass("WORD"), index + 2
    if esc == "W":
        return CharClass("NOT_WORD"), index + 2

    literal = _decode_escaped_literal(esc)
    return Lit(literal), index + 2

# In the event it doesn't map to a specific character class but is escaped
def _decode_escaped_literal(esc: str) -> str:
    if esc == "n":
        return "\n"
    if esc == "t":
        return "\t"
    if esc == "r":
        return "\r"
    if esc == "f":
        return "\f"
    if esc == "v":
        return "\v"
    return esc


def _resolve_char_class_body(body: str) -> str:
    i = 0
    while i < len(body):
        if body[i] == "\\" and i + 1 >= len(body):
            raise ValueError("Dangling escape inside character class")
        i += 2 if body[i] == "\\" else 1
    return body
```

In our parser, `[...]` is reserved for regex character-class syntax only, which means “match exactly one character from this set” (or, with [^...], one character not in the set). Inside brackets, the rules differ from normal regex: a leading ^ means negation, ranges like a-z are allowed, and escapes like \n or \d are interpreted as class members rather than full standalone atoms.

This is exactly what makes patterns in json_schema.py compact and expressive: INTEGER_PATTERN uses [1-9] and [0-9] for digit ranges, STRING_PATTERN uses [^"\\] to consume safe string characters, and WS uses [ \t\n\r] to represent all JSON whitespace in one class instead of large alternations.

## Conclusion

In this article, we built a parser that converts raw regex strings into a normalized IR with explicit semantics. We defined our own types for this IR and then defined a simple parser that was able to handle things such as optional items, groups, repetitions and even character class matching.

Our original regex and JSON Schema are now represented as a structured IR that we can compile. That puts us in a position to answer the key decoding question: given the text we've generated so far, what can legally come next?

In the next article, we'll compile this IR into a state-machine to solve this problem and optimize it for fast next-step lookup.
