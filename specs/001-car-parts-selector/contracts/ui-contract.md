# UI Contract: 3D Car Parts Selector

The app has no API. Its interface to users and tests is the accessible UI. Playwright and
Testing Library tests MUST find elements by the roles and names below, never by CSS classes,
so renaming anything here is a breaking change for the tests.

## Regions

| Role and element | Accessible name | Requirement |
|------------------|-----------------|-------------|
| `navigation` | "Inspection areas" | FR-016 |
| `main` | (none) | |
| `region` (section) | "3D vehicle" | FR-001 |
| `img` (canvas) | "Rotatable 3D vehicle. Drag to rotate and tap a part to select it. Every part is also in the list beside it." | FR-022 |
| `status` (fallback text inside the 3D region) | "3D view is not available here. Use the list." | FR-023 |
| `complementary` (aside) | "Parts" | |
| `status` (visually hidden, `aria-live="polite"`) | Announces "<Part name> selected · <Condition or Not checked>" | FR-022 |

## Controls

| Control | Role and name | State | Requirement |
|---------|---------------|-------|-------------|
| Zone filter | `button` named after the zone ("All parts", "Front", "Top", "Right side", "Left side", "Rear", "Wheels"); visible text includes "checked/total" | `aria-pressed` | FR-016 |
| Vehicle type | `group` "Vehicle type" › `button` "SUV", "Saloon", "Hatch", "Pickup", "Van" | `aria-pressed` | FR-017 |
| Camera preset | `group` "Camera view" › `button` "3/4", "Front", "Right", "Rear", "Left", "Top" | (none) | FR-006 |
| Paint | `group` "Paint" › `button` "Grey paint", "White paint", "Black paint" | `aria-pressed` | FR-019 |
| Part row | `list` "<Zone> parts" › `button` named after the part; visible status label | `aria-pressed` (selected) | FR-007 |
| Condition | `group` "Condition" › `button` "Pass", "Advisory", "Damage" | `aria-pressed` | FR-009 |
| Note | `textbox` "Notes" (textarea), placeholder "Scratch, dent or chip, and where" | | FR-011 |
| Clear | `button` "Clear" | | FR-012 |
| Pass the rest | `button` "Pass the rest" | disabled when every part is checked | FR-014 |
| Switch confirmation | `dialog` "Start a new inspection?" › `button` "Switch and clear", `button` "Cancel" | modal; Esc cancels | FR-018 |

## Visible text

- The hint line reads "Drag to rotate · Tap a part", or the name of the hovered part (FR-005).
- The empty condition panel reads "Tap a part on the car or in the list to record its
  condition."
- The progress line reads "Inspection progress", then "<n> pass · <n> advisory · <n> damage",
  then "<done>/<total>" (FR-013).
- The header shows the registration "AB12 CDE", labelled "Registration AB12 CDE" (FR-020; a
  fictional value from `src/demoDetails.ts`). There is no workshop name.
- Nothing is saved: there is no Save button, and a reload starts a fresh inspection.

## Keyboard

- Tab moves through: zones, vehicle types, camera presets, paint, the parts list (one tab
  stop; ↑/↓ move between parts and Enter or Space selects), the condition buttons, Notes,
  Clear, and Pass the rest.
- Every focusable control shows a 2 px focus ring in #3E6AE1.
- The canvas isn't a tab stop. Everything it does is also available from the list and the
  presets.

## Test hooks

- `window.__carInspector` is available only in development and test builds, and is
  stripped from production. It exposes `{ getPartScreenPosition(partId): {x, y} | null }`, so
  end-to-end tests can click a known part on the canvas without hard-coding coordinates.
