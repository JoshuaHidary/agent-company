import type { AgentState, AgentRun } from "./types.js";

/**
 * Severity ranking for agent states. Used to compute the worst
 * (highest-attention) state across a set of runs.
 */
export const STATE_SEVERITY: Record<AgentState, number> = {
  waiting_on_you: 3,
  blocked: 2,
  working: 1,
  idle: 0,
};

/**
 * Returns the highest-severity state from a collection of agent runs.
 * An empty collection yields `idle`.
 */
export function worstState(runs: AgentRun[]): AgentState {
  let worst: AgentState = "idle";
  for (const r of runs) {
    if (STATE_SEVERITY[r.state] > STATE_SEVERITY[worst]) worst = r.state;
  }
  return worst;
}