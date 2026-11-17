# Quickstart & Validation: 3D Car Parts Selector

This guide shows how to run the app and prove the feature works from start to finish.
Element names come from [contracts/ui-contract.md](./contracts/ui-contract.md). Stored data
is not saved (removed 2026-11-18: it's a demo).

## Prerequisites

- Node 22 LTS or newer, and npm 11 or newer.
- A browser that supports WebGL 2: the current Chrome, Edge, Firefox or Safari.
- For the end-to-end tests, install Playwright's browsers once with
  `npx playwright install chromium webkit firefox`.

## Run

```bash
npm ci
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # type-check + production build
npm run preview      # serve the production build → http://localhost:4173
```

## Automated checks (all must pass before merge)

```bash
npm run typecheck    # tsc --noEmit (strict)
npm run lint
npm test             # Vitest unit + component tests
npm run test:e2e     # Playwright smoke/e2e against `vite preview` (Chromium + WebKit)
npm run size         # fails if entry-chunk JS > 300 KB gzipped
```

## Manual checks against the spec

| # | Steps | Expected | Covers |
|---|-------|----------|--------|
| 1 | Open the app | The sidebar and parts list appear immediately, and the car appears within 3 s and settles into the 3/4 view | FR-008, SC-004 |
| 2 | Drag across the car, then drag down hard | The car rotates and tilts, but never goes below the ground or past top-down | FR-002 |
| 3 | Click the front-left door without moving the mouse | The door highlights with a blue outline, the callout reads "FRONT LEFT DOOR · Not checked" and the list row is selected | FR-003, FR-004 |
| 4 | Press, drag 20 px, then release on a part | The car rotates and the selection doesn't change | Edge case (drag versus tap) |
| 5 | Hover over the bonnet with a mouse | The bonnet lightens and the hint reads "Bonnet" | FR-005 |
| 6 | With the door selected, choose Damage and type "Dent, lower edge" | The door turns red, the list shows "Damage" and the summary shows 1 damage | FR-009 to FR-011, FR-013 |
| 7 | Choose Damage again | The condition is removed and the status returns to "Not checked" | FR-009 |
| 8 | Choose the Wheels zone, then pick "Rear left wheel" in the list | The list shows only the 4 wheels, and the camera swings to the left side | FR-007, FR-016 |
| 9 | Try each camera preset | Each one animates to its angle | FR-006 |
| 10 | Choose "Pass the rest" | Progress shows `total/total`, and parts already checked keep their condition | FR-014 |
| 11 | Reload the page without saving | Everything recorded is restored | FR-015, SC-007 |
| 12 | Choose Save, then mark one more part | "Finished" shows with a confirmation, then returns to in progress after the change | FR-015 |
| 13 | Choose Pickup while data is recorded, then Cancel; do it again and choose "Switch and clear" | Cancel keeps everything. Confirming shows the pickup with "Load bed" and "Rear cab window", no quarter windows, and 0/25 | FR-017, FR-018 |
| 14 | Change paint to White, then reload | The car is white after the reload | FR-019 |
| 15 | Complete an inspection using only the keyboard | Every step can be done, with a visible focus ring each time | FR-021, SC-006 |
| 16 | Turn on reduced motion in the OS settings and reload, then pick a camera preset | There's no opening movement and presets jump straight to their angle | FR-008, Principle IV |
| 17 | Disable WebGL (Chrome flag `--disable-webgl`, or Firefox `webgl.disabled`) | The fallback message shows and a full inspection works from the list | FR-023, SC-006 |
| 18 | Resize to 390 px wide | The layout stacks with no sideways scrolling, and swiping up and down over the car scrolls the page | FR-024 |
| 19 | Corrupt the stored data: in DevTools, set `localStorage['car-inspection:v1'] = '{bad'` and reload | A fresh inspection starts with no error screen | Edge case |

## Usability checks (manual)

Run these with someone who hasn't seen the app before, without giving instructions.

| Check | Steps | Pass when | Covers |
|-------|-------|-----------|--------|
| U1 | Ask them to mark the "Front left door" as Damage | Done within 30 s of the app loading | SC-001 |
| U2 | Ask them to inspect the whole car, marking 3 parts and passing the rest, then save | Done within 3 min | SC-002 |

## Performance check (constitution Principle II)

- Run `npm run preview`, open DevTools › Performance, and drag-rotate for 5 s. Frames should
  stay at about 60 fps on a laptop with integrated graphics, and at 30 fps or more on a
  mid-range phone using remote debugging.
- When idle, there should be no recurring animation frames in the Performance timeline,
  because the scene only redraws when something changes.
- `npm run size` reports the entry chunk, which must be 300 KB gzipped or less, and the 3D
  chunk separately.
- Report the measured fps and any change in bundle size in the PR description.
