import type { Benchmark } from "./types.js";

/**
 * Benchmark definitions — one suite per team.
 *
 * Cases are deliberately discriminating: `mustContain` phrases never appear
 * in the prompt itself (so an echo-only provider earns nothing for free),
 * `mustNotContain` catches refusal/apology patterns, and at least one case
 * per benchmark carries a `reference` answer for token-overlap scoring.
 */

/** Engineering: code review, CI triage, and release readiness. */
const ENGINEERING: Benchmark = {
  id: "eng-core",
  name: "Engineering Core",
  description: "Code review, CI debugging, and deployment planning.",
  team: "engineering",
  cases: [
    {
      id: "eng-code-review",
      team: "engineering",
      prompt: "Look over the latest pull request and tell me if it is safe to merge.",
      expectedTools: ["read_file", "bash"],
      criteria: {
        mustContain: ["bug", "security"],
        mustNotContain: ["i can't", "as an ai"],
      },
    },
    {
      id: "eng-debug-ci",
      team: "engineering",
      prompt: "Our continuous integration run is red. Figure out why.",
      expectedTools: ["read_file", "bash"],
      criteria: {
        mustContain: ["test", "logs"],
        mustNotContain: ["apologize"],
      },
    },
    {
      id: "eng-release-plan",
      team: "engineering",
      prompt: "Prepare everything we need before tomorrow's production push.",
      expectedTools: ["read_file", "bash"],
      criteria: {
        mustContain: ["rollback", "monitor"],
        reference:
          "Deployment checklist: run the test suite, tag the release, deploy to staging, verify health checks, monitor error rates, and keep a rollback plan ready.",
      },
    },
  ],
};

/** Revenue: invoicing, collections, and forecasting. */
const REVENUE: Benchmark = {
  id: "rev-core",
  name: "Revenue Core",
  description: "Invoicing, payment follow-ups, and revenue forecasting.",
  team: "revenue",
  cases: [
    {
      id: "rev-invoice",
      team: "revenue",
      prompt: "Draft the Q3 bill for the REQCE account.",
      criteria: {
        mustContain: ["total", "due"],
        mustNotContain: ["i can't", "apologize"],
      },
    },
    {
      id: "rev-followup",
      team: "revenue",
      prompt: "Write a note about the unpaid Stage 2 milestone.",
      criteria: {
        mustContain: ["payment", "reminder"],
        mustNotContain: ["sorry"],
      },
    },
    {
      id: "rev-forecast",
      team: "revenue",
      prompt: "Summarize expected income for next quarter.",
      criteria: {
        mustContain: ["revenue", "pipeline"],
        reference:
          "Quarterly revenue forecast: pipeline of signed contracts, expected payment schedule, and projected totals per account.",
      },
    },
  ],
};

/** Ops: standups, scheduling, and triage. */
const OPS: Benchmark = {
  id: "ops-core",
  name: "Operations Core",
  description: "Standup synthesis, calendar management, and inbox triage.",
  team: "ops",
  cases: [
    {
      id: "ops-standup",
      team: "ops",
      prompt: "Turn this morning's standup notes into next steps.",
      criteria: {
        mustContain: ["action", "owner"],
        mustNotContain: ["i can't"],
      },
    },
    {
      id: "ops-calendar",
      team: "ops",
      prompt: "Organize tomorrow so the deep-work block is protected.",
      criteria: {
        mustContain: ["schedule", "calendar"],
        reference:
          "Tomorrow's schedule: calendar holds a protected deep-work block in the morning, meetings batched in the afternoon, and a review slot at the end of the day.",
      },
    },
    {
      id: "ops-inbox",
      team: "ops",
      prompt: "Go through the overnight messages and flag anything pressing.",
      criteria: {
        mustContain: ["priority", "escalate"],
        mustNotContain: ["apologize"],
      },
    },
  ],
};

/** Intelligence: competitive scans, digests, and risk analysis. */
const INTELLIGENCE: Benchmark = {
  id: "intel-core",
  name: "Intelligence Core",
  description: "Competitor tracking, research digests, and risk assessment.",
  team: "intelligence",
  cases: [
    {
      id: "intel-competitors",
      team: "intelligence",
      prompt: "What did rival clinical AI products ship this month?",
      criteria: {
        mustContain: ["competitor", "feature"],
        mustNotContain: ["i can't"],
      },
    },
    {
      id: "intel-digest",
      team: "intelligence",
      prompt: "Prepare the Monday research briefing.",
      criteria: {
        mustContain: ["summary", "trend"],
        reference:
          "Research digest: a summary of the week's findings, key market trends, notable competitor moves, and recommended follow-ups.",
      },
    },
    {
      id: "intel-risk",
      team: "intelligence",
      prompt: "Assess how the new regulation affects our roadmap.",
      criteria: {
        mustContain: ["risk", "impact"],
        mustNotContain: ["apologize"],
      },
    },
  ],
};

/** Growth: announcements, discoverability, and campaigns. */
const GROWTH: Benchmark = {
  id: "growth-core",
  name: "Growth Core",
  description: "Product announcements, SEO, and campaign planning.",
  team: "growth",
  cases: [
    {
      id: "growth-announce",
      team: "growth",
      prompt: "Announce the dashboard redesign to our users.",
      expectedTools: ["web_search", "publish"],
      criteria: {
        mustContain: ["launch", "blog"],
        mustNotContain: ["i can't"],
      },
    },
    {
      id: "growth-seo",
      team: "growth",
      prompt: "Improve how easily people find our docs pages.",
      expectedTools: ["web_search", "publish"],
      criteria: {
        mustContain: ["keyword", "search"],
        mustNotContain: ["apologize"],
      },
    },
    {
      id: "growth-campaign",
      team: "growth",
      prompt: "Plan next month's newsletter push.",
      expectedTools: ["web_search", "publish"],
      criteria: {
        mustContain: ["audience", "engagement"],
        reference:
          "Campaign plan: define the audience, draft the newsletter, schedule the send, and measure engagement with open and click rates.",
      },
    },
  ],
};

/** All benchmarks, one per team. */
export const BENCHMARKS: Benchmark[] = [
  ENGINEERING,
  REVENUE,
  OPS,
  INTELLIGENCE,
  GROWTH,
];

/** Look up a benchmark by id; undefined when no benchmark matches. */
export function benchmarkById(id: string): Benchmark | undefined {
  return BENCHMARKS.find((b) => b.id === id);
}
