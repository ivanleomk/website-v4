---
title: "Are your eval improvements just pure chance?"
date: 2024-12-04
description: "Grokking simple statistical analysis for LLM evals"
categories:
  - LLMs
  - Evals
authors:
  - ivanleomk
---

# Are your eval improvements just pure chance?

A step that's often missed when benchmarking retrieval methods is determining if any performance difference is due to random chance. Without this crucial step, you might invest in a new system upgrade that's outperformed your old one by pure chance.

If you're comparing retrieval methods, you'll often want to know if the improvements you're seeing are due to random chance.

In this article, we'll use a simple case study to demonstrate how to answer this question, introducing a new library called `indomee` (a playful nod to both "in-domain" evaluation and the beloved instant noodle brand in Southeast Asia) that makes this analysis significantly easier.

We'll do so in three steps:

1. First we'll simulate some fake data using `numpy`
2. Then we'll demonstrate how to do bootstrapping using nothing but `numpy` before visualising the results with `matplotlib`
3. Finally we'll perform a paired t-test to determine if the differences are statistically significant

<!-- more -->

Let's start by installing the necessary libraries:

```bash
pip install indomee numpy pandas scipy matplotlib
```

## Why RAG metrics matter

Before diving into the statistical analysis, let's understand why these metrics matter for Retrieval Augmented Generation (RAG):

### Looking to the Future

As LLMs become more capable, two key trends are emerging:

- Improved context understanding: Newer models are getting better at identifying and utilizing relevant information from their context window
- Longer context windows: Gemini has a context window that can take 2 million tokens - that's the entire harry potter series multiplied by 10 times over and a bit more.

This means that:

1. Having high-quality retrieval becomes even more critical - better models can make better use of good context
2. We can afford to retrieve more documents since context windows are expanding
3. The cost of retrieving irrelevant documents is decreasing (as models get better at ignoring noise)

This is why measuring both recall and position (through MRR) is crucial:

- **Recall@k**: Measures whether relevant documents appear in the top k retrieved results. For RAG, high recall is crucial because even if relevant information is mixed with some noise, newer models are increasingly good at finding and using it. A recall@5 of 0.8 means that 80% of the time, the relevant document appears in the top 5 results.

- **Mean Reciprocal Rank (MRR)**: Focuses on where the first relevant document appears in the results. Even with longer context windows, having relevant information appear earlier helps ensure it won't get truncated and gives models the best chance of using it effectively.

### Business-Driven Evaluation

The specific k values you choose for evaluation should be driven by your business needs:

- Search engines might care about recall@25 or higher since users can scroll through results
- Recommendation Systems might prioritize recall@5 since they need to be concise
- Research assistants might use recall@50+ to gather extensive information

This is why being able to calculate metrics at different k values is crucial - it lets you align your evaluation with your specific use case. Most importantly, it allows you to see whether how retrieval performs at different k values.

## Comparing Three Retrieval Methods

Let's say you're comparing three retrieval methods based off recall@10. This is a metric between 0 and 1 that measures how many relevant items are retrieved in the top 10 results.

You have the following three methods:

- Baseline: Your current approach
- Method 1: A promising new approach
- Method 2: Another alternative

Since we don't have real data, we'll simulate some fake data using `numpy`. We'll use a normal distribution to generate random scores and then ensure they're between 0 and 1 using `clip(0,1)`:

```python
import numpy as np
import pandas as pd

np.random.seed(42)
# Simulate data for 200 test queries
n_tests = 200
baseline = np.random.normal(0.4, 0.08, n_tests).clip(0, 1)
method_1 = np.random.normal(0.45, 0.1, n_tests).clip(0, 1)
method_2 = np.random.normal(0.49, 0.14, n_tests).clip(0, 1)

df = pd.DataFrame({
    "test_id": range(1, n_tests + 1),
    "baseline": baseline,
    "method_1": method_1,
    "method_2": method_2
})

# Initial data simulation output
print(df.mean().round(2))

test_id     100.50
baseline      0.40
method_1      0.46
method_2      0.48
dtype: float64

# Shows the mean values for each method - baseline performs worst, method_2 performs best
```

Looking at the means:

