# AGENTS.md

How every coding agent works on Talking Marble. This file is a map: rules live here, knowledge lives in `docs/`. Keep it under ~100 lines; add a rule only after a mistake repeats.

## Project

- **Talking Marble**: a reusable, audio-reactive animated orb component that developers drop into their own voice AI apps (MIT, © Justin Liao). Not an assistant app.
- **Stakes**: MVP. Working, clean and shipped beats complete. <!-- change to "production" once real users depend on it -->
- **Built here**: the orb UI library (web/React in v1) plus a static showcase/docs/playground site in this repo, deployed to GitHub Pages via GitHub Actions. No voice/AI backend: developers wire in their own.
- **Stack**: TypeScript, pnpm workspace, raw WebGL2 + Web Audio, React (peer >=18), tsdown, Vite site, Vitest + Playwright (see docs/architecture.md)
- **Owner**: pro

## Docs

| File | Holds | Read |
|------|-------|------|
| `docs/progress.md` | Now (status, next action, in flight), milestones, feedback, decisions, blockers, session log | First, every session |
| `docs/product.md` | Pitch, users, goals, MVP features with IDs, what was cut | Before feature work |
| `docs/design.md` | Feel, design system, patterns, references | Before user-facing work |
| `docs/architecture.md` | Shape, stack and why, data, interfaces, environments and secret names, deploy | Before system work |

Everything goes in one of these: a technical choice and its source in the doc it shapes; why X beat Y in Decisions; notes, plans and summaries folded in, then deleted. No other Markdown files. Design and architecture docs are current truth: rewrite them in place (git keeps history).

## Start of every session

1. Read `docs/progress.md`, then `git status` and `git log -5`. If they disagree, trust git and fix `progress.md`.
2. If this file still has `{{placeholders}}`, setup is unfinished: finish it before building.
3. Run the smoke check, if one is set: `pnpm test && pnpm typecheck`. If it fails, fix or report that first.
4. "Where were we": three lines (phase, last done, next action), then wait. "Continue": do the approved next action. A specific task: one line of orientation, then the task.
5. If `progress.md` does not explain the latest commits or work in flight, the last session ended abruptly. Find its chat before guessing: this tool's resume list for this folder, or `scripts/sessions.py` in the ignition-sequence-start skill folder (usually `~/.claude/skills/` or `~/.agents/skills/`) if it is installed.

## Owner shortcuts

| Owner says | Do |
|------------|----|
| continue, go | The approved next action. |
| status | Phase, milestone, done / in progress / waiting on the owner, open feedback IDs. |
| handoff | Update `progress.md` › Now and the session log, commit if allowed, list anything uncommitted. |
| 1. … 2. … | Add each to `progress.md` › Feedback with an ID, work through them, report per ID. |
| new feature: … | Add to `docs/product.md` with an ID, propose where it fits in the plan, wait for approval. |
| add backend (or frontend, an app, …) | Agree the new part's direction and contract with the owner, then plan it like a milestone. |
| change … | Edit the doc where it lives, say what it affects, get approval if it adds work. |
| keep going | Agree the boundary first; stay inside it; queue questions under Blockers. |
| faster / slower | Fewer check-ins and terser updates, or more explanation and smaller steps. |
| ship it | Run the ship checklist for this project and get approval before anything goes public. |
| help | List these shortcuts in plain words. |

## How we build

1. Plan the milestone in a few lines: what, which files, the check that proves it works. New milestones need the owner's approval.
2. Build in small, focused changes. Simplest thing that works; no speculative layers; nothing unrelated.
3. Verify (below) and show the evidence.
4. Commit per the approval mode. In `ask` mode, stop for the owner after each change; otherwise keep going and stop at milestone end or when a decision is the owner's.
5. Milestone end: tidy pass (below), then update `docs/progress.md`.

If two attempts at the same fix fail, stop, re-plan, and tell the owner.

## Verify

- Build: `pnpm build` (package, then site)
- Test: `pnpm test` (unit), `pnpm typecheck`, `pnpm test:e2e` (Playwright, its own server on 5174)
- Run it: open the site, click every state and palette at 280, 96 and 48 px; no console errors
- Live preview: `pnpm dev` → http://localhost:5173 (the app's preview pane: `.claude/launch.json` › site)

While building, keep the live preview running and give the owner its link, so they watch every change as it lands; after each change, say what to look at. List it under In flight; stop it when the session ends.

Done means checked, not assumed: show the command and its result, or a screenshot. Never edit or delete a test to make it pass. What only a person or a real device can check goes under Blockers, with exact steps.

## Quality bar

- **Security, always.** Follow the secrets rules below. Validate input at every boundary. Least privilege for keys, tokens and database access.
- **Performance and scale, as far as the goals need** (`docs/product.md` › Goals). Measure before optimizing.
- **No duplication.** When the same logic appears a third time, extract it. Refactor in its own commit, tests green before and after.

## Secrets

- Never ask for, read, print or commit secret values. Refer to them by name. Values live in `.env` (gitignored) or the host's secret settings; `.env.example` lists names only.
- Do not run commands that print secrets (`cat .env`, `printenv`, `env`, `echo $KEY`). To check a key is set, test that it exists, never show it.
- Keys for paid or private services never go in frontend code: call them from a server.
- If a secret appears in chat, a log or a commit, tell the owner to revoke and replace it now.

## Ask the owner first

Changing the stack or architecture · a dependency outside the approved stack · anything that costs money · deleting the owner's files (your own scratch files and build output are fine) · deploying or publishing · auth, payments or personal data · CI, signing, credentials · rewriting git history.

## Git

- **Approval mode: auto-commit.** Commit after each passing check; push at milestone end once the owner signs off. Other modes: `ask` (after each verified change ask: improve further, commit, or commit and push?), `auto-push` (commit and push after each passing check), `none` (no git: no commits, and every deletion is permanent, so ask first). Only the owner changes the mode.
- **Commits:** `MAJOR.MINOR.PATCH - What changed` (1–15 words, no period; next unused version from `git log`; patch for fixes, minor for a new feature, major for a release). Stage only project files; check `git diff --cached` for secrets first.
- Before pushing, the skill's `check.py --secrets` runs as a git pre-push hook (if installed). Never bypass it with `--no-verify` unless the owner confirms a false alarm.
- Never force-push or rewrite published history.

## Handoff

Sessions can end without warning (limits, crashes, a switch of agent or account). So after every commit and before any long step, keep `docs/progress.md` › Now current: phase, next action, in flight. Push at milestone end so another machine can continue. Write for a stranger: no "as discussed".

## Tidy pass (every milestone end)

Remove what is no longer used: files, assets, dependencies, dead code, temporary docs, `references/` images nobody needs. Show the list with the milestone summary; delete once the owner approves (git keeps history). Keep this file under ~100 lines and `progress.md` under ~200 (done feedback rows out, ~15 decisions, ~10 log lines).
