import type {
  Benchmark,
  CaseScore,
  EvalProvider,
  EvalResult,
  ProviderOutput,
  ScoringWeights,
} from "./types.js";
import { DEFAULT_WEIGHTS } from "./types.js";
import {
  compositeScore,
  normalizeToBest,
  scoreAccuracy,
  scoreTools,
} from "./scorer.js";

/** Arithmetic mean; 0 for an empty list. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sum of a list. */
function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Run every case of a benchmark through every provider and score the
 * results.
 *
 * Accuracy and tool correctness are absolute (per case). Latency and cost
 * are relative: each provider's *mean latency* and *total cost* are
 * normalized across the field with `normalizeToBest`, so the cheapest /
 * fastest provider scores 1.0 and the rest scale down. The composite is the
 * weighted sum of all four dimensions.
 */
export async function runBenchmark(
  benchmark: Benchmark,
  providers: EvalProvider[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Promise<EvalResult[]> {
  // Phase 1: collect raw outputs for every provider × case.
  const outputsByProvider: ProviderOutput[][] = [];
  for (const provider of providers) {
    const outputs: ProviderOutput[] = [];
    for (const testCase of benchmark.cases) {
      outputs.push(await provider.generate(testCase.prompt));
    }
    outputsByProvider.push(outputs);
  }

  // Phase 2: normalize latency (mean) and cost (total) across providers.
  const meanLatencies = outputsByProvider.map((outs) =>
    mean(outs.map((o) => o.latencyMs))
  );
  const totalCosts = outputsByProvider.map((outs) =>
    sum(outs.map((o) => o.costUsd))
  );
  const latencyScores = normalizeToBest(meanLatencies);
  const costScores = normalizeToBest(totalCosts);

  // Phase 3: score each case and aggregate per provider.
  return providers.map((provider, p) => {
    const outputs = outputsByProvider[p];
    const caseScores: CaseScore[] = benchmark.cases.map((testCase, c) => ({
      testCaseId: testCase.id,
      accuracy: scoreAccuracy(outputs[c].text, testCase.criteria),
      latencyScore: latencyScores[p],
      costScore: costScores[p],
      toolScore: scoreTools(outputs[c].toolCalls, testCase.expectedTools),
    }));

    const accuracy = mean(caseScores.map((s) => s.accuracy));
    const toolScore = mean(caseScores.map((s) => s.toolScore));

    return {
      benchmarkId: benchmark.id,
      provider: provider.name,
      model: provider.model,
      caseScores,
      accuracy,
      latencyMs: meanLatencies[p],
      costUsd: totalCosts[p],
      toolScore,
      composite: compositeScore(
        accuracy,
        latencyScores[p],
        costScores[p],
        toolScore,
        weights
      ),
    };
  });
}
