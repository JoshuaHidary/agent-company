import type { TeamId } from "../types.js";

/**
 * Evaluation harness types.
 *
 * The harness is provider-agnostic: a `Benchmark` describes what to test,
 * an `EvalProvider` produces answers, and the scorer turns those answers
 * into comparable numbers — deterministically, with no LLM in the loop.
 */

/** Scoring criteria for a single test case. Deterministic and explainable. */
export interface Criterion {
  /** Phrases the output must contain (case-insensitive). */
  mustContain?: string[];
  /** Phrases the output must NOT contain (case-insensitive). */
  mustNotContain?: string[];
  /** Optional reference answer, scored by token overlap (Jaccard). */
  reference?: string;
}

/** A single test case within a benchmark. */
export interface TestCase {
  id: string;
  team: TeamId;
  prompt: string;
  /** Expected tool calls, in order, for tool-calling correctness. */
  expectedTools?: string[];
  criteria: Criterion;
}

/** A team-scoped suite of test cases. */
export interface Benchmark {
  id: string;
  name: string;
  description: string;
  team: TeamId;
  cases: TestCase[];
}

/** Raw output from a provider for one prompt. */
export interface ProviderOutput {
  text: string;
  latencyMs: number;
  costUsd: number;
  /** Tool names the agent invoked, in order. */
  toolCalls: string[];
  inputTokens?: number;
  outputTokens?: number;
}

/** A model/provider that can answer a prompt. */
export interface EvalProvider {
  name: string;
  model: string;
  generate(prompt: string): Promise<ProviderOutput>;
}

/** Per-dimension score for one test case. */
export interface CaseScore {
  testCaseId: string;
  accuracy: number; // 0..1
  latencyScore: number; // 0..1 (normalized across providers)
  costScore: number; // 0..1 (normalized across providers)
  toolScore: number; // 0..1 (1.0 when no tools expected)
}

/** Aggregate result for one provider on one benchmark. */
export interface EvalResult {
  benchmarkId: string;
  provider: string;
  model: string;
  caseScores: CaseScore[];
  accuracy: number; // mean case accuracy
  latencyMs: number; // mean
  costUsd: number; // total
  toolScore: number; // mean
  composite: number; // weighted
}

/** One ranked row in a leaderboard. */
export type LeaderboardEntry = EvalResult & { rank: number };

/** Relative importance of each dimension. Defaults sum to 1.0. */
export interface ScoringWeights {
  accuracy: number;
  latency: number;
  cost: number;
  tool: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  accuracy: 0.5,
  latency: 0.2,
  cost: 0.15,
  tool: 0.15,
};
