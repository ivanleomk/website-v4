---
title: "Compiling IR to NFA"
date: 2026-02-09
description: Turn regex IR into a graph-based automaton for fast next-step lookup
authors:
  - ivanleomk
series:
  - Structured Outputs From Scratch
---

In the previous articles, we went from a JSON Schema to a regular expression, and then from a regular expression to a structured intermediate representation (IR). That IR made all of the implicit structure in regex explicit: sequences, branches, repetitions, and character classes were no longer hidden behind syntax, but represented as concrete nodes we could reason about.

However, an IR on its own still isn’t enough for constrained decoding. During decoding, a language model emits tokens one by one. At each step, we need to answer a single question:

> Given the prefix we’ve generated so far, what tokens are still allowed next?

What we need instead is a structure that can be stepped forward, one token at a time, while keeping track of all valid ways the output could still continue. That structure is a finite-state machine. In this article, we’ll introduce the most flexible version of it: the non-deterministic finite automaton (NFA), and show how it lets us validate token streams incrementally.

## What is a NFA

A non-deterministic finite automaton (NFA) is a graph that represents all valid ways a pattern can be matched, step by step. In a NFA, we're usually in many states at once. This doesn't mean that we're here in the string but more that if the output continues from this point, it can be valid.

At any point during decoding, the NFA represents all futures that are still possible given the prefix we’ve generated so far. There are two main building blocks here of a NFA

1. **Transitions** : Consume an input token and move to another state
2. **Epsilons** : These simply represent a structure (Eg. branching, optional elements, repetition boundaries)

For instance, if we had a open brace that we were evaluating right now, a transition would mean consuming this token and then evaluating the remainder based solely.

```
(state 3) -- "{" --> (state 4)
```

But an epsilon on the other hand allows us to evaluate two potential states without consuming the input

```
(state 1) --ε--> (state 2)
(state 1) --ε--> (state 5)
```

For instance, going back to our intermediate representation. If we had a regex of `a|b` we might result in a `Alt(Lit("a"),Lit("b"))` which in turn would be represented here as

```
(start) --ε--> (a_start) --"a"--> (a_end) --ε--> (end)
(start) --ε--> (b_start) --"b"--> (b_end) --ε--> (end)
```

This is incredibly useful for constrained decoding because we can validate the current prefix by stepping through the NFA quickly.

## Implementing our NFA

Let's start putting together our NFA, as usual, we'll put together a scaffold and then iteratively write tests for each portion of our NFA. This way we can slowly implement support for each specific type that we've defined in our `IR` previously. Let's start by defining the types that we'll work with while creating our IR.

```py
@dataclass(frozen=True, slots=True)
class Literal:
    value: str


@dataclass(frozen=True, slots=True)
class CharClass:
    kind: str
    pattern: str | None = None
    negated: bool = False


type Symbol = Literal | CharClass


@dataclass(frozen=True, slots=True)
class Fragment:
    start: int
    end: int

@dataclass(slots=True)
class NFA:
    start_state: StateId
    final_states: StateSet
    transitions: TransitionMap
    epsilon: EpsilonMap
    _next_state: StateId

    def add_transition(self, src: StateId, symbol: Symbol, dst: StateId) -> None:
        self.transitions.setdefault(src, []).append((symbol, dst))

    def add_epsilon(self, src: StateId, dst: StateId) -> None:
        self.epsilon.setdefault(src, set()).add(dst)

    def _new_state(self) -> StateId:
        out = self._next_state
        self._next_state += 1
        return out

    def _compile_node(self, ir: Node) -> Fragment:
        raise NotImplementedError(
            "Nothing is implemented yet"
        )

    def accepts(self, text: str) -> bool:
        raise NotImplementedError("NFA.validate is not implemented yet")
```

We can see here that there are Symbols and Fragments ( and our NFA down the line ). A way to think about this is that for our regex there are characters and then there are structural nodes. For instance the node `Literal("ABC")` indicates that our final output requires us to have the text `ABC` inside it but the node `Repeat(Lit("ab"), min_times=1, max_times=None)` indicates that we need to have the `Literal("ab")` appear at least once in the output string.

In this case here `Symbols` represent the possible values that our string might take on and `Fragment` represents the NFA of a complete node. We also define a simple dataclass to represent our `NFA` and enforce that only these specific attributes can exist on our dataclass using the `slots=True` keyword.

We then define a simple function which will handle our NFA compilation for now and we complete our initial scaffold.

```py
def ir_to_nfa(node: Node) -> NFA:
    nfa = NFA(
        start_state=0,
        final_states=set(),
        transitions={},
        epsilon={},
        _next_state=0,
    )
    frag = nfa._compile_node(node)
    nfa.start_state = frag.start
    nfa.final_states = {frag.end}
    return nfa
```

## Supporting Literals

