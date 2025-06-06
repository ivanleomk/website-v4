---
title: "Writing scripts that scale"
date: 2024-04-19
description: A few actionable tips to writing better machine learning scripts
categories:
  - LLMs
authors:
  - ivanleomk
---

Writing good scripts for machine learning is an art. I struggled with writing them for a long time because of how different it was to my experience working with full-stack frameworks such as React or FastAPI.

There were four main issues that I struggled with

1. My job has a high probability of failing without any reason
2. My data might not fit into memory for no reason
3. Running a single job takes days or more
4. Optimizing hyper-parameters is genuinely difficult

<!-- more -->

This means that when we write these scripts, there are a different set of considerations that need to be kept in mind. I find it useful to keep these few things in mind when writing my training scripts.

1. Write your pipeline first
2. Build in regular checkpoints
3. Use generators
4. Implement Logging

## Write your pipeline first

Before starting on the big training job, it's important to make sure that your entire pipeline is working the way you want it to be. A good way to detect errors in your pipeline is to first work with a smaller model and dataset before going for a large YOLO run.

I typically work with a training dataset of 1000-2000 values when I'm writing these scripts. My goal is to ideally have something that can be ran in < 60s at most so that I can check for any quick implementation issues. This has caught many different bugs in my codebase because we can iterate and experiment quickly. ( **Note** : Depending on your pipeline, this might be even smaller, for some projects I've done just 30-50 values for the initial stage )

Here's an example below using the hugging face `datasets` library where I take a small slice of 20 items that have been filtered using the `.filter` method.

```python
from datasets import load_dataset

selected_repos = set(["facebook/react"])
total_fetched_rows = 20
dataset = (
    load_dataset("bigcode/the-stack-github-issues", split="train", streaming=True)
    .filter(lambda row: row["repo"] in selected_repos)
    .take(total_fetched_rows)
)
```

The goal is really to make sure everything works end to end.

## Using Checkpoints

It's not uncommon for models to fail midway through a long training run either due to a timeout issue or insufficient memory capacity inside the CUDA GPU that you're using to train

![Solving the “RuntimeError: CUDA Out of memory” error | by Nitin Kishore |  Medium](https://miro.medium.com/v2/resize:fit:1400/1*enMsxkgJ1eb9XvtWju5V8Q.png)

Therefore, you'll need to implement some form of checkpoints so that if training fails, you can just resume it from an earlier version. This has been a lifesaver in many circumstances and many standard libraries should support it out of the box.

## Use Generators/Dataloaders

Generators allow you to get significant performance improvements because we can load in data on-demand. This is big because many of our datasets will not be able to fit into the memory of a single CPU/GPU.

Intuitively, we can use generators to save time.

```python
def get_all_keys(data):
    return [row["key"] for row in data]


def get_all_keys_with_generator(data):
    for row in data:
        yield row["key"]

```

If we look at the example above, we can immediately start consuming the `row['key']` data in the first row with the generator syntax. In the first example, we needed to wait for the every single row in memory to be processed and the key added to the new list that the list comprehension would create.

What's really cool about generators is that we can chain them together. This ensures that we process our data quickly but also that we do so in the specific order that we want. A common problem in RAG is to read in documents, so let's see how we might be able to write a few generators to do the job.

```python
from pathlib import Path


def read_files(path: Path, file_suffix: str):
    for file in path.iterdir():
        if file.suffix != file_suffix:
            continue
        yield {"file": file.name, "content": file.read_text()}


def chunk_text(documents):
    for document in documents:
        for chunk in document["content"].split("\n"):
            yield {"chunk": chunk, "file": document["file"]}


def batch_items(items, batch_size=20):
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == batch_size:
            yield batch
            batch = []

    if batch:
        yield batch


files = read_files(Path.cwd(), "md")
chunks = chunk_text(files)
batches = batch_items(chunks)
```

Imagine if we had an incredibly large number of documents, we'd be waiting for every file to be read in and every chunk that we'd ever process to be loaded into memory before we even started batching items. With generators, we're able to both reason about the order that our data is consumed AND get the huge cost savings in execution time.

## Implement Logging

Logging doesn't have to be complex. In fact, for most purposes, a simple `.csv` or a `.json` file will work well for most experiments since you'll be able to throw it into GPT-4 to do some simple data exploration once you've obtained the results.

There are two main things that I think are important

1. use an append-only file for your logs so you don't override any previous results in your logs
2. make sure to list the raw events so that you can do further data processing. Try your best to avoid any magic numbers

```python
# Save the results to a markdown file, this is useful for viewing the results in a human readable format
with open("./output.md", "a+") as f:
    for row in data:
        f.write(
            json.dumps(
                {
                    "batch_size": 3,
                    # List out parameters of job here
                }
            )
            + "\n"
        )

```

We can see an example here of magic numbers in a json format. It's immediately obvious that I have no idea what `12348`, `8` or `24` represent and the longer you spend away from your code, the less likely you will anyway.

```
{
    12348: {"accuracy": 24, "recall": 123},
    8: {"accuracy": 24, "recall": 123},
    24: {"accuracy": 24, "recall": 123},
}
```

Instead log data with all the parameters named so that it's easier to work through it later like aforementioned. Examples of this can be seen below where we not only encode in all of the parameters explicitly, we also utilise a `.jsonl` format where each entry is separated by a `\n` character.

```
{{"accuracy": 24, "recall": 123, "sample_size": 12348}
{"accuracy": 24, "recall": 123, "sample_size": 8}
{"accuracy": 24, "recall": 123, "sample_size": 24}
```

This json can then be read in down the line with a function which is similar to what we see below.

```py
def read_chunks_from_jsonl(path: str):
    chunks = []
    with open(path, "r") as file:
        for line in file:
            chunk = CommentChunk(**json.loads(line))
            chunks.append(chunk)
    return chunks
```

If you're looking to do more advanced logging, weights and biases is a useful addition to your toolbox that you can consider.

## Use Pydantic

This is a small bonus tip but try to use pydantic where possible. It's a great tool in your scripts to buiild in simple validation checks.

## Conclusion

I hope you found this small article useful. I'm new to the machine learning space and changing the way I write python scripts has helped me get much better results with my scripts. With these small changes, I'm confident that you'll see huge improvements in your scripts and their results.
