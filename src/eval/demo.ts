/**
 * Demo: evaluate three mock providers across every team benchmark.
 *
 * Deterministic and fully offline — MockProviders only, no API keys. The
 * three mocks are tuned to make the ranking non-trivial:
 *
 *   atlas — slow and pricey, but hits nearly every scoring criterion
 *   swift — fastest by far, but sloppy answers and no tool use
 *   penny — cheapest, middling accuracy and partial tool use
 *
 *   node --import tsx src/eval/demo.ts
 */

import {
  BENCHMARKS,
  MockProvider,
  runBenchmark,
  buildLeaderboard,
} from "./index.js";
import type { EvalResult, LeaderboardEntry } from "./types.js";
import { TEAMS } from "../teams.js";

/* ── Providers ─────────────────────────────────────────────────────── */

const atlas = new MockProvider("atlas", "atlas-large", {
  latencyMs: 2400,
  costUsd: 0.0045,
  phrases: [
    "Plan: flag every bug and security issue, run the test suite, read the",
    "logs, monitor error rates after deploy, and keep a rollback ready.",
    "Invoice shows the total and the amount due; payment reminder drafted.",
    "Revenue pipeline reviewed. Action items each have an owner; the",
    "calendar schedule protects deep work; priority triage set, escalate",
    "blockers. Competitor feature summary with trend analysis; risk and",
    "impact assessed. Launch blog post drafted; keyword search coverage",
    "improved; audience engagement tracked.",
  ],
  toolCalls: ["read_file", "bash", "web_search", "publish"],
});

const swift = new MockProvider("swift", "swift-mini", {
  latencyMs: 120,
  costUsd: 0.0018,
  phrases: ["Quick take: looks fine overall.", "I can't dig deeper right now."],
  toolCalls: [],
});

const penny = new MockProvider("penny", "penny-lite", {
  latencyMs: 850,
  costUsd: 0.0001,
  phrases: [
    "Notes: ran the test suite and checked the logs; drafted a payment",
    "reminder with the total due; captured action items with an owner;",
    "summary of competitor moves; scheduled the launch blog post.",
  ],
  toolCalls: ["read_file", "web_search"],
});

const providers = [atlas, swift, penny];

/* ── Run every benchmark ───────────────────────────────────────────── */

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║         Agent Company · Evaluation Demo              ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

const perBenchmark = new Map<string, LeaderboardEntry[]>();
for (const bench of BENCHMARKS) {
  const results = await runBenchmark(bench, providers);
  perBenchmark.set(bench.id, buildLeaderboard(results));
}

/* ── Per-team winners ──────────────────────────────────────────────── */

console.log("▸ Team winners — best provider per benchmark:\n");
for (const bench of BENCHMARKS) {
  const lb = perBenchmark.get(bench.id)!;
  const winner = lb[0];
  const team = TEAMS.find((t) => t.id === bench.team)!;
  console.log(
    `  ${team.icon} ${team.short.padEnd(14)} ${winner.provider.padEnd(8)}` +
      ` composite ${winner.composite.toFixed(3)}  (accuracy ${winner.accuracy.toFixed(2)})`
  );
}

/* ── Overall leaderboard (mean across benchmarks) ──────────────────── */

const overall: EvalResult[] = providers.map((p) => {
  const rows = [...perBenchmark.values()].map(
    (lb) => lb.find((e) => e.provider === p.name)!
  );
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    benchmarkId: "overall",
    provider: p.name,
    model: p.model,
    caseScores: rows.flatMap((r) => r.caseScores),
    accuracy: mean(rows.map((r) => r.accuracy)),
    latencyMs: mean(rows.map((r) => r.latencyMs)),
    costUsd: rows.reduce((a, r) => a + r.costUsd, 0),
    toolScore: mean(rows.map((r) => r.toolScore)),
    composite: mean(rows.map((r) => r.composite)),
  };
});

const leaderboard = buildLeaderboard(overall);

console.log("\n▸ Overall leaderboard — mean composite across all 5 benchmarks:\n");
console.log("  ┌──────┬──────────┬─────────────┬───────────┬──────────┬──────────┬──────────┬───────┐");
console.log("  │ rank │ provider │ model       │ composite │ accuracy │ latency  │ cost     │ tools │");
console.log("  ├──────┼──────────┼─────────────┼───────────┼──────────┼──────────┼──────────┼───────┤");
for (const e of leaderboard) {
  console.log(
    `  │ ${String(e.rank).padEnd(4)} │ ${e.provider.padEnd(8)} │ ${e.model.padEnd(11)} │` +
      ` ${e.composite.toFixed(3).padStart(9)} │ ${e.accuracy.toFixed(3).padStart(8)} │` +
      ` ${(Math.round(e.latencyMs) + "ms").padStart(8)} │ ${("$" + e.costUsd.toFixed(4)).padStart(8)} │` +
      ` ${e.toolScore.toFixed(2).padStart(5)} │`
  );
}
console.log("  └──────┴──────────┴─────────────┴───────────┴──────────┴──────────┴──────────┴───────┘");

/* ── Summary ───────────────────────────────────────────────────────── */

const champ = leaderboard[0];
console.log(`\n▸ Champion: ${champ.provider} (${champ.model})`);
console.log(
  "  Accuracy carries half the composite weight, so the slow-but-thorough"
);
console.log(
  "  provider beats the fast and cheap ones — but latency and cost keep"
);
console.log("  the race honest on close calls.");
console.log("\n✓ Eval demo complete. Deterministic scoring, no network, no keys.\n");
