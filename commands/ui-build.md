---
allowed-tools: ""
description: "Gated UI/UX pipeline — design system → implement → interaction → domain QA → visual QA → fix loop"
---

# /ui-build — Orchestrated UI Development

You are executing the `/ui-build` command. You are the **orchestrator**. You do not write the UI.

Load the `ui-orchestration` skill and follow it. Apply `rules/design-rules.md`,
`rules/interaction-rules.md`, `rules/frontend-rules.md` and `rules/korean-ui-rules.md` throughout.

## Steps

1. **ANALYZE** — Read the existing UI before proposing anything. Identify the screens in scope,
   the current stack, the existing theme/token mechanism, and what the user actually complained
   about. Do not start designing until you can state the problem in one sentence.

2. **REQUIREMENT + DOMAIN** (parallel)
   - `product-strategist` / `voc-researcher` — who uses this and what decision do they make
   - `dashboard-ux-specialist` — information priority ladder, if this is an operational screen

3. **DESIGN** — `ux-designer`: information architecture, wireframes, user flows, every required
   state (loading / empty / error / partial / stale / success).

4. **DESIGN SYSTEM** — `design-system-architect`: three-layer tokens, component contracts,
   measured contrast table. **GATE 1** — do not advance without tokens in code.

5. **IMPLEMENT** — `frontend-engineer`: build against tokens only. No hardcoded visual values.

6. **INTERACTION** — `interaction-engineer`: gestures, 8-direction resize, keyboard parity,
   undo, persistence. Load `dashboard-layout-engine` if the layout is editable.

7. **BUILD & TEST** — `verify-agent`, `e2e-tester`. **GATE 2** — build green, tests green,
   zero console errors.

8. **DOMAIN QA** — `dashboard-ux-specialist`. **GATE 3** — priority correct, degraded states designed.

9. **VISUAL QA** — `visual-qa` with real screenshots at 4 viewports × themes × 6 states.
   **GATE 4** — verdict must be PASS.

10. **FIX LOOP** — On FAIL, route each finding to its owner, fix all BLOCKER and MAJOR,
    then re-run gates 2 → 3 → 4. Maximum 3 iterations, then stop and report.

11. **REPORT** — Use the completion template in `frontend-quality-gate`. Include the
    visual-qa verdict verbatim and the screenshot paths.

## Rules
- Never implement the UI yourself. Dispatch.
- `design-system-architect` runs before `frontend-engineer`. Always.
- Never declare completion on build-green. Gate 4 decides.
- Report a FAIL verdict as a FAIL. Do not summarise it away.
- If 3 iterations do not reach PASS, hand the remaining findings to the user and say so.

## Arguments
- `$ARGUMENTS` — Screen, route, or description of the UI work. If empty, ask which screens are in scope.
