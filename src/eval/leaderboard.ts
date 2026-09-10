import type { EvalResult, LeaderboardEntry } from "./types.js";

/**
 * Rank evaluation results by composite score, descending.
 *
 * Ties (identical composites) share a rank and the next distinct composite
 * skips past them (1, 1, 3 — competition ranking). Tied entries are ordered
 * deterministically by provider name ascending.
 */
export function buildLeaderboard(results: EvalResult[]): LeaderboardEntry[] {
  const sorted = [...results].sort(
    (a, b) => b.composite - a.composite || a.provider.localeCompare(b.provider)
  );
  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const tiedWithPrevious =
      i > 0 && sorted[i].composite === sorted[i - 1].composite;
    const rank = tiedWithPrevious ? entries[i - 1].rank : i + 1;
    entries.push({ ...sorted[i], rank });
  }
  return entries;
}
