import test from "node:test";
import assert from "node:assert/strict";
import {
  jaccard,
  scoreChecklist,
  scoreAccuracy,
  scoreTools,
  normalizeToBest,
  compositeScore,
  DEFAULT_WEIGHTS,
  MockProvider,
  BENCHMARKS,
  benchmarkById,
  runBenchmark,
  buildLeaderboard,
} from "./index.js";
import type { Benchmark, EvalResult } from "./types.js";

/* ── jaccard ───────────────────────────────────────────────────────── */

test("jaccard: identical strings score 1", () => {
  assert.equal(jaccard("the quick fox", "the quick fox"), 1);
});

test("jaccard: disjoint strings score 0", () => {
  assert.equal(jaccard("alpha beta", "gamma delta"), 0);
});

test("jaccard: partial overlap", () => {
  // tokens {a,b,c} vs {b,c,d} → 2 / 4
  assert.equal(jaccard("a b c", "b c d"), 0.5);
});

test("jaccard: case- and punctuation-insensitive", () => {
  assert.equal(jaccard("Hello, World!", "hello world"), 1);
});

test("jaccard: both empty → 1, one empty → 0", () => {
  assert.equal(jaccard("", ""), 1);
  assert.equal(jaccard("", "something"), 0);
  // punctuation-only tokenizes to nothing
  assert.equal(jaccard("!!!", "..."), 1);
});

/* ── scoreChecklist ────────────────────────────────────────────────── */

test("scoreChecklist: null when no phrases defined", () => {
  assert.equal(scoreChecklist("anything", {}), null);
  assert.equal(scoreChecklist("anything", { reference: "ref only" }), null);
});

test("scoreChecklist: fraction of mustContain satisfied, case-insensitive", () => {
  assert.equal(
    scoreChecklist("Found a BUG in the diff", { mustContain: ["bug", "security"] }),
    0.5
  );
  assert.equal(
    scoreChecklist("bug and security", { mustContain: ["bug", "security"] }),
    1
  );
});

test("scoreChecklist: mustNotContain earns credit when absent", () => {
  assert.equal(scoreChecklist("all good", { mustNotContain: ["i can't"] }), 1);
  assert.equal(scoreChecklist("I can't do that", { mustNotContain: ["i can't"] }), 0);
});

test("scoreChecklist: combines both lists", () => {
  const c = { mustContain: ["yes"], mustNotContain: ["no"] };
  assert.equal(scoreChecklist("yes", c), 1);
  assert.equal(scoreChecklist("yes and no", c), 0.5);
  assert.equal(scoreChecklist("neither", c), 0.5);
});

/* ── scoreAccuracy ─────────────────────────────────────────────────── */

test("scoreAccuracy: no signals → 0", () => {
  assert.equal(scoreAccuracy("whatever", {}), 0);
});

test("scoreAccuracy: checklist only", () => {
  assert.equal(scoreAccuracy("has bug", { mustContain: ["bug"] }), 1);
});

test("scoreAccuracy: reference only uses jaccard", () => {
  assert.equal(scoreAccuracy("a b c", { reference: "a b c" }), 1);
  assert.equal(scoreAccuracy("a b c", { reference: "b c d" }), 0.5);
});

test("scoreAccuracy: mean of checklist and reference", () => {
  // checklist = 1, jaccard("a b", "a b") = 1 → 1
  assert.equal(scoreAccuracy("a b", { mustContain: ["a"], reference: "a b" }), 1);
  // checklist = 0, jaccard = 1 → 0.5
  assert.equal(scoreAccuracy("a b", { mustContain: ["z"], reference: "a b" }), 0.5);
});

/* ── scoreTools ────────────────────────────────────────────────────── */

test("scoreTools: 1.0 when no tools expected", () => {
  assert.equal(scoreTools(["anything"]), 1);
  assert.equal(scoreTools([], []), 1);
});

test("scoreTools: full subsequence match", () => {
  assert.equal(scoreTools(["read_file", "grep", "bash"], ["read_file", "bash"]), 1);
});

test("scoreTools: order matters (subsequence, not set)", () => {
  assert.equal(scoreTools(["bash", "read_file"], ["read_file", "bash"]), 0.5);
});

test("scoreTools: partial and zero matches, case-insensitive", () => {
  assert.equal(scoreTools(["READ_FILE"], ["read_file", "bash"]), 0.5);
  assert.equal(scoreTools([], ["read_file"]), 0);
});

/* ── normalizeToBest ───────────────────────────────────────────────── */

test("normalizeToBest: empty → empty", () => {
  assert.deepEqual(normalizeToBest([]), []);
});

test("normalizeToBest: lowest maps to 1.0, rest scale as min/value", () => {
  assert.deepEqual(normalizeToBest([100, 200, 400]), [1, 0.5, 0.25]);
});

test("normalizeToBest: all equal → all 1.0", () => {
  assert.deepEqual(normalizeToBest([5, 5, 5]), [1, 1, 1]);
});

