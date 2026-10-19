# SpotPlot Design Guide

Values come from Apple's **macOS 27 UI Kit** (Sketch, v12, 2026-06-23) and are adapted for SpotPlot. The kit itself is not in this repo. Apple's license doesn't allow redistributing it, and the repo is public, so never commit kit files.

All screens follow this guide as of the design refresh (2026-09-30). New or reworked UI must follow it too.

## One design language across SpotPlot

This guide covers every SpotPlot surface. Use the same tokens everywhere so the products feel like one family:

| Surface | How it applies |
|---|---|
| **Desktop app** | Everything below, as written. |
| **iPad app** | Same colors (window, panels, Apple Blue accent, meaning colors), same dark-only rule and grouped lists, same type scale. Use the iPad's native controls (SwiftUI) at iPad sizes; make cue content even larger, since tablets sit further from the operator in a booth. Highlights (yellow and red) and action icons/colors must match the desktop exactly. |
| **Website** | `spotplot-website/styles.css` uses the same tokens (black and `#1C1C1E`/`#2A2A2A` surfaces, Apple Blue `#0A84FF`, `#409CFF` links, meaning colors) with Inter as the web stand-in for the system font. |
| **Printed sheets** | Light, for paper: black headers, gray labels, gel colors as data, `#FFE45C` for color changes, the same yellow/red highlight meanings. Built in `src/pdfGenerator.js`. |