Let's start with the simplest possible NFA - literals. Recall that in our previous article, we defined an intermediate representation (IR) to represent literals as `Literal("ABC")`. This would then result in the following NFA.

```text
(start) --"a"--> (state_1) --"b"--> (state_2) --"c"--> (state_3) ----> (end)
```

We can implement this by using a simple loop in our `_compile_lit` method in our `NFA` class.

```py
def add_transition(self, src: StateId, symbol: Symbol, dst: StateId) -> None:
    self.transitions.setdefault(src, []).append((symbol, dst))

def _compile_lit(self, lit: Lit) -> Fragment:
    start = self._new_state()
    if lit.text == "":
        raise ValueError("Empty Strings are not allowed!")

    prev = start
    for ch in lit.text:
        nxt = self._new_state()
        self.add_transition(prev, Literal(ch), nxt)
        prev = nxt
    return Fragment(start, prev)
```

This creates the following transition as seen below.

```text
(0) --"a"--> (1) --"b"--> (2) --"c"--> (3) ----> (end)
```

We can then modify our `_compile_node` function so that it works on literals.

```py
def _compile_node(self, ir: Node) -> Fragment:
    if isinstance(ir, Lit):
        return self._compile_lit(ir)
```

If we run this function with a simple test case we can see that it works as intended.

```py
def test_compile_literal_user_to_known_nfa():
    nfa = ir_to_nfa(Lit("user"))

    assert nfa.start_state == 0
    assert nfa.final_states == {4}
    assert nfa.epsilon == {}
    assert nfa.transitions == {
        0: [(Literal("u"), 1)],
        1: [(Literal("s"), 2)],
        2: [(Literal("e"), 3)],
        3: [(Literal("r"), 4)],
    }
```

## Supporting Unions

Now that we've implemented support for a simple Literal, let's see how we can support unions. This is where epsilon transitions come in. Let's see a more concrete example with a simple regex `(a|b)` which corresponds to the string `a` or `b`.

We can represent this as the following NFA.

```text
(0) --ε--> (1) --"a"--> (2) --ε--> (5)
(0) --ε--> (3) --"b"--> (4) --ε--> (5)
```

How might we implement this? Well, it's exactly the same as how we would support literals, just with two extra steps.

```py
def _compile_alt(self, alt: Alt) -> Fragment:
    start = self._new_state()
    option_frags: list[Fragment] = []
    for option in alt.options:
        # First we generate the list of states and links that we originally had
        frag = self._compile_node(option)
        # We then add it to the list of paths that we can have
        option_frags.append(frag)
        # Then we add an epsilon mapping our initial state -> the start of this fragment we've generated
        self.add_epsilon(start, frag.start)

    end = self._new_state()
    for frag in option_frags:
        self.add_epsilon(frag.end, end)
    return Fragment(start, end)
```

Note that here `start` and `end` are just IDs for a current state that our generated output can be in. By writing the code this way, we ensure that we have sequential IDs generated. Let's write another test and make sure that our alt implementation works as intended.

```py
def test_compile_alt_a_or_c_to_known_nfa():
    nfa = ir_to_nfa(Alt((Lit("a"), Lit("c"))))

    assert nfa.start_state == 0
    assert nfa.final_states == {5}
    assert nfa.transitions == {
        1: [(Literal("a"), 2)],
        3: [(Literal("c"), 4)],
    }
    assert nfa.epsilon == {0: {1, 3}, 2: {5}, 4: {5}}
```

With this we've implemented basic support for Literals and Unions ( of literals ) for now.

## Validating Prefixes

Now that we've implemented support for a basic and limited set of our intermediate representation, let's now add support for validating prefixes. This will allow us to determine whether a prefix is valid or not. The key idea here is that

1. We first want to keep a set of current active states
2. Then we'll expand the set of potential state
3. For each state that we have, we'll then consume one character by following a transition
4. We keep repeating until we run out of characters in our prefix or hit a mismatch

Let's start by first writing a function which will help us to take a given state and then find all of the potential starting points it maps to without consuming a token.

```py
def test_epsilon_closure_mock_nfa_with_two_epsilon_edges():
    # A(0) --eps--> B(1)
    # A(0) --eps--> C(2)
    nfa = NFA(
        start_state=0,
        final_states=set(),
        transitions={},
        epsilon={0: {1, 2}},
        _next_state=3,
    )

    assert nfa.epsilon_closure({0}) == {0, 1, 2}


def test_epsilon_closure_mock_nfa_with_only_symbol_transition():
    # A(0) --"x"--> B(1) and no epsilon edges.
    nfa = NFA(
        start_state=0,
        final_states=set(),
        transitions={0: [(Literal("x"), 1)]},
        epsilon={},
        _next_state=2,
    )

    assert nfa.epsilon_closure({0}) == {0}
```

