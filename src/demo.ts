/**
 * Demo: simulate a multi-agent company in action.
 *
 * Runs a deterministic walkthrough of the core model — teams, dispatch,
 * state transitions, and the "needs you" escalation pattern — without
 * requiring any external services or API keys.
 *
 *   node --import tsx src/demo.ts
 */

import { TEAMS, inferDispatchTeam, worstState } from "./index.js";
import type { AgentRun, NeedsYouItem, CompanyState } from "./types.js";

const now = (offset = 0) =>
  new Date(Date.now() + offset * 1000).toISOString();

/* ── Dispatch: route 5 instructions to teams ──────────────────────── */

const INSTRUCTIONS = [
  "Review the open PR and deploy the auth fix",
  "Draft the Q3 invoice for REQCE — $12,500",
  "Scan competitors for new features in clinical AI",
  "Write a release post for the dashboard redesign",
  "Summarize this morning's standup meeting",
] as const;

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║         Agent Company · Live Demo                    ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

console.log("▸ Dispatch — routing 5 instructions to teams:\n");
for (const text of INSTRUCTIONS) {
  const team = inferDispatchTeam(text);
  const t = TEAMS.find((x) => x.id === team)!;
  console.log(`  ${t.icon} ${t.short.padEnd(14)} ← "${text}"`);
}

/* ── Build a live company snapshot ─────────────────────────────────── */

const runs: AgentRun[] = INSTRUCTIONS.map((text, i) => ({
  id: `run-${i + 1}`,
  team: inferDispatchTeam(text),
  env: "personal" as const,
  title: text,
  state: (["working", "working", "working", "idle", "blocked"] as const)[i],
  detail: i === 3 ? "Waiting on content approval" : "Running autonomously",
  startedAt: now(-60 * i),
  updatedAt: now(),
  source: "manual" as const,
}));

const needsYou: NeedsYouItem[] = [
  {
    id: "need-1",
    team: "revenue",
    env: "personal",
    kind: "approval",
    summary: "Approve Q3 invoice for REQCE ($12,500) — ready to send",
    options: ["Approve & send", "Edit", "Reject"],
    createdAt: now(-120),
  },
];

const state: CompanyState = {
  generatedAt: now(),
  teams: TEAMS,
  runs,
  needsYou,
};

/* ── Report ────────────────────────────────────────────────────────── */

console.log("\n▸ Company state — 5 teams, 5 active runs:");
for (const team of TEAMS) {
  const tr = runs.filter((r) => r.team === team.id);
  const st = worstState(tr);
  const current = tr.find((r) => r.state === "working") ?? tr[0];
  const pad = " ".repeat(Math.max(0, 16 - team.short.length));
  console.log(
    `  ${team.icon} ${team.short}${pad} ${String(tr.length).padStart(2)} runs  ·  ${st.replace(/_/g, " ")}`
  );
  if (current) {
    console.log(`    ▸ ${current.title}`);
  }
}

if (needsYou.length > 0) {
  console.log(`\n▸ Needs you — ${needsYou.length} item(s) require attention:`);
  for (const n of needsYou) {
    const t = TEAMS.find((x) => x.id === n.team)!;
    console.log(`  ${t.icon} ${n.kind.toUpperCase()}  ${n.summary}`);
    if (n.options) {
      console.log(`    Options: ${n.options.join("  |  ")}`);
    }
  }
}

console.log("\n▸ Summary:");
console.log(`  ${TEAMS.length} teams  ·  ${runs.length} active runs  ·  ${needsYou.length} need you`);
console.log("\n✓ Demo complete. The framework is pure TypeScript — no API keys,");
console.log("  no external services, no runtime dependencies beyond Node.js.\n");