test("normalizeToBest: min <= 0 → 1 for non-positive values, 0 otherwise", () => {
  assert.deepEqual(normalizeToBest([0, 10]), [1, 0]);
  assert.deepEqual(normalizeToBest([-1, 0, 3]), [1, 1, 0]);
});

/* ── compositeScore ────────────────────────────────────────────────── */

test("compositeScore: uses DEFAULT_WEIGHTS by default", () => {
  assert.equal(compositeScore(1, 1, 1, 1), 1);
  assert.equal(compositeScore(1, 0, 0, 0), DEFAULT_WEIGHTS.accuracy);
  assert.equal(compositeScore(0, 1, 0, 0), DEFAULT_WEIGHTS.latency);
});

test("compositeScore: custom weights", () => {
  const w = { accuracy: 1, latency: 0, cost: 0, tool: 0 };
  assert.equal(compositeScore(0.7, 0.1, 0.1, 0.1, w), 0.7);
});

test("DEFAULT_WEIGHTS sums to 1.0", () => {
  const { accuracy, latency, cost, tool } = DEFAULT_WEIGHTS;
  assert.equal(accuracy + latency + cost + tool, 1);
});

/* ── MockProvider ──────────────────────────────────────────────────── */

test("MockProvider: echoes prompt plus phrases, deterministic", async () => {
  const p = new MockProvider("m", "mock-1", {
    latencyMs: 250,
    costUsd: 0.002,
    phrases: ["extra", "words"],
    toolCalls: ["bash"],
  });
  const out1 = await p.generate("hello");
  const out2 = await p.generate("hello");
  assert.equal(out1.text, "hello extra words");
  assert.equal(out1.latencyMs, 250);
  assert.equal(out1.costUsd, 0.002);
  assert.deepEqual(out1.toolCalls, ["bash"]);
  assert.deepEqual(out1, out2);
});

test("MockProvider: respond override wins over phrases", async () => {
  const p = new MockProvider("m", "mock-1", {
    phrases: ["ignored"],
    respond: (prompt) => `custom:${prompt}`,
  });
  const out = await p.generate("x");
  assert.equal(out.text, "custom:x");
});

/* ── benchmarks ────────────────────────────────────────────────────── */

test("BENCHMARKS: five suites, one per team, 3+ cases each", () => {
  assert.equal(BENCHMARKS.length, 5);
  const teams = BENCHMARKS.map((b) => b.team);
  assert.deepEqual(
    [...teams].sort(),
    ["engineering", "growth", "intelligence", "ops", "revenue"]
  );
  for (const b of BENCHMARKS) {
    assert.ok(b.cases.length >= 3, `${b.id} has ${b.cases.length} cases`);
    for (const c of b.cases) {
      assert.equal(c.team, b.team, `${c.id} team matches benchmark`);
    }
  }
});

test("BENCHMARKS: every benchmark has at least one reference case", () => {
  for (const b of BENCHMARKS) {
    assert.ok(
      b.cases.some((c) => typeof c.criteria.reference === "string"),
      `${b.id} has a reference case`
    );
  }
});

test("BENCHMARKS: engineering and growth cases expect tools", () => {
  for (const id of ["eng-core", "growth-core"]) {
    const b = benchmarkById(id)!;
    assert.ok(
      b.cases.some((c) => (c.expectedTools?.length ?? 0) > 0),
      `${id} has expectedTools`
    );
  }
});

test("benchmarkById: finds by id, undefined for unknown", () => {
  assert.equal(benchmarkById("eng-core")?.team, "engineering");
  assert.equal(benchmarkById("nope"), undefined);
});

/* ── runner ────────────────────────────────────────────────────────── */

const TINY_BENCH: Benchmark = {
  id: "tiny",
  name: "Tiny",
  description: "Two cases for runner tests.",
  team: "ops",
  cases: [
    {
      id: "t1",
      team: "ops",
      prompt: "first prompt",
      expectedTools: ["bash"],
      criteria: { mustContain: ["good"] },
    },
    {
      id: "t2",
      team: "ops",
      prompt: "second prompt",
      criteria: { mustContain: ["good"], mustNotContain: ["bad"] },
    },
  ],
};

