---
name: design-tokens
description: "Three-layer design token architecture — define once, enforce everywhere"
---

# Design Tokens Skill

## Trigger
Starting any UI; or when screens drift apart visually; or before `frontend-engineer` implements.

## Layers

```
PRIMITIVE  →  SEMANTIC  →  COMPONENT
```

A component referencing a primitive token is a bug. Components consume semantic tokens.

## Minimum Token Set

```css
:root {
  /* ---- primitive ---- */
  --blue-500: #3b82f6;  --blue-600: #2563eb;
  --gray-50: #f8fafc;   --gray-900: #0f172a;  --gray-950: #020617;
  --red-500: #ef4444;   --amber-500: #f59e0b;  --green-500: #22c55e;

  /* ---- scale ---- */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-full: 9999px;

  --text-xs: 12px;  --leading-xs: 16px;
  --text-sm: 14px;  --leading-sm: 20px;
  --text-base: 16px; --leading-base: 24px;
  --text-lg: 20px;  --leading-lg: 28px;
  --text-xl: 24px;  --leading-xl: 32px;
  --text-2xl: 32px; --leading-2xl: 40px;

  --weight-normal: 400; --weight-medium: 500;
  --weight-semibold: 600; --weight-bold: 700;

  --shadow-raised: 0 1px 2px rgb(0 0 0 / .08);
  --shadow-overlay: 0 4px 12px rgb(0 0 0 / .12);
  --shadow-modal: 0 16px 48px rgb(0 0 0 / .20);

  --z-base: 0; --z-sticky: 100; --z-dropdown: 200;
  --z-overlay: 300; --z-modal: 400; --z-toast: 500;

  --duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 320ms;
  --ease: cubic-bezier(.2, 0, 0, 1);

  /* ---- semantic (light) ---- */
  --color-surface-0: #ffffff;
  --color-surface-1: var(--gray-50);
  --color-surface-2: #eef2f7;
  --color-border: #d8dee9;
  --color-text: var(--gray-900);
  --color-text-muted: #64748b;
  --color-accent: var(--blue-600);
  --color-on-accent: #ffffff;
  --color-danger: var(--red-500);
  --color-warning: var(--amber-500);
  --color-success: var(--green-500);
  --color-focus: var(--blue-500);
}

:root[data-theme="dark"],
:root:not([data-theme="light"]) {
  @media (prefers-color-scheme: dark) {
    --color-surface-0: var(--gray-950);
    --color-surface-1: #0b1220;
    --color-surface-2: #131c2e;
    --color-border: #23304a;
    --color-text: #e6edf7;
    --color-text-muted: #94a3b8;
    --color-accent: var(--blue-500);
  }
}
```

Adapt the values to the project. Keep the **structure**.

## Data Visualisation Palette

Keep it separate from the semantic palette, and keep it ordered — series 1 is used first.

```css
--viz-1 … --viz-8   /* categorical, distinguishable in both themes and for deuteranopia */
--viz-seq-0 … --viz-seq-5   /* sequential */
--viz-div-neg-2 … --viz-div-pos-2  /* diverging, neutral midpoint */
```

Never reuse `--color-danger` as a chart series color. Semantic red must keep meaning red.

## Enforcement

Run as an audit and report `file:line` for each hit:

```bash
# hardcoded colors outside the token file
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(' src --include='*.{ts,tsx,js,jsx,vue,svelte,css}' \
  | grep -v 'tokens\.css\|theme\.'

# off-scale spacing
grep -rnE '(margin|padding|gap)[^:]*:\s*[0-9]+px' src | grep -vE ':\s*(4|8|12|16|24|32|48|64)px'

# raw z-index
grep -rnE 'z-index:\s*[0-9]+' src

# off-scale font sizes
grep -rnE 'font-size:\s*[0-9]+px' src | grep -vE ':\s*(12|14|16|20|24|32|40)px'
```

## Contrast Verification

Every text/surface pair must be computed, not eyeballed:

```
AA body text      ≥ 4.5:1
AA large (≥18.66px bold or ≥24px)  ≥ 3:1
UI components / focus ring  ≥ 3:1
```

Report a table of pairs with measured ratios. An unmeasured pair is an unverified pair.

## Rules
- Light and dark are defined together.
- Adding a value means adding a token, never a local literal.
- Existing project theme wins — read it before proposing a new one.
- Ship tokens as code, not only as a document.
