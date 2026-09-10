import type { Criterion, ScoringWeights } from "./types.js";
import { DEFAULT_WEIGHTS } from "./types.js";

/** Tokenize on non-alphanumerics, lowercase. */
function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
}

/** Jaccard similarity between two strings (0..1). */
export function jaccard(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Checklist score: fraction of must-contain / must-not-contain phrases
 * satisfied. Returns null when a criterion defines no checklist phrases.
 */
export function scoreChecklist(output: string, criteria: Criterion): number | null {
  const o = output.toLowerCase();
  let earned = 0;
  let total = 0;
  for (const p of criteria.mustContain ?? []) {
    total++;
    if (o.includes(p.toLowerCase())) earned++;
  }
  for (const p of criteria.mustNotContain ?? []) {
    total++;
    if (!o.includes(p.toLowerCase())) earned++;
  }
  return total === 0 ? null : earned / total;
}

/**
 * Accuracy score (0..1). Combines checklist results and, when a reference
 * answer is present, token-overlap against it. A case with neither
 * checklist nor reference scores 0.
 */
export function scoreAccuracy(output: string, criteria: Criterion): number {
  const parts: number[] = [];
  const c = scoreChecklist(output, criteria);
  if (c !== null) parts.push(c);
  if (criteria.reference) parts.push(jaccard(output, criteria.reference));
  if (parts.length === 0) return 0;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/**
 * Tool-calling correctness: fraction of expected tool calls matched as a
 * subsequence of the actual calls. Returns 1.0 when no tools are expected.
 */
export function scoreTools(actual: string[], expected?: string[]): number {
  if (!expected || expected.length === 0) return 1;
  const a = actual.map((s) => s.toLowerCase());
  const e = expected.map((s) => s.toLowerCase());
  let i = 0;
  for (const t of a) {
    if (i < e.length && t === e[i]) i++;
  }
  return i / e.length;
}

/**
 * Normalize a list of non-negative values so the best (lowest) maps to 1.0
 * and the rest scale as min/value. Latency and cost both use this: lower is
 * better. All-equal inputs yield all 1.0.
 */
export function normalizeToBest(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  if (min <= 0) {
    return values.map((v) => (v <= 0 ? 1 : 0));
  }
  return values.map((v) => Math.min(1, min / v));
}

/** Weighted composite of the four dimensions (0..1). */
export function compositeScore(
  accuracy: number,
  latencyScore: number,
  costScore: number,
  toolScore: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  return (
    weights.accuracy * accuracy +
    weights.latency * latencyScore +
    weights.cost * costScore +
    weights.tool * toolScore
  );
}
