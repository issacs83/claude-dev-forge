---
name: dashboard-layout-engine
description: "Free drag positioning and 8-direction resize for editable dashboards — never +/- buttons alone"
---

# Dashboard Layout Engine Skill

## Trigger
Any editable/arrangeable dashboard, panel grid, canvas or widget board.

## Prime Directive

**Direct manipulation is the primary mechanism.** The user grabs the panel and moves it; grabs
its edge and sizes it. `+` / `-` buttons and numeric fields are the *accessible alternative*,
offered alongside — never instead.

## Hit Zones

Resolve intent at pointer-down, from where the pointer is:

```
 ┌────────────────────────────────┐
 │ NW          N            NE    │   corner box  10×10px
 │  ┌──────────────────────────┐  │   edge band    6px
 │  │                          │  │
 │ W│      BODY  (move)        │E │
 │  │   controls keep their    │  │
 │  │   own hit priority       │  │
 │  └──────────────────────────┘  │
 │ SW          S            SE    │
 └────────────────────────────────┘
```

| Zone | Cursor | Action |
|------|--------|--------|
| Body, empty area | `move` | move panel |
| N / S | `ns-resize` | resize height |
| E / W | `ew-resize` | resize width |
| NE / SW | `nesw-resize` | resize both |
| NW / SE | `nwse-resize` | resize both |
| Any control | control's own | control's action — never a drag |

Controls win over the body. A button inside a draggable panel is a button.

## Gesture Rules

- **Drag threshold 4px.** Below it, pointer-up is a click.
- **Pointer capture** for the whole gesture; one gesture at a time.
- `Escape` mid-gesture cancels and restores the prior geometry.
- `Shift` preserves aspect ratio; `Alt` resizes about the center. Document these in the UI.
- Use Pointer Events. No separate mouse/touch code paths.
- `user-select: none` only for the gesture's duration.

## Snapping

| Target | Default |
|--------|---------|
| Grid | 8px |
| Container edges | on |
| Sibling edges & centers | on |
| Snap strength | 8px |
| Override | hold `Ctrl`/`Cmd` |

Show alignment guides only while a snap is engaged. Remove them on pointer-up.

## Constraints

```
minWidth / minHeight   per panel type — content decides, not the container
maxWidth / maxHeight   optional
clamp to container     a panel can never leave the viewport
collision policy       'push' | 'swap' | 'overlap' — pick one and state it
```

## Keyboard Parity (required)

| Key | Action |
|-----|--------|
| `Tab` | focus next panel |
| `Enter` / `Space` | enter layout-edit mode for the focused panel |
| `Arrows` | move by one grid unit |
| `Shift` + `Arrows` | resize by one grid unit |
| `Ctrl/Cmd` + `Arrows` | nudge 1px |
| `Escape` | cancel, then exit edit mode |
| `Ctrl/Cmd` + `Z` / `Shift+Z` | undo / redo |
| `Delete` | remove panel |

## Performance

- Move with `transform: translate3d()`. Never animate `top`/`left` during a drag.
- Read layout once at pointer-down; do not read the DOM per pointermove.
- `requestAnimationFrame`-throttle pointermove handling.
- `will-change: transform` on the active panel only, removed on pointer-up.
- Target 60fps during drag. Measure it; do not assume it.

## Persistence

```json
{
  "schemaVersion": 2,
  "viewId": "dashboard-main",
  "userId": "...",
  "panels": [
    { "id": "pack-status", "x": 0, "y": 0, "w": 6, "h": 4, "visible": true }
  ]
}
```

- Debounce save ~500ms after the gesture settles. Never save per frame.
- Version the schema; unknown or invalid stored layouts fall back to the default rather than
  rendering broken.
- Persist per user **and** per view.
- Provide an explicit "레이아웃 초기화" action.

## Undo/Redo

- Command pattern with coalescing: **one drag = one undo entry**.
- Cover move, resize, add, remove, reset.
- State the history limit.

## Verification Checklist

Report pass/fail with evidence — do not claim completion without it:

- [ ] All 8 handles resize, each with the correct cursor
- [ ] Body drag moves; edge drag resizes; never confused
- [ ] A button inside a panel activates instead of starting a drag
- [ ] 4px threshold separates click from drag
- [ ] Snapping engages, shows guides, can be overridden
- [ ] `Escape` cancels and restores geometry
- [ ] Full keyboard parity per the table
- [ ] One drag = one undo step
- [ ] Layout persists across reload; reset works
- [ ] Touch works (pointer events)
- [ ] 60fps measured during drag
- [ ] `prefers-reduced-motion` respected

## Anti-Patterns

- Size changes only via `+` / `-` buttons
- Resize from the bottom-right corner only
- Drag that also selects page text
- Saving to storage on every pointermove
- Undo that replays a drag one pixel at a time
- Mouse-only handlers that break on touch
