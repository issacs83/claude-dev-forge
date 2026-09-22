---
name: frontend-quality-gate
description: "Evidence-based completion for UI work — build-green is necessary, never sufficient"
---

# Frontend Quality Gate Skill

## Trigger
Before any claim that a UI task is complete, fixed, done or ready.

## Prime Directive

**Build PASS + Test PASS can coexist with Design FAIL.** A UI that compiles, passes its tests and
looks amateur is not finished. This gate exists because the usual definition of done does not
cover what the user actually sees.

## The Four Gates

```
GATE 1  DESIGN SYSTEM   tokens exist, contracts written, contrast measured
GATE 2  BUILD & TEST    build green, tests green, zero console errors
GATE 3  DOMAIN          information priority correct, degraded states designed
GATE 4  VISUAL          visual-qa verdict = PASS
```

All four, in order. Reporting completion with gate 4 unrun is a false completion claim.

## Evidence Required

A completion claim must carry evidence. Assertions without output are not accepted.

| Gate | Evidence |
|------|----------|
| 1 | Token file path + contrast table with measured ratios |
| 2 | Build command output, test summary, console log excerpt |
| 3 | Priority ladder mapped to actual screen elements |
| 4 | Screenshot paths + visual-qa report with verdict line |

## Gate 2 — Functional

```bash
npm run build           # must exit 0
npm test -- --run       # must exit 0
npx tsc --noEmit        # if TypeScript
npx eslint . --max-warnings=0
```

Plus, in the browser:
- Zero console errors and zero unhandled rejections on load and on primary interaction
- No React key warnings, no hydration mismatch
- Network panel: no 4xx/5xx on the happy path

## Gate 3 — Domain

- Information priority ladder filled with this screen's real elements
- Degraded behaviour designed: feed lost, partial data, sensor fault
- Aggregate values accompanied by their worst-case member where one exists
- Units and precision stated for every numeric display

## Gate 4 — Visual

Run the `visual-review` skill / `visual-qa` agent. Required captures:

| Viewport | 1440×900 · 1280×800 · 768×1024 · 360×800 |
| Theme | light · dark |
| State | loading · empty · error · partial · stale · success |

Verdict: `PASS` (0 BLOCKER, ≤3 MAJOR) or `FAIL`.

## Accessibility Floor (blocks gate 4)

- [ ] Keyboard-only completion of the primary task
- [ ] `:focus-visible` present on every interactive element
- [ ] Contrast AA verified by measurement
- [ ] No information conveyed by color alone
- [ ] Every input labelled; errors associated with their field
- [ ] Works at 200% browser zoom without horizontal scroll
- [ ] `prefers-reduced-motion` respected

## Performance Floor

| Metric | Budget |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Drag/scroll | 60fps |

Report measured values. "Feels fast" is not a measurement.

## Completion Report Template

```markdown
## 완료 보고: [Screen]

### Gate 1 — 디자인 시스템 ✅
토큰: src/styles/tokens.css
대비: [쌍 | 비율 | AA] 표

### Gate 2 — 빌드/테스트 ✅
build: exit 0 / tests: 24 passed / console errors: 0

### Gate 3 — 도메인 ✅
정보 우선순위: [래더 → 실제 요소 매핑]
열화 동작: 피드 끊김 시 stale 표시, 부분 데이터 시 결손 항목 명시

### Gate 4 — 비주얼 ✅ PASS
캡처: shots/*.png (4 뷰포트 × 2 테마 × 6 상태)
visual-qa 판정: PASS — BLOCKER 0, MAJOR 2 (후속 처리 예정)

### 남은 항목
- MINOR 3건 (목록)
```

## Rules
- Never write "완료" before gate 4 returns PASS.
- Report a FAIL verdict verbatim. Do not summarise it away.
- If a gate was skipped, say which and why — do not let silence imply it passed.
- If 3 fix iterations do not reach PASS, stop and hand the remaining findings to the user.