- Method 2 is 20% better than baseline
- Method 2 is 4% better than Method 1

But is Method 2 really better, or is this just random chance?

We need two things to answer this:

1. Bootstrapping to estimate confidence intervals
2. Statistical tests to validate the differences

## Measuring Uncertainty with Bootstrapping

Bootstrapping helps us understand how much our results might change if we ran the experiment again. It works by creating new datasets from our original dataset by randomly selecting samples with replacement. Sampling with replacement means that an item in our original dataset can be selected more than once when we're selecting samples.

By repeating this multiple times, we can create a large diversity of potential outcomes. In the code snippet below, we repeat this 1000 times, allowing us to see how stable or uncertain our results are:

```python
import numpy as np

SAMPLE_SIZE = 200
NUM_SAMPLES = 1000

# Lists to store bootstrapped means
baseline_means = []
method_1_means = []
method_2_means = []

# Perform bootstrapping
for _ in range(NUM_SAMPLES):
    sample = df.sample(SAMPLE_SIZE, replace=True)
    baseline_means.append(sample["baseline"].mean())
    method_1_means.append(sample["method_1"].mean())
    method_2_means.append(sample["method_2"].mean())

# Compute mean of bootstrapped samples
method_names = ['Baseline', 'Method 1', 'Method 2']
all_means = [baseline_means, method_1_means, method_2_means]
mean_estimates = [np.mean(means) for means in all_means]

# Calculate confidence intervals
ci_lower = [np.percentile(means, 2.5) for means in all_means]
ci_upper = [np.percentile(means, 97.5) for means in all_means]
error = [[m - l for m, l in zip(mean_estimates, ci_lower)],
         [u - m for m, u in zip(mean_estimates, ci_upper)]]

# Plotting code
plt.figure(figsize=(8, 6))
plt.bar(range(len(method_names)), mean_estimates, yerr=error, align='center',
        alpha=0.7, capsize=10, color='skyblue')
plt.xticks(range(len(method_names)), method_names)
plt.ylabel('Mean Value')
plt.title('Bootstrap Confidence Intervals')
plt.grid(True, axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
```

### Simplifying Bootstrap Analysis with `indomee`

Now that we've seen how to perform bootstrapping manually, let's see how indomee simplifies this process.

Previously, you'd need all that bootstrapping code. With indomee, it's just:

```python
from indomee import bootstrap_from_results

baseline_stats = bootstrap_from_results(df["baseline"].tolist())
method_1_stats = bootstrap_from_results(df["method_1"].tolist())
method_2_stats = bootstrap_from_results(df["method_2"].tolist())

# Bootstrap metric output
print(baseline_stats)

BootstrapMetric(
    name='bootstrap_metric',  # Identifier for the metric
    value=0.47800829518587357,  # Mean value across all bootstrap samples
    ci_lower=0.4582167411327398,  # Lower bound of 95% confidence interval
    ci_upper=0.498828905051887  # Upper bound of 95% confidence interval
)
```

### Computing metrics at different k values

`indomee` makes it easy to calculate recall and mrr at different k values:

```python
from indomee import calculate_mrr, calculate_recall

# Basic metric calculation
mrr = calculate_mrr(["apple", "banana", "orange"], ["banana", "orange", "grape"])
print("MRR:", mrr)
# > MRR: 0.5

recall = calculate_recall(["apple", "banana", "orange"], ["banana"])
print("Recall:", recall)
# > Recall: 1

# Metrics at different k values
metrics = calculate_metrics_at_k(
    metrics=["recall"],
    preds=["cat", "dog", "fish", "bird", "hamster"],
    labels=["fish"],
    k=[1, 2, 3, 4, 5],
)

for metric in metrics:
    print(f"- {metric} -> {metrics[metric]}")

# Output:
- recall@1 -> 0.0  # Fish not in first position
- recall@2 -> 0.0  # Fish not in first two positions
- recall@3 -> 1.0  # Fish found at position 3
- recall@4 -> 1.0  # Fish still found when looking at top 4
- recall@5 -> 1.0  # Fish still found when looking at top 5
```

### Working with Raw Bootstrap Data

