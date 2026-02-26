---
title: "Stop Being Your AI Agent's Assistant"
excerpt: "When we launched code.umans.ai at the beginning of February, my cofounder Naji and I saw it as an opportunity to challenge ourselves. We had unlimited LLM access now. No more token anxiety. So we asked: what happens if we really let our agents work autonomously?"
publishDate: 2026-02-26
isFeatured: true
tags: [ "AI", "Engineering", "Agents" ]
seo:
  title: "Stop Being Your AI Agent's Assistant"
  description: "What we learned from letting AI agents work truly autonomously on a real product with real users."
---

# Stop Being Your AI Agent's Assistant

Everyone on Twitter has a fancy AI coding setup. Multi-agent orchestration, custom frameworks, elaborate prompt chains. It looks impressive. It's also exhausting to watch.

When we launched [code.umans.ai](https://code.umans.ai) at the beginning of February, my cofounder Naji and I saw it as an opportunity to challenge ourselves. We had unlimited LLM access now. No more token anxiety. So we asked: what happens if we really let our agents work autonomously? Not in theory. In practice, on a real product, with real users.

Here's what we learned.

## The Trap We Wanted to Avoid

Our past experiences with AI agents had taught us something: it's incredibly easy to end up working *for* the agent instead of the other way around. We'd seen the pattern. You become a bottleneck because the agent waits for you to validate every step. You run things manually to compensate for what it can't do. You spend too much time reviewing its code. You spend too much time re-reading its code. And everything you didn't catch comes back to bite you later: bugs, tech debt, unmaintainable code.

So going into this experiment, we had one rule: the AI works for us, not the other way around.

## What Actually Helped

We deliberately didn't adopt a framework. Not out of laziness. We wanted to learn. We didn't want to invest weeks mastering some tool that would be obsolete the next time an AI bro tweets or Anthropic ships an update. We wanted to understand, from the ground up, how AI can actually help us with our real problems. And along the way, we got to relearn our own craft. Honestly, it's been a lot of fun.

We just kept asking ourselves one question: *why is the agent asking me to do this, and how do I make sure it never has to again?*

Three things made the biggest difference.

### Putting everything in the repo

Not just code. Architecture docs, product vision, backlog, conventions, past conversations, incident reports, runbooks. If a new teammate would need it on day one, the agent needs it too.

We have a `docs/` folder at the root with subfolders for architecture, backlog (todo / in-progress / done), conversations, incidents, product specs, runbooks, and spikes. Plus a `conventions.md` and a `user-guide.md`. One `AGENTS.md` file (symlinked to `CLAUDE.md`) ties it all together.

We didn't start with all of this. Our first commit had a value proposition, a system design, our first conversation, and an initial backlog. The rest grew from there, one piece at a time, as we realized what the agent kept needing. The more context it had, the less we had to explain, repeat, and correct. That alone was a huge shift.

### Just talk to the model

No elaborate prompt engineering. No system. You have a conversation, you iterate, you ask it what it understood, you correct. That's it.

The mindset that changed everything for us: sit back. Every time the agent tries to get you to do work for it, it's a scam. It wants you to run something? Push back. It wants a screenshot of what happened? Push back. It wants you to check if the tests pass? That's its job. Tell it to figure it out. It usually can.

### The three-step loop

Our entire workflow boils down to this:

1. **Tell it to do the work.** Hold firm when it tries to hand micro-tasks back to you.
2. **Tell it to verify its own work.** Tests, types, deploy, logs. Not you.
3. **Ask: "What was painful and how do we avoid it next time?"** The answer goes into the docs, the AGENTS.md, the justfile. Next time, that friction is gone.

Tell it to do. Tell it to verify. Tell it to learn. That's the whole thing.

### Then it snowballs

Here's what surprised us: we started with almost nothing. One agent, a terminal, and a conversation. But because step 3 keeps feeding improvements back into the system, things grow fast.

Early on the agent couldn't act on anything outside the code, so we gave it CLIs: `gh` for GitHub, `aws cli` for infra, `just` for repetitive tasks. Then it couldn't test anything visually, so we added Playwright. Then it needed safe feedback on infrastructure and environment changes, so we put all our infra as code in Terraform and gave it the ability to spawn an isolated production-like environment when needed. Then it kept making the same mistakes on infra, so we wrote conventions and runbooks. Each time it needed us for something it should have handled alone, we fixed the gap.

Within a few days, what started as "just talk to the model" had organically grown into a setup with real feedback loops: lint and type checks running automatically, unit tests written and executed by the agent, Playwright for visual verification, autonomous deploys, log access for self-debugging. None of this was planned upfront. It just accumulated, one friction point at a time.

We started with a single coding agent. Alongside it, we had other agents running for different jobs: production monitoring, activity tracking, documentation. But for code, just one. We wanted throughput, not chaos. The ecosystem is full of tools for running parallel coding agents, but spawning five that step on each other or break production every other deploy didn't appeal to us when real users rely on the product every day.

Now, with more experience, we run two or three coding agents in parallel. But only because we have a better understanding now that allowed us to design independent workstreams aligned with our business. We earned that gradually.

## Where We Are Now

Some numbers for context. We're a team of two cofounders. We do everything: dev, product, user interviews, sales, discovery. We have hundreds of users in production, most of them daily active. We run zero-downtime deployments with real performance and availability constraints.

With this setup, each of us ships about two meaningful increments per day. These are increments that used to take me one to four days each, and I have 17 years of experience. I never stopped coding or designing architecture.

Less than 10% of the code gets reviewed by a human. That sounds scary, but it works because we invested in the process around it: the feedback loops, the context, the tooling. We focus on the delivery system rather than manually inspecting every output.

Some of these principles we'd already been applying on other products we develop. But launching umans code in February gave us a reason to push further, on a fresh repo where everything lives together: frontend, backend, infra as code, and all the documentation the agent needs.

## What's Next

This article is about the principles. In a follow-up, we'll go concrete: how we structure the backlog, how preview apps work, how we build and share agent skills, the day-to-day mechanics.

For now, if you're drowning in AI tooling announcements and Twitter flex posts, maybe try this: one agent, one repo, one loop. Sit back, give it context, and stop doing its job for it. You'll be surprised how fast things compound.

We'll also share repos to practice on and packaged skills soon. Stay tuned.
