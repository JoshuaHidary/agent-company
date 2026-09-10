# Agent Company

> A multi-agent orchestration framework that organizes autonomous AI agents as functional business teams — with a built-in evaluation harness for benchmarking.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6)](https://www.typescriptlang.org)

---

## Why?

Most agent frameworks treat every task as a generic prompt → tool-call loop. **Agent Company** takes a different approach: model your agents as a *company*. Five specialized teams — engineering, revenue, operations, intelligence, and growth — each with a clear mandate, state machine, and accountability.

The framework routes natural-language instructions to the right team, tracks execution state, escalates blockers, and benchmarks agent performance across models.

### The Model

| Team | Mandate | What It Watches |
|------|---------|----------------|
| 🛠 **Engineering** | Repos, PRs, deploys → working code | GitHub, CI/CD, incidents |
| 💰 **Revenue** | Deals, proposals → signed contracts | Invoices, pipeline, CRM |
| 🧭 **Ops** | Inbox, calendar → prioritized day | Email, meetings, tasks |
| 🔬 **Intelligence** | Market watch, tech eval → briefs | Competitors, papers, trends |
| 📡 **Growth** | Content, outreach → inbound | Social, publishing, brand |

Teams operate across **business domains** (environments) — personal projects, contract work, or a research lab — with each run scoped to a specific domain.

---

## Architecture

<p align="center">
  <a href="docs/architecture.html">
    <img src="docs/architecture.png" alt="Agent Company Architecture" width="800">
  </a>
</p>

**[Open interactive diagram →](docs/architecture.html)**

1. **Dispatch** — `inferDispatchTeam()` routes natural language to the correct team using prioritized keyword classification.
2. **State Machine** — every agent run cycles through `idle → working → blocked → waiting_on_you`. `worstState()` aggregates across runs.
3. **Evaluation** — benchmark runner executes agent prompts across LLMs, scoring accuracy, latency, cost, and tool-calling correctness.

---

## Quick Start

```bash
git clone https://github.com/JoshuaHidary/agent-company.git
cd agent-company
npm install
npm run demo     # no API keys needed
npm test         # 12 tests, zero deps
```

### Demo Output

```
╔══════════════════════════════════════════════════════╗
║         Agent Company · Live Demo                    ║
╚══════════════════════════════════════════════════════╝

▸ Dispatch — routing 5 instructions to teams:

  🛠 Engineering    ← "Review the open PR and deploy the auth fix"
  💰 Revenue        ← "Draft the Q3 invoice for REQCE — $12,500"
  🔬 Intelligence   ← "Scan competitors for new features in clinical AI"
  📡 Growth         ← "Write a release post for the dashboard redesign"
  🧭 Ops            ← "Summarize this morning's standup meeting"

▸ Company state — 5 teams, 5 active runs:
  🛠 Engineering      1 runs  ·  working
  💰 Revenue          1 runs  ·  working
  🧭 Ops              1 runs  ·  blocked
  🔬 Intelligence     1 runs  ·  working
  📡 Growth           1 runs  ·  idle

▸ Needs you — 1 item(s) require attention:
  💰 APPROVAL  Approve Q3 invoice for REQCE ($12,500) — ready to send

✓ Demo complete.
```

---

## API

```ts
import {
  TEAMS,                  // Team[] — all five teams with icons, accents, mandates
  teamById,               // (id: TeamId) => Team
  STATE_SEVERITY,         // Record<AgentState, number> — severity ranking
  worstState,             // (runs: AgentRun[]) => AgentState
  inferDispatchTeam,      // (text: string) => TeamId — NL → team router
  normalizeDispatchEnv,   // (env?: string) => EnvId — env scoping
} from "agent-company";
```

### State Machine

```ts
STATE_SEVERITY.idle === 0
STATE_SEVERITY.working === 1
STATE_SEVERITY.blocked === 2
STATE_SEVERITY.waiting_on_you === 3   // highest priority

worstState([
  { state: "working", /* ... */ },
  { state: "blocked", /* ... */ },
]); // → "blocked"
```

### Dispatch (NL → Team)

```ts
inferDispatchTeam("Review the open PR");      // → "engineering"
inferDispatchTeam("Draft the REQCE invoice"); // → "revenue"
inferDispatchTeam("Scan competitors");        // → "intelligence"
inferDispatchTeam("Write a launch post");     // → "growth"
inferDispatchTeam("What's on my calendar");   // → "ops"
```

---

## Evaluation Harness

A deterministic, provider-agnostic benchmark runner that answers: *which model
should run each team?* The scorer is pure TypeScript — no LLM is involved in
scoring, so results are reproducible and explainable.

**Dimensions** (weighted composite, configurable):

| Dimension | Weight | Method |
|-----------|--------|--------|
| Accuracy | 0.50 | checklist (`mustContain`/`mustNotContain`) + token-overlap vs `reference` |
| Latency | 0.20 | mean latency normalized across the field (lower is better) |
| Cost | 0.15 | total cost normalized across the field (lower is better) |
| Tool calls | 0.15 | subsequence match against `expectedTools` |

```ts
import {
  BENCHMARKS,        // one Benchmark per team (5 total, 3+ cases each)
  benchmarkById,
  runBenchmark,      // (benchmark, providers, weights?) => EvalResult[]
  buildLeaderboard,  // (results) => ranked LeaderboardEntry[]
  MockProvider,      // deterministic, no network
  OpenAICompatibleProvider,
  AnthropicProvider,
} from "agent-company";
```

**Run it** (offline, no API keys):

```bash
npm run eval    # prints a per-team + overall leaderboard
npm test        # 51 tests, including the eval harness
```

The demo pits three tuned mocks against each other — a slow-but-thorough
provider, a fast-but-sloppy one, and a cheap-but-mediocre one — so the composite
ranking is non-trivial: accuracy usually wins, but latency and cost flip close
races (the cheap provider wins the revenue and ops teams).

Real providers (`OpenAICompatibleProvider`, `AnthropicProvider`) are opt-in:
they read API keys from the environment and never fabricate cost — when no
token pricing is configured, `costUsd` is `0`, not an invented number.

---

## Use Cases

- **Agent orchestration platforms** — route user instructions to specialized agent pools
- **AI dashboards** — render company state as a live org chart
- **Model evaluation** — benchmark which LLM performs best per functional domain
- **Autonomous workflows** — cron-driven agents that report state through CompanyState
- **Research** — study agent specialization and routing effects on multi-agent performance

---

## Project Structure

```
src/
  types.ts                    # TeamId, AgentRun, NeedsYouItem, CompanyState, EnvId
  teams.ts                    # TEAMS constant, teamById()
  state.ts                    # STATE_SEVERITY, worstState()
  dispatch.ts                 # inferDispatchTeam(), normalizeDispatchEnv()
  index.ts                    # Public barrel export
  agent-company.test.ts       # Full test suite (Node.js test runner)
  demo.ts                     # Self-contained demo — no API keys
docs/
  architecture.html           # Interactive architecture diagram
```

---

## Philosophy

- **No AI slop.** Every function is deterministic, testable, and documented. Dispatch uses explicit keyword matching, not an LLM. The state machine is a finite automaton. The evaluation layer compares real outputs against real criteria.
- **Framework, not platform.** No API keys, no cloud services, no vendor lock-in. Import what you need.
- **Teams over tasks.** Organizing agents as teams with mandates creates accountability — "Revenue is drafting the Q3 invoice" instead of "do the thing."

---

## License

MIT — see [LICENSE](LICENSE).

## Author

[Joshua Hidary](https://github.com/JoshuaHidary)

*Built for anyone who wants their AI agents to run like a company, not a chat thread.*