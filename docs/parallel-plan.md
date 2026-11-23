# Parallel plan

> 2026-11-23. The owner approved building M2+M3 and M4 in parallel sessions, coordinated by the main session (**"Main"**, the one that ran setup and M1). Every parallel session follows this file. Main merges each branch into `main`, wires the pieces together, and runs a review pass with the owner per milestone. This file and `docs/milestones/` are temporary: Main deletes them after the last merge (git keeps them).

## Wave 2 (2026-11-23, after M6)

Base: local `main` at 0.6.1 (restructured: `packages/core`, `packages/react`, `apps/site`). Contract: `docs/architecture.md` › Interfaces (M7 additions) and `docs/design.md` (the orb's states, presets, sizes; the site's sections).

| Session | Milestone | Branch (cut from local `main`) | Versions | Owns | Ports |
|---------|-----------|--------------------------------|----------|------|-------|
| Package | M7 The orb to spec | `milestone/orb-spec` | `0.7.x` | `packages/core/**`, `packages/react/**`, `e2e/package-*.spec.ts`, `e2e/fixtures/**` | e2e on ephemeral ports (its fixture) |
| Site | M8 Hero, states, in context | `milestone/site-sections` | `0.8.x` | `apps/site/**`, `e2e/site-*.spec.ts`, `e2e/render.spec.ts` (same assertions), `.github/workflows/pages.yml` | dev 5176, e2e `E2E_PORT=5177` |

Merging (Main, after the 2026-11-23 squash): both branches start at the old 0.6.2 `f510995`; rebase them with `git rebase --onto main f510995 <branch>` before merging.

Main owns `docs/**` (except the sessions' own `docs/milestones/<name>.md`), `AGENTS.md`, root config, `pnpm-lock.yaml`, `prototype/`. M8 codes against today's API and adopts M7's additions (`emotion`, `label`, the new preset names) after Main merges M7; until then it keeps emotions as presets. Same rules as wave 1: no push, no merging `main` in, report first line `<Session> done: <branch> at <hash>`.

## Base

Parallel work starts from local `main` at `0.1.1` (M1 plus review fixes and the frozen contracts below). Sessions build against `main` and the contracts, never against another session's unmerged code. Nothing is pushed to GitHub until the owner signs off.

## Waves

| Wave | Milestones | Starts |
|------|------------|--------|
| 1 | Package (M2 Audio, then M3 Presets, polish, fidelity) · Site (M4) | after base `0.1.1` |

M5 (Ship) runs in Main after both merge.

## Sessions

| Session | Milestones | Branch | Versions | Isolated resources |
|---------|------------|--------|----------|--------------------|
| Package | M2, then M3 | `milestone/package` | `0.2.x` (M2), `0.3.x` (M3) | e2e port 5175 (`E2E_PORT=5175`) |
| Site | M4 | `milestone/site` | `0.4.x` | dev port 5176 (`pnpm --filter site exec vite --port 5176`), e2e port 5177 (`E2E_PORT=5177`) |

- Each session runs in its own git worktree (the app creates it), on its branch cut from local `main`.
- Port 5173 is the owner's live preview from Main, and 5174 is Main's e2e port: never use them.
- Commits use the project format with the session's reserved versions only. **Do not push** (the owner has not approved pushing yet). Never merge, never force-push, never touch `main` or the other branch.

## Ownership map

| Area | Owner |
|------|-------|
| `docs/**` except `docs/milestones/<own>.md`, `AGENTS.md`, root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `playwright.config.ts`, `.claude/**`, `pnpm-lock.yaml` | **Main only** |
| `packages/talking-marble/**`, `core/**`, `e2e/package-*.spec.ts` | Package |
| `site/**`, `e2e/site-*.spec.ts`, `.github/workflows/pages.yml` | Site |
| `docs/milestones/package.md` · `docs/milestones/site.md` | that session |

- A dependency you need: add it to your own `package.json` (`packages/talking-marble` or `site`) and say so in the report; Main reconciles the lockfile at merge. Root dev tools are Main's.
- Need a contract change? Do not make it in a way that breaks the other side. Package may *add* to the API; Site codes only against the contracts below. Describe every change in the report.
- `prototype/` is Main's; Site may read it for reference (it is deleted when the site lands).

## Contracts

Frozen interfaces both sessions code against.

| File | Provides | Used by |
|------|----------|---------|
| `docs/architecture.md` › Interfaces | The public React API: `<TalkingMarble state audio level palette size presets halo paused aria-label />`, exports `palettes`, `states`, `muted`, `happy`, `calm`, types | Package implements; Site consumes |
| `packages/talking-marble/src/TalkingMarble.tsx` › `TalkingMarbleProps` | The prop types, already including `audio` and `halo` (accepted, wired in M2 and M3) | Site |
| `core/spec.md`, `core/presets/*.json`, `core/shader/*` | Parameters, motion, audio-level math, palettes, states, example presets, the shader | Package (may tune values; report every change) |
| `docs/design.md` | Orb states, halo, fallback, reduced motion; the site's sections, tokens and states | Both |

## Quality bar (every session)

- `pnpm test`, `pnpm typecheck` and `pnpm build` pass with no new warnings; your own e2e specs pass on your port.
- Check your own result in a browser (screenshots) before reporting.
- Defaults chosen for open questions are recorded in the report, not in `docs/product.md`.
- No secrets anywhere. Mic audio never leaves the browser.

## Finish and report back

1. Write `docs/milestones/<package|site>.md` (template: `docs/milestones/TEMPLATE.md`) and commit it on your branch.
2. End your turn with a report whose first line is `<Session> done: milestone/<slug> at <hash>`, then the summary. Main receives it automatically.
3. Stop. Do not start another milestone.

## Merge log (Main)

| Milestone | Merged at | Conflicts and fixes | Review |
|-----------|-----------|---------------------|--------|
| Package (M2, M3) | 0.5.0 (39ae732) | none; lockfile updated with `pnpm install`; 37 unit + 25 e2e green | DES-02 deferred to the F-1 redesign |
