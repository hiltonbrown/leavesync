# DESIGN.md — LeaveSync Design System

## Creative North Star

**"The Botanical Editorial."**

A premium digital journal aesthetic: Modern Calm blended with Organic Minimalism. Grounded authority via sage and slate tones. No template energy; instead, intentional whitespace, tonal layering (not borders), and asymmetrical balance.

---

## Colour Tokens

### Light Mode

| Token                        | Hex       | Usage                                                    |
|------------------------------|-----------|----------------------------------------------------------|
| `primary`                    | `#336A3B` | High-action touchpoints, CTAs, brand moments             |
| `primary-container`          | `#6DA671` | Signature sage; large surfaces, primary action blocks    |
| `on-primary`                 | `#FFFFFF` | Text/icons on `primary`                                  |
| `on-primary-container`       | `#1B3620` | Text/icons on `primary-container`                        |
| `secondary`                  | `#4B6542` | Supportive green; secondary actions                      |
| `secondary-container`        | `#CAE8BC` | Secondary button fills, chips, tags                      |
| `on-secondary-container`     | `#2A3D24` | Text/icons on `secondary-container`                      |
| `tertiary`                   | `#57624F` | Muted green; tertiary text, metadata                     |
| `surface`                    | `#FCF8FF` | Base page background                                     |
| `surface-container-lowest`   | `#FFFFFF` | Elevated cards on darker parents                         |
| `surface-container-low`      | `#F6F1FF` | Sidebars, contextual headers, secondary panels           |
| `surface-container`          | `#F1EBFD` | Primary cards                                            |
| `surface-container-high`     | `#EBE5F7` | Hover states, elevated cards                             |
| `surface-container-highest`  | `#E5E0F1` | Active states, floating modals, input field fills        |
| `surface-variant`            | `#E0DDE6` | Tertiary button hover background                         |
| `on-surface`                 | `#1C1A26` | Primary text colour (never use `#000000`)                |
| `on-surface-variant`         | `#46454E` | Secondary/supporting text                                |
| `inverse-surface`            | `#312F3C` | Deep slate; high-contrast elements, footers, dark accent |
| `inverse-on-surface`         | `#F3EFF8` | Text on `inverse-surface`                                |
| `outline`                    | `#777680` | Disabled states, subtle iconography                      |
| `outline-variant`            | `#C1C9BD` | Ghost borders at 15% opacity only                        |
| `error`                      | `#BA1A1A` | Destructive actions, validation errors                   |
| `error-container`            | `#FFDAD6` | Error banners, inline error backgrounds                  |
| `success`                    | `#6DA671` | Use `primary-container` sage, not bright green           |

### Dark Mode

Dark mode inverts the surface and text layers while preserving the botanical character. Greens shift to lighter, desaturated tones for comfortable contrast on dark backgrounds.

| Token                        | Hex       | Notes                                                    |
|------------------------------|-----------|----------------------------------------------------------|
| `primary`                    | `#8FD496` | Lightened sage for legibility on dark surfaces            |
| `primary-container`          | `#1F5226` | Deep green; large surface areas, primary action blocks   |
| `on-primary`                 | `#003912` | Dark text on light primary buttons (rare use)            |
| `on-primary-container`       | `#ABEDB0` | Light text/icons on `primary-container`                  |
| `secondary`                  | `#AECAA1` | Lightened secondary                                      |
| `secondary-container`        | `#374E2E` | Muted dark fill for secondary actions                    |
| `on-secondary-container`     | `#C8E6BB` | Light text on `secondary-container`                      |
| `tertiary`                   | `#B8C9AB` | Lightened muted green                                    |
| `surface`                    | `#131218` | Base dark background                                     |
| `surface-container-lowest`   | `#0E0D13` | Deepest layer                                            |
| `surface-container-low`      | `#1C1B22` | Sidebars, contextual headers                             |
| `surface-container`          | `#211F26` | Primary cards                                            |
| `surface-container-high`     | `#2B2931` | Hover states, elevated cards                             |
| `surface-container-highest`  | `#36343C` | Active states, modals, input fills                       |
| `surface-variant`            | `#46454E` | Tertiary button hover background                         |
| `on-surface`                 | `#E6E1EC` | Primary text                                             |
| `on-surface-variant`         | `#C8C5D0` | Secondary/supporting text                                |
| `inverse-surface`            | `#E6E1EC` | Light accent blocks within dark layout                   |
| `inverse-on-surface`         | `#312F3C` | Text on `inverse-surface`                                |
| `outline`                    | `#918F9A` | Disabled states, subtle iconography                      |
| `outline-variant`            | `#46454E` | Ghost borders at 15% opacity only                        |
| `error`                      | `#FFB4AB` | Destructive actions, validation errors                   |
| `error-container`            | `#93000A` | Error banners                                            |
| `success`                    | `#8FD496` | Matches dark `primary`                                   |

### Mode Switching

Implement via CSS custom properties scoped to `[data-theme="light"]` and `[data-theme="dark"]` on the root element. Default to the user's system preference via `prefers-color-scheme`, with a manual toggle that persists to the database (not localStorage).

---

## Typography

**Font family:** Plus Jakarta Sans (Google Fonts).

