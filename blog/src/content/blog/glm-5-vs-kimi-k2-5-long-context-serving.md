---
title: "GLM-5 vs Kimi-K2.5: Long-context serving at scale"
excerpt: "Why GLM-5 is a real step forward compared to GLM-4.7 for serving long-context coding agents, and why we still keep Kimi-K2.5 as the default for the best experience."
publishDate: 2026-02-12
isFeatured: true
tags: ["llm", "inference", "glm", "kimi", "moe", "claude code"]
seo:
  title: "GLM-5 vs Kimi-K2.5: Long-context serving at scale"
  description: "A technical breakdown of why GLM-5 improves on GLM-4.7 for long-context serving, and why Kimi-K2.5 remains the default for agentic coding workloads."
  pageType: "article"
---

Serving long-context coding agents is a concurrency problem before it is a benchmark problem.

If you care about a "Claude Code" style experience, costs and latency are dominated by how much GPU memory each live session locks up, and how that scales when many people are using the endpoint at the same time.

At **[code.umans.ai](https://code.umans.ai/)**, that is exactly what we optimize for. This post explains why **GLM-5** is a real step forward compared to **GLM-4.7**, and why we still keep **Kimi-K2.5** as the default for the best experience.

## GLM-5: a massive leap over GLM-4.7

A realistic serving scenario for long-context coding agents: 128k context, 100 concurrent live sessions, single node. We covered the KV cache math in **[host-claude-code](https://blog.umans.ai/blog/host-claude-code/)**. Same framework applies here. Weights are shared across sessions. KV cache is not. So KV cache is the term that scales with users.

GLM-4.7 is a 300B MoE with full attention. At 128k context that puts you at around 23 GiB of KV cache per session, or about 2.3 TB across 100 sessions. That is before weights and runtime overhead. We covered this in **[host-claude-code](https://blog.umans.ai/blog/host-claude-code/)**, and ZAI themselves have acknowledged the [serving pain](https://x.com/Zai_org/status/2021656633320018365) publicly.

GLM-5 is a 744B MoE with compressed attention (DSA). **[GLM-5 blog](https://z.ai/blog/glm-5)** and **[GLM-5 model](https://huggingface.co/zai-org/GLM-5)**

* GLM-4.7: ~23 GiB per session, ~2.3 TB at 100 sessions
* GLM-5: ~6.25 GiB per session, ~625 GiB at 100 sessions

More than double the parameters, 3x to 4x less KV cache per session. That is what moving from full attention to compressed attention gets you at scale.


## Single-node reality: weights plus KV cache have to fit

GLM-5 is 744B total parameters. In BF16 that is roughly 1.5 TB of weights alone, so BF16 is off the table for single-node. The practical format is FP8, which means quantizing down from the native checkpoint with some quality loss. **[GLM-5 FP8](https://huggingface.co/zai-org/GLM-5-FP8)**

Kimi-K2.5 is 1.04T total parameters. It ships with native INT4 as the post-trained deployment format, so INT4 is where the model was evaluated and optimized. No quality loss from quantization. **[Kimi-K2.5 model](https://huggingface.co/moonshotai/Kimi-K2.5)**

Now add KV cache for 100 sessions on top:

| | Weights | KV cache (100 sessions) | Total |
|---|---|---|---|
| GLM-5 FP8 | ~744 GB | ~625 GiB | ~1.37 TB |
| Kimi-K2.5 INT4 | ~520 GB | ~489 GiB | ~1.01 TB |

An 8xH200 node has 1.13 TB GPU memory and 8xB200 has 1.44 TB. Neither is comfortable for GLM-5 once you account for activations and framework overhead. Kimi-K2.5 fits on both with headroom.

The bigger model takes less memory and keeps full quality. That is what MoE plus a native low-bit deployment format gets you.


## Why Kimi is materially faster under load

When the service is busy, what the user feels is decode speed. For MoE models, that comes down to two things: how many parameters activate per token, and how many bytes each one costs to move.

* **Kimi-K2.5**: 32B activated, INT4. **[Kimi-K2.5 model](https://huggingface.co/moonshotai/Kimi-K2.5)**
* **GLM-5**: 40B activated, FP8. **[GLM-5 FP8](https://huggingface.co/zai-org/GLM-5-FP8)**

Fewer activated parameters at half the bytes per weight. Back-of-the-envelope bytes moved per generated token:

* Kimi INT4: 32B × 0.5 bytes ≈ 16 GB
* GLM-5 FP8: 40B × 1 byte ≈ 40 GB

That is a 2.5x ratio. In practice, depending on batching and context length, that shows up as **2x to 4x faster generation per user under load**.

## Native multimodal is another real difference

Kimi-K2.5 is natively multimodal, jointly pretrained on text and vision from the start. GLM-5 is text-only. You can bolt a vision encoder onto it, and we have done exactly this kind of work with DeepSeek V3.2 in [umans-coder-v0](https://huggingface.co/umans-ai/umans-coder-v0/tree/main). But a post-hoc adapter does not match a model that learned both modalities together over the full training run.

In a Claude Code-like workflow, users copy-paste screenshots constantly while iterating: UI state, error dialogs, visual debugging. If vision is a second-class citizen, the agent loses context on exactly the inputs that make the workflow feel native.

## What we ship

GLM-5 is impressive. It is a serious upgrade over GLM-4.7 for long-context serving, and it is worth taking seriously.

For the best Claude Code-like experience on **[code.umans.ai](https://code.umans.ai/)**, we keep **Kimi-K2.5** as the default: smaller per-session KV cache footprint, faster decode under load, and native multimodal training.

---

# Appendix

## A. KV cache math used in this post

We use the same compressed-cache accounting as in the earlier analysis, based on the FlashMLA FP8 cache layout:

* 656 bytes per token per layer
  (512 FP8 NoPE + 16 scales + 128 BF16 RoPE)

KV cache per session:

$$
M_{\text{KV}}(T) = T \cdot L \cdot 656
$$

With $T = 131{,}072$ tokens (128k):

* per layer: $131{,}072 \cdot 656 \approx 82\ \text{MiB}$

So:

* Kimi-K2.5, $L = 61$: $82\ \text{MiB} \cdot 61 \approx 4.89\ \text{GiB/session}$
* GLM-5, $L = 78$: $82\ \text{MiB} \cdot 78 \approx 6.25\ \text{GiB/session}$

The layer counts are consistent with Kimi's report and GLM-5 config. **[GLM-5 config](https://huggingface.co/zai-org/GLM-5/blob/main/config.json)**

## B. Why the decode speed ratio is 2x to 4x

A simple proxy for per-token decode work in MoE is:

$$
W \propto P_{\text{active}} \cdot b
$$

where $P_{\text{active}}$ is activated parameters per token, and $b$ is bytes per weight in the deployed format.

* Kimi: $32\text{B} \cdot 0.5 = 16$
* GLM-5 FP8: $40\text{B} \cdot 1 = 40$

Ratio:

$$
\frac{W_{\text{GLM}}}{W_{\text{Kimi}}} \approx 2.5
$$

Real systems add batching effects, kernel differences, and context-length dependent overhead, so the user-visible gap is typically a range. The point is that Kimi has a structural throughput advantage in the single-node format you actually serve.