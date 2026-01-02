---
title: Reversing Chinese Poetry
date: 2026-01-02
description: Creating our first RL Pipeline with Verifiers
categories:
  - SFT
authors:
  - ivanleomk
series:
  - Reinforcement Learning From Scratch
---

> The code for this can be found [here](https://github.com/ivanleomk/spinning-up-rl) in the `reversing-chinese-poetry` directory.

In the [previous article](/blog/spinning-up-rl), we built a simple number guesser to understand the core RL loop. In this article, we'll create a simple but challenging task - taking a line of Chinese poetry and reversing it character by character.

There's a common misconception that reinforcement learning can teach a model anything from scratch. Just define a reward function, let the model explore, and it'll figure things out. But that's not how it works in practice. The reality is that pretraining and SFT determine the upper bound of what RL can achieve. RL can only refine and optimize capabilities that already exist—it can't conjure them from nothing.

In this article, we'll prove this empirically. We'll take a simple but surprisingly hard task—reversing Chinese poetry character by character—and show exactly where RL helps, where it hurts, and why.

We'll do so in 3 steps

1. Create a verifiers environment using the [Iess/chinese_modern_poetry](https://huggingface.co/datasets/Iess/chinese_modern_poetry) dataset and upload it to the [Prime Intellect](https://www.primeintellect.ai/) Environments hub—we'll use this same environment for both evaluation and RL training
2. Run SFT at different data scales (100, 500, 2500, 5000, 10000 examples) using Prime-RL and evaluate each checkpoint
3. Run RL ablations on the SFT-500 checkpoint to see if we can squeeze out any gains

While auto-regressive LLMs are trained to predict the next token, reversing a string requires holding the entire input in working memory and outputting it backwards. If a model can't learn this through SFT, RL won't save it.

## Defining an Environment

First, let's look at our dataset [Iess/chinese_modern_poetry](https://huggingface.co/datasets/Iess/chinese_modern_poetry) which consists of a single prompt and a generated LLM response in Mandarin. This is a relatively small dataset with around 247k responses. Each row has a response that looks like `标题:六年的几个词语片段：1999：孤岛...` and we'd like our model to reverse the string as seen below.

<ChinesePoetryReverser />

Since we'll be using the `verifiers` library and `Prime-RL`, we need to structure our data carefully.

### Uploading to HF

We'll create a dataset with the following columns:

- `question`: The original string to be reversed
- `answer`: The correctly reversed string
- `prompt`: The full conversation history (system message + user message)
- `completion`: The assistant's response wrapped in XML tags

Why both formats? The `question`/`answer` fields are used by reward model verifiers during RL training, while the `prompt`/`completion` fields are required for supervised fine-tuning.

In SFT, the model learns to predict the next token given a prompt, so having an explicit completion field makes the training setup cleaner. By including both, anyone who wants to fork this dataset or experiment with different prompts can do so easily.

We'll also want to create 3 splits - train (10k), rl (2.5k) and test (2.5k) which will be used for SFT, RL and evaluation respectively.

In order to make sure that this is a challenging task, we'll ensure that each sequence is between 250 and 300 characters, with the exact length randomized. Additionally we'll make sure that there's no repetition across splits by using a set to collect unique responses.

Let's walk through the code piece by piece. First, we'll install the dependencies:

```bash
uv pip install tenacity datasets
```

We start by defining our split sizes and loading the dataset in streaming mode:

```python
import random

from datasets import load_dataset, Dataset, DatasetDict
from tenacity import retry, stop_after_attempt, wait_exponential

TRAIN = 10000
TRAIN_SIZES = [100, 500, 2500, 5000, 10000]
EVAL = 2500
RL = 2500
TOTAL = TRAIN + EVAL + RL

dataset = load_dataset("Iess/chinese_modern_poetry", streaming=True)
```

Next, we collect unique responses using a set. Each sequence is normalized to a random length between 250 and 300 characters—if the original text is shorter, we repeat it to reach the target length:

```python
responses = set()
for row in dataset["train"]:
    response = row["response"]
    if response:
        cleaned = response.replace("标题:", "")
        target_len = random.randint(250, 300)
        if len(cleaned) < target_len:
            repeats = (target_len // len(cleaned)) + 1
            cleaned = (cleaned * repeats)[:target_len]
        else:
            cleaned = cleaned[:target_len]
        responses.add(cleaned)
    if len(responses) >= TOTAL:
        break

print(f"Total unique responses: {len(responses)}")
```

Now we partition the data into our three splits and define helper functions to build the conversation format:

```python
responses_list = list(responses)

train_full = responses_list[:TRAIN]
test_data = responses_list[TRAIN : TRAIN + EVAL]
rl_data = responses_list[TRAIN + EVAL : TRAIN + EVAL + RL]

SYSTEM_MESSAGE = (
    "Reverse the text character-by-character. Put your answer in <reversed_text> tags."
)


def build_prompt(question: str) -> list[dict]:
    return [
        {"content": SYSTEM_MESSAGE, "role": "system"},
        {"content": question, "role": "user"},
    ]


def build_completion(answer: str) -> list[dict]:
    return [
        {
            "content": f"<reversed_text>\n{answer}\n</reversed_text>",
            "role": "assistant",
        }
    ]
```

Finally, we create datasets at different training sizes and push them to the Hub:

```python
for size in TRAIN_SIZES:
    train_subset = train_full[:size]
    train_answers = [t[::-1] for t in train_subset]
    test_answers = [t[::-1] for t in test_data]
    rl_answers = [t[::-1] for t in rl_data]

    splits = {
        "train": Dataset.from_dict(
            {
                "question": train_subset,
                "answer": train_answers,
                "prompt": [build_prompt(q) for q in train_subset],
                "completion": [build_completion(a) for a in train_answers],
            }
        ),
        "test": Dataset.from_dict(
            {
                "question": test_data,
                "answer": test_answers,
                "prompt": [build_prompt(q) for q in test_data],
                "completion": [build_completion(a) for a in test_answers],
            }
        ),
        "rl": Dataset.from_dict(
            {
                "question": rl_data,
                "answer": rl_answers,
                "prompt": [build_prompt(q) for q in rl_data],
                "completion": [build_completion(a) for a in rl_answers],
            }
        ),
    }
    dataset_dict = DatasetDict(splits)
    print(f"Pushing dataset with train size {size}")
    print(dataset_dict)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def push_with_retry():
        dataset_dict.push_to_hub(f"ivanleomk/reverse-chinese-poetry-{size}")

    push_with_retry()
```

Here's the complete script:

```python
import random

from datasets import load_dataset, Dataset, DatasetDict
from tenacity import retry, stop_after_attempt, wait_exponential

TRAIN = 10000
TRAIN_SIZES = [100, 500, 2500, 5000, 10000]
EVAL = 2500
RL = 2500
TOTAL = TRAIN + EVAL + RL

dataset = load_dataset("Iess/chinese_modern_poetry", streaming=True)

responses = set()
for row in dataset["train"]:
    response = row["response"]
    if response:
        cleaned = response.replace("标题:", "")
        target_len = random.randint(250, 300)
        if len(cleaned) < target_len:
            repeats = (target_len // len(cleaned)) + 1
            cleaned = (cleaned * repeats)[:target_len]
        else:
            cleaned = cleaned[:target_len]
        responses.add(cleaned)
    if len(responses) >= TOTAL:
        break

print(f"Total unique responses: {len(responses)}")

responses_list = list(responses)

train_full = responses_list[:TRAIN]
test_data = responses_list[TRAIN : TRAIN + EVAL]
rl_data = responses_list[TRAIN + EVAL : TRAIN + EVAL + RL]

SYSTEM_MESSAGE = (
    "Reverse the text character-by-character. Put your answer in <reversed_text> tags."
)


def build_prompt(question: str) -> list[dict]:
    return [
        {"content": SYSTEM_MESSAGE, "role": "system"},
        {"content": question, "role": "user"},
    ]


def build_completion(answer: str) -> list[dict]:
    return [
        {
            "content": f"<reversed_text>\n{answer}\n</reversed_text>",
            "role": "assistant",
        }
    ]


for size in TRAIN_SIZES:
    train_subset = train_full[:size]
    train_answers = [t[::-1] for t in train_subset]
    test_answers = [t[::-1] for t in test_data]
    rl_answers = [t[::-1] for t in rl_data]

    splits = {
        "train": Dataset.from_dict(
            {
                "question": train_subset,
                "answer": train_answers,
                "prompt": [build_prompt(q) for q in train_subset],
                "completion": [build_completion(a) for a in train_answers],
            }
        ),
        "test": Dataset.from_dict(
            {
                "question": test_data,
                "answer": test_answers,
                "prompt": [build_prompt(q) for q in test_data],
                "completion": [build_completion(a) for a in test_answers],
            }
        ),
        "rl": Dataset.from_dict(
            {
                "question": rl_data,
                "answer": rl_answers,
                "prompt": [build_prompt(q) for q in rl_data],
                "completion": [build_completion(a) for a in rl_answers],
            }
        ),
    }
    dataset_dict = DatasetDict(splits)
    print(f"Pushing dataset with train size {size}")
    print(dataset_dict)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def push_with_retry():
        dataset_dict.push_to_hub(f"ivanleomk/reverse-chinese-poetry-{size}")

    push_with_retry()
```

The created datasets can be found here:

- [100 train examples](https://huggingface.co/datasets/ivanleomk/reverse-chinese-poetry-100)
- [500 train examples](https://huggingface.co/datasets/ivanleomk/reverse-chinese-poetry-500)
- [2500 train examples](https://huggingface.co/datasets/ivanleomk/reverse-chinese-poetry-2500)
- [5000 train examples](https://huggingface.co/datasets/ivanleomk/reverse-chinese-poetry-5000)
- [10000 train examples](https://huggingface.co/datasets/ivanleomk/reverse-chinese-poetry-10000)

Now that we've created our initial dataset, let's create our first verifiers environment.

### Using Verifiers

If you're unfamiliar with [Verifiers](https://docs.primeintellect.ai/verifiers/source/overview), it's an open source library created by [Will Brown](https://x.com/willccbb) to define custom environments for reinforcement learning. It's particularly useful because we can define our training environment here for both evaluation and training during RL with many of the core primitives that they expose such as

1. Rubrics: A set of reward functions to evaluate the LLM's performance which we can assign arbitrary weights to
2. Parsers: These are simple components to parse out LLM's output from demarcated XML tags
3. Dataloader : We can use the Hugging Face Dataset library to load and preprocess the data before providing it as

These are used together to form a single Environment which can be used to train and evaluate LLMs. You can find more documentation [here](https://docs.primeintellect.ai/verifiers/source/overview).

We'll be using the [reverse-text environment](https://github.com/PrimeIntellect-ai/verifiers/blob/main/environments/reverse_text/reverse_text.py) provided in the quickstart repository as a reference. Let's start by creating a verifiers environment.

```bash
uv pip install verifiers
uv run vf-init reverse-chinese
```

This will create a quickstart folder which has a simple set of files that we can start with. Now let's start creating our environment. In our case, this can be found inside the `reverse_chinese.py` file. What we want is to create an environment where the model is provided with a string to reverse and has to output the reversed string in a `<reversed_text>` xml tag

```py
import verifiers as vf
from datasets import load_dataset

TRAIN_SIZES = [100, 500, 2500, 5000, 10000]


def load_environment(
    train_size: int = 100,
    system_prompt: str
    | None = "Reverse the text character-by-character. Put your answer in <reversed_text> tags.",
    **kwargs,
) -> vf.Environment:
    """
    Loads a custom environment.
    """

    if train_size not in TRAIN_SIZES:
        raise ValueError(f"Invalid train size: {train_size}. Choose from {TRAIN_SIZES}")

    train_dataset = load_dataset(
        f"ivanleomk/reverse-chinese-poetry-{train_size}", split="rl"
    )
    eval_dataset = load_dataset(
        f"ivanleomk/reverse-chinese-poetry-{train_size}", split="test"
    )
    parser = vf.XMLParser(["reversed_text"], answer_field="reversed_text")

    def lcs_reward_func(completion, answer, **kwargs) -> float:
        """
        LCS ratio of the reversed prompt and the parsed completion.
        """

        def lcs_ratio(x: str, y: str) -> float:
            """
            Return the longest common subsequence ratio of x and y.
            """
            from difflib import SequenceMatcher

            return SequenceMatcher(None, x, y).ratio()

        response = parser.parse_answer(completion) or ""
        return lcs_ratio(response, answer)

    rubric = vf.Rubric(
        funcs=[
            lcs_reward_func,
        ],
        weights=[1.0],
    )

    vf_env = vf.SingleTurnEnv(
        dataset=train_dataset,
        eval_dataset=eval_dataset,
        system_prompt=system_prompt,
        parser=parser,
        rubric=rubric,
    )
    return vf_env

```

We'll then install this environment as a local module by running the following command

```bash
uv run vf-install reverse-chinese
```

We can then run this locally using `gpt-4o-mini`

```bash
uv run vf-eval reverse-chinese -s -r 1 -n 10
```

This in turn gives us the following output

```text
--- Evaluation ---
Environment: reverse-chinese
Model: gpt-4.1-mini
Provider: https://api.openai.com/v1/
Examples: 10
Rollouts per example: 1

....

**Reward:** 0.928

--- All ---
Rewards:
reward: avg - 0.928, std - 0.036
r1: [0.858, 0.927, 0.919, 0.925, 0.874, 0.924, 0.943, 0.966, 0.966, 0.975]
lcs_reward_func: avg - 0.928, std - 0.036
r1: [0.858, 0.927, 0.919, 0.925, 0.874, 0.924, 0.943, 0.966, 0.966, 0.975]

2025-12-31 22:30:55 - verifiers.utils.eval_utils - INFO - Results saved to environments/reverse_chinese/outputs/evals/reverse-chinese--gpt-4o-mini/08e59810
```

Notice here how we see that there's a `reward` that's being computed here. If you look above, we compute the LCS ratio of the reversed prompt and the parsed completion. This is a verifiable and objective way to measure whether or not the model is reversing the prompt correctly.

<RewardsDiagram />

While we've chosen here to use LCS as a reward function - which provides partial and shaped rewards, we could have also chosen to use a binary reward such as whether the reversed prompt is correct or not.

Now that we understand what's happening, let's now upload this to the environments hub which you can do using the Prime CLI tool

```bash
uv tool install prime
prime login
cd ./environments/reverse-chinese
prime env push
```

Once you've had your environment succesfully pushed, let's now run it using Prime's inference tool which allows us to run a benchmark using one of the open models they support - `meta-llama/llama-3.1-70b-instruct`

```bash
prime env eval reverse-chinese -m meta-llama/llama-3.1-70b-instruct -n 10 -r 1
```

This is a surprisingly simple task but `llama-3.1-70b` doesn't do very well here - on a set of 10 different inputs, it scores an average reward of [0.528](https://app.primeintellect.ai/dashboard/evaluations/cjg5zb28mv4bllx3o9ixqqkz) indicating that it gets the reversed sequence wrong about more than half of the time.

Let's look at one of the actual outputs to see how the LCS is computed:

<LCSVisualization original="精英在上，人民在下&#10;&#10;这个时代多么开放&#10;连房产商都这么有思想&#10;“捐献1元”的创意&#10;真不是人能想出来的&#10;小文人永乖戾&#10;倡导同仁快“失语”&#10;而在这时候&#10;在四川的灾区&#10;几个受灾的农民&#10;正悄然离开安置点&#10;走在乱石当道的&#10;返乡之路上&#10;为的是在一片&#10;倒塌的房屋里&#10;拣回他们的腊肉" actual="肉腊他们的回拣为的在 houses倒塌的片一在上路之乡返上道当石乱的走在民农的灾受几个后区灾川在四在时候这时候在 语失快仁同导倡戾乖永文小人真不是出来想能人真的的创意献捐1的 subscribe连商产房都么开放多么时代这个" />

There's a huge room for improvement on this simple benchmark. Looking at the actual output, we can see several failure modes - The model drops punctuation and newlines entirely, inserts random spaces, occasionally hallucinates English words like "houses" and "subscribe" instead of preserving the original chinese characters and even is inconsistent in reversing the order of characters.

## SFT

Supervised Fine-Tuning (SFT) is conceptually simple: you show the model examples of the behavior you want, and it learns to imitate them.

Each training example is a prompt-completion pair—the model sees the prompt, predicts the completion token by token, and updates its weights to minimize the difference between its prediction and the ground truth.

This is why we structured our dataset with `prompt` and `completion` fields earlier: SFT literally trains the model to produce that exact completion given that exact prompt. For our reversal task, this means showing the model Chinese text and its reversed version, hoping it learns the underlying transformation.

<SFTPipelineDiagram />

The key question we want to answer: **how much data does a model need to learn string reversal through imitation alone?**. We'll train on our different dataset sizes (100, 500, 2500, 5000, 10000 examples) and see where performance plateaus.

To do so, we'll need to train a few different models. The easiest way to do so is to rent a cloud instance with a GPU, I used [Prime Intellect](https://primeintellect.ai/) to rent a couple of A6000s from Datacrunch and Hyperstack to do this over the holiday and paid roughly $0.50/hr for each GPU.

Luckily for us, [Prime-RL](https://github.com/PrimeIntellect-ai/prime-rl/) is a great tool for this and provides an easy way for us to

### Setting Up The GPU

The first thing that you'll need to do is to setup your GPU and for this I wrote a simple script below that would help me to install Prime-RL, UV, Wandb and other related packages that I would need for my SFT training and evaluation. You'll need the following env variables for it to work

```bash
WANDB_API_KEY=
WANDB_ENTITY=
HF_TOKEN=
```

You can get the `HF_TOKEN` by generating one from [Hugging Face](https://huggingface.co/settings/tokens) and the `WANDB_API_KEY` from [Weights & Biases](https://wandb.ai/authorize). If you're unfamiliar with the two, Hugging Face provides you with an easy way to upload and store your models and datasets while Weights & Biases provides you with a platform to track and visualize your experiments.

This is important as we look at the performance of the model on the reversal task. Make sure that you copy both this `.env` and the `setup.sh` script below to your GPU instance.

```bash
#!/bin/bash
#
# Setup script for Prime-RL SFT training and evaluation
#
# Usage:
#   ./setup.sh
#
# This script installs:
#   - Prime-RL (cloned from GitHub)
#   - uv (Python package manager)
#   - flash-attn (for fast attention)
#   - vllm (for inference)
#   - wandb (for experiment tracking)
#   - verifiers (for evaluation)

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

# Store the original directory
ORIGINAL_DIR="$(pwd)"

# -------------------------------------------------------------------
# 0. Load environment variables
# -------------------------------------------------------------------
if [[ -f ".env" ]]; then
    log_info "Loading .env file..."
    set -a
    source .env
    set +a
else
    log_warn "No .env file found, skipping..."
fi

# -------------------------------------------------------------------
# 1. Install base packages
# -------------------------------------------------------------------
log_info "Installing base packages..."
sudo apt update && sudo apt install -y build-essential curl git tmux htop nvtop

# -------------------------------------------------------------------
# 2. Install uv (if not already installed)
# -------------------------------------------------------------------
if ! command -v uv &> /dev/null; then
    log_info "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source "$HOME/.local/bin/env"
else
    log_info "uv already installed"
fi

# Source uv environment
[[ -f "$HOME/.local/bin/env" ]] && source "$HOME/.local/bin/env"

# -------------------------------------------------------------------
# 3. Clone Prime-RL
# -------------------------------------------------------------------
if [[ ! -d "prime-rl" ]]; then
    log_info "Cloning prime-rl..."
    git clone https://github.com/PrimeIntellect-ai/prime-rl.git
else
    log_info "prime-rl already exists, pulling latest..."
    cd prime-rl && git pull && cd ..
fi

cd prime-rl

# -------------------------------------------------------------------
# 4. Sync Prime-RL dependencies
# -------------------------------------------------------------------
log_info "Syncing prime-rl dependencies..."
uv sync --all-extras

# -------------------------------------------------------------------
# 5. Install flash-attn
# -------------------------------------------------------------------
log_info "Installing flash-attn..."
uv pip install flash-attn --no-build-isolation

# -------------------------------------------------------------------
# 6. Install vllm (for inference/evaluation)
# -------------------------------------------------------------------
log_info "Installing vllm..."
uv pip install vllm

# -------------------------------------------------------------------
# 7. Install wandb (for experiment tracking)
# -------------------------------------------------------------------
log_info "Installing wandb..."
uv pip install wandb

# -------------------------------------------------------------------
# 8. Install prime CLI tool
# -------------------------------------------------------------------
log_info "Installing prime CLI..."
uv tool install prime

# -------------------------------------------------------------------
# 9. Install the chinese-text-reverse environment (verifiers)
# -------------------------------------------------------------------
log_info "Installing chinese-text-reverse environment..."
prime env install ivanleomk/reverse-chinese

# -------------------------------------------------------------------
# 10. Verify installation
# -------------------------------------------------------------------
log_info "Verifying installation..."
uv run python -c "
import torch
print(f'PyTorch: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'GPU count: {torch.cuda.device_count()}')
if torch.cuda.is_available():
    print(f'GPU name: {torch.cuda.get_device_name(0)}')
"

# Check flash-attn
uv run python -c "import flash_attn; print(f'flash-attn: OK')" || log_warn "flash-attn import failed"

# Check vllm
uv run python -c "import vllm; print(f'vllm: OK')" || log_warn "vllm import failed"

# Check verifiers environment
uv run python -c "import reverse_chinese; print(f'chinese-text-reverse env: OK')" || log_warn "chinese-text-reverse import failed"

# -------------------------------------------------------------------
# 11. Auto-login to services (if tokens are set)
# -------------------------------------------------------------------
if [[ -n "${WANDB_API_KEY:-}" ]]; then
    log_info "Logging into wandb..."
    uv run wandb login "$WANDB_API_KEY"
    uv run wandb login --verify
else
    log_warn "WANDB_API_KEY not set, skipping wandb login"
fi

if [[ -n "${HF_TOKEN:-}" ]]; then
    log_info "Logging into HuggingFace..."
    uvx hf auth login --token "$HF_TOKEN"
else
    log_warn "HF_TOKEN not set, skipping HuggingFace login"
fi

# -------------------------------------------------------------------
# 12. Copy .env file into prime-rl
# -------------------------------------------------------------------
if [[ -f "$ORIGINAL_DIR/.env" ]]; then
    log_info "Copying .env file to prime-rl..."
    cp "$ORIGINAL_DIR/.env" .
else
    log_warn "No .env file to copy"
fi

echo ""
log_info "=============================================="
log_info "Setup complete!"
log_info "=============================================="
echo ""
echo "Next steps:"
echo "  source \$HOME/.local/bin/env"
echo "  cd prime-rl"
echo "  chmod +x ./train.sh"
```

You can copy these files to your GPU instance using `scp`:

```bash
# Fill in your GPU-IP Here
scp .env setup.sh user@your-gpu-ip:~
```

Then SSH into your instance and run the setup:

```bash
ssh user@your-gpu-ip
chmod +x setup.sh
./setup.sh
```

### Running SFT

With datasets prepared, we can train our models. The script below handles everything: validating the dataset size, computing the number of training steps, generating a Prime-RL config file, and launching training in a tmux session so SSH disconnects won't kill the job.

Key parts of the script:

- **Step calculation**: `MAX_STEPS = (SIZE * EPOCHS) / BATCH_SIZE` ensures each example is seen 3 times. For 500 examples, that's 46 gradient updates.
- **Config generation**: The heredoc dynamically creates a TOML config for Prime-RL with the right model, dataset, and hyperparameters.
- **tmux session**: Training runs in a detached session, so you can disconnect and reconnect without losing progress.
- **Auto-upload**: After training completes, the checkpoint is pushed directly to HuggingFace.

```bash
#!/bin/bash
# Train SFT model and upload to HuggingFace
# Usage: ./train.sh 100
# Run from within the prime-rl directory

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

SIZE=${1:?Usage: ./train.sh <size>}
SESSION_NAME="sft-train-n${SIZE}"
WORK_DIR="${PWD}"

export TERM=xterm-256color
export WANDB_ENTITY=ivanleomk

VALID_SIZES=(100 500 2500 5000 10000)
if [[ ! " ${VALID_SIZES[*]} " =~ " ${SIZE} " ]]; then
    echo "Error: Invalid size '${SIZE}'. Valid sizes: ${VALID_SIZES[*]}"
    exit 1
fi

if [[ -f ".env" ]]; then
    log_info "Loading .env file..."
    set -a
    source .env
    set +a
elif [[ -f "../.env" ]]; then
    log_info "Loading ../.env file..."
    set -a
    source ../.env
    set +a
else
    log_warn "No .env file found, skipping..."
fi

if [[ -n "${HF_TOKEN:-}" ]]; then
    log_info "Logging into HuggingFace..."
    hf auth login --token "$HF_TOKEN"
else
    log_warn "HF_TOKEN not set, skipping HuggingFace login..."
fi

EPOCHS=3
BATCH_SIZE=32
MAX_STEPS=$(( (SIZE * EPOCHS) / BATCH_SIZE ))

if [ ${MAX_STEPS} -lt 1 ]; then
    MAX_STEPS=1
fi

MODEL="Qwen/Qwen3-0.6B"
DATASET="ivanleomk/reverse-chinese-poetry-${SIZE}"
HF_REPO="ivanleomk/chinese-reverse-sft-n${SIZE}"

echo "Training on ${DATASET}..."
echo "Dataset size: ${SIZE}, Epochs: ${EPOCHS}, Max steps: ${MAX_STEPS}"

mkdir -p ./configs/ablation
cat > ./configs/ablation/sft_n${SIZE}.toml << EOF
max_steps = ${MAX_STEPS}

[ckpt]

[model]
name = "${MODEL}"

[data]
name = "${DATASET}"
seq_len = 4096
batch_size = 32

[optim]
lr = 2e-5
EOF

TRAIN_SCRIPT=$(mktemp)
cat > "${TRAIN_SCRIPT}" << SCRIPT
#!/bin/bash
set -euo pipefail

cd "${WORK_DIR}"
echo "Training on ${DATASET}..."
uv run sft @ ./configs/ablation/sft_n${SIZE}.toml \\
    --wandb.project reverse-text-sft \\
    --wandb.name chinese-reverse-sft-n${SIZE}

echo "Uploading to ${HF_REPO}..."
hf upload ${HF_REPO} ./outputs/weights/step_${MAX_STEPS}

echo "✓ Done: https://huggingface.co/${HF_REPO}"
echo "Press Enter to close this session..."
read
SCRIPT

chmod +x "${TRAIN_SCRIPT}"

tmux kill-session -t "${SESSION_NAME}" 2>/dev/null || true

echo "Starting tmux session: ${SESSION_NAME}"
tmux new-session -d -s "${SESSION_NAME}" "bash ${TRAIN_SCRIPT}; rm ${TRAIN_SCRIPT}"

echo "Training started in tmux session '${SESSION_NAME}'"
echo "Attach with: TERM=xterm-256color tmux attach -t ${SESSION_NAME}"
```

To speed things up, I ran all five ablations across different GPUs: `./train.sh 100` on one, `./train.sh 500` on another, and so on.

### Evaluating Our Models

Once training completes, we need to evaluate each checkpoint against our test set. This is where the verifiers environment we created earlier pays off—we can use the same environment for both RL training and evaluation.

The eval script spins up a local vLLM server with our fine-tuned model, waits for it to be ready, then runs `vf-eval` against our `reverse-chinese` environment. The cleanup trap ensures the vLLM server is killed even if the script fails.

```bash
#!/bin/bash
# Benchmark a HuggingFace model using verifiers + vLLM
# Usage: ./eval.sh <model_name>
# Example: ./eval.sh ivanleomk/chinese-reverse-sft-n100

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }

MODEL=${1:?Usage: ./eval.sh <model_name>}
ENV_ID="reverse-chinese"
SAMPLES=1000
VLLM_PORT=8000
MAX_SEQ_LEN=2048

echo "=============================================="
echo "Benchmarking: ${MODEL}"
echo "Environment: ${ENV_ID}"
echo "Samples: ${SAMPLES}"
echo "=============================================="

# Start vLLM server in background
log_info "Starting vLLM server..."
vllm serve "${MODEL}" \
    --port ${VLLM_PORT} \
    --max-model-len ${MAX_SEQ_LEN} &
VLLM_PID=$!

# Cleanup function to kill vLLM on exit
cleanup() {
    log_info "Stopping vLLM server..."
    kill $VLLM_PID 2>/dev/null || true
    wait $VLLM_PID 2>/dev/null || true
}
trap cleanup EXIT

# Wait for vLLM to be ready
log_info "Waiting for vLLM server to start..."
while ! curl -s "http://localhost:${VLLM_PORT}/health" > /dev/null 2>&1; do
    echo "  Waiting for vLLM..."
    sleep 5
done
log_info "vLLM server ready!"

# Run evaluation
log_info "Running evaluation..."

uv run vf-eval "${ENV_ID}" \
    -m "${MODEL}" \
    -b "http://localhost:${VLLM_PORT}/v1" \
    -s \
    -r 1 \
    -n "${SAMPLES}"

echo ""
log_info "Evaluation complete!"
```

Here we can use the same verifiers environment to compare the performance of different SFT checkpoints, we use the `-n` flag here so that we just use 1000 examples because vLLM does take a while to work through all of them.

<SFTResultsChart />

## Reinforcement Learning

Now comes the interesting part: can RL squeeze more performance out of our SFT checkpoints?

### What is RL?

Unlike SFT where you show the model exactly what to output, RL lets the model explore. It generates outputs, receives rewards based on how good they are, and updates its weights to produce higher-reward outputs more often.

The key difference: SFT is imitation learning (copy this), while RL is trial-and-error learning (figure out what works). In theory, this means RL can discover solutions that aren't in your training data. In practice, it can only refine capabilities the model already has—it can't conjure new ones from nothing.

<RLPipelineDiagram />

### Results

We ran ~20 steps of GRPO on each SFT checkpoint and evaluated on our held-out test set:

| SFT Examples | SFT Reward | RL Reward | Delta |
| ------------ | ---------- | --------- | ----- |
| 100          | 0.02       | 0.02      | 0.00  |
| 500          | 0.24       | 0.24      | 0.00  |
| 2500         | 0.84       | 0.85      | +0.01 |
| 5000         | 0.91       | 0.92      | +0.01 |
| 10000        | 0.94       | 0.95      | +0.01 |

RL didn't move the needle. For this task—reversing a string character by character—the problem is simple enough that SFT either teaches it or it doesn't. There's no "partial understanding" that RL can refine. The model either learned the reversal pattern from seeing examples, or it didn't.

### Abalations

I then tried experimenting with the SFT-500 checkpoint because I was curious to see whether we might be able to match the performance of the SFT runs using the larger number of examples using simple RL. So I ran a grid of ablations varying three different hyper-parameters

| Ablation            | Training Steps | Rollouts | Learning Rate | Final Reward     |
| ------------------- | -------------- | -------- | ------------- | ---------------- |
| Baseline (SFT only) | -              | -        | -             | 0.24             |
| More steps          | 50             | 16       | 3e-6          | 0.25             |
| Even more steps     | 100            | 16       | 3e-6          | 0.24             |
| More rollouts       | 20             | 32       | 3e-6          | 0.25             |
| Higher LR           | 20             | 16       | 1e-5          | 0.00 (collapsed) |
| Lower LR            | 20             | 16       | 1e-6          | 0.24             |

We also ran ablations on the SFT-500 checkpoint, varying training steps (20, 50, 100), rollouts (8, 16, 32), and learning rate (1e-6, 1e-5).

None of them pushed the performance past ~0.25. The 1e-5 learning rate actually destroyed the model entirely—instead of reversing text, it collapsed into outputting nothing but XML tags:

```xml
System: Reverse the text character-by-character. Put your answer in <reversed_text> tags.
User:  床前明月光，疑是地上霜。举头望明月，低头思故乡。
Assistant:
<think>
</think>

<think>
</think>

<think>
</think>
```

This is a classic failure mode when the learning rate is too high—the policy update overshoots and lands in a region of weight space where the model can no longer produce coherent output.

## Conclusion

Our experiments demonstrated a clear limitation of reinforcement learning: it cannot bootstrap capabilities absent from the base model or SFT checkpoint. Across training scales from 100 to 10,000 examples, RL produced at most a 1% improvement in reward, and only on checkpoints that already achieved high accuracy through supervised fine-tuning. Models that failed to learn string reversal from SFT showed no improvement after RL, regardless of hyperparameter configuration.

These results operated under specific constraints—single-turn generation with binary reward signals. Binary rewards are effective when the task admits exactly one correct answer, but they provide no gradient for partial progress. This becomes problematic in longer-horizon tasks where intermediate steps matter.

In the next article, we'll move to multi-turn RL on a base model without SFT. We'll examine whether shaped rewards and extended interaction sequences can elicit capabilities that binary, single-turn setups cannot.
