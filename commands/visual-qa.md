---
allowed-tools: ""
description: "Capture the rendered UI and judge it — PASS or FAIL"
---

# /visual-qa — Rendered Interface Review

You are executing the `/visual-qa` command. Load the `visual-review` skill and dispatch the
`visual-qa` agent.

## Prime Directive

You must look at a rendered screenshot. A review written from reading source code is not a
visual review — if the UI cannot be rendered, report that as a BLOCKER.

## Steps

1. **Locate the running UI** — find the dev server URL, or start it. If it will not start,
   that is the finding; stop and report.

2. **Capture** the matrix:

   ```bash
   npx playwright screenshot --viewport-size=1440,900 --wait-for-timeout=1500 \
     "<url>" shots/<screen>-1440-light.png
   ```

   | Axis | Values |
   |------|--------|
   | Viewport | 1440×900 · 1280×800 · 768×1024 · 360×800 |
   | Theme | light · dark (if both exist) |
   | State | loading · empty · error · partial · stale · success |
   | Data | realistic, plus a worst case (longest name, largest number, most rows) |

3. **Read** each screenshot with the Read tool. State what you see before judging it.

4. **Critique** against the rubric in `visual-review`: hierarchy, density, rhythm, typography,
   color, data visualisation, craft — plus the AI-slop checklist.

5. **Report** using the format in `agents/visual-qa.md`. Every finding carries severity,
   a specific element, the evidence you saw, and a concrete replacement value.

6. **Verdict** — `PASS` (0 BLOCKER, ≤3 MAJOR) or `FAIL`.

## Rules
- Never pass a screen you have not seen rendered.
- "간격을 개선하라"는 지적이 아니다. "패널 간격 20px → 24px"가 지적이다.
- Judge only — do not rewrite the code. Route fixes to `frontend-engineer`,
  `ux-designer` or `design-system-architect`.
- After fixes, re-capture and re-review. Only a re-review turns FAIL into PASS.
- Keep the screenshots. They are the evidence for the completion claim.

## Arguments
- `$ARGUMENTS` — URL, route, or screen name. If empty, ask which screen to review.