What makes indomee really powerful is that we can bootstrap not with the mean of the results but the raw data itself. This allows us to:

1. Do a single bootstrap with `bootstrap_sample`
2. Do multiple bootstraps with `bootstrap`

```python
# Single bootstrap sample
result = bootstrap_sample(
    preds=[["a", "b"], ["c", "d"], ["e", "f"]],
    labels=[["a", "b"], ["c", "d"], ["e", "f"]],
    sample_size=10,
    metrics=["recall"],
    k=[1, 2, 3],
)

# Multiple bootstraps
result = bootstrap(
    preds=[["a", "b"], ["c", "d"], ["e", "f"]],
    labels=[["a", "b"], ["c", "d"], ["e", "f"]],
    n_samples=2,
    sample_size=10,
    metrics=["recall"],
    k=[1, 2, 3],
)
```

The result gives us access to:

1. The raw samples used in each bootstrap iteration
2. The metrics calculated for each iteration
3. Summary statistics across all iterations

This makes it easy to do more advanced analysis depending on your specific use case.

## Testing for Statistical Significance

The t-test is a statistical method that helps us determine if the differences we observe between two methods are statistically significant or just due to random chance.

When we look at our bootstrap plots, we can see some overlap in the confidence intervals between methods. While this gives us a visual indication, the t-test provides a formal statistical framework to quantify this difference:

1. The t-test calculates a t-statistic and p-value. The t-statistic measures how many standard deviations the difference between means is from zero while the p-value tells us the probability of observing such a difference if there was actually no real difference between the methods.

2. We use a paired t-test here because our measurements are related (same queries used for each method) and each data point in one method has a natural pairing with a data point in the other method. This helps control for query-specific variations.

First, let's see the manual implementation:

```python
from scipy.stats import ttest_rel
import pandas as pd

# Calculate the mean for each method
method_1 = df["method_1"].tolist()
method_2 = df["method_2"].tolist()
baseline = df["baseline"].tolist()

t_stat_baseline_method1, p_val_baseline_method1 = ttest_rel(baseline, method_1)
t_stat_baseline_method2, p_val_baseline_method2 = ttest_rel(baseline, method_2)
t_stat_method1_method2, p_val_method1_method2 = ttest_rel(method_1, method_2)

# Create a DataFrame with the t-test results
results_df = pd.DataFrame(
    {
        "Comparison": ["Baseline vs M1", "Baseline vs M2", "M1 vs M2"],
        "T statistic": [
            t_stat_baseline_method1,
            t_stat_baseline_method2,
            t_stat_method1_method2,
        ],
        "P Value": [
            p_val_baseline_method1,
            p_val_baseline_method2,
            p_val_method1_method2,
        ],
    }
)

# Format the numeric columns
results_df["T statistic"] = results_df["T statistic"].round(2)
results_df["P Value"] = results_df["P Value"].map("{:.2e}".format)
```

### Simplifying t-tests with `indomee`

With indomee, running t-tests is straightforward. Better yet, we automatically do a pairwise comparison for all of the methods you pass in with the option for custom labels for each method.

```python
from indomee import perform_t_tests

results = perform_t_tests(
    baseline, method_1, method_2,
    names=["Baseline", "Method 1", "Method 2"],
    paired=True
)
print(results)

    Comparison  T statistic  P Value
Baseline vs M1        -7.42 3.30e-12  # Highly significant difference
Baseline vs M2        -6.91 6.55e-11  # Highly significant difference
      M1 vs M2        -1.59 1.14e-01  # Not significant (p > 0.05)
```

This produces a clean DataFrame showing:

- The methods being compared
- T-statistics and p-values
- Whether differences are significant at p < 0.05

## Conclusion

As LLMs continue to evolve with better context understanding and longer context windows, having robust evaluation of retrieval systems becomes even more crucial. Statistical analysis helps ensure that improvements are real and not just random chance.

Without being able to perform statistical analysis, you might invest in a new system upgrade that's outperformed your old one by pure chance. That's a huge time sink and a waste of resources for any company looking to move fast and build a great product.

`indomee` makes it easy to implement statistical analysis for your retrieval pipeline. Give it a try today with `pip install indomee`.
