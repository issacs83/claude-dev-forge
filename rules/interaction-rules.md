# Interaction Rules

## One Gesture, One Meaning
Intent is decided by the hit zone at pointer-down — never by what happens afterwards.

| Zone | Gesture | Meaning |
|------|---------|---------|
| Control | press | the control's action |
| Body / empty | drag | move |
| Edge (6px band) | drag | resize one axis |
| Corner (10px box) | drag | resize both axes |
| Body | click, no movement | select |

Controls always win over their container. A button inside a draggable panel is a button.

## Direct Manipulation First
- If a thing can be moved or sized, the user grabs it directly.
- `+` / `-` buttons and numeric fields are the accessible alternative, offered alongside.
- A capability available only through buttons is an incomplete implementation.

## Thresholds & Timing
| Property | Value |
|----------|-------|
| Drag threshold | 4px |
| Long press | 500ms |
| Double-click window | 400ms |
| Visible response to input | < 100ms |
| Transition | 120–200ms |
| Debounced save | ~500ms after settle |

## Cursors
Advertise the zone before the user commits: `move`, `ns-resize`, `ew-resize`, `nesw-resize`,
`nwse-resize`, `grab` → `grabbing`, `not-allowed`.

## Keyboard Parity — Mandatory
Every pointer gesture has a keyboard equivalent.

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | move focus |
| `Enter` / `Space` | activate / enter edit |
| `Arrows` | move by one unit |
| `Shift+Arrows` | resize by one unit |
| `Ctrl/Cmd+Arrows` | fine nudge |
| `Escape` | cancel gesture, then deselect/exit |
| `Ctrl/Cmd+Z` / `Shift+Z` | undo / redo |
| `Delete` | remove selection |

No capability may exist only as a pointer gesture.

## Hover · Focus · Selected
Three distinct visual states. Collapsing them confuses the user about what is active.
`:focus-visible` is always visible — never `outline: none` without a replacement.

## Cancellation & Undo
- `Escape` cancels an in-flight gesture and restores the prior state.
- One drag = one undo entry. Coalesce.
- Every destructive action is undoable or confirmed. Never neither.

## Feedback
- Every action produces a visible result within 100ms.
- Async work shows progress; indeterminate work shows it is alive.
- Errors say what failed and what to do next — never only "Error".
- Status changes announced to assistive technology via `aria-live`.

## Touch
- Pointer Events only. No separate mouse/touch code paths.
- Target size ≥ 44×44 CSS px on touch-primary interfaces.
- No hover-only affordances.
- Do not hijack native scroll, pinch or back gestures.

## Performance
- Movement via `transform`, never `top`/`left`.
- `requestAnimationFrame`-throttle pointermove.
- Read layout once at gesture start; never per move event.
- 60fps during drag — measured, not assumed.

## Forbidden
- A drag that selects page text
- Pointer-only capability with no keyboard path
- `outline: none` without a visible replacement
- Auto-dismissing an error or safety-relevant message
- Saving to storage on every frame
- Blocking the main thread during a gesture
