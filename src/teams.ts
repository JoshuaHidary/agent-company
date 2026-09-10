import type { Team, TeamId } from "./types.js";

/**
 * The five functional teams that comprise the agent company.
 * Each carries a visual signature (icon, accent color) and a mandate
 * describing what it owns and what it produces.
 */
export const TEAMS: Team[] = [
  {
    id: "engineering",
    name: "Engineering & Delivery",
    short: "Engineering",
    icon: "🛠",
    accent: "#38e0a0",
    mandate: "Repos, PRs, deploys, incidents → working, deployed code",
  },
  {
    id: "revenue",
    name: "Revenue & Clients",
    short: "Revenue",
    icon: "💰",
    accent: "#ffc75a",
    mandate: "Deals, proposals, contracts, invoicing → signed deals & sent invoices",
  },
  {
    id: "ops",
    name: "Chief of Staff & Ops",
    short: "Ops",
    icon: "🧭",
    accent: "#2ff3ff",
    mandate:
      "Inbox, calendar, meetings, action inbox → nothing dropped, one prioritized day",
  },
  {
    id: "intelligence",
    name: "Intelligence & Research",
    short: "Intelligence",
    icon: "🔬",
    accent: "#b478ff",
    mandate:
      "Tech eval, market watch, opportunity radar → briefs & alerts before you ask",
  },
  {
    id: "growth",
    name: "Growth & Presence",
    short: "Growth",
    icon: "📡",
    accent: "#ff7ab8",
    mandate:
      "Content, social, outreach, brand → published work & inbound",
  },
];

export function teamById(id: TeamId): Team {
  return TEAMS.find((t) => t.id === id) ?? TEAMS[0];
}