We can implement a function which supports this as seen below which passes all of our tests below.

```py
def epsilon_closure(self, states: StateSet) -> StateSet:
    closure = set(states)
    stack = list(states)
    while stack:
        src = stack.pop()
        for dst in self.epsilon.get(src, set()):
            if dst in closure:
                continue
            closure.add(dst)
            stack.append(dst)
    return closure
```

Now that we have these initial states and a character to validate, we can simply just get all of the individual transitions and the values they map to and see if they match our character

```py
def _matches_symbol(symbol: Symbol, char: str) -> bool:
    if isinstance(symbol, Literal):
        return symbol.value == char
    raise NotImplementedError("Other terms will be supported down the line ")


def step(self, states: StateSet, char: str) -> StateSet:
    if len(char) != 1:
        raise ValueError("step expects a single character")

    reached: StateSet = set()
    for src in self.epsilon_closure(states):
        for symbol, dst in self.transitions.get(src, []):
            if _matches_symbol(symbol, char):
                reached.add(dst)
    return self.epsilon_closure(reached)
```

We can see this in action below with the following tests which test our Literal and the Union path.

```py
def test_step_mock_nfa_literal_transition():
    # 0 --"a"--> 1 --"b"--> 2
    nfa = NFA(
        start_state=0,
        final_states={2},
        transitions={
            0: [(Literal("a"), 1)],
            1: [(Literal("b"), 2)],
        },
        epsilon={},
        _next_state=3,
    )

    assert nfa.step({0}, "a") == {1}
    assert nfa.step({1}, "b") == {2}
    assert nfa.step({0}, "b") == set()


def test_step_union_paths():
    # 0 --eps--> 1 --"a"--> 2 --eps--> 5
    # 0 --eps--> 3 --"c"--> 4 --eps--> 5
    nfa = NFA(
        start_state=0,
        final_states={5},
        transitions={
            1: [(Literal("a"), 2)],
            3: [(Literal("c"), 4)],
        },
        epsilon={
            0: {1, 3},
            2: {5},
            4: {5},
        },
        _next_state=6,
    )

    assert nfa.step({nfa.start_state}, "a") == {2, 5}
    assert nfa.step({nfa.start_state}, "c") == {4, 5}
    assert nfa.step({nfa.start_state}, "b") == set()
```

We can then add a simple `.accepts()` function can help to validate whether a given prefix is valid for a known IR. This is only for testing our NFA to make sure it compiles as intended and is able to validate prefixes using our other functions.

```py
def accepts(self, text: str) -> bool:
    states = self.epsilon_closure({self.start_state})
    for ch in text:
        states = self.step(states, ch)
        if not states:
            return False
    return bool(states)
```

This is the first concrete bridge to constrained decoding: at any prefix, we can tell whether we're still on a valid path. Let's test this out with a few tests.

```py
@pytest.mark.parametrize(
    ("ir", "accepted", "rejected"),
    [
        (Alt((Lit("a"), Lit("c"))), ["", "a", "c"], ["b", "ac"]),
        (Lit("abc"), ["", "a", "ab", "abc"], ["abcd", "xbc"]),
    ],
)
def test_accepts_from_ir(ir, accepted: list[str], rejected: list[str]):
    nfa = ir_to_nfa(ir)

    for text in accepted:
        assert nfa.accepts(text)
    for text in rejected:
        assert not nfa.accepts(text)
```

We can see that this works nicely. Now that we have an easy way to validate arbitrary strings given our IR, let's now look towards supporting more parts of our overall IR syntax.

## Scaling up our NFA

This leaves us with a few more things to implement

1. First, we want to support `Seq` which is simply just a few nodes processed sequentially with an epsilon linking them.
2. Then, we'll look at `CharClass` so that we can support whitespaces, digits etc
3. Next, we'll then support the Optionals
4. Last, we'll fix up support for the `Repeat` that we previously created

Sequences are relatively easy to support and we can do so with a simple for loop that iterates over each `part` in our sequence.

```py
def _compile_seq(self, seq: Seq) -> Fragment:
    if not seq.parts:
        raise ValueError("Seq must contain at least one part")

    parts = list(seq.parts)
    first = self._compile_node(parts[0])
    prev = first
    for node in parts[1:]:
        # 1. First generate the fragment for this node
        cur = self._compile_node(node)

        # Add the epsilon link ( which automatically increments the state idx too )
        self.add_epsilon(prev.end, cur.start)

        # Update the pointer
        prev = cur
    return Fragment(first.start, prev.end)
```

We can see here that what we do is honestly just a bit like creating a linked list hehe. We can take a similar approach to dealing with the character classes.

