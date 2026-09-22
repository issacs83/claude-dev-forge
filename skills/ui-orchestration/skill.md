---
name: ui-orchestration
description: "Orchestrate the UI/UX agent team through a gated pipeline — the orchestrator never implements UI itself"
---

# UI Orchestration Skill

## Trigger

Any request to build, redesign, improve or fix a user-facing interface. Including:
"화면 만들어줘", "대시보드 개선해줘", "이거 왜 이렇게 아마추어 같지", "UI 고쳐줘",
"상용 제품 수준으로 올려줘", or a screenshot with a complaint attached.

## Prime Directive

**The orchestrating session does not write UI code.** Its job is to route, gate and iterate.
The single most common failure is the orchestrator skipping straight to implementation and
declaring victory. That is the behaviour this skill exists to prevent.

## Pipeline

```
                    ┌──────────────────┐
                    │  0. ANALYZE      │  orchestrator
                    └────────┬─────────┘
                             │
          ┌──────────────────┴──────────────────┐
          ▼                                     ▼
 ┌──────────────────┐                 ┌──────────────────┐
 │ 1. REQUIREMENT   │                 │ 1b. DOMAIN       │
 │ product-strategist│                │ dashboard-ux-    │
 │ voc-researcher    │                │ specialist       │
 └────────┬─────────┘                 └────────┬─────────┘
          └──────────────────┬──────────────────┘
                             ▼
                    ┌──────────────────┐
                    │ 2. DESIGN        │  ux-designer
                    │    IA, 와이어프레임 │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 3. DESIGN SYSTEM │  design-system-architect
                    │    토큰 · 계약     │     ◀── GATE 1
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 4. IMPLEMENT     │  frontend-engineer
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 5. INTERACTION   │  interaction-engineer
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ 6. BUILD/TEST    │  verify-agent, e2e-tester
                    └────────┬─────────┘     ◀── GATE 2
                             ▼
                    ┌──────────────────┐
                    │ 7. DOMAIN QA     │  dashboard-ux-specialist
                    └────────┬─────────┘     ◀── GATE 3
                             ▼
                    ┌──────────────────┐
                    │ 8. VISUAL QA     │  visual-qa
                    └────────┬─────────┘     ◀── GATE 4
                             │
                       PASS? │ FAIL
                        ┌────┴────┐
                        ▼         ▼
                     DONE      9. FIX ──┐
                                        │
                        ┌───────────────┘
                        ▼
                  back to step 4 (or 2 if the design itself is wrong)
                        │
                        └──▶ re-run 6, 7, 8
```

## Gates

A gate is a hard stop. Do not advance past a failing gate by explaining why it is acceptable.

| Gate | Owner | Passes when |
|------|-------|-------------|
| 1 — Design system | design-system-architect | Tokens exist; every planned component has a contract; contrast verified |
| 2 — Build & function | verify-agent, e2e-tester | Build green, tests green, no console errors |
| 3 — Domain | dashboard-ux-specialist | Information priority correct; degraded states designed |
| 4 — Visual | visual-qa | Verdict is PASS. No BLOCKER, ≤3 MAJOR |

**Gate 2 passing is not completion.** Build-green with a FAIL at gate 4 is an unfinished task.

## Iteration Rule

On a `FAIL` from gate 3 or 4:

1. Route each finding to its owner:
   - hierarchy / density / rhythm / typography → `ux-designer`
   - token drift / inconsistency → `design-system-architect`
   - implementation defect / missing state → `frontend-engineer`
   - gesture / keyboard / persistence → `interaction-engineer`
   - wrong information priority → `dashboard-ux-specialist`
2. Fix all BLOCKER and MAJOR findings. MINOR/NIT may be deferred with an explicit note.
3. Re-run gates 2 → 3 → 4. A gate is re-run, never assumed.
4. Cap at **3 iterations**. If gate 4 still fails, stop and report to the user with the
   remaining findings and what is blocking them. Do not loop silently.

## Routing Table

| Symptom | Agent |
|---------|-------|
| "아마추어 같다", "AI가 만든 티" | visual-qa → then ux-designer |
| 페이지마다 스타일이 다르다 | design-system-architect |
| 드래그/리사이즈/키보드가 안 된다 | interaction-engineer |
| 느리다, 렌더가 끊긴다 | frontend-engineer |
| 중요한 정보가 안 보인다 | dashboard-ux-specialist |
| 화면 구조 자체가 잘못됐다 | ux-designer |
| API / DB / 인증 / 배포 | web-developer |
| 빌드 실패 | build-error-resolver |
| 브라우저 동작 검증 | e2e-tester |

## Parallelism

Run in parallel (no shared files):
- Step 1 and 1b
- Within step 4: independent components/routes, one owner per file

Run strictly sequentially:
- 3 → 4 (tokens must exist before implementation)
- 4 → 5 (interaction attaches to built components)
- 6 → 7 → 8 (each gate consumes the previous one's output)

## File Ownership

Declare it before dispatching. Two agents must never hold the same file.

| Path | Owner |
|------|-------|
| tokens / theme / tailwind config | design-system-architect |
| components, hooks, routes | frontend-engineer |
| interaction & layout-editor modules | interaction-engineer |
| docs/ux/*, wireframes | ux-designer |
| reports/visual-qa/* | visual-qa |

## Orchestrator Checklist

- [ ] Did I dispatch, rather than implement, the UI myself?
- [ ] Did design-system-architect run **before** frontend-engineer?
- [ ] Did I capture real screenshots at gate 4, not read code?
- [ ] Did I re-run the gates after fixes rather than assuming they now pass?
- [ ] Am I reporting visual-qa's verdict verbatim, including a FAIL?
- [ ] If I stopped at 3 iterations, did I say so explicitly?

## Anti-Patterns

- Orchestrator writes the components itself "because it's faster"
- Declaring done on build-green without a visual-qa PASS
- Skipping the design system because "it's just one screen"
- Softening or summarising away a FAIL verdict
- Looping fix→check more than 3 times without telling the user
- Running visual-qa against source code instead of a rendered screenshot
