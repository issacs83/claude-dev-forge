---
name: visual-review
description: "Capture a rendered UI and critique it from the pixels — the gate that build-green cannot pass"
---

# Visual Review Skill

## Trigger
Before declaring any UI task complete. Also on "이거 왜 이렇게 별로지", "아마추어 같다",
or whenever a screenshot arrives with a complaint.

## Prime Directive

**You must look at the rendered screen.** A review written from reading source code is not a
visual review. If you cannot render it, say so — that is the finding.

## 1. Capture

```bash
# single screen, one viewport
npx playwright screenshot --viewport-size=1440,900 --wait-for-timeout=1500 \
  "http://localhost:3000/dashboard" shots/dashboard-1440.png

# full page
npx playwright screenshot --full-page --viewport-size=1440,900 \
  "http://localhost:3000/dashboard" shots/dashboard-full.png
```

Required matrix:

| Axis | Values |
|------|--------|
| Viewport | 1440×900, 1280×800, 768×1024, 360×800 |
| Theme | light, dark (if both exist) |
| State | loading, empty, error, partial, stale, success |
| Data | realistic, plus a worst case (longest name, largest number, most rows) |

Then **Read** each PNG. State what you see before you judge it.

## 2. Look, in this order

1. **Squint test** — blur your reading of the image. What is still visible? That is the hierarchy
   the user actually perceives. Is it the right one?
2. **First fixation** — name the single element the eye lands on first. Should it be that one?
3. **Grid test** — do edges align? Are gaps on one scale?
4. **Grey test** — imagine it desaturated. Does it still work, or was color carrying the structure?
5. **Worst-case test** — what happens with a 40-character name, a 7-digit number, 200 rows?

## 3. Critique Rubric

Score each /10 and justify with what you saw.

| Axis | Failing looks like |
|------|--------------------|
| Hierarchy | Labels louder than values; every card equal weight; two competing primary actions |
| Density | Vast empty regions, or no breathing room anywhere |
| Rhythm | 16/20/24px gaps mixed; edges 1–3px misaligned |
| Typography | >3 sizes or >3 weights; prose lines over 75ch; digits jittering |
| Color | Accent used decoratively; meaning carried by color alone; unverified contrast |
| Data viz | Chart type mismatched to the question; truncated baseline; needs hover to read |
| Craft | Missing focus ring; undesigned empty/error states; text overflow; inverted dark mode |

## 4. AI-Slop Checklist

Call each out by name when present:

- [ ] Uniform card grid, no hierarchy — just tiles
- [ ] Gradient / glow / glass applied without purpose
- [ ] Emoji used as interface icons
- [ ] Everything wrapped in a bordered card
- [ ] Centered text that should be left-aligned
- [ ] Purple→blue gradient header
- [ ] Generic copy: "Overview", "Details", "Information"
- [ ] Icons that decorate rather than identify
- [ ] Even spacing everywhere, so nothing groups
- [ ] Three-column layout with nothing justifying three columns

## 5. Report

Use the format in `agents/visual-qa.md`. Every finding must carry:

```
심각도 | 위치(구체적 요소) | 무엇이 문제인가 | 화면에서 본 근거 | 구체적 수정값
```

"간격을 개선하라"는 지적이 아니다. "패널 간격 20px → 24px (스케일 준수)"가 지적이다.

## 6. Verdict

```
PASS  — BLOCKER 0, MAJOR ≤ 3
FAIL  — 그 외 전부
```

FAIL 시 수정 후 **반드시 재캡처하여 재검수**한다. 재검수 없이 PASS 로 바꾸지 않는다.

## Rules
- Never pass a screen you have not seen rendered.
- Report the verdict verbatim to the orchestrator, including FAIL.
- Judge only. Fixes belong to `frontend-engineer` / `ux-designer` / `design-system-architect`.
- Keep screenshots — they are the evidence for the completion claim.
