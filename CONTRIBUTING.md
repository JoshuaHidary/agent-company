# Contributing

Thanks for your interest in `agent-company`. This is a small, deliberately
minimal framework — the contribution bar is *quality over quantity*.

## Ground rules

1. **No AI slop.** Every function must be deterministic, typed, documented, and
   unit-tested. If a change can't be reasoned about without running a model,
   it doesn't belong here.
2. **Zero runtime dependencies.** Build and test tooling (`tsc`, `tsx`) is fine
   as a dev dependency; production code imports nothing but the standard library.
3. **Scoring is deterministic.** The evaluation harness must never call an LLM
   to score an LLM. Scores are pure functions of text, latency, and cost.
4. **No fabricated data.** Costs, latencies, and tool calls must come from real
   provider output or an explicit mock. Never invent a number to make a result
   look complete.

## Development

```bash
npm install          # install tsc + tsx (dev only)
npm run typecheck    # strict TypeScript check
npm test             # Node.js native test runner (51 tests)
npm run demo         # orchestration demo (offline)
npm run eval         # evaluation harness demo (offline)
npm run build        # emit dist/ for publishing
```

## Structure

```
src/
  types.ts           # core types: Team, AgentRun, CompanyState, EnvId
  teams.ts           # the five teams + teamById()
  state.ts           # state machine: STATE_SEVERITY, worstState()
  dispatch.ts        # inferDispatchTeam(), normalizeDispatchEnv()
  eval/              # the evaluation harness (self-contained)
    types.ts         # Criterion, TestCase, Benchmark, EvalResult, ...
    scorer.ts        # pure scoring: checklist, Jaccard, tools, normalizeToBest
    provider.ts      # MockProvider + OpenAI-compatible + Anthropic adapters
    benchmarks.ts    # BENCHMARKS — one suite per team
    runner.ts        # runBenchmark()
    leaderboard.ts   # buildLeaderboard()
```

## Conventions

- **2-space indentation**, trailing semicolons, single quotes.
- **JSDoc on every public export.** State what it does, not how.
- **Types over `any`.** Public signatures must be fully typed. `any` is
  tolerated only where a library boundary forces it (e.g. `fetch().json()`),
  and must be commented as such.
- **NodeNext module resolution.** Internal imports use `.js` extensions
  (`import { X } from "./types.js"`).
- **Tests co-located** with the code they cover, named `*.test.ts`, using
  `node:test` + `node:assert/strict`.

## Adding a team

1. Add the `TeamId` to the union in `src/types.ts`.
2. Add the `Team` entry to `TEAMS` in `src/teams.ts` (id, name, short, icon,
   accent, mandate).
3. Add a dispatch keyword group in `src/eval/benchmarks.ts` is *not* required —
   dispatch lives in `src/dispatch.ts`. If the new team needs routing, add a
   `inferDispatchTeam` branch with its own priority position and a test.

## Adding a benchmark

1. Add a `Benchmark` object in `src/eval/benchmarks.ts` (id, name, description,
   team, and 3+ `TestCase`s).
2. Make cases discriminating: `mustContain` tokens must NOT appear in the
   prompt, so an echo-only provider scores zero.
3. Include at least one `reference` case per benchmark for overlap scoring.
4. Add the benchmark to `BENCHMARKS` and a test to `src/eval/eval.test.ts`.

## Definition of done

A PR is ready when all of these pass locally:

```bash
npm run typecheck
npm test
npm run build
```

CI runs the same three on every push and pull request.

## Commit style

Conventional commits, e.g. `feat:`, `fix:`, `docs:`, `test:`. One logical
change per commit.

---

*Maintained by [Joshua Hidary](https://github.com/JoshuaHidary). MIT licensed.*