test("runBenchmark: scores, normalizes, and aggregates per provider", async () => {
  const strong = new MockProvider("strong", "m-strong", {
    latencyMs: 100,
    costUsd: 0.001,
    phrases: ["good"],
    toolCalls: ["bash"],
  });
  const weak = new MockProvider("weak", "m-weak", {
    latencyMs: 200,
    costUsd: 0.004,
    phrases: [],
  });

  const results = await runBenchmark(TINY_BENCH, [strong, weak]);
  assert.equal(results.length, 2);

  const s = results.find((r) => r.provider === "strong")!;
  const w = results.find((r) => r.provider === "weak")!;

  // strong: both cases fully satisfied.
  assert.equal(s.accuracy, 1);
  assert.equal(s.toolScore, 1);
  assert.equal(s.latencyMs, 100);
  assert.equal(s.costUsd, 0.002); // 2 cases × 0.001, summed
  assert.equal(s.caseScores.length, 2);
  // strong is fastest and cheapest → both normalized scores are 1.
  assert.equal(s.caseScores[0].latencyScore, 1);
  assert.equal(s.caseScores[0].costScore, 1);
  assert.equal(s.composite, compositeScore(1, 1, 1, 1));

  // weak: echoes only — misses "good" (t1 0/1), avoids "bad" (t2 1/2).
  assert.equal(w.accuracy, 0.25);
  // no tool calls: t1 expects bash → 0; t2 expects none → 1; mean 0.5.
  assert.equal(w.toolScore, 0.5);
  // 2× slower and 4× costlier than strong.
  assert.equal(w.caseScores[0].latencyScore, 0.5);
  assert.equal(w.caseScores[0].costScore, 0.25);
  assert.ok(s.composite > w.composite);
});

test("runBenchmark: honors custom weights", async () => {
  const fast = new MockProvider("fast", "m", { latencyMs: 10, phrases: [] });
  const slow = new MockProvider("slow", "m", { latencyMs: 100, phrases: ["good"] });
  // Weigh latency only: the fast-but-wrong provider must win.
  const results = await runBenchmark(TINY_BENCH, [fast, slow], {
    accuracy: 0,
    latency: 1,
    cost: 0,
    tool: 0,
  });
  const f = results.find((r) => r.provider === "fast")!;
  const sl = results.find((r) => r.provider === "slow")!;
  assert.equal(f.composite, 1);
  assert.equal(sl.composite, 0.1);
});

test("runBenchmark: single provider gets best-normalized latency and cost", async () => {
  const only = new MockProvider("only", "m", { latencyMs: 999, costUsd: 9 });
  const [r] = await runBenchmark(TINY_BENCH, [only]);
  assert.equal(r.caseScores[0].latencyScore, 1);
  assert.equal(r.caseScores[0].costScore, 1);
});

/* ── leaderboard ───────────────────────────────────────────────────── */

function result(provider: string, composite: number): EvalResult {
  return {
    benchmarkId: "b",
    provider,
    model: "m",
    caseScores: [],
    accuracy: 0,
    latencyMs: 0,
    costUsd: 0,
    toolScore: 0,
    composite,
  };
}

test("buildLeaderboard: sorts by composite descending, ranks from 1", () => {
  const lb = buildLeaderboard([result("a", 0.3), result("b", 0.9), result("c", 0.6)]);
  assert.deepEqual(
    lb.map((e) => [e.provider, e.rank]),
    [["b", 1], ["c", 2], ["a", 3]]
  );
});

test("buildLeaderboard: ties share a rank, next rank skips", () => {
  const lb = buildLeaderboard([
    result("a", 0.5),
    result("b", 0.9),
    result("c", 0.9),
    result("d", 0.1),
  ]);
  assert.deepEqual(
    lb.map((e) => [e.provider, e.rank]),
    [["b", 1], ["c", 1], ["a", 3], ["d", 4]]
  );
});

test("buildLeaderboard: ties break deterministically by provider name", () => {
  const lb = buildLeaderboard([result("zeta", 0.5), result("alpha", 0.5)]);
  assert.deepEqual(lb.map((e) => e.provider), ["alpha", "zeta"]);
});

test("buildLeaderboard: does not mutate its input", () => {
  const input = [result("a", 0.1), result("b", 0.9)];
  buildLeaderboard(input);
  assert.equal(input[0].provider, "a");
});

test("buildLeaderboard: empty input → empty leaderboard", () => {
  assert.deepEqual(buildLeaderboard([]), []);
});

/* ── end-to-end: benchmarks × mocks × leaderboard ──────────────────── */

test("end-to-end: full benchmark suite ranks an accurate mock first", async () => {
  const accurate = new MockProvider("accurate", "m-a", {
    latencyMs: 2000,
    costUsd: 0.004,
    phrases: [
      "bug security test logs rollback monitor total due payment reminder",
      "revenue pipeline action owner schedule calendar priority escalate",
      "competitor feature summary trend risk impact launch blog keyword",
      "search audience engagement",
    ],
    toolCalls: ["read_file", "bash", "web_search", "publish"],
  });
  const sloppy = new MockProvider("sloppy", "m-s", {
    latencyMs: 100,
    costUsd: 0.001,
    phrases: ["I can't be sure."],
  });

  for (const bench of BENCHMARKS) {
    const lb = buildLeaderboard(await runBenchmark(bench, [accurate, sloppy]));
    assert.equal(lb[0].provider, "accurate", `${bench.id} winner`);
    assert.equal(lb[0].rank, 1);
    assert.ok(lb[0].composite > lb[1].composite, `${bench.id} strict order`);
  }
});
