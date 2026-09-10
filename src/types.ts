/**
 * Agent Company — a multi-agent orchestration framework.
 *
 * Models autonomous agents as members of functional business teams:
 * engineering, revenue, operations, intelligence, and growth. Each team
 * operates across business domains with a shared state machine, dispatch
 * system, and evaluation harness.
 *
 * @module agent-company
 */

/* ── Types ────────────────────────────────────────────────────────── */

/** Functional team identifier. */
export type TeamId = "engineering" | "revenue" | "ops" | "intelligence" | "growth";

/** Business domain identifier. */
export type EnvId = "personal" | "solo" | "msai";

/** A team definition — its identity, visual signature, and mandate. */
export interface Team {
  id: TeamId;
  name: string;
  short: string;
  icon: string;
  accent: string;
  mandate: string;
}

/** The lifecycle state of an agent run. */
export type AgentState = "working" | "idle" | "blocked" | "waiting_on_you";

/** A single agent execution — what a team member is doing right now. */
export interface AgentRun {
  id: string;
  team: TeamId;
  env: EnvId;
  title: string;
  state: AgentState;
  detail?: string;
  needsYouId?: string;
  startedAt: string;
  updatedAt: string;
  source: "cron" | "delegate" | "manual";
  jobRef?: string;
}

/** Classification for an item that requires human attention. */
export type NeedsYouKind = "approval" | "decision" | "blocked" | "review";

/** A single item requiring operator intervention. */
export interface NeedsYouItem {
  id: string;
  team: TeamId;
  env: EnvId;
  kind: NeedsYouKind;
  summary: string;
  options?: string[];
  createdAt: string;
  ref?: string;
}

/** The complete company state at a point in time. */
export interface CompanyState {
  generatedAt: string;
  teams: Team[];
  runs: AgentRun[];
  needsYou: NeedsYouItem[];
}