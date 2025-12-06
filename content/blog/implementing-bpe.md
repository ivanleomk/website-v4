---
title: "Implementing BPE"
date: 2025-11-30
description: "Building a Byte-Pair Encoding tokenizer from scratch"
categories:
  - LLMs
authors:
  - ivanleomk
series:
  - LLMs From Scratch
---

> You can find the code here at [ivanleomk/llms-from-scratch](https://github.com/ivanleomk/llms-from-scratch)

Every Large Language Model faces the same initial hurdle: converting unstructured text into the clean, numerical tokens it can process. The answer isn't to split by characters (too long) or by words (too many), but to find a statistical middle ground. This is the job of the tokenizer.

In this article, we'll build a BPE tokenizer from the ground up to understand how this process works. We'll do it in three parts:

1. **The Theory**: We'll start with the fundamentals—why tokenization is necessary and walk through what Unicode is.
2. **A Naive Implementation**: Next, we’ll walk through what BPE is and then implement our naive implementation of the BPE algorithm in Python, showing how it splits text into workable chunks and applies merge rules.
3. **Production Optimization**: Finally, we’ll add the critical performance optimizations that make modern tokenizers so efficient, including caching and parallelization, to make our implementation truly fast.

Let's get started!

## Tokenization

At its core, tokenization is about converting raw text into a sequence of integer IDs that a model can understand. Splitting by individual characters creates sequences that are too long for models to learn from effectively. On the other hand, splitting by words creates a massive vocabulary that can't handle typos, new words, or complex languages. Byte-Pair Encoding (BPE) offers a clever compromise.

### Unicode

First, we need a universal dictionary that assigns a unique number to every character in every language. This is what Unicode does. It gives every character—from 'A' to '€' to '😂'—its own special ID number, called a code point.

1. The character 'A' has the code point 65.
2. The character '€' has the code point 8364.

We can print it out in python with the following code:

```python
>>> ord('h')
104
>>> ord("你")
20320
>>> chr(104)
'h'
>>> ord("hello")
Traceback (most recent call last):
  File "<python-input-3>", line 1, in <module>
    ord("hello")
    ~~~^^^^^^^^^
TypeError: ord() expected a character, but string of length 5 found
```

We can see here that these code points are on a character level, not a word level. How are these code points then stored in memory? We'll do so by encoding these in bytes.

### Unicode Bytes

Computers store information in tiny, standardized containers called bytes. A byte is like a small box that can only hold a single number between 0 and 255.

This is simple for a character like 'A', whose code point (65) fits perfectly inside one byte. But what about '€'? Its code point (8364) is far too large to fit into a single box.

This is where encodings come in. An encoding is simply a set of rules for how to pack these large code point numbers into these small byte strategires.

There are three main ways here to store these IDs with **UTF-8** being the web standard to store characters

1. **UTF-32**: This uses a fixed 4-byte container to store these IDs
2. **UFT-16** : This uses a fixed 2 bytes and then rare/historic characters take 4 bytes.
3. **UTF-8** : We use a variable byte container that goes from 1-4 bytes, expanding to use two, three or four bytes only when necessary for complex characters.

In **UTF-8**, the system uses specific bit prefixes to mark multi-byte patterns

1.  **`0xxxxxxx`** - Signals a **1-byte** character (standard ASCII)
2.  **`110xxxxx`** - Signals a **2-byte** character sequence
3.  **`1110xxxx`** - Signals a **3-byte** character sequence
4.  **`11110xxx`** - Signals a **4-byte** character sequence

Let's see this more concretely with the same character '€' (8364)

| Encoding   | Rule                               | 'A' `(65)`    | '€' `(8364)`     |
| :--------- | :--------------------------------- | :------------ | :--------------- |
| **UTF-32** | Always use **4 bytes**             | [0, 0, 0, 65] | [0, 0, 32, 172]  |
| **UTF-16** | Use **2 bytes** (4 for rare chars) | [0, 65]       | [32, 172]        |
| **UTF-8**  | Use **1-4 bytes** as needed        | [65]          | [226, 130, 172]` |

For ASCII text like "Hello", UTF-8 uses just 5 bytes while UTF-16 needs 10 and UTF-32 needs 20. This is why UTF-8 dominates the web.

### UTF-8

UTF-8 uses specific bit prefixes as **instructions** (signposts) rather than data. It divides bytes into "Leaders" (which signal the start) and "Continuations" (which signal the middle) which is a byte that starts with `10` and follows the format `10xxxxxx`

To pack a non-English character like the Japanese 'こ' (Unicode ID 12371, Binary `11000001010011`):

1. **Select Pattern**: The binary length (14 bits) requires the **3-byte pattern** (`1110xxxx 10xxxxxx 10xxxxxx`), which offers 16 `x` slots.
2. **Pad**: We add zeros to the *left* of our binary number to fill all 16 slots: `0011000001010011`.
3. **Pack**: We pour these bits into the `x` slots of the pattern to get the final bytes:  
   `[11100011, 10000001, 10010011]` or `[227, 129, 147]`.

This is where the BPE algorithm comes in. It doesn't understand that [227, 129, 147] represents 'こ'; to the algorithm, it's just a sequence of numbers.

The process happens bottom-up, through iterative merging:

1. During training, the algorithm scans the entire dataset and might find that the pair (227, 129) is extremely common.
2. It would then merge this pair into a new token (e.g., token ID 256) and replace every instance of [227, 129] in the text with [256].
3. Now, our original byte sequence for 'こ' has become [256, 147].

In a later step, the algorithm might discover that the new pair (256, 147) is itself very frequent, and merge it into yet another token. Through this pairwise process, BPE eventually learns to represent the entire multi-byte sequence for 'こ' as a single, efficient token. It effectively "learns" the character not by seeing it, but by discovering that its component bytes consistently appear together.

## Naive Implementation

Let's now walk through what a naive implementation might require.

```py
Vocab = dict[int, bytes]
Merges = list[tuple[bytes, bytes]]
WordCounts = dict[tuple[bytes, ...], int]
PairCounts = dict[tuple[bytes, bytes], int]


def train_bpe(
    input_path: str,
    vocab_size: int,
    special_tokens: list[str],
) -> tuple[Vocab, Merges]:
    """Train a BPE tokenizer and return vocabulary and merges."""
    word_counts = pretokenize(input_path, special_tokens)
    vocab = build_initial_vocab(special_tokens)
    merges: Merges = []

    num_merges = vocab_size - len(vocab)

    for _ in range(num_merges):
        best_pair = find_most_frequent_pair(word_counts, vocab)
        if best_pair is None:
            break
        merges.append(best_pair)
        vocab[len(vocab)] = best_pair[0] + best_pair[1]
        word_counts = apply_merge(word_counts, best_pair)

    return vocab, merges
```

Let's break down what's happening here on a high level.

1. **Pretokenization** : Firstly, we pretokenize the words that we have to get a count of all the words that we have. This is done by reading the input file and then splitting it into words.

2. **Vocabulary and Merges** : Then we'll build an initial vocabulary here that maps each word to a unique token ID. This means that when we encode our text, we'll go from a list of words to a list of token IDs. For instance, the words `Hello World` map over to `31373, 995` in the original GPT-2 tokenizer. We also initialise a list of Merges. This will store all of the merged words (Eg. AB ) in their byte string format so that we can refer to them later.

3. **Finding the most frequent pair** : The next step is to find the most frequent pair of bytes in the vocabulary. This is done by iterating over all the pairs of bytes in the vocabulary and counting how many times each pair appears. The pair with the highest count is the most frequent pair.

4. **Applying our Merge**: Once we've found this most common pair, we need to then apply the merge to the current list of words that we have. For instance, if we decided that now we wanted to merge the character `el`, then our new list of words that we have is `H,e,l,l,o, W,o,r,l,d` becomes `H,el,lo W,or,l,d`.

In other words, we replace all instances of the pair in the list of words we have

Once we've finished it all, we'll have a new vocabulary and a list of merges that we can use to encode our text. If this doesn't make sense at first, it will once we walk through our implementation.

It's useful here to also note what each type here represents

```py
Vocab = dict[int, bytes]
Merges = list[tuple[bytes, bytes]]
WordCounts = dict[tuple[bytes, ...], int]
PairCounts = dict[tuple[bytes, bytes], int]
```

We have

1. `Vocab` which is a mapping of Token IDs to the bytes of the words that they represent (Eg. 312 -> Hello which would be represented as `b'Hello'`)
2. `Merges` which is a list of tuples of bytes that represent the merged words (Eg. AB )
3. `WordCounts` which is a dictionary that maps each word to the number of times it appears in the corpus
4. `PairCounts` which is a dictionary that maps each pair of bytes to the number of times it appears in the corpus

### Pre-Tokenization

Before we can analyze our text, we need to convert it from human-readable characters into a numerical format that our algorithm can process. This is done by encoding the text into bytes using a standard like UTF-8. In Python, a sequence of bytes, or a "byte string," is represented with a b'' prefix, like b'hello'.

The BPE algorithm operates on the most fundamental level: individual bytes. Therefore, our first step is to take each word, convert it into its byte representation, and then split that byte string into a sequence of its individual byte components.

For example, the word "hello" becomes the byte string b'hello', which we then break down into the tuple (b'h', b'e', b'l', b'l', b'o'). This tuple of single bytes is the foundational unit our algorithm will work with.

This initial step of splitting our corpus into a list of words is called pre-tokenization. The BPE algorithm is designed to merge frequent subword units, but it should not merge characters across word boundaries. For instance, in the phrase "hello world," we don't want to merge the "o" from "hello" with the "w" from "world."

We can achieve this using a regular expression that segments the text based on spaces and punctuation. The GPT-2 tokenizer, for example, uses a specific regex pattern to handle common contractions and split text into a preliminary set of chunks.

For instance, the word `capybara` gets split into the following three words

```text
cap-y-bara
11128, 88, 39389
```

You can mess around with different sentences and see how the `GPT-2` tokenizer works here at this website [here](https://tiktokenizer.vercel.app/?model=gpt2).

We can implement this pretokenization step in `bpe.py`

```py
def pretokenize(input_path: str, special_tokens: list[str]) -> WordCounts:
    """Pre-tokenize input into words/chunks, returning counts of each word as tuple of bytes."""
    with open(input_path) as f:
        corpus = f.read()

    corpus_split = [corpus]

    if special_tokens:
        pattern = r"(" + "|".join(regex.escape(token) for token in special_tokens) + r")"
        corpus_split = regex.split(pattern, corpus)
        corpus_split = [x for x in corpus_split if x]

    gpt_2_regex = regex.compile(
        r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
    )

    word_count: WordCounts = {}
    for corpus in corpus_split:
        if corpus in special_tokens:
            continue
        words = gpt_2_regex.findall(corpus)
        for word in words:
            word_bytes = tuple(bytes([b]) for b in word.encode("utf-8"))
            word_count[word_bytes] = word_count.get(word_bytes, 0) + 1

    return word_count
```

A few important things are happening here:

- **Regex Splitting**: The regular expression breaks the corpus into a list of strings that constitute our "words." This ensures that merges will only occur within these chunks.
- **Special Tokens**: Special tokens like `<|endoftext|>` are markers for the model and should be treated as single, indivisible units. While the provided code doesn't explicitly handle them in this function, a complete implementation would separate them before this step.
- **Word Counts**: The function returns a dictionary called word_counts. This dictionary maps each word (represented as a tuple of its UTF-8 bytes) to its frequency in the training corpus. This frequency count is crucial for the next step. For example, if "hello" appears 10 times, our dictionary will have an entry like {(b'h', b'e', b'l', b'l', b'o'): 10}.

This word_counts dictionary is the direct input for our main training loop. It serves as the initial state of our vocabulary before any merges have been learned.

### Building an initial vocabulary

Modern tokenizers don't work with characters; they work with bytes. This is a crucial design choice. The UTF-8 encoding system can represent every character from every language in the world as a sequence of bytes.

Since every piece of text can be broken down into a stream of bytes, a vocabulary that includes all possible byte values (0-255) can, by definition, represent any text without errors or "unknown token" issues.

By initializing our vocabulary with this 0-255 range, we establish a complete base vocabulary. Every single byte is its own token from the very beginning.

- Token ID 65 maps to the byte `b'A'`.
- Token ID 97 maps to the byte `b'a'`.

This guarantees that before a single merge is learned, our tokenizer can already process any input string by simply converting it into a sequence of these base byte tokens.

In our case, we want to make sure the special tokens are included in this initial vocabulary initially befoer we assign the bytes to other token IDs.

### Finding the Most Frequent Pair

The core of the BPE algorithm is an iterative process: find the most frequent adjacent pair of tokens in our current vocabulary and merge them into a new, single token. This process is repeated for a predetermined number of merges.

To do this, we need a function that can take our word_counts and calculate the frequency of every adjacent pair. Let's call it get_pair_counts.

```py
def find_most_frequent_pair(word_counts: WordCounts, vocab: Vocab) -> tuple[bytes, bytes] | None:
    """Find the most frequent adjacent pair across all words."""
    counts: PairCounts = {}
    for word in word_counts:
        for x, y in zip(word, word[1:]):
            if (x, y) not in vocab:
                counts[(x, y)] = counts.get((x, y), 0) + word_counts[word]

    if not counts:
        return None

    return max(counts, key=lambda pair: (counts[pair], pair[0], pair[1]))
```

Here's how it works:

1. Iterate Through Words: The function loops through every unique word (represented as a tuple of bytes) in our word_counts dictionary.
2. Count Adjacent Pairs: For each word, it slides a window of size two across its byte sequence. For instance, for the word (b'h', b'e', b'l', b'l', b'o'), it generates the pairs (b'h', b'e'), (b'e', b'l'), (b'l', b'l'), and (b'l', b'o').
3. Aggregate Frequencies: The count of each generated pair is incremented by the frequency of the word it came from. If the word "hello" appeared 10 times, the counts for (b'h', b'e'), (b'e', b'l'), etc., would each increase by 10.

But what happens if there's a tie? For instance, if the pairs (b'e', b's') and (b't', b'h') both appear 500 times, which one should we merge first?

To ensure the training process is deterministic (meaning it produces the exact same result every time), we need a consistent tie-breaking rule. The standard approach is to use lexicographical ordering.

This simply means that if two pairs have the same frequency, we choose the one that would come first if they were sorted. Python's default sorting for tuples of bytes handles this automatically. For example, (b'e', b's') would be chosen over (b't', b'h') because b'e' has a lower byte value than b't'.

### Updating our Vocabulary

Once we have identified the most frequent pair, the next step is to update our entire dataset to reflect this new merge. We need to replace every occurrence of the pair with their newly created single token. This is the job of the apply_merge function.

```py
def apply_merge(word_counts: WordCounts, pair: tuple[bytes, bytes]) -> WordCounts:
    """Apply a merge to all words, combining the pair into a single token."""
    new_word_counts = {}
    merged = pair[0] + pair[1]
    for word, count in word_counts.items():
        new_word = []
        i = 0
        while i < len(word):
            if i < len(word) - 1 and word[i] == pair[0] and word[i + 1] == pair[1]:
                new_word.append(merged)
                i += 2  # Skip both
            else:
                new_word.append(word[i])
                i += 1
        new_word_counts[tuple(new_word)] = new_word_counts.get(tuple(new_word), 0) + count

    return new_word_counts
```

Let's break down its logic:

1. Create a New Token: The function first concatenates the two bytes of the pair to create the new, merged token. For example, if our pair is (b'e', b'l'), the merged token becomes b'el'.
2. Iterate and Rebuild: It then loops through every word in our existing word_counts. For each word, it doesn't modify it in place but instead builds a new_word from scratch.
3. Scan and Replace: The while loop scans through the tokens of the current word. If it finds an occurrence of our target pair (e.g., b'e' followed by b'l'), it appends the merged token (b'el') to our new_word and advances the index by two positions, effectively skipping over both original tokens. If the current tokens do not match the pair, it simply appends the current token and advances the index by one.
4. Update Counts: The newly constructed word (now a tuple of potentially merged tokens) is added to a new_word_counts dictionary. The frequency (count) of the original word is transferred to this new, merged version.

For instance, if our most frequent pair is (b'l', b'l') and we process the word (b'h', b'e', b'l', b'l', b'o'), the function will rebuild it as (b'h', b'e', b'll', b'o').

This new word becomes a key in new_word_counts, inheriting the original word's frequency.

### Benchmarking

With a complete naive implementation, the next step is to verify its correctness and establish a performance baseline. To do this, we'll run our BPE training function on two distinct datasets which were provided in the CS336 course repository.

Our testing strategy involves two key scenarios:

1. Correctness on a Small Dataset (corpus.en): The first test uses corpus.en, a small and simple text file. The primary goal here is not speed, but correctness. On a controlled dataset like this, we can more easily inspect the output to ensure the vocab and merges are generated as expected.

2. Performance on a Larger Dataset (tinystories_sample_5M.txt): The second test is a stress test for performance. We will run our tokenizer on a 5MB sample from the TinyStories dataset and make sure that we do not tokenize our special token `<|endoftext|>` accidentally, this means checking that we don't have any tokens like `<`, `>` , `|`.

By running these two tests, we can be confident that our implementation is not only working correctly but also have a clear performance target to improve upon.

```bash
Run 1/1: 1.0985s (vocab=500, merges=243)

--- Results for bpe_naive on corpus ---
Runs: 1
Mean: 1.0985s
Min:  1.0985s
Max:  1.0985s
Run 1/1: 2.5534s (vocab=500, merges=243)

--- Results for bpe_naive on tinystory ---
Runs: 1
Mean: 2.5534s
Min:  2.5534s
Max:  2.5534s
```

On my M4-Max, the two run in roughly 1-2 seconds.

## Optimization

Our current implementation is good, but for it to work on massive, real-world datasets, we need to make it significantly faster. We'll tackle this by focusing on the most time-consuming parts of the process.

The three main bottlenecks are:

1. Pre-tokenization: Reading and processing the entire input file on a single CPU core.
2. Memory Efficiency : We're recreating the entire vocabulary in memory on each step
3. Pair Counting: Repeatedly scanning the entire vocabulary to find the most frequent pair in every single merge step.

### Parallelizing the counts

The first and most straightforward optimization is to tackle the pre-tokenization step. Our naive implementation reads the entire corpus and processes it sequentially in a single thread.

This is inefficient, as modern CPUs have multiple cores that sit idle during this process. We can speed this up by dividing the work among several workers.

However, we can't just split the file at arbitrary byte locations. If we split in the middle of a word or a multi-byte UTF-8 character, we would corrupt our data. The key is to find "safe" places to split.

A good strategy is to use a delimiter, like a newline character or a special token such as 〈, which often marks a natural boundary in a dataset.

Let's start by writing a function that will read in some text and split it into predefined chunk boundaries

```py
def find_chunk_boundaries(
    file: BinaryIO,
    desired_num_chunks: int,
    split_special_token: bytes,
) -> list[int]:
    """
    Chunk the file into parts that can be counted independently.
    May return fewer chunks if the boundaries end up overlapping.
    """
    assert isinstance(split_special_token, bytes), (
        "Must represent special token as a bytestring"
    )

    # Get total file size in bytes
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    chunk_size = file_size // desired_num_chunks

    # Initial guesses for chunk boundary locations, uniformly spaced
    # Chunks start on previous index, don't include last index
    chunk_boundaries = [i * chunk_size for i in range(desired_num_chunks + 1)]
    chunk_boundaries[-1] = file_size

    mini_chunk_size = 4096  # Read ahead by 4k bytes at a time

    for bi in range(1, len(chunk_boundaries) - 1):
        initial_position = chunk_boundaries[bi]
        file.seek(initial_position)  # Start at boundary guess
        while True:
            mini_chunk = file.read(mini_chunk_size)  # Read a mini chunk

            # If EOF, this boundary should be at the end of the file
            if mini_chunk == b"":
                chunk_boundaries[bi] = file_size
                break

            # Find the special token in the mini chunk
            found_at = mini_chunk.find(split_special_token)
            if found_at != -1:
                chunk_boundaries[bi] = initial_position + found_at
                break
            initial_position += mini_chunk_size

    # Make sure all boundaries are unique, but might be fewer than desired_num_chunks
    return sorted(set(chunk_boundaries))
```

This works in a relatively straightforward manner. Let's take the text below as an example.

```text
She knew the legends—the ones the old-timers whispered about the night the bell stops ringing. It was a sign. A warning.

<|endoftext|>

Captain Eva Rostova checked the nav-computer for the tenth time. The readings were stable: atmospheric pressure, oxygen mix, gravity at 1.02 Gs.
```

Let's assume that we want to split this file here into 3 chunks using the `split_special_token` special token. We would split this chunk of text here into three chunk boundaries as seen below.

```py
content = """
She knew the legends—the ones the old-timers whispered about the night the bell stops ringing. It was a sign. A warning.

<|endoftext|>

Captain Eva Rostova checked the nav-computer for the tenth time. The readings were stable: atmospheric pressure, oxygen mix, gravity at 1.02 Gs.
""".strip()

desired_chunks = 3
chunk_size = len(content) // desired_chunks + 1
chunks = [content[i : i + chunk_size] for i in range(0, len(content), chunk_size)]

for i, chunk in enumerate(chunks):
    print(f"----CHUNK {i + 1}----")
    print(chunk)
    print("----CHUNK END----")
    print(" ")
```

This gives the following breakdown of our chunks below

```bash
python3 ./testing.py
----CHUNK 1----
She knew the legends—the ones the old-timers whispered about the night the bell stops ringing.
----CHUNK END----

----CHUNK 2----
 It was a sign. A warning.

<|endoftext|>

Captain Eva Rostova checked the nav-computer for th
----CHUNK END----

----CHUNK 3----
e tenth time. The readings were stable: atmospheric pressure, oxygen mix, gravity at 1.02 Gs.
----CHUNK END----
```

Because our logic looks forward from this initial chunk boundary for the special token delimiter in small steps, we can ensure that we split on a nice and logical "safe" boundary.

In our case,

1. From the first guess (inside "ringing"), it searches forward and finds the <|endoftext|> token. It marks the position of this token as the first safe boundary.
2. From the second guess (inside "nav-computer"), it searches forward. It reaches the end of the text without finding another token. In this case, it falls back to marking the end of the file as the boundary.
3. For the third guess since the `initial_position` is already at the end of the file, it will not find any more special tokens and will mark the end of the file as the boundary.

This results in a final raw list of positions as `[start_of_file, position_of_eot_token, end_of_file, end_of_file]` which when converted to a set yields `[start_of_file, position_of_eot_token, end_of_file]`.

We can then convert these to a list of tuples with the start and end positions of each chunk.

```py
chunks = [
  (input_path, boundaries[i], boundaries[i + 1], special_tokens) for i in range(len(boundaries) - 1)
]
```

For each chunk of text, we'll then apply the same logic that we used to convert our original chunks into our word chunks.

```py
def pretokenize_chunk(args: tuple[str, int, int, list[str]]) -> WordCounts:
    """Process a single chunk of the file."""
    input_path, start, end, special_tokens = args

    with open(input_path, "rb") as f:
        f.seek(start)
        chunk = f.read(end - start).decode("utf-8")

    corpus_split = [chunk]

    if special_tokens:
        pattern = (
            r"(" + "|".join(regex.escape(token) for token in special_tokens) + r")"
        )
        corpus_split = regex.split(pattern, chunk)
        corpus_split = [x for x in corpus_split if x]

    word_count: WordCounts = {}
    for corpus in corpus_split:
        if corpus in special_tokens:
            continue
        words = GPT2_REGEX.findall(corpus)
        for word in words:
            word_bytes = tuple(bytes([b]) for b in word.encode("utf-8"))
            word_count[word_bytes] = word_count.get(word_bytes, 0) + 1

    return word_count
```

We can then merge these independent counts together relatively easy as seen below.

```py
def merge_word_counts(counts_list: list[WordCounts]) -> WordCounts:
    """Merge multiple WordCounts dicts into one."""
    merged: WordCounts = {}
    for counts in counts_list:
        for word, count in counts.items():
            merged[word] = merged.get(word, 0) + count
    return merged
```

On the 5MB TinyStories sample, the results improved from 2.55s with the naive implementation to 2.04s with the parallel version.

```bash
--- Results for bpe_naive on tinystory ---
Mean: 2.5534s

--- Results for bpe_parallel on tinystory ---
Mean: 2.0401s
```

This is a solid improvement, but you might wonder why it isn't a 4x speedup on a 4-worker setup.

The reason is that for a relatively small 5MB file, the overhead of creating processes, splitting the data, and merging the results takes up a noticeable fraction of the total time.

The true power of this parallel approach becomes evident on much larger datasets (e.g., gigabytes of text), where the processing time for each chunk far outweighs the overhead, leading to near-linear speedups with the number of CPU cores.

### Memory Efficiency

Our naive implementation has a significant performance bottleneck hidden in the main training loop. In every single merge step, the apply_merge function creates an entirely new word_counts dictionary. For a large corpus with many unique words, this means rebuilding a massive dictionary from scratch thousands of times. This constant creation and destruction of large objects is computationally expensive and memory-intensive.

This is largely because in this implementation, we rely on the tuple of the word pairs to identify a unique word.

```
new_word_counts[tuple(new_word)] = new_word_counts.get(tuple(new_word), 0) + count
```

If we think about it carefully, what changes is just the breakdown of the word not the word itself. The frequency of a word type (e.g., "hello") never changes during training; only its internal representation does (e.g., from [b'l', b'l'] to [b'll']).

This means that we can reuse the same word_counts dictionary for each merge step, simply updating the counts for the new word types as they are created. This avoids the need to rebuild the dictionary from scratch, which is a significant performance improvement.

To fix this, we'll modify our data structure to use a more efficient representation of the word counts.

1. Words = list[list[bytes]]: A list where each element is a unique word, represented as a list of its current tokens (bytes).
2. WordFreq = list[int]: A parallel list that stores the frequency of the word at the corresponding index in the Words list.

Instead of rebuilding a new dictionary, the new function directly modifies the lists of bytes within the Words structure.

```py
def apply_merge(words: Words, pair: tuple[bytes, bytes]) -> None:
    """Apply a merge to all words in-place, combining the pair into a single token."""
    merged = pair[0] + pair[1]
    for word in words:
        i = 0
        while i < len(word) - 1:
            if word[i] == pair[0] and word[i + 1] == pair[1]:
                word[i] = merged
                del word[i + 1]
            else:
                i += 1
```

We'll also update the `pretokenize` function to use this new data structure

```py
def pretokenize(input_path: str, special_tokens: list[str]) -> tuple[Words, WordFreq]:
    """Pre-tokenize input into words/chunks, returning words and their frequencies."""
    with open(input_path) as f:
        corpus = f.read()

    corpus_split = [corpus]

    if special_tokens:
        pattern = r"(" + "|".join(regex.escape(token) for token in special_tokens) + r")"
        corpus_split = regex.split(pattern, corpus)
        corpus_split = [x for x in corpus_split if x]

    gpt_2_regex = regex.compile(
        r"""'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
    )

    word_to_id: dict[tuple[bytes, ...], int] = {}
    words: Words = []
    word_freq: WordFreq = []

    # First we split by special tokens
    for corpus_chunk in corpus_split:
        if corpus_chunk in special_tokens:
            continue
        # Then we split our individual chunks in our corpus to get individual words/punctuation etc
        matched_words = gpt_2_regex.findall(corpus_chunk)
        for word in matched_words:

            # Then we encode each character in the word into its utf-8 representation
            word_bytes = tuple(bytes([b]) for b in word.encode("utf-8"))

            # If it exists we'll update the word_freq count
            if word_bytes in word_to_id:
                word_id = word_to_id[word_bytes]
                word_freq[word_id] += 1

            # Else we create a new word_to_id mapping and then add a new word_freq count
            else:
                word_id = len(words)
                word_to_id[word_bytes] = word_id
                words.append(list(word_bytes))
                word_freq.append(1)

    return words, word_freq
```

This yields a significant speedup as seen below

```bash
Run 1/1: 0.6376s (vocab=500, merges=243)

--- Results for bpe_in_place on corpus ---
Runs: 1
Mean: 0.6376s
Min:  0.6376s
Max:  0.6376s
Run 1/1: 1.7873s (vocab=500, merges=243)

--- Results for bpe_in_place on tinystory ---
Runs: 1
Mean: 1.7873s
Min:  1.7873s
Max:  1.7873s
```

### Combining the two

Now that we have two powerful optimizations, the final step is to merge them. We want to combine the speed of parallel pre-tokenization with the memory efficiency of in-place updates.

The core logic of the pretokenize_chunk function, which runs on each parallel worker, remains the same. Each worker will still process its assigned text chunk and produce a WordCounts dictionary (dict[tuple[bytes, ...], int]). The key change is in how we aggregate the results from all workers.

Instead of just merging dictionaries, we need a final step that converts the list of `WordCounts` dictionaries into our efficient `Words` and `WordFreq` list-based structure.

We introduce a merge_word_counts function to handle this transformation.

```py
def merge_word_counts(counts_list: list[WordCounts]) -> tuple[Words, WordFreq]:
    """Merge multiple WordCounts dicts into the final Words/WordFreq structure."""
    word_to_id: dict[tuple[bytes, ...], int] = {}
    words: Words = []
    word_freq: WordFreq = []

    # Iterate through the list of dictionaries from each worker
    for counts in counts_list:
        for word_bytes, count in counts.items():
            # If we've seen this word type before (from another chunk)
            if word_bytes in word_to_id:
                word_id = word_to_id[word_bytes]
                word_freq[word_id] += count # Just update its frequency
            # If this is a new word type
            else:
                word_id = len(words)
                word_to_id[word_bytes] = word_id
                words.append(list(word_bytes)) # Add its mutable list representation
                word_freq.append(count) # Add its frequency

    return words, word_freq
```

This function intelligently combines the parallel results. When it encounters a word, it checks if it has already been seen (perhaps from a different chunk). If so, it simply adds to its existing frequency count. If not, it adds the new word to our `Words` list and its count to the `WordFreq` list.

This approach gives us the best of both worlds:

1.  The initial, heavy lifting of processing the raw text is distributed across multiple CPU cores.
2.  The final, combined data structure is perfectly formatted for our fast, in-place `apply_merge` function.

By combining these two strategies, we achieve our best performance yet. The runtime on the TinyStories sample drops to just **1.28s**.

```bash
Run 1/1: 0.6381s (vocab=500, merges=243)

--- Results for bpe_in_place_parallel on corpus ---
Runs: 1
Mean: 0.6381s
Min:  0.6381s
Max:  0.6381s
Run 1/1: 1.2856s (vocab=500, merges=243)

--- Results for bpe_in_place_parallel on tinystory ---
Runs: 1
Mean: 1.2856s
Min:  1.2856s
Max:  1.2856s
```

This represents a 2x speedup compared to our original naive implementation. Now let's see how we can speed this up even further by creating an inverted index for the word frequency counts.

### Inverted Index

Our previous optimization successfully addressed the memory inefficiency of rebuilding the word_counts dictionary in every step. However, a significant computational bottleneck remains: finding the most frequent pair.

In each of the thousands of merge steps, our find_most_frequent_pair function has to iterate through every single token of every single word in our vocabulary to recalculate the pair counts from scratch. **This is incredibly redundant because A single merge only affects the pairs immediately adjacent to the merge location; all other pair counts in the vocabulary remain unchanged.**.

To eliminate this repeated work, we can pre-calculate the pair counts once and then intelligently update them after each merge. This is where an inverted index comes in. An inverted index is a data structure that maps an item to all the locations where it can be found. In our case, it will map each token pair to the set of word IDs that contain it.

More intuitively, when we merge a pair, say (A, B) into AB, the counts of several other pairs are affected:

1. The count for (A, B) itself becomes zero and it is removed.
2. If a word has the sequence X, A, B, Y, the count for (X, A) and (B, Y) decreases.
3. New pairs are formed: (X, AB) and (AB, Y), and their counts must be increased.

Let's see how we can implement this. We'll introduce two new data structures:

1. `PairCounts`: A dictionary that maps each pair of bytes to its total frequency across the entire corpus.
2. `PairToWords`: Our inverted index. A dictionary that maps each pair to a set of word_ids where the pair occurs.

```py
# A dictionary mapping a pair of bytes to its total frequency
PairCounts = dict[tuple[bytes, bytes], int]

# The inverted index: maps a pair to the set of word IDs that contain it
PairToWords = dict[tuple[bytes, bytes], set[int]]
```

With these structures, finding the most frequent pair becomes a simple, fast lookup in the pair_counts dictionary instead of a full scan.

```py
def find_most_frequent_pair(
    pair_counts: PairCounts,
) -> tuple[bytes, bytes] | None:
    """Find the most frequent pair - now an efficient lookup."""
    if not pair_counts:
        return None
    # No need to scan the whole vocabulary, just find the max in our counts dict
    return max(pair_counts, key=lambda pair: (pair_counts[pair], pair[0], pair[1]))
```

We'll also need to update our initial `merge_word_counts` function which was originally used to merge the word counts so that we're able to generate the pair counts and inverted index when we generate our initial Words and WordFreq counts.

```py
def merge_word_counts(
    counts_list: list[WordCounts],
) -> tuple[Words, WordFreq, PairCounts, PairToWords]:
    """Merge multiple WordCounts dicts into one, building pair counts and inverted index."""

    word_to_id: dict[tuple[bytes, ...], int] = {}
    words: Words = []
    word_freq: WordFreq = []

    # First pass: merge word counts (same as before)
    for counts in counts_list:
        for word_bytes, count in counts.items():
            if word_bytes in word_to_id:
                word_id = word_to_id[word_bytes]
                word_freq[word_id] += count
            else:
                word_id = len(words)
                word_to_id[word_bytes] = word_id
                words.append(list(word_bytes))
                word_freq.append(count)

    # NEW: Build initial pair_counts and pair_to_words
    pair_counts: PairCounts = {}
    pair_to_words: PairToWords = {}

    for word_id, word in enumerate(words):
        freq = word_freq[word_id]
        for i in range(len(word) - 1):
            pair = (word[i], word[i + 1])
            # Update count
            pair_counts[pair] = pair_counts.get(pair, 0) + freq
            # Update inverted index
            if pair not in pair_to_words:
                pair_to_words[pair] = set()
            pair_to_words[pair].add(word_id)

    return words, word_freq, pair_counts, pair_to_words
```

Before we see how we can implement this with our `apply_merge` step, let's take a look at an example. Let's imagine our pretokenize step has produced the following vocabulary after processing a large text:

| Word ID | Word Representation | Frequency |
| ------- | ------------------- | --------- |
| 0       | [l, e, t, t, e, r]  | 5         |
| 1       | [b, e, t, t, e, r]  | 3         |
| 2       | [f, o, l, l, o, w]  | 10        |

Our inverted index would give us the following information

| Pair   | Word ID | Frequency | Count |
| ------ | ------- | --------- | ----- |
| (t, t) | 0, 1    | 5, 3      | 8     |
| (l, l) | 2       | 10        | 10    |
| (o, l) | 2       | 10        | 10    |
| (l, o) | 2       | 10        | 10    |

Both `(l, l)` and `(o, l)` have a count of 10, but `(l, l)` wins the tie-break (lexicographical order). Using `pair_to_words[(l, l)]`, we instantly find only word 2 needs updating—skipping "letter" and "better" entirely. After the merge:

| Pair    | Word ID | Frequency | Count   |
| ------- | ------- | --------- | ------- |
| (t, t)  | 0, 1    | 5, 3      | 8       |
| (l, l)  | -       | -         | DELETED |
| (o, l)  | -       | -         | DELETED |
| (l, o)  | -       | -         | DELETED |
| (o, ll) | 2       | 10        | 10      |
| (ll, o) | 2       | 10        | 10      |

Here's the full implementation:

```py
def apply_merge(
    words: Words,
    word_freq: WordFreq,
    pair: tuple[bytes, bytes],
    pair_counts: PairCounts,
    pair_to_words: PairToWords,
) -> None:
    """Apply merge and incrementally update pair_counts and the inverted index."""
    merged = pair[0] + pair[1]

    # 1. Use the inverted index to find only the words that need updating
    affected_word_ids = pair_to_words.pop(pair, set())
    del pair_counts[pair]

    for word_id in affected_word_ids:
        word = words[word_id]
        freq = word_freq[word_id]
        i = 0
        while i < len(word) - 1:
            # Find the location of the pair to be merged
            if word[i] == pair[0] and word[i + 1] == pair[1]:
                # 2. Decrement counts for pairs that will be broken by the merge
                # Left-adjacent pair: (word[i-1], pair[0])
                if i > 0:
                    left_pair = (word[i - 1], pair[0])
                    pair_counts[left_pair] -= freq
                    pair_to_words[left_pair].discard(word_id)
                    # Clean up if counts or sets become empty
                    if pair_counts[left_pair] == 0:
                        del pair_counts[left_pair]
                        del pair_to_words[left_pair]

                # Right-adjacent pair: (pair[1], word[i+2])
                if i + 2 < len(word):
                    right_pair = (pair[1], word[i + 2])
                    pair_counts[right_pair] -= freq
                    pair_to_words[right_pair].discard(word_id)
                    if pair_counts[right_pair] == 0:
                        del pair_counts[right_pair]
                        del pair_to_words[right_pair]

                # 3. Apply the actual merge in-place
                word[i] = merged
                del word[i + 1]

                # 4. Increment counts for new pairs created by the merge
                # New left pair: (word[i-1], merged)
                if i > 0:
                    new_left_pair = (word[i - 1], merged)
                    pair_counts[new_left_pair] = pair_counts.get(new_left_pair, 0) + freq
                    if new_left_pair not in pair_to_words:
                        pair_to_words[new_left_pair] = set()
                    pair_to_words[new_left_pair].add(word_id)

                # New right pair: (merged, word[i+1])
                if i + 1 < len(word):
                    new_right_pair = (merged, word[i + 1])
                    pair_counts[new_right_pair] = pair_counts.get(new_right_pair, 0) + freq
                    if new_right_pair not in pair_to_words:
                        pair_to_words[new_right_pair] = set()
                    pair_to_words[new_right_pair].add(word_id)
                # Continue scanning from the current position
            else:
                i += 1
```

When we run this new implementation, we get the following result which represents a roughly 10x speedup from the original naive implementation.

```bash
Run 1/1: 0.1128s (vocab=500, merges=243)

--- Results for bpe_inverted_index on corpus ---
Runs: 1
Mean: 0.1128s
Min:  0.1128s
Max:  0.1128s
Run 1/1: 0.2827s (vocab=500, merges=243)

--- Results for bpe_inverted_index on tinystory ---
Runs: 1
Mean: 0.2827s
Min:  0.2827s
Max:  0.2827s
```

This implementation is much faster and more efficient than the original naive implementation.

## Conclusion

Of course! Here is a concluding section that incorporates your summary and sets the stage for the next article in the series.

---

## Conclusion

In this article, we journeyed from the foundational concepts of Unicode to a fully optimized BPE tokenizer built from scratch. We started with a simple, naive implementation to grasp the core logic, then systematically identified and eliminated key performance bottlenecks. This process of gradual optimization highlights a crucial lesson: the right algorithm and data structure can transform a tool from a theoretical exercise into a practical, high-performance utility ready for real-world data.

We walked through what BPE is, how it works, and how we can implement it in Python. By parallelizing, using in-place updates, and finally implementing an intelligent inverted index, we achieved a final speedup of nearly 10x over our original code.

Here is a summary of the performance improvements we achieved at each stage, benchmarked on the 5MB TinyStories sample:

| Implementation Stage          | Time (s)    | Speedup   | Key Optimization                                     |
| :---------------------------- | :---------- | :-------- | :--------------------------------------------------- |
| **Naive**                     | 2.5534s     | 1.0x      | Baseline implementation                              |
| **Parallel Pre-tokenization** | 2.0401s     | ~1.25x    | Utilized multiple CPU cores for initial counting     |
| **In-place Memory Updates**   | 1.7873s     | ~1.43x    | Avoided recreating the word dictionary in each step  |
| **Parallel + In-place**       | 1.2856s     | ~2.0x     | Combined the benefits of the first two optimizations |
| **Inverted Index**            | **0.2827s** | **~9.0x** | Enabled efficient lookups and surgical updates       |

With our efficient tokenizer now complete, we have the first essential component of a Large Language Model. In the next article in the "LLMs From Scratch" series, we'll take this tokenizer and use it to build the core components of a transformer model. Stay tuned
