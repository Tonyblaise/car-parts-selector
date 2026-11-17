# 3D Car Parts Selector

A demo vehicle-inspection screen. You rotate a stylised 3D car, tap a body panel, window or
wheel (or pick it from the list), and mark it **Pass**, **Advisory** or **Damage** with a
note. It covers three body styles (SUV, Saloon and Van), six camera presets,
zone filters, a progress bar and "Pass the rest". It's a demo, so nothing is saved: a reload starts a fresh inspection.

The specification, plan and tasks are in [`specs/001-car-parts-selector/`](specs/001-car-parts-selector/).
The design inspiration is kept in `specs/001-car-parts-selector/reference/`.

## Scripts

```bash
npm ci
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # type-check + production build → dist/
npm run preview      # serve dist/ → http://localhost:4173

npm run typecheck    # strict TypeScript
npm run lint         # ESLint (typescript-eslint, react-hooks, jsx-a11y)
npm test             # Vitest unit (Node) + component (jsdom) tests
npm run test:e2e     # Playwright against a production build (Chromium, WebKit, Firefox subset)
npm run size         # fails if the entry JS exceeds 300 KB gzipped (run after build)
npm run deploy       # build and deploy to Cloudflare (Workers static assets, wrangler.jsonc)
```

Live: https://car-parts-selector.bubbablaise3.workers.dev

The first time you run the end-to-end tests, install the browsers with
`npx playwright install chromium webkit firefox`.

## Architecture

- **`src/vehicles/`**: pure data and geometry, with no React and no three.js.
  - `catalog.ts`: body-style shape numbers, zones and paints.
  - `parts.ts`: the part list for each body style.
  - `geometry.ts`: the procedural mesh, built as typed arrays, with a part index per vertex
    and part-boundary edges.
  - `cameraAngles.ts`: the only conversion from the design's yaw and pitch to camera
    angles.
- **`src/state/`**: a zustand store holding the inspection and temporary UI state.
  - `selectors.ts`: progress and zone counts.
- **`src/scene/`**: the only code that imports three.js. It is lazy-loaded, so the list UI
  works before the 3D view arrives, and also when WebGL is missing.
  - `VehicleMesh`: one mesh and one draw call. It picks the part from the triangle hit.
  - `PartSeams` and `SelectionOutline`: seams and the selection outline, drawn as thin
    strips laid on the surface.
  - `CameraRig`: drei `CameraControls`.
  - `Callout`: a DOM label positioned each frame through a ref, not React state.
  - The scene recovers if the GPU context is lost.
- **`src/ui/`**: plain accessible DOM.
  - Zone navigation, vehicle-type switch with a confirmation dialog, camera presets, paint,
    parts list (arrow keys move within it), condition panel, progress bar, and a live
    announcer for screen readers.

Roles and names that the tests rely on are listed in
[`contracts/ui-contract.md`](specs/001-car-parts-selector/contracts/ui-contract.md).

## Real models

All three body styles (SUV, Saloon and Van) use real 3D models. Rebuild them after changing a
source file:

```bash
node scripts/build-model.mjs ~/Downloads/ImageToStl.com_MB.W222.AMG.glb public/models/saloon.glb 150000 5.0
node scripts/build-model.mjs ~/Downloads/bmwx1f48.stl public/models/suv.glb 150000 4.5
node scripts/build-model.mjs "$HOME/Downloads/Van_Car_1/Van Car 1/Van Car 1.obj" public/models/van.glb 150000 4.7
```

Neither file has separate panels, so `src/vehicles/modelSegmentation.ts` splits each one into
the inspection parts using landmarks measured on that model. If a model changes, re-measure
its landmarks; the unit tests in `tests/unit/modelSegmentation.test.ts` check the result. If a
model fails to load, the app falls back to the drawn version of that body style.

## Constitution and models

The project constitution (Principle V) asks for compressed glTF/GLB models. All three body
styles now meet it. The procedural shapes in `src/vehicles/geometry.ts` remain only as a
fallback if a model fails to load. The history is in
[`plan.md` › Complexity Tracking](specs/001-car-parts-selector/plan.md).

## Licences

Inter is under the SIL Open Font License 1.1. The SUV, Saloon and Van models were supplied by the
project owner; **their source and licence still need recording** in
[`public/LICENSES.md`](public/LICENSES.md).
