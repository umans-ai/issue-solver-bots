---
title: "GLM-5 vs Kimi-K2.5: Long-context serving at scale"
excerpt: "Why GLM-5 is a real step forward compared to GLM-4.7 for serving long-context coding agents, and why we still keep Kimi-K2.5 as the default for the best experience."
publishDate: 2026-02-12
isFeatured: true
tags: ["llm", "inference", "glm", "kimi", "moe"]
seo:
  title: "GLM-5 vs Kimi-K2.5: Long-context serving at scale"
  description: "A technical breakdown of why GLM-5 improves on GLM-4.7 for long-context serving, and why Kimi-K2.5 remains the default for agentic coding workloads."
  pageType: "article"
---

Serving long-context coding agents is a concurrency problem before it is a benchmark problem.

If you care about a "Claude Code" style experience, costs and latency are dominated by how much GPU memory each live session locks up, and how that scales when many people are using the endpoint at the same time.

At **[code.umans.ai](https://code.umans.ai/)**, that is exactly what we optimize for. This post explains why **GLM-5** is a real step forward compared to **GLM-4.7**, and why we still keep **Kimi-K2.5** as the default for the best experience.

## The stress case we use

* 128k context
* 100 concurrent live sessions
* single node (no multi-node cluster)

Multi-node works, but it is a different product and a different cost curve. This section is about what holds on one box.

## KV cache is what scales with users

We already went through the mental model and the math in **[host-claude-code](https://blog.umans.ai/blog/host-claude-code/)**. Same framework here: weights are shared, KV cache is per session, so KV cache is the scaling term.

## GLM-5: a massive leap over GLM-4.7

A realistic serving scenario for long-context coding agents: 128k context, 100 concurrent live sessions, single node. We covered the KV cache math in **[host-claude-code](https://blog.umans.ai/blog/host-claude-code/)**. Same framework applies here. Weights are shared across sessions. KV cache is not. So KV cache is the term that scales with users.

GLM-4.7 uses full attention. At 128k context that puts you at around 23 GiB of KV cache per session, or about 2.3 TB across 100 sessions. That is before weights and runtime overhead. We covered this in **[host-claude-code](https://blog.umans.ai/blog/host-claude-code/)**, and ZAI themselves have acknowledged the [serving pain](https://x.com/Zai_org/status/2021656633320018365) publicly.

GLM-5 includes compressed attention (DSA) that changes this picture. **[GLM-5 blog](https://z.ai/blog/glm-5)** and **[GLM-5 model](https://huggingface.co/zai-org/GLM-5)**

* GLM-4.7: ~23 GiB per session, ~2.3 TB at 100 sessions
* GLM-5: ~6.25 GiB per session, ~625 GiB at 100 sessions

Roughly 3x to 4x less memory on the term that actually multiplies with concurrency. That is the whole point of GLM-5.


## Single-node constraint: weights decide the format

Take the nodes people actually run:

* **8x H200**: 141 GB per GPU
* **8x B200**: more headroom, still finite

GLM-5 is **744B** total parameters. Serving it in BF16 is roughly **1.5 TB of weights** before you even allocate KV cache and runtime overhead. That does not fit on an 8xH200 node, and it is still not a comfortable single-node target even on the next class up once you include KV cache and headroom.

So the practical single-node format for GLM-5 is the **FP8 artifact**: **[GLM-5 FP8](https://huggingface.co/zai-org/GLM-5-FP8)**. This is not "hacky quant", this is the standard serving format for modern large models.

## Why Kimi is materially faster under load

When the service is busy, the user experience is driven by decode throughput under contention. For MoE models, the best first-order predictor is:

* **activated parameters per token**
* **bytes per weight** in the deployed format

Published numbers:

* **Kimi-K2.5**: 1.04T total, **32B activated**
* **GLM-5**: **40B activated** (on the 744B variant) **[GLM-5 model](https://huggingface.co/zai-org/GLM-5)**

Now combine that with what you actually serve:

* Kimi-K2.5 ships as a **post-trained checkpoint** and is released with **native INT4 quantization** as the intended deployment configuration **[Kimi-K2.5 model](https://huggingface.co/moonshotai/Kimi-K2.5)**
* GLM-5, on a single node, is realistically served as **FP8** **[GLM-5 FP8](https://huggingface.co/zai-org/GLM-5-FP8)**

Back-of-the-envelope bytes moved per generated token:

* Kimi INT4: 32B × 0.5 bytes ≈ 16 GB per token
* GLM-5 FP8: 40B × 1 byte ≈ 40 GB per token

That ratio is **2.5x**. In the interactive agent regime, it is completely normal for that to show up as **2x to 4x faster generation per user under load**, depending on batching and context length.

## Native multimodal is another real difference

Kimi-K2.5 is natively multimodal, jointly pretrained on text and vision from the start. GLM-5 is text-only. You can bolt a vision encoder onto it, and we have done exactly this kind of work with DeepSeek V3.2 in [umans-coder-v0](https://huggingface.co/umans-ai/umans-coder-v0/tree/main). But a post-hoc adapter does not match a model that learned both modalities together over the full training run.

In a Claude Code-like workflow, users copy-paste screenshots constantly while iterating: UI state, error dialogs, visual debugging. If vision is a second-class citizen, the agent loses context on exactly the inputs that make the workflow feel native.


## Why a 1T+ model can be cheaper than a smaller-looking one

This is where people get misled by headline total parameters.

Serving cost and latency are driven by:

* KV cache per session (multiplies by concurrency)
* activated parameters per token (drives decode compute)
* deployed weight format (drives memory and throughput)

So a "bigger" MoE can be cheaper if it activates fewer parameters and ships a lower-bit deployment format that you can run comfortably.

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