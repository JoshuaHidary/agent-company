import test from "node:test";
import assert from "node:assert/strict";
import {
  TEAMS,
  teamById,
  STATE_SEVERITY,
  worstState,
  inferDispatchTeam,
  normalizeDispatchEnv,
} from "./index.js";
import type { AgentRun } from "./types.js";

/* ── Teams ─────────────────────────────────────────────────────────── */

test("TEAMS defines five teams with unique ids", () => {
  assert.equal(TEAMS.length, 5);
  const ids = TEAMS.map((t) => t.id);
  assert.equal(new Set(ids).size, 5);
});

test("every team has required display fields", () => {
  for (const t of TEAMS) {
    assert.ok(t.name.length > 0, `${t.id} name`);
    assert.ok(t.short.length > 0, `${t.id} short`);
    assert.ok(t.mandate.length > 0, `${t.id} mandate`);
    assert.ok(t.accent.startsWith("#"), `${t.id} accent`);
  }
});

test("teamById returns the matching team", () => {
  assert.equal(teamById("engineering").short, "Engineering");
  assert.equal(teamById("revenue").icon, "💰");
});

test("teamById falls back to the first team for unknown ids", () => {
  assert.equal(teamById("unknown" as any), TEAMS[0]);
});

/* ── State Machine ─────────────────────────────────────────────────── */

test("STATE_SEVERITY ordering: idle < working < blocked < waiting_on_you", () => {
  assert.ok(STATE_SEVERITY.waiting_on_you > STATE_SEVERITY.blocked);
  assert.ok(STATE_SEVERITY.blocked > STATE_SEVERITY.working);
  assert.ok(STATE_SEVERITY.working > STATE_SEVERITY.idle);
});

test("STATE_SEVERITY covers every AgentState", () => {
  const states: AgentRun["state"][] = [
    "working",
    "idle",
    "blocked",
    "waiting_on_you",
  ];
  for (const s of states) {
    assert.ok(s in STATE_SEVERITY, s);
  }
});

test("worstState picks the highest severity", () => {
  const r = (state: AgentRun["state"]): AgentRun => ({
    id: state,
    team: "ops",
    env: "personal",
    title: "",
    state,
    startedAt: "",
    updatedAt: "",
    source: "manual",
  });

  assert.equal(worstState([r("idle"), r("working")]), "working");
  assert.equal(worstState([r("idle"), r("blocked")]), "blocked");
  assert.equal(
    worstState([r("working"), r("waiting_on_you")]),
    "waiting_on_you"
  );
});

test("worstState returns idle for empty runs", () => {
  assert.equal(worstState([]), "idle");
});

/* ── Dispatch ──────────────────────────────────────────────────────── */

test("inferDispatchTeam routes natural language to correct teams", () => {
  assert.equal(
    inferDispatchTeam("Review the open PR and deploy the fix"),
    "engineering"
  );
  assert.equal(inferDispatchTeam("Draft the REQCE Stage 1 invoice"), "revenue");
  assert.equal(
    inferDispatchTeam("Scan competitors for new features"),
    "intelligence"
  );
  assert.equal(inferDispatchTeam("Write a post about our new release"), "growth");
  assert.equal(inferDispatchTeam("What's on my calendar today"), "ops");
  assert.equal(inferDispatchTeam("random text with no keywords"), "ops");
});

test("inferDispatchTeam is case-insensitive", () => {
  assert.equal(inferDispatchTeam("DEPLOY THE FIX"), "engineering");
});

test("inferDispatchTeam prioritizes revenue over engineering for overlapping terms", () => {
  assert.equal(inferDispatchTeam("Review the contract"), "revenue");
});

test("normalizeDispatchEnv accepts valid envs and defaults otherwise", () => {
  assert.equal(normalizeDispatchEnv("msai"), "msai");
  assert.equal(normalizeDispatchEnv("solo"), "solo");
  assert.equal(normalizeDispatchEnv(undefined), "personal");
  assert.equal(normalizeDispatchEnv("all"), "personal");
});