# Design Rules

## Hierarchy
- One primary action per view. If there are two, one of them is not primary.
- The value is louder than its label. A metric at 14px under a 16px bold title is inverted.
- Size, weight, color and position all encode importance — use them consistently, not randomly.
- Squint test: blur the screen. What remains visible is the hierarchy the user perceives.

## Spacing
- One spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. No other values.
- Related elements sit closer than unrelated ones. Even spacing everywhere means nothing groups.
- Padding inside a container ≥ the gap between containers.
- Align to a grid. Edges 1–3px off read as sloppy even when nobody can name why.

## Typography
- Maximum 3 sizes and 3 weights per view.
- Prose line length 45–75 characters.
- Numeric data uses tabular figures. Digits must not shift as values change.
- Line height: 1.5 for body, 1.2–1.3 for headings.
- Korean text: see `korean-ui-rules.md`.

## Color
- One accent hue. Additional hues only for semantic state.
- Surfaces form a ladder (surface-0 … surface-3), not ad-hoc greys.
- Semantic colors keep their meaning everywhere — danger is always the same red.
- Never convey information by color alone. Pair with text, icon or shape.
- Contrast is measured, not estimated. AA: 4.5:1 body, 3:1 large and UI.
- Chart series colors are a separate ordered palette. Never reuse semantic red as a series.

## Cards & Containers
- A card must earn its border. Not everything belongs in a box.
- A uniform grid of equal-weight cards is an absence of hierarchy, not a design.
- Nesting depth ≤ 2. A card inside a card inside a panel is a structural problem.
- If every panel has the same treatment, the layout is not saying anything.

## States
Every data-bearing view ships: loading, empty, error, partial, stale, success.
- Loading = skeleton matching the final layout, not a spinner over blank space.
- Empty = why it is empty and what to do next.
- Error = what failed and how to retry.
- An undesigned state is an unfinished view.

## Motion
- 120–200ms, one easing curve.
- Motion communicates causality (where a thing came from), never decorates.
- Respect `prefers-reduced-motion` — disable transitions, never disable function.

## Dark Mode
- Designed, not inverted.
- Avoid pure black surfaces and pure white text; both fatigue.
- Re-verify every contrast pair in dark. Light-mode ratios do not carry over.

## Forbidden
- Emoji as interface iconography
- Gradient / glow / glassmorphism without a reason
- Purple→blue gradient headers
- Centered body text
- Placeholder copy shipped as real copy: "Overview", "Details", "Information", "Data"
- Icons that decorate rather than identify
- Hardcoded visual values outside the token file
