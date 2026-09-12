---
title: "I Organized My AI Agents Like a Company — the Hard Part Wasn't the Agents"
published: false
description: "What I learned building a multi-agent orchestration framework: routing, state, and evaluation are boring, deterministic code — and they're where every agent project falls apart."
tags: ai, agents, typescript, architecture
canonical_url: https://github.com/JoshuaHidary/agent-company
# cover_image: https://...  (suggest the architecture diagram or a demo screenshot)
---

Every agent framework I've seen is shaped like a chatbot: a user says something, an LLM loops through tool calls, and eventually produces text. That works for *one* agent answering *one* question. It breaks the moment you have ten agents doing ten different kinds of work on a schedule — and you can't tell which one is stuck, why, or whether swapping the model made anything better.

I kept hitting the same three walls, whether I was building a personal command center or watching agent fleets misbehave:

1. **Routing is an afterthought.** Every task is assumed to be for "the agent," singular. In practice "review this PR" and "draft this invoice" need different capabilities, different tools, different failure modes.
2. **State is invisible.** An agent is either "done" or "not done." There's no "blocked, needs a human," no "waiting on you," no way to ask *which of my ten agents is stuck right now*.
3. **Nobody can answer the question that matters: is this actually working?** No benchmark, no baseline, no way to know if a model change helped or hurt.

So I built [`agent-company`](https://github.com/JoshuaHidary/agent-company) — a small, dependency-free TypeScript framework that models agents the way a business actually works, then bolts on an evaluation harness that measures them like a research project, not a demo.

## The model: teams, not tasks

The core idea is almost embarrassingly simple, and I think that's the point. Five teams, each with a mandate:

| Team | Mandate | Owns → produces |
|------|---------|-----------------|
| Engineering | Repos, PRs, deploys, incidents | working, deployed code |
| Revenue | Deals, proposals, contracts, invoicing | signed deals & sent invoices |
| Ops | Inbox, calendar, meetings | nothing dropped, one prioritized day |
| Intelligence | Tech eval, market watch | briefs before you ask |
| Growth | Content, social, outreach | published work & inbound |

The interesting engineering isn't the list — it's what you can *do* with the list.

### Routing is a deterministic function, not an LLM

This is the first decision I'm stubborn about. Dispatching a natural-language instruction to a team:

```ts
inferDispatchTeam("Review the open PR and deploy the fix"); // → "engineering"
inferDispatchTeam("Draft the REQCE invoice");               // → "revenue"
```

It's keyword classification with explicit priority ordering — revenue checks run before engineering, so overlapping terms like "contract" don't get misrouted. Why not ask an LLM to route? Because routing should be *fast, free, and predictable*. An LLM router is a second inference you're paying for, on a problem that's 95% solvable with a regex. The genuinely ambiguous 5% are rare enough that a sensible default ("ops") beats a probabilistic answer.

The rule that fell out of this: **reach for an LLM only when the problem is genuinely open-ended.** Routing, state transitions, and scoring are plain code you can test.

### A state machine you can actually see

Every agent run is in one of four states, severity-ranked:

```
idle [0] → working [1] → blocked [2] → waiting_on_you [3]
```

`waiting_on_you` is the one that matters. It's the difference between "the agent is busy" and "the agent is done and needs a human decision." When a revenue agent drafts an invoice, it doesn't *send* it — it lands in a "needs you" queue with `["Approve & send", "Edit", "Reject"]`. The framework tracks that as a first-class `NeedsYouItem`, not a log line.

Aggregate across runs and you get the only number an operator actually wants: `worstState(runs)` → what needs my attention *right now*.

## The part I'm most proud of: honest evaluation

The orchestration is useful. The evaluation harness is where the project earns its keep — because I made three decisions most demo projects skip.

**1. Scoring is deterministic.** No LLM judging another LLM's output. Accuracy is a checklist of `mustContain` / `mustNotContain` phrases plus token-overlap (Jaccard) against a reference answer. Latency and cost are normalized so the *best* value maps to 1.0 and the rest scale down. Every number is reproducible — run it twice, get the same result.

**2. The benchmarks are actually discriminating.** This is the subtle one. If a case asks "review this PR" and scores on whether the output contains "bug" and "security," an echo-only provider — one that just repeats the prompt back — only scores zero if those tokens don't appear in the prompt. So every `mustContain` token is written to be absent from its prompt. A lazy model earns nothing for free.

**3. Cost is never fabricated.** If a provider has no token pricing configured, its `costUsd` is `0` — not an invented number. I'd rather report "unknown" than make the benchmark look more complete than it is.

Put it together and you get a question with a real answer:

```
┌──────┬──────────┬─────────────┬───────────┬──────────┬──────────┬──────────┬───────┐
│ rank │ provider │ model       │ composite │ accuracy │ latency  │ cost     │ tools │
├──────┼──────────┼─────────────┼───────────┼──────────┼──────────┼──────────┼───────┤
│ 1    │ atlas    │ atlas-large │     0.589 │    0.851 │   2400ms │  $0.0675 │  1.00 │
│ 2    │ penny    │ penny-lite  │     0.565 │    0.533 │    850ms │  $0.0015 │  0.80 │
│ 3    │ swift    │ swift-mini  │     0.376 │    0.155 │    120ms │  $0.0270 │  0.60 │
└──────┴──────────┴─────────────┴───────────┴──────────┴──────────┴──────────┴───────┘
```

The slow-but-thorough provider wins on the accuracy-weighted composite, but the cheap one flips the revenue and ops teams where its cost edge is decisive. That's a *real* tradeoff surface, not a canned demo.

## What I'd do differently

- **The routing regex is naive.** It works for a fixed vocabulary of teams, but real dispatch needs embeddings — or at least synonym expansion — once the team set grows. The good news: it's a pure function, so swapping in a smarter classifier is a one-file change.
- **Latency and cost normalization is per-run, not per-benchmark.** A provider's latency score is computed against the other providers *in the same benchmark*. Across a full suite, the picture is noisier than it should be.
- **The evaluation is a harness, not a benchmark suite.** Real evaluation needs ground-truth datasets, not hand-written criteria. The honest framing: it's something you can plug a real dataset into, not a leaderboard worth publishing numbers from yet.

## The takeaway

The whole thing is ~925 lines of production TypeScript (plus 51 tests), zero runtime dependencies, MIT licensed, and it runs offline — `npm run demo` works with no API keys and no network.

If there's one idea I want to leave you with: **the hard part of multi-agent systems isn't the agents — it's the scaffolding.** Routing, state, and evaluation are boring, and they're exactly where most agent projects fall apart. Build those three as plain, testable code first, and the agents become the easy part.

---

*[`agent-company`](https://github.com/JoshuaHidary/agent-company) — a multi-agent orchestration framework with a built-in evaluation harness. MIT licensed.*
