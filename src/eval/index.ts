/**
 * Evaluation harness — deterministic, provider-agnostic benchmarking for
 * agent teams. Scoring is pure TypeScript (no LLM in the loop); the
 * `MockProvider` runs everything offline, and real API adapters are opt-in.
 *
 * @module agent-company/eval
 */

export type {
  Criterion,
  TestCase,
  Benchmark,
  ProviderOutput,
  EvalProvider,
  CaseScore,
  EvalResult,
  LeaderboardEntry,
  ScoringWeights,
} from "./types.js";
export { DEFAULT_WEIGHTS } from "./types.js";

export {
  jaccard,
  scoreChecklist,
  scoreAccuracy,
  scoreTools,
  normalizeToBest,
  compositeScore,
} from "./scorer.js";

export type {
  MockProviderOptions,
  TokenPrice,
  OpenAIOptions,
  AnthropicOptions,
} from "./provider.js";
export {
  MockProvider,
  OpenAICompatibleProvider,
  AnthropicProvider,
} from "./provider.js";

export { BENCHMARKS, benchmarkById } from "./benchmarks.js";
export { runBenchmark } from "./runner.js";
export { buildLeaderboard } from "./leaderboard.js";
