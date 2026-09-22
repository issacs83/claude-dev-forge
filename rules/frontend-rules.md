# Frontend Rules

## Tokens Before Code
- No hardcoded color, size, radius, shadow, duration or z-index in a component.
- A missing value means requesting a token, not writing a literal.
- A component referencing a primitive token instead of a semantic one is a bug.

## Component Architecture
- One component, one responsibility. Split beyond ~200 lines.
- Presentational / container separation. Data fetching never lives in a leaf.
- More than ~7 props means the component is doing too much.
- Co-locate component, styles, tests.
- Public props are a typed, documented, stable contract.

## State Classification
Classify every piece of state before writing it:

| Kind | Home |
|------|------|
| Server | cache layer (React Query / SWR) — never duplicated into local state |
| URL | filters, tab, selection, pagination — anything shareable or reloadable |
| Local UI | open/closed, hover, in-flight gesture |
| Form | form library, with validation colocated |
| Ephemeral | toasts, transient announcements |

Derive, do not duplicate. A value computable from others is computed.

## Required States
Every data-bearing view ships all six, or it is not done:
`loading` · `empty` · `error` · `partial` · `stale` · `success`

A live view that lost its feed must say so. Showing old numbers as current is a defect.

## Real-Time Data
- Throttle or batch high-frequency updates. Never re-render per message.
- Decouple data rate from paint rate.
- Virtualize lists/tables beyond ~100 rows.
- Downsample chart data before render.
- Mark staleness with the data's age.

## Responsive
- Breakpoints defined once, in tokens.
- Container queries for components used in multiple layout contexts.
- Layout primitives (Stack, Grid, Cluster) over one-off margins.
- Verify at 360 / 768 / 1280 / 1920 and at 200% zoom.
- No horizontal page scroll at any width.

## Accessibility — Non-Negotiable
- Semantic HTML first; ARIA only where semantics fall short.
- Keyboard reachable and operable, with visible `:focus-visible`.
- Labels on every input; errors programmatically associated.
- `aria-live` for async status.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Target size ≥ 24×24 CSS px (44×44 touch).
- Contrast AA, measured.

## Performance Budget
| Metric | Budget |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Interaction frame rate | 60fps |

- Reserve space for async content — no shift when data arrives.
- Code-split at route boundaries; lazy-load heavy chart/3D libraries.
- Profile before optimizing. Report numbers, not impressions.

## Ownership Boundary
| Concern | Agent |
|---------|-------|
| Tokens, consistency | design-system-architect |
| UI implementation, state, performance, a11y | frontend-engineer |
| Gestures, keyboard, undo, persistence | interaction-engineer |
| API, DB, auth, deploy | web-developer |
| IA, wireframes, flows | ux-designer |
| Rendered-screen judgment | visual-qa |

## Completion
Never write "완료" for UI work until `frontend-quality-gate` passes all four gates,
including a `visual-qa` PASS with screenshots. Build-green is necessary, not sufficient.
