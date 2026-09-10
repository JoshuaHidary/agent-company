# Quickstart

Five minutes from clone to a working multi-agent company — no API keys, no
network, no cloud.

## 1. Install

```bash
git clone https://github.com/JoshuaHidary/agent-company.git
cd agent-company
npm install
```

## 2. See it work

```bash
npm run demo
```

Routes five natural-language instructions to teams and renders the live company
state — including a "needs you" escalation for the revenue invoice.

```bash
npm run eval
```

Runs every benchmark through three mock providers and prints a ranked
leaderboard showing which provider wins each team.

## 3. Use it in your code

```ts
import { TEAMS, inferDispatchTeam, worstState } from "agent-company";

// Route a request to the right team
const team = inferDispatchTeam("Draft the Q3 invoice"); // → "revenue"

// Find what needs your attention
const worst = worstState(runs); // → "waiting_on_you" if anything is blocked on you
```

Or benchmark a model:

```ts
import { BENCHMARKS, runBenchmark, buildLeaderboard, MockProvider } from "agent-company";

const results = await runBenchmark(BENCHMARKS[0], [
  new MockProvider("fast", "fast-mini", { latencyMs: 100, costUsd: 0.001, phrases: ["bug", "security"] }),
  new MockProvider("slow", "slow-large", { latencyMs: 3000, costUsd: 0.05, phrases: ["bug", "security", "rollback", "monitor"] }),
]);

const leaderboard = buildLeaderboard(results); // ranked, deterministic
```

## 4. Plug in real models (optional)

```ts
import { OpenAICompatibleProvider, AnthropicProvider } from "agent-company";

const gpt = new OpenAICompatibleProvider("openai", "gpt-4o", {
  price: { inputPer1k: 2.5, outputPer1k: 10 },
});
const claude = new AnthropicProvider("anthropic", "claude-sonnet-4", {
  price: { inputPer1k: 3, outputPer1k: 15 },
});
```

Keys are read from `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`. When no pricing is
configured, `costUsd` is reported as `0` — the harness never fabricates cost.

## Next

- [README](../README.md) — full API and architecture
- [CONTRIBUTING](../CONTRIBUTING.md) — how to add teams and benchmarks
- [Architecture diagram](../docs/architecture.html) — interactive SVG