When a color, icon or meaning changes in one place (for example an action's icon or the highlight colors), change it everywhere it appears: desktop, iPad, prints and website screenshots.

## Principles

- **Dark only.** SpotPlot is used at tech tables and in dark booths. There is no light mode.
- **Show content beats chrome.** Cue content (LQ numbers, actions, characters) is read quickly, at a distance, during tech. Make it bigger and higher-contrast than buttons, labels and headers.
- **One accent color: Apple Blue.** It marks what's interactive or selected. Other colors only carry meaning (delete, warning, highlight). No purple anywhere in the UI.
- **Native Mac feel.** Use the system font, macOS control heights and corner radii, and capsule-shaped switches.
- **Gel colors are data, not UI.** Gel swatches show the real gel color. Never tint, restyle or theme them.

## Color

### Surfaces and layering
Apple layers dark UI by putting translucent white fills on top of the window background, not by using a separate hex code for each grey.

| Token | Value | Use |
|---|---|---|
| Window background | `#1E1E1E` | Page background (Apple's dark window color) |
| Panel | `#2A2A2A` | Cards, modals, grouped sections |
| Toolbar | `#282828` | Top bar (`AppHeader`), hairline `rgba(0,0,0,0.45)` below |
| Fill 1 | `rgba(255,255,255,0.10)` | Switch-off track, strongest raised surface |
| Fill 2 | `rgba(255,255,255,0.08)` | Bordered buttons (Apple uses 7%), cards |
| Fill 3 | `rgba(255,255,255,0.05)` | Table cells, hover |
| Fill 4 | `rgba(255,255,255,0.03)` | Subtle row striping |
| Fill 5 | `rgba(255,255,255,0.02)` | Barely-there grouping |
| Separator | `rgba(255,255,255,0.10)` | Dividers, cell borders |
| Popover / menu | `#1A1A1A`, shadow `0 18px 48px rgba(0,0,0,0.45)` | Floating panels |

### Text
| Token | Value | Use |
|---|---|---|
| Label 1 (primary) | `#FFFFFF` | Main text, cue content |
| Label 2 (secondary) | `rgba(255,255,255,0.55)` | Supporting text, field labels |
| Label 3 (tertiary) | `rgba(255,255,255,0.25)` | Placeholders, disabled text |
| Label 4 (quaternary) | `rgba(255,255,255,0.10)` | Faint markers, like "—" in empty cells |

### Accent: Apple Blue
| Token | Value | Use |
|---|---|---|
| Accent | `#0A84FF` | Filled controls: default buttons, switch-on track, selected chips, focus ring |
| Accent text | `#409CFF` | Blue **text or icons** on dark backgrounds (spot names, links) |
| Accent tint | `rgba(10,132,255,0.16)` | Selected-row / drag-target background |

### Meaning colors (Apple dark-mode system colors)
Only use these when the color carries meaning.

| Color | Value | SpotPlot meaning |
|---|---|---|
| Red | `#FF453A` | Delete / destructive actions, the red cue highlight |
| Orange | `#FF9F0A` | Warnings |
| Yellow | `#FFD60A` | The yellow cue highlight |
| Green | `#30D158` | Success, confirmations |
| Brown | `#AC8E68` | No-color (NC) and color-change actions |
| Cyan / Indigo | `#64D2FF` / `#5E5CE6` | Action families only: swap/slide/stay, and iris moves |

For highlight **backgrounds**, use the color at 15% opacity (for example `rgba(255,66,69,0.15)`) so the text stays readable.

## Typography

The font is SF Pro through `font-family: -apple-system, BlinkMacSystemFont, sans-serif` (already set in the `<style>` block of `src/index.html`; `src/index.css` is not loaded). "Emphasized" means weight 600 (semibold), or 700 where the table says Bold.

| Style | Size / line height | Weight (default → emphasized) | SpotPlot use |
|---|---|---|---|
| Large Title | 26 / 32 | 400 → 700 | Home screen show titles |
| Title 1 | 22 / 26 | 400 → 700 | Screen titles |
| Title 2 | 17 / 22 | 400 → 700 | Section headers, **cue list LQ numbers** |
| Title 3 | 15 / 20 | 400 → 600 | Dialog titles, **cue list action and character** |
| Headline | 13 / 16 | 700 → 800 | Table column headers |
| Body | 13 / 16 | 400 → 600 | Default UI text, form fields, buttons |
| Callout | 12 / 15 | 400 → 600 | Notes, "When" text in dense cells |
| Subheadline | 11 / 14 | 400 → 600 | Field labels, metadata |
| Footnote / Caption | 10 / 13 | 400 → 600 | Smallest allowed text |

- **Minimum text size is 10px.** The app currently has some 8px and 9px text; raise it during the refresh.
- Buttons and text-field values use **Medium (500) at 13px**.
- **Cue list exception:** the content people read during tech gets Title 2 or Title 3 sizes (15–17px, semibold), so it reads well at a glance. Headers and chrome around it stay at Body 13.

## Controls

### Sizes
macOS controls come in five heights. Use **Regular (24px)** by default, **Large (28px)** for primary actions in dialogs and **Small (20px)** in dense cue cells.

| Size | Height | Corner radius (buttons, pop-ups, segmented) | Text-field radius | Switch (w × h) |
|---|---|---|---|---|
| Mini | 16 | 6 | 6 | 36 × 16 |
| Small | 20 | 6 | 6 | 44 × 20 |
| Regular | 24 | 6 | 6 | 54 × 24 |
| Large | 28 | capsule (fully round) | 7 | 64 × 28 |
| Extra Large | 36 | capsule | 9 | 80 × 36 |

### Buttons
- **Bordered (standard):** fill `rgba(255,255,255,0.07)`, no border, label white Medium 13.
- **Default (primary):** accent fill `#0A84FF`, label white. Use one per dialog, for the main action.
- **Destructive:** use a red label (`#FF4245`) on a bordered button, or a red fill if it's the dialog's main action.
- **Borderless:** text only. It gets a bezel (Fill 3) on hover.
- **Pressed:** add about 5% more white fill. **Disabled:** 50% opacity.

### Switches (on/off settings)
Use a switch for any setting that is simply on or off, like the w/LQ toggle.
- Off track: `rgba(255,255,255,0.10)`. On track: accent `#0A84FF`.
- Knob: a **pill**, not a circle. It's `rgba(255,255,255,0.85)` with a soft shadow, 32 × 20 inside a 54 × 24 track (2px inset).
- Put the label next to the switch. Clicking the label toggles it too.

### Text fields
- Background: the window background. Border: `1px rgba(255,255,255,0.04)`. Radius: 6 (Regular).
- Focus: an accent ring, 3.5px at 50% opacity, plus a 1px solid accent border.
- Value text: white, Medium 13. Placeholder: Label 3.
- Disabled: 50% opacity.

### Segmented controls
Use one to pick between 2–5 options, like highlight: None / Yellow / Red. Regular height is 24px with radius 6, and the selected segment is a lighter fill (`rgba(255,255,255,0.14)`) or the accent.

### Removable items in a grid (color frames)
Each item shows a small remove button on hover only: a 16px circle at its top-right, red `×` on a red tint (`rgba(255,69,58,0.16)`). The add tile takes the next grid spot instead of a new row: dashed 1px `rgba(255,255,255,0.2)` border, radius 8, accent-blue "+ Add …" label. Hide it when the grid is full.

### Gel chips
A compact way to show a spot's frames in one row: the chips share the row's width (never wrapping), each taking the room its gel number needs, each with a 5px color strip on top (the gel's color; several gels sit side by side; empty is a dashed outline), the frame label below (F1…, Bold 9, Label 3) and the gel number (Medium 11), cut short with "…" if the row is narrow. Fill 3 background, radius 5, 3px apart. The permanent frame gets a gold outline and a gold "PERM" label. Hover shows the full gel. Used in the cue list header's color load.

### Cue flags (iPad)
Quick marks an operator puts on a cue: **Missed** (red, `exclamationmark.triangle.fill`), **Clarify** (orange, `questionmark.circle.fill`), **Idea** (yellow, `lightbulb.fill`). Tapping a cue opens a popover with three big buttons (96×78, radius 14, the color at 16% behind the symbol and label). A flagged cue shows small symbols under its T· number.

### Highlighted rows and row shading (iPad)
A highlighted cue gets its color at 24% across the row plus a solid 5pt bar on its left edge. A highlighted When/Notes line uses 42%. Cue rows alternate between no fill and white at 3.5% so rows are easy to tell apart. In the caller view (spots side by side), cues are split by a full-width line (white 16%) and spots by a short, faint line (white 9%, stopping 10pt short of the top and bottom), so a cue reads as one row and it never looks like a grid. Each spot's When box in a row starts at the same height.

Several color frames are written **F1+2** (the F once, frames in number order), on prints and on the iPad.

### Right-click (context) menus
Use the **real macOS menu**, not one we draw: send the items to main.js with `ipcRenderer.send('show-context-menu', items)` (`{ id, label, enabled, checked, submenu }` or `{ type: 'separator' }`); the chosen item comes back as `context-menu-action` with its id, and `context-menu-closed` when it goes away. macOS handles the look, keyboard and dark mode. First line: a disabled item saying what was clicked ("Spot 1 · LQ 20"). Title Case labels, "…" when the item opens a box or asks first, a checkmark for on/off items (Ignore Cue, highlight colors), separators between groups, and a submenu rather than a long list (Highlight ▸). Gray out what can't apply instead of hiding it. While the menu is open, the clicked item gets a 2px accent (`#0A84FF`) outline, like Finder.

### Pop-up buttons (dropdowns)
Height 24px, radius 6, bordered-button fill, with a chevron on the right.

## Surfaces

| Surface | Radius | Notes |
|---|---|---|
| Window | 16 | Set by macOS |
| Popover | 20 | `#1A1A1A`, large soft shadow |
| Alert / confirm dialog | ~16 | 260px wide, 16px margins. Title Bold 13, description Regular 13, two 28px buttons side by side |
| Cards / panels inside screens | 10–12 | Fill 2 on the window background |
| Table cells | 0–6 | Separator borders, Fill 3 hover |

## Spacing
Use a **4px grid**: 4, 8, 12, 16, 20, 24. Dialog and panel margins are 16px, which is what the kit's alerts use. Put 8px between related controls and 16–24px between groups.

## Motion
Apple-style: calm, smooth and quick to settle. Things ease into place; they never bounce or spin.
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (fast start, long gentle finish) for anything that moves.
- **Durations:** hover and press 0.2–0.5s; entrances 1–1.4s; nothing loops.
- **Hover and press:** buttons grow to 103% on hover and 97% while pressed; cards and plans lift 4px with a slightly lighter fill and brighter border; screenshots zoom 1.5%.
- **Entrances (website):** content rises about 44px while fading in as it scrolls into view (screenshots also grow from 95%); items in a row are staggered 40–90ms apart. The hero eases in line by line on load, and its screenshot grows from 90% to full size as it scrolls up the screen. Gradient headlines sweep their color in.
- **Reduce motion:** when the system's Reduce motion setting is on, nothing moves; only colors change. The page must read fine with motion off or scripts blocked.
- In the app, keep motion small and functional (menus, sheets, highlights). Big entrances belong on the website.

## Implementation notes
- Styles are currently inline objects in each screen, with hard-coded hex values; for example `#2a2a2a` appears about 120 times. As part of the refresh, move these values into one shared file (for example `src/theme.js`) and import them. Then a future color change is one edit, not a hunt through every screen.
- The kit's cursor SVGs don't need to be used. macOS supplies cursors, so use CSS `cursor` values.