| Scale         | Size     | Weight    | Letter-spacing | Line-height | Usage                              |
|---------------|----------|-----------|----------------|-------------|------------------------------------|
| `display-lg`  | 3.5rem   | Semi-Bold | -0.02em        | 1.1         | Hero statements                    |
| `display-md`  | 2.75rem  | Semi-Bold | -0.02em        | 1.15        | Page-level headlines               |
| `display-sm`  | 2.25rem  | Semi-Bold | -0.02em        | 1.2         | Contextual header headline         |
| `headline-lg` | 2rem     | Semi-Bold | 0              | 1.25        | Section headings                   |
| `headline-md` | 1.75rem  | Semi-Bold | 0              | 1.3         | Sub-section headings               |
| `title-lg`    | 1.375rem | Medium    | 0              | 1.35        | Card headers                       |
| `title-md`    | 1rem     | Medium    | 0.01em         | 1.4         | Component titles                   |
| `title-sm`    | 0.875rem | Medium    | 0.01em         | 1.4         | Small titles, nav items            |
| `body-lg`     | 1.125rem | Regular   | 0              | 1.6         | Contextual header summary, lead    |
| `body-md`     | 1rem     | Regular   | 0              | 1.6         | Default body text                  |
| `body-sm`     | 0.875rem | Regular   | 0              | 1.6         | Supporting body text               |
| `label-lg`    | 0.875rem | Medium    | 0.01em         | 1.4         | Button text (standard)             |
| `label-md`    | 0.75rem  | Medium    | 0.05em         | 1.3         | Overlines, categories, ALL-CAPS    |
| `label-sm`    | 0.6875rem| Medium    | 0.05em         | 1.3         | Fine metadata, timestamps          |

---

## Elevation and Depth

Depth is achieved through **tonal layering**, not shadows.

### Rules

1. **No borders.** Do not use `1px solid` borders to section content. Boundaries are defined by background colour shifts between surface tiers.
2. **Tonal stacking.** A card at `surface-container` sits on a parent at `surface-container-low`. The tonal shift is the divider.
3. **Ambient shadows (floating elements only).** Popovers, FABs, dropdowns: `box-shadow: 0 12px 32px rgba(53, 51, 64, 0.06)`. Use the slate colour in the shadow, never pure black. In dark mode: `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25)`.
4. **Ghost border fallback.** If accessibility demands a visible boundary, use `outline-variant` at **15% opacity**. Never 100% opaque.
5. **Corner radius.** `16px` (`border-radius: 1rem`) for all primary cards and containers. No 4px or 8px radii.

### Glassmorphism (floating navigation, tooltips)

```css
backdrop-filter: blur(16px);
background: rgba(252, 248, 255, 0.72); /* light mode */
/* background: rgba(19, 18, 24, 0.72); dark mode */
```

### Hero CTA Gradient

```css
background: linear-gradient(135deg, var(--primary), var(--primary-container));
```

---

## Layout Principles

1. **Asymmetrical balance.** Default content/sidebar split is roughly 2:1 (e.g., `grid-template-columns: 1fr 380px`). The wider column holds the primary content; the narrower column holds metadata, actions, or summary cards.
2. **Intentional whitespace.** Minimum `24px` gap between cards. Use `32px` or `48px` vertical spacing between list items instead of divider lines.
3. **Contextual header.** Full-width `surface-container-low` bleed at the top of each view. Contains a `display-sm` headline paired with a `body-lg` summary. This separates the "stage" (navigation context) from the "work area" (content).
4. **Responsive breakpoints.** `640px` (mobile), `1024px` (tablet), `1440px` (desktop). Collapse sidebar below `1024px`.

---

## Components

### Buttons

| Variant   | Background                | Text colour                | Border          | Hover                                      |
|-----------|---------------------------|----------------------------|-----------------|---------------------------------------------|
| Primary   | `primary`                 | `on-primary`               | None            | Darken 8%                                   |
| Secondary | `secondary-container`     | `on-secondary-container`   | None            | Darken 5%                                   |
| Tertiary  | Transparent               | `primary`                  | None            | `surface-variant` background                |
| Danger    | `error`                   | `#FFFFFF`                  | None            | Darken 8%                                   |

All buttons: `border-radius: 16px`, `label-md` uppercase text, `padding: 10px 24px`.

### Cards

No divider lines. Separation via whitespace or tonal shifts. Inner (nested) cards use one surface tier higher than their parent. `border-radius: 16px`.

### Input Fields

Fill: `surface-container-highest`, no border. On focus: ghost border using `primary` at 20% opacity. Label: `label-md`, positioned above the field (never as placeholder text). `border-radius: 12px`.

### Data/Metric Highlights

Use `primary-container` (sage) for success and growth metrics. Do not use saturated bright green. Negative metrics use `error-container` with `error` text.

---

## Hard Rules

1. Never use `#000000` for text. Use `on-surface`.
2. Never use `1px solid` borders to divide content.
3. Never use drop shadows with high opacity.
4. Never use 4px or 8px border-radius. Use `16px` (cards) or `12px` (inputs, small elements).
5. Never use bright green for success states. Use the sage palette.
6. Always use Plus Jakarta Sans. No Inter, Roboto, or system fonts.
7. Always achieve hierarchy through typography scale first, colour second.
8. Always implement colours as CSS custom properties, not hardcoded hex values.
9. Always scope theme tokens to `[data-theme]` for light/dark switching.
10. Never use em dashes in any UI copy or generated text.