```py
# We import our CharClass from the IR file as IRCharClass so that there's no naming conflict
def _compile_char_class(self, char_class: IRCharClass) -> Fragment:
    start = self._new_state()
    end = self._new_state()
    self.add_transition(
        start,
        CharClass(
            kind=char_class.kind,
            pattern=char_class.pattern,
            negated=char_class.negated,
        ),
        end,
    )
    return Fragment(start, end)
```

We can then add validation for these classes easily in our prior `_matches_symbol` function because we preserve the original regex pattern instead of escaping it.

```py
def _matches_symbol(symbol: Symbol, char: str) -> bool:
    if isinstance(symbol, Literal):
        return symbol.value == char
    if symbol.kind == "ANY":
        return True
    if symbol.kind == "DIGIT":
        return char.isdigit()
    if symbol.kind == "NOT_DIGIT":
        return not char.isdigit()
    if symbol.kind == "WHITESPACE":
        return char.isspace()
    if symbol.kind == "NOT_WHITESPACE":
        return not char.isspace()
    if symbol.kind == "WORD":
        return char.isalnum() or char == "_"
    if symbol.kind == "NOT_WORD":
        return not (char.isalnum() or char == "_")
    if symbol.kind == "BRACKET":
        if symbol.pattern is None:
            return False
        class_expr = f"[^{symbol.pattern}]" if symbol.negated else f"[{symbol.pattern}]"
        return re.fullmatch(class_expr, char) is not None
    raise NotImplementedError(f"Unsupported character class kind: {symbol.kind}")
```

Let's now look at `Optional(X)`. In regex, this is `X?.` It means we can either match the sub-pattern X exactly once, or we can skip it entirely. This "either/or" choice translates perfectly into an NFA fork.

```
            +------------- ε (skip) ------------+
            |                                   |
            |                                   v
(start_optional) --ε--> [ NFA for X ] --ε--> (end_optional)
                        ("take" path)
```

Wen can implement this in `_compile_optional` as seen below.

```py
def _compile_optional(self, optional: IROptional) -> Fragment:
    start = self._new_state()
    end = self._new_state()

    # Build the NFA for the inner node `X`
    frag = self._compile_node(optional.node)

    # 1. Wire the "skip" path
    self.add_epsilon(start, end)

    # 2. Wire the "take" path
    self.add_epsilon(start, frag.start)
    self.add_epsilon(frag.end, end)

    return Fragment(start, end)
```

Repetition, like a+ or a{2,4}, might seem complex, but we can build it from the simpler patterns we already have. Our strategy for Repeat(node, min_times, max_times) is to handle it in two phases, just like the code does:

1. First, build the required part by chaining min_times copies of the node's NFA together. This is mandatory.
2. Then, from the end of that required chain, handle the optional extra repetitions.

We can see an implementation below which implements this.

```py
def _compile_repeat(self, repeat: IRRepeat) -> Fragment:
    start = self._new_state()
    cursor = start

    # Step 1: Build the required `min_times` sequence
    for _ in range(repeat.min_times):
        frag = self._compile_node(repeat.node)
        self.add_epsilon(cursor, frag.start)
        cursor = frag.end

    # `cursor` is now the decision point after all required parts are done.
    end = self._new_state()

    # Step 2: Handle the optional part
    if repeat.max_times is None:
        # Case A: Unbounded repetition (the feedback loop)
        # Path to stop/exit the loop.
        self.add_epsilon(cursor, end)
        # Path to take one more and loop back to the decision point.
        loop_body = self._compile_node(repeat.node)
        self.add_epsilon(cursor, loop_body.start)
        self.add_epsilon(loop_body.end, cursor)  # <-- The magic feedback loop!
    else:
        # Case B: Bounded repetition (a chain of optionals)
        extra = repeat.max_times - repeat.min_times
        for _ in range(extra):
            # At each step, we can either stop and go to the end...
            self.add_epsilon(cursor, end)
            # ...or we can take one more step in the chain.
            frag = self._compile_node(repeat.node)
            self.add_epsilon(cursor, frag.start)
            cursor = frag.end

        # After the final possible match, we must go to the end.
        self.add_epsilon(cursor, end)

    return Fragment(start, end)
```

With these wiring patterns, we can now handle the full structure of our regex IR, transforming any pattern into a graph that's ready for step-by-step validation.

## Conclusion

In this article, we moved from a structured regex IR to a working NFA runtime that can be advanced incrementally one character at a time. We implemented the core compilation rules for literals, alternation, sequences, character classes, optional nodes, and bounded/unbounded repetition, then used epsilon-closure plus transition stepping to validate whether a prefix is still on a legal path.

That gives us correctness and flexibility, but not yet the fastest possible runtime. NFAs can keep many states active at once, which becomes expensive as patterns grow.

In the next article, we'll convert our NFA into a DFA and then use DFA state transitions to build token masks for a transformer, so generation can stay both valid and efficient at each decoding step.
