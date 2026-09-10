# I Organized My AI Agents Like a Company — Here's What Broke and What Worked

*The pitch: stop treating every agent task as a generic "prompt → tool call" loop. Give agents jobs, teams, and a state machine. Build the thing that routes work, tracks state, and — critically — measures whether any of it is any good.*

---

## The framing mistake

Most agent frameworks are shaped like a conversation: a user says something, an LLM loops through tool calls, and eventually produces text. That model works for a chatbot. It falls apart the moment you have *many* agents doing *many* kinds of work on a schedule.

I kept running into the same three problems, whether I was building a personal command center or watching real agent fleets misbehave:

1. **Routing is an afterthought.** Every task is assumed to be for "the agent," singular. In practice "review this PR" and "draft this invoice" need different capabilities, different tools, different failure modes.
2. **State is invisible.** An agent is either "done" or "not done." There's no "blocked, needs a human," no "waiting on you," no way to ask *which of my ten agents is stuck right now*.
3. **Nobody can answer the question that matters most: is this thing actually working?** There's no benchmark, no baseline, no way to know if swapping the model made things better or worse.

So I built `agent-company` — a small, dependency-free TypeScript framework that models agents the way a business actually works, and then bolts on an evaluation harness that measures them like a research project, not a demo.

## The model: teams, not tasks

The core idea is embarrassingly simple and I think that's the point. Five teams, each with a mandate:

| Team | Mandate | "Owns → produces" |
|------|---------|-------------------|
| Engineering | Repos, PRs, deploys, incidents | working, deployed code |
| Revenue | Deals, proposals, contracts, invoicing | signed deals & sent invoices |
| Ops | Inbox, calendar, meetings | nothing dropped, one prioritized day |
| Intelligence | Tech eval, market watch | briefs before you ask |
| Growth | Content, social, outreach | published work & inbound |

The interesting engineering is not the list — it's what you can *do* with the list.

### Routing is a deterministic function, not an LLM

This is the first decision I'm stubborn about. Dispatching a natural-language instruction to a team is:

```ts
inferDispatchTeam("Review the open PR and deploy the fix"); // → "engineering"
inferDispatchTeam("Draft the REQCE invoice");               // → "revenue"
```

It's keyword classification with explicit priority ordering — revenue checks run before engineering so overlapping terms like "contract" don't get misrouted. Why not just ask an LLM to route? Because routing should be *fast, free, and predictable*. An LLM router is a second inference you're paying for, on a problem that is 95% solvable with a regex. The 5% of genuinely ambiguous cases are rare enough that a sensible default ("ops") beats a probabilistic answer.

This is a pattern worth internalizing: **reach for an LLM only when the problem is genuinely open-ended.** Everything else — routing, state transitions, scoring — should be plain code you can test.

### A state machine you can actually see

Every agent run has one of four states, severity-ranked:

```
idle [0] → working [1] → blocked [2] → waiting_on_you [3]
```

`waiting_on_you` is the one that matters. It's the difference between "the agent is busy" and "the agent is done and needs a human decision." When a revenue agent drafts an invoice, it doesn't *send* it — it lands in a "needs you" queue with `["Approve & send", "Edit", "Reject"]`. The framework tracks this as a first-class `NeedsYouItem`, not a log line.

Aggregating across runs gives you the only number an operator actually wants: `worstState(runs)` → what needs my attention *right now*.

## The part I'm most proud of: honest evaluation

The orchestration stuff is useful. The evaluation harness is where I think the project earns its keep — because I made three decisions that most demo projects skip.

**1. Scoring is deterministic.** No LLM judging another LLM's output. Accuracy is a checklist of `mustContain` / `mustNotContain` phrases plus token-overlap (Jaccard) against a reference answer. Latency and cost are normalized so the *best* value maps to 1.0 and the rest scale down. Every number is reproducible — run it twice, get the same result.

**2. The benchmarks are actually discriminating.** This is the subtle one. If your test case asks "review this PR" and scores on whether the output contains "bug" and "security," an echo-only provider — one that just repeats the prompt back — would score *zero* only if those tokens don't appear in the prompt. So I wrote every `mustContain` token to be absent from the prompt. A lazy model earns nothing for free.

**3. Cost is never fabricated.** If a provider has no token pricing configured, its `costUsd` is `0` — not an invented number. I'd rather report "unknown" than make the benchmark look more complete than it is.

Put it together and you get a question with a real answer:

```
┌──────┬──────────┬─────────────┬───────────┬──────────┬──────────┬──────────┐
│ rank │ provider │ model       │ composite │ accuracy │ latency  │ cost     │
├──────┼──────────┼─────────────┼───────────┼──────────┼──────────┼──────────┤
│ 1    │ atlas    │ atlas-large │     0.589 │    0.851 │   2400ms │  $0.0675 │
│ 2    │ penny    │ penny-lite  │     0.565 │    0.533 │    850ms │  $0.0015 │
│ 3    │ swift    │ swift-mini  │     0.376 │    0.155 │    120ms │  $0.0270 │
└──────┴──────────┴─────────────┴───────────┴──────────┴──────────┴──────────┘
```

The "slow but thorough" provider wins on the accuracy-weighted composite, but the "cheap" one flips the revenue and ops teams where its cost edge is decisive. That's a *real* tradeoff surface, not a canned demo.

## What I'd do differently

- **The routing regex is naive.** It works for a fixed vocabulary of teams, but real dispatch needs embeddings or at least synonym expansion when the team set grows. The good news: it's a pure function, so swapping in a smarter classifier is a one-file change.
- **Latency and cost normalization is per-run, not per-benchmark.** Right now a provider's latency score is computed against the other providers *in the same benchmark*. Across a full suite, the picture is a bit noisier than it should be.
- **The evaluation is a starting point, not a benchmark suite.** Real evaluation needs ground-truth datasets, not hand-written criteria. This is the honest framing: it's a harness you can plug a real dataset into, not a leaderboard worth publishing numbers from yet.

## The takeaway

The whole thing is ~1,400 lines of TypeScript with zero runtime dependencies, MIT licensed, and it runs offline — you can clone it and run `npm run demo` with no API keys and no network.

If there's one idea I want to leave you with, it's this: **the hard part of multi-agent systems isn't the agents — it's the scaffolding.** Routing, state, and evaluation are boring, and they're exactly where most agent projects fall apart. Build those three things as plain, testable code first, and the agents become the easy part.

---

*[agent-company](https://github.com/JoshuaHidary/agent-company) — a multi-agent orchestration framework with a built-in evaluation harness. MIT licensed.*
