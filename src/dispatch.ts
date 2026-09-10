import type { TeamId } from "./types.js";
import type { EnvId } from "./types.js";

/**
 * Infer which team should handle a natural-language instruction.
 * Keyword matching is prioritized: revenue checks run before engineering
 * so that overlapping terms (e.g. "contract") route correctly.
 */
export function inferDispatchTeam(text: string): TeamId {
  const value = text.toLowerCase();
  if (/invoice|proposal|contract|client|deal|reqce|re-sm|revenue/.test(value))
    return "revenue";
  if (
    /pr\b|pull request|deploy|vercel|repo|code|test|build|merge|github|incident/.test(
      value
    )
  )
    return "engineering";
  if (/market|competitor|research|opportunity|signal|trend|radar/.test(value))
    return "intelligence";
  if (/post|social|content|presence|outreach|publish|brand/.test(value))
    return "growth";
  return "ops";
}

/** Normalize a raw environment string into a valid EnvId, defaulting to "personal". */
export function normalizeDispatchEnv(env: string | undefined): EnvId {
  const valid = new Set<EnvId>(["msai", "solo", "personal"]);
  return env !== undefined && valid.has(env as EnvId) ? (env as EnvId) : "personal";
}