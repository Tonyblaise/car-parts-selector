---
description: "Task list for the 3D Car Parts Selector"
---

# Tasks: 3D Car Parts Selector

**Input**: design documents in `/specs/001-car-parts-selector/`: [plan.md](./plan.md),
[spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/) and [quickstart.md](./quickstart.md)

**Inspiration source**: [reference/inspiration-Main.dc.html](./reference/inspiration-Main.dc.html),
the original design to port from. Line numbers referenced below:

| What | Lines |
|------|-------|
| Vehicle configs `vehicles()` | 151–166 |
| `zoneDefs()` | 168–178 |
| Part list `getModel()` | 180–219 |
| `buildGeometry()` | 221–378 |
| `ribbons()` | 380–394 |
| Colour and tint logic `updateColors()` | 513–538 |
| Shader lighting and wheel-arch discard | 437–473 |
| `hit()` | 628–664 |
| UI copy and status colours `renderVals()` | 766–866 |
| Camera presets `viewDefs` | 821 |

**Tests**: included. Constitution Principle III requires test-first unit tests for all
non-visual logic and a smoke test for each scene. Write each test task first and confirm it
fails before doing the matching implementation task.

**Organization**: tasks are grouped by user story, so each story can be built and tested on
its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: the user story the task belongs to (US1–US5 from spec.md)

## Conventions for every task

- Single Vite project at the repo root. Code goes in `src/` and tests in `tests/` (see
  plan.md › Project Structure).
- TypeScript is strict. Use `any` only with a comment explaining why.
- Tests find elements by the role and name given in
  [contracts/ui-contract.md](./contracts/ui-contract.md), never by CSS class.
- `src/vehicles/` and `src/state/` must not import `react`, `three` or
  `@react-three/*`.
- Only files in `src/scene/` may import `three`, `@react-three/fiber` or `@react-three/drei`.
- **Coordinate system**: geometry uses +X for the car's front, +Y up and +Z for the car's
  right side, as in the inspiration. The inspiration's camera uses yaw and pitch. For
  camera-controls, convert as `polar = π/2 − pitch` and `azimuth = yaw + π/2`, then check
  that the "Front" preset shows the grille. If it doesn't, fix the azimuth offset once in
  `src/vehicles/cameraAngles.ts`, which is the only source. `src/scene/cameraMath.ts`
  re-exports it.

---

## Phase 1: Setup (shared infrastructure)

**Purpose**: create a working Vite + React + TypeScript project with the full toolchain.

- [X] T001 Scaffold the project in the repo root, which already contains `.specify/`,
  `.claude/` and `specs/`, so don't overwrite them. Run
  `npm create vite@latest . -- --template react-ts`, accepting existing files, then pin the
  versions from research.md in `package.json`: vite ^8.3, react and react-dom ^19.3,
  typescript ^7.0. Remove the demo assets in `src/` and `public/`.
- [X] T002 Install the runtime dependencies: `npm i three@^0.187 @react-three/fiber@^9.8
  @react-three/drei@^10.7 zustand@^5.1 @fontsource-variable/inter`. Install the development
  dependencies: `npm i -D @types/three vitest@^5 jsdom @testing-library/react@^16
  @testing-library/user-event @testing-library/jest-dom @playwright/test@^1.65`. Update
  `package.json`.
- [X] T003 [P] Turn on strict TypeScript in `tsconfig.json` and `tsconfig.app.json`, with
  `"strict": true`, `"noUncheckedIndexedAccess": true` and `"noImplicitOverride": true`.
  Add the scripts `"typecheck": "tsc -b --noEmit"`, `"test": "vitest run"` and
  `"test:watch": "vitest"` to `package.json`.
- [X] T004 [P] Set up ESLint (flat config) with typescript-eslint, react-hooks and
  jsx-a11y in `eslint.config.js`. Add Prettier in `.prettierrc` with 100-character lines and
  single quotes. Add `"lint": "eslint ."`.
- [X] T005 [P] Set up Vitest in `vite.config.ts`. Use the `jsdom` environment for
  `tests/component/**`, `node` for `tests/unit/**`, and the setup file
  `tests/setup.ts`, which imports `@testing-library/jest-dom/vitest`.
- [X] T006 [P] Set up Playwright in `playwright.config.ts`:
  - `webServer` runs
    `VITE_TEST_HOOKS=1 npm run build -- --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173`.
    The separate output folder keeps the test-hook build away from `dist/`, which
    `npm run size` measures.
  - `baseURL` is `http://localhost:4173`.
  - Chromium and WebKit projects run every test. A `firefox` project runs only
    `smoke.spec.ts` and `no-webgl.spec.ts`, set with `testMatch`.
  - `reducedMotion: 'reduce'` by default.
  Add `"test:e2e": "playwright test"`, and add `dist-e2e/` to `.gitignore`.
- [X] T007 [P] Write `scripts/check-size.mjs`. It reads `dist/.vite/manifest.json` (turn on
  `build.manifest` in `vite.config.ts`), gzips the entry chunk and its static imports,
  prints the entry size and every dynamic chunk, and exits 1 if the entry exceeds
  300 × 1024 bytes. Add `"size": "node scripts/check-size.mjs"`.
- [X] T008 [P] Create `public/LICENSES.md`, noting that Inter is licensed under the SIL Open
  Font License 1.1, with a link to rsms/inter, and that the vehicle geometry is generated
  in-app with no third-party models.

**Checkpoint**: `npm run dev`, `npm run typecheck`, `npm run lint` and `npm test` (with no
tests yet) all run without errors.

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: the vehicle catalog, part list, geometry, base store, layout shell and 3D
canvas shell that every story builds on.

**⚠️ CRITICAL**: no user story work can start until this phase is complete.

### Tests (write first and make sure they fail)

- [X] T009 [P] Write a unit test for the catalog in `tests/unit/catalog.test.ts`. It
  checks that `VEHICLE_TYPES` has exactly suv, saloon, hatch, pickup and van, labelled
  "SUV", "Saloon", "Hatch", "Pickup" and "Van". It checks that `ZONES` lists Front, Top,
  Right side, Left side, Rear and Wheels in that order. It checks that `PAINTS` maps grey
  to #6B6E74, white to #E6E7E9 and black to #1F2124.
- [X] T010 [P] Write a unit test for the parts in `tests/unit/parts.test.ts`. For
  `buildParts(type)` it checks:
  - The counts: suv 26, saloon 24, hatch 26, pickup 25, van 26.
  - Part ids are unique.
  - Every part has a zone and a view angle.
  - The renames: the Saloon "tailgate" is called "Boot lid"; the Pickup has the parts
    "Load bed", "Rear cab window", "Cab roof" and "Load bed right side"; the Van has "Rear
    doors" and "Sliding left door".
  - Saloon and Pickup have no `quarter-window-*` parts.
  - The order matches inspiration lines 193–214.
- [X] T011 [P] Write a unit test for the geometry in `tests/unit/geometry.test.ts`. For
  each vehicle type, `buildGeometry(type)` must:
  - Return `positions.length === normals.length === count * 3`.
  - Return `partIndex.length === kinds.length === count`, with `count % 3 === 0`.
  - Give every part at least one triangle.
  - Return only edges whose `a` and `b` are valid part ids or null.
  - Return a centroid for every part with finite values.
  - Give the same output (positions hash) on two calls.
  - Keep every vertex within the bounds |x| ≤ 2.5 and 0 ≤ y ≤ 2.1.
- [X] T043 [P] Write a unit test for the selectors in `tests/unit/selectors.test.ts`. Check
  that `progress(state)` returns `{done, total, pass, advisory, damage}`, that
  `zoneSummary(state, zone)` returns `{checked, total}` for each zone and for 'all', and that
  `visibleParts(state)` filters by `activeZone`. (Moved here from US3, because US1 and US4
  need it.)

### Implementation

- [X] T012 [P] Implement `src/vehicles/catalog.ts`, which exports `VehicleTypeId`,
  `ShapeConfig`, `VEHICLE_TYPES` (the shape numbers, `skipParts` and `renames` ported
  exactly from inspiration lines 151–166), `ZoneId`, `ZONES` (the names plus SVG path `d`
  values for icons, from lines 168–178), `PaintId` and `PAINTS`. This makes T009 pass.
- [X] T013 Implement `src/vehicles/parts.ts`, which exports `PartId`, `Part`
  (`{ id, name, zone, view: { azimuth, polar } }`) and a memoised
  `buildParts(type): Part[]`. Port inspiration lines 180–219 and convert each view
  `[yaw, pitch]` with the helpers in `src/vehicles/cameraAngles.ts`
  (`toAzimuthPolar(yaw, pitch)`, pure, no three.js). Export `partIndexById(type)`. This
  makes T010 pass. Depends on T012.
- [X] T014 Implement `src/vehicles/geometry.ts`, which exports `VehicleGeometry`,
  `MaterialKind` and a memoised `buildGeometry(type)`. Port inspiration lines 221–378 as
  closely as possible, but output separate typed arrays (`positions`, `normals`,
  `kinds: Uint8Array`, `partIndex: Int16Array`), `edges` with part ids, `centroids` and
  `wheelCutout`. Also export `isInWheelCutout(x, y, z, cutout)`, ported from the
  fragment-shader discard and from `hit()`. This makes T011 pass. Depends on T013.
- [X] T015 [P] Implement `src/vehicles/ribbons.ts`, which exports
  `buildRibbons(edges, width, lift): Float32Array`, returning only positions for
  camera-independent ribbon quads (ported from inspiration lines 380–394). Add a small test
  in `tests/unit/ribbons.test.ts` checking that a single edge produces 6 vertices and that
  zero-length edges are skipped.
- [X] T016 Create the base store in `src/state/inspectionStore.ts` with zustand and no
  persistence yet. It holds:
  - Inspection fields from data-model.md: `vehicleType` ('suv'), `paint` ('grey'), and
    empty `conditions`, `notes`, `status: 'in-progress'`, `finishedAt: null` and
    `updatedAt`.
  - Temporary UI fields: `selectedPart: null`, `activeZone: 'all'` and
    `webgl: 'checking'`.
  - The actions `selectPart(id | null)`, `setActiveZone`, `setPaint` and `setWebgl`.
  Export the hook `useInspection` and the raw `inspectionStore` for tests. Depends on T013.
- [X] T047 Implement `src/state/selectors.ts` (`progress`, `zoneSummary` and
  `visibleParts`, all memoised by vehicle type). This makes T043 pass. (Moved here from US3,
  because US1 and US4 need it.) Depends on T016.
- [X] T017 [P] Create the style tokens in `src/styles/tokens.css`, copied from the
  inspiration:
  - Page `#DADADA`, shell `#ECECEC`, sidebar `#F7F7F7`.
  - Segmented track `#DCDCDC`, ink `#1C1C1E`, secondary text `#5E5E62` and `#3A3A3C`.
  - Accent `#3E6AE1` and `#2F55C0`.
  - Status colours `#1F7A45`, `#9A5200` and `#B3261E`.
  - Radii of 14, 8 and 6 px, and the shadow values.
  - Segmented-control buttons have `min-height: 44px` and `min-width: 44px`, overriding
    the inspiration's 40 px, to meet FR-024.
  - Inter at 15/22, and small caps text at 13 px with 0.04em tracking and uppercase.
  Create `src/styles/app.css` with the shell layout from the inspiration: a flex-wrap
  shell, a nav with `flex: 1 1 220px`, a main with `flex: 999 1 640px`, a 3D section with
  `flex: 999 1 460px`, an aside with `flex: 1 1 280px`, a 2 px focus ring, 44 px touch
  targets and a visually hidden `.sr-only` class.
- [X] T018 Build the app shell in `src/main.tsx` and `src/App.tsx`. Import
  `@fontsource-variable/inter` and the CSS. Render the layout landmarks from
  contracts/ui-contract.md:
  - `nav` "Inspection areas", with a header showing "[WORKSHOP NAME]" and "[VEHICLE REG]"
    and a placeholder "Guide" link with `href="#"`.
  - `main`, with a toolbar row, the `section` "3D vehicle", the `aside` "Parts" and the
    progress row.
  Leave empty slots for later components. Depends on T016 and T017.
- [X] T019 [P] Implement `src/ui/useWebGLSupport.ts`. It probes once, in a `useEffect`,
  with `document.createElement('canvas').getContext('webgl2') ?? getContext('webgl')` and
  writes `'ok'` or `'unavailable'` to the store's `webgl` field. Implement
  `src/ui/NoWebGLFallback.tsx`, a `role="status"` paragraph reading "3D view is not
  available here. Use the list." Write a component test in
  `tests/component/webgl-fallback.test.tsx` that stubs `getContext` to return null and
  checks that the fallback text appears.
- [X] T020 Build the 3D canvas shell in `src/scene/VehicleCanvas.tsx`, as the default export
  for `React.lazy`:
  - `<Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 30, position: [6, 3, 6] }}>`
    with `role="img"` and the `aria-label` from contracts/ui-contract.md on
    `gl.domElement`. Set `style={{ touchAction: 'pan-y' }}`, `aspect-ratio: 5 / 4` and
    `max-height: 560px`.
  - Hemisphere and directional lights matching inspiration lines 462–470, and a soft
    elliptical ground shadow (a plane with a radial-gradient `CanvasTexture`, disposed on
    unmount).
  - A custom hook, `src/scene/useAdaptiveDpr.ts`, for adaptive quality. It averages frame
    times only while the camera is moving or being dragged (camera-controls `controlstart`
    to `rest`). If the average goes over 20 ms, it lowers the pixel ratio in steps of 0.25,
    to a minimum of 1, and never raises it again during the session. drei
    `PerformanceMonitor` isn't used, because it needs a steady stream of frames and
    `frameloop="demand"` only produces them during movement.
  In `App.tsx`, mount it with `React.lazy` and `<Suspense fallback="Loading 3D view…">`
  only when `webgl === 'ok'`, and render `NoWebGLFallback` when it is `'unavailable'`. Wrap
  it in an error boundary, `src/ui/SceneErrorBoundary.tsx`, that shows the fallback.
  Depends on T018 and T019.
- [X] T021 Create `src/scene/VehicleMesh.tsx`. It builds a `BufferGeometry` in `useMemo`
  from `buildGeometry(vehicleType)` with the attributes `position`, `normal` and `color`
  (Float32 RGB, writable), and disposes of the geometry when it changes and on unmount. It
  has two materials:
  - Body: `MeshStandardMaterial` with `vertexColors`, roughness 0.45 and metalness 0.1.
  - Glass: a second mesh made from the glass-only triangles (kinds === 1), roughness 0.05,
    with a darker tint.
  Wheel arches are cut out with `onBeforeCompile`, which injects the `isInWheelCutout`
  discard (inspiration lines 451–456) using the `wheelCutout` uniform. Base colours per
  kind come from inspiration line 516, with paint from the store's `paint`. Export
  `writeColors(colorAttr, geometry, state)` from `src/scene/colors.ts` as a pure function
  (no React) that applies base colour, condition tint, selection and hover lift exactly as
  in inspiration lines 513–538. Call `invalidate()` after each write. Depends on T014 and
  T020.
- [X] T022 [P] Write a unit test for `src/scene/colors.ts` in `tests/unit/colors.test.ts`.
  Check that a body vertex of a part marked damage blends fully toward
  [0.9, 0.3, 0.28]; that a glass vertex blends 50%; that a selected part with no condition
  shifts toward blue; that hover lifts by 0.16; and that the paint hex is parsed correctly.
  Write this test before the colour logic in T021.
- [X] T023 [P] Create `src/scene/PartSeams.tsx`, which draws `lineSegments` for every edge
  between different parts in near-black `#1F1F21`, built once per vehicle type and
  disposed. Depends on T014.

**Checkpoint**: the app shows the grey SUV with its seams in a static 3D view. Unit tests
pass. With WebGL stubbed out, the fallback text appears.

---

## Phase 3: User Story 1 – select a part on the 3D car (P1) 🎯 MVP

**Goal**: drag to rotate, tap a part to select it, highlight it with an outline and callout,
show a hover hint on mouse, and pick parts from a basic list that turns the camera.

**Independent test**: load the app, drag to rotate, and click the front-left door. The door
highlights, the callout reads "FRONT LEFT DOOR · Not checked", and the list row for that
door is selected (quickstart checks 2–5).

### Tests for User Story 1 (write first and make sure they fail)

- [X] T024 [P] [US1] Write a unit test for the camera maths in
  `tests/unit/cameraMath.test.ts`. Check that `toAzimuthPolar` turns the inspiration's
  `[-π/2, 0.22]` "Front" view into the angle that faces +X. Check that the polar angle is
  clamped to [0.05, 1.52]. Check that `shortestAzimuth(from, to)` wraps within ±π.
- [X] T025 [P] [US1] Write a component test for the parts list in
  `tests/component/parts-list.test.tsx`. Check that it renders a `list` labelled
  "All parts" with one `button` per SUV part. Check that clicking "Bonnet" sets
  `selectedPart` to `'bonnet'` and gives that row `aria-pressed="true"`. Check that ↓ and ↑
  move focus between rows (roving tabindex) and that Enter selects.
- [X] T026 [P] [US1] Write a Playwright test, `tests/e2e/smoke.spec.ts`:
  - Load `/` and check there are no console errors.
  - Check that the `img` with the canvas name is visible.
  - Pick "Front left door" from the parts list, which turns the camera to the left side
    (FR-007), then pick "Bonnet" from the list so the door is no longer selected.
  - Using the test hook, call `window.__carInspector.getPartScreenPosition('front-door-left')`,
    click that point, and check that the hidden live region contains "Front left door
    selected" and that the list row has `aria-pressed="true"`.
  - Drag 40 px starting on a part and check that the selection does not change.
  - SC-005 accuracy check. Once US4's presets exist, this step is extended in T053: for
    each of the six presets, click the projected centre of every part whose centre is in
    view and not covered by another part. The test hook reports covered parts through a
    raycast from that pixel. Check that each click selects the intended part.

### Implementation for User Story 1

- [X] T027 [US1] Implement `src/scene/cameraMath.ts` (`toAzimuthPolar`, the polar clamp,
  `shortestAzimuth` and `PRESET_VIEWS` from inspiration line 821). Re-export the
  conversion that `src/vehicles/cameraAngles.ts` uses so there is one source of truth. This
  makes T024 pass.
- [X] T028 [US1] Implement `src/scene/CameraRig.tsx` with drei `<CameraControls>`:
  - Polar limits [0.05, 1.52].
  - Zoom limited to distances [7, 12].
  - One-finger touch rotates, and the mouse wheel zooms only while the canvas is focused or
    hovered, to keep page scrolling free.
  - It exposes `lookAtView({ azimuth, polar })` through a small zustand slice or ref
    registry in `src/scene/cameraBus.ts`, using `rotateTo(az, polar, !reducedMotion)`.
  - On mount, an intro move to the 3/4 preset over about 1.6 s, skipped with reduced
    motion (FR-008).
  - Reduced motion is read from `matchMedia('(prefers-reduced-motion: reduce)')` with a
    change listener.
  Depends on T027.
- [X] T029 [US1] Add picking to `src/scene/VehicleMesh.tsx`:
  - `onClick`: ignore it if `e.delta > 5`. Otherwise read the part from
    `partIndex[e.faceIndex * 3]`, skip wheel-arch hits on body or glass using
    `isInWheelCutout` with `e.point` in local space, and call `selectPart(id)`. A click on
    empty space leaves the selection unchanged (FR-003).
  - `onPointerMove` (mouse only): store the hovered part id in a ref, rewrite colours,
    set `document.body.style.cursor` to `pointer` or `grab`, and publish the hover name to
    `src/scene/hoverBus.ts`, a tiny subscribe/emit store that doesn't trigger React
    renders in the canvas.
  - `onPointerOut` clears the hover.
  Depends on T021.
- [X] T030 [P] [US1] Implement `src/scene/SelectionOutline.tsx`. When `selectedPart`
  changes, build the selected part's edges with `buildRibbons(edges, 0.04, 0.01)` into a
  `mesh` in accent blue `#3D6BE0` (`MeshBasicMaterial`, `depthTest` on, polygon offset),
  and dispose of the previous geometry. Depends on T015 and T021.
- [X] T031 [P] [US1] Implement `src/scene/Callout.tsx`. A drei-free DOM overlay sits in the
  "3D vehicle" section next to the canvas. A `useFrame` inside the canvas projects the
  selected part's centroid with `Vector3.project(camera)` and writes
  `transform`, `width` and the left or right side to the overlay's element ref, without
  `setState`, flipping sides like inspiration lines 554–569. It is hidden while the camera
  is moving or dragging. It shows the part name in uppercase and "Not checked" or the
  condition label in its colour. `aria-hidden="true"`. Depends on T021.
- [X] T032 [P] [US1] Implement `src/ui/HintLine.tsx`. It subscribes to `hoverBus` and
  shows the hovered part's name, or "Drag to rotate · Tap a part". It is a pill centred at
  the bottom of the 3D section with `aria-hidden="true"` (FR-005). Selection is announced
  only by LiveAnnouncer (T033), so hovering doesn't flood screen readers.
- [X] T033 [P] [US1] Implement `src/ui/LiveAnnouncer.tsx`, a visually hidden
  `role="status"` that announces "<Part name> selected · <Condition label or Not checked>"
  when `selectedPart` changes (FR-022).
- [X] T034 [US1] Implement `src/ui/PartsList.tsx`. It shows a heading "All parts" and a
  `role="list"` of buttons (name, status dot, status label) from `visibleParts`, with
  `aria-pressed` for the selected row, scrolling with a maximum height of 300 px on the
  `#DCDCDC` track. It uses roving tabindex with ↑, ↓, Home and End. Clicking a row calls
  `selectPart(id)` and then `cameraBus.lookAtView(part.view)` (FR-007). This makes T025
  pass. Depends on T016, T028 and T047.
- [X] T035 [US1] Implement `src/scene/testHooks.ts`. It is enabled only when
  `import.meta.env.DEV || import.meta.env.VITE_TEST_HOOKS === '1'`, and normal production
  builds strip it out. A `useFrame` keeps `window.__carInspector.getPartScreenPosition`
  up to date with projected centroids in client pixels. It also exposes
  `isPartCoveredAt(partId, x, y)`, a raycast from that pixel, for the SC-005 check. Mount it
  in `VehicleCanvas`. The end-to-end build sets `VITE_TEST_HOOKS=1` through the
  `webServer` command from T006. Depends on T031.
- [X] T036 [US1] Wire US1 into `App.tsx` and `VehicleCanvas.tsx`: `CameraRig`,
  `VehicleMesh`, `PartSeams`, `SelectionOutline`, `Callout`, `HintLine`, `LiveAnnouncer`
  and `PartsList`. Run T026 and quickstart checks 1–5. Depends on T028 to T035.

**Checkpoint**: User Story 1 works on its own. A part can be selected on the car or in the
list, with a highlight, outline, callout and spoken announcement.

---

## Phase 4: User Story 2 – record a condition and notes for each part (P1)

**Goal**: mark the selected part Pass, Advisory or Damage (choosing the same one again
clears it), add per-part notes, clear both, and tint the model by condition.

**Independent test**: select the bonnet, mark it Damage and type "Stone chip, centre". The
bonnet turns red, the row shows "Damage", and the note is still there after selecting
another part and coming back (quickstart checks 6–7).

### Tests for User Story 2 (write first and make sure they fail)

- [X] T037 [P] [US2] Write a unit test for the store in
  `tests/unit/store-conditions.test.ts`:
  - `mark('bonnet', 'damage')` sets it, and marking it again removes it.
  - `mark` with no matching part is ignored.
  - `setNote('bonnet', '  ')` removes the note.
  - Notes are capped at 1,000 characters.
  - `clear('bonnet')` removes both the condition and the note.
  - Every change updates `updatedAt`.
- [X] T038 [P] [US2] Write a component test for the condition panel in
  `tests/component/condition-panel.test.tsx`:
  - With nothing selected, it shows "Tap a part on the car or in the list to record its
    condition."
  - With the bonnet selected, it shows the `group` "Condition" and the heading
    "Condition · Bonnet".
  - Clicking Damage gives it `aria-pressed="true"`.
  - Typing in "Notes" stores the note, and switching parts shows that part's note.
  - Clear resets both.

### Implementation for User Story 2

- [X] T039 [US2] Add the actions `mark(partId, condition)`, `setNote(partId, text)` and
  `clear(partId)` to `src/state/inspectionStore.ts`, following the rules in data-model.md
  (part ids checked against `buildParts(vehicleType)`). This makes T037 pass.
- [X] T040 [US2] Implement `src/ui/ConditionPanel.tsx`:
  - The empty-state paragraph.
  - The `group` "Condition", a three-column segmented control with coloured dots, using
    `aria-pressed` and the colours from data-model.md.
  - A `<label>` "Notes" wrapping a `<textarea rows=3>` with the placeholder "Scratch, dent
    or chip, and where" and `maxLength=1000`, updated on input.
  - A "Clear" button.
  This makes T038 pass. Depends on T039.
- [X] T041 [US2] Extend `src/scene/colors.ts` and `VehicleMesh.tsx` so that condition tints
  come from the store's `conditions`. Subscribe with a selector and rewrite the colour
  buffer and `invalidate()` on change. Update `Callout.tsx` and `LiveAnnouncer.tsx` to show
  the condition label and colour. Update the `PartsList.tsx` rows to show the status dot and
  label in the status colour (FR-010). Depends on T039.
- [X] T042 [US2] Wire `ConditionPanel` into the "Parts" aside in `App.tsx`, under the
  parts list. Add `tests/e2e/condition.spec.ts`: select "Bonnet" from the list, click
  Damage, fill in Notes, and check that the row label reads "Damage" and that the note
  survives switching to another part and back. Depends on T040 and T041.

**Checkpoint**: User Stories 1 and 2 work together, giving a usable inspection with no
saving yet.

---

## Phase 5: User Story 3 – track progress and finish the inspection (P2)

**Goal**: a progress bar with counts, "Pass the rest", automatic saving to the device, and a
Save action that marks the inspection finished.

**Independent test**: mark two parts and choose "Pass the rest". Progress shows `total/total`
with correct counts. Reload, and everything is restored. Save shows "Finished", and the next
change returns it to in progress (quickstart checks 10–12 and 19).

### Tests for User Story 3 (write first and make sure they fail)

- [X] T044 [P] [US3] Write a unit test for the store's lifecycle in
  `tests/unit/store-lifecycle.test.ts`:
  - `passRest()` sets pass only on unchecked parts and keeps existing conditions.
  - When every part is already checked, it changes nothing, including `updatedAt`.
  - `finish()` sets `status: 'finished'` and `finishedAt`.
  - Any `mark`, `setNote`, `clear`, `setPaint` or `passRest` after `finish()` sets
    `status` back to `'in-progress'` and `finishedAt` back to null.
- [X] T045 [P] [US3] Write a unit test for persistence in
  `tests/unit/persistence.test.ts`:
  - `validatePersisted(raw)` accepts a valid object matching
    contracts/persisted-inspection.schema.json.
  - It rejects a bad enum, a wrong version, extra fields and non-JSON.
  - `sanitizeForVehicle` drops part ids that don't belong to the vehicle type.
  - `partialize` leaves out `selectedPart`, `activeZone` and `webgl`.
  - When storage throws (a mocked `localStorage.setItem` that throws), the store keeps
    working and `storageAvailable` becomes false.
- [X] T046 [P] [US3] Write a Playwright test, `tests/e2e/persistence.spec.ts`:
  - Mark two parts, choose "Pass the rest", and check that "26/26" shows.
  - Reload and check that the counts are still the same.
  - Click Save and check that "Finished" is visible.
  - Mark one part Advisory and check that "Finished" is gone.
  - Set `localStorage['car-inspection:v1'] = '{bad'`, reload, and check that "0/26" shows
    with no error screen.

### Implementation for User Story 3

- [X] T048 [US3] Add `passRest()` and `finish()` to `src/state/inspectionStore.ts`, and
  return any finished inspection to in progress on every changing action. This makes T044
  pass. Depends on T039.
- [X] T049 [US3] Implement `src/state/persistence.ts`:
  - A hand-written `validatePersisted` that mirrors the JSON Schema, without adding a
    validation library.
  - `sanitizeForVehicle`.
  - `storageProbe()`.
  - zustand `persist` options: name `car-inspection:v1`, `version: 1`, a `migrate` that
    returns a fresh inspection for unknown versions, `partialize`, a custom `storage` that
    validates in `getItem` and catches errors in `setItem`, and `onRehydrateStorage`, which
    logs `console.warn` and resets when invalid.
  Wrap the store from T016 with `persist(...)` and add `storageAvailable` to the temporary
  UI state. This makes T045 pass. Depends on T048.
- [X] T050 [US3] Implement `src/ui/ProgressBar.tsx`:
  - The label row "Inspection progress" with "<n> pass · <n> advisory · <n> damage".
  - A 44 px track with a fill `width: <pct>%` and a `<done>/<total>` badge.
  - A "Pass the rest" button, disabled when nothing is unchecked.
  - A primary "Save" button in `#3E6AE1` that calls `finish()`.
  - A status chip "Finished", or nothing while in progress, plus a short confirmation
    through `LiveAnnouncer` ("Inspection saved as finished").
  - A notice reading "Changes can't be saved in this browser." when `storageAvailable` is
    false.
  Depends on T047 to T049.
- [X] T051 [US3] Wire `ProgressBar` into the bottom row of `main` in `App.tsx`, and check
  that the colour buffer refreshes after `passRest`. Run T046 and quickstart checks 10–12
  and 19. Depends on T050.

**Checkpoint**: User Stories 1 to 3 give a full inspection that survives a reload.

---

## Phase 6: User Story 4 – navigate by zone and camera preset (P2)

**Goal**: sidebar zone filters with checked/total counts, and six camera preset buttons.

**Independent test**: choose "Wheels". The list shows only the 4 wheels and the zone reads
"0/4". Choose "Rear", and the car animates to the rear view (quickstart checks 8–9).

### Tests for User Story 4 (write first and make sure they fail)

- [X] T052 [P] [US4] Write a component test for zone navigation in
  `tests/component/zone-nav.test.tsx`:
  - Seven buttons appear in the `navigation` "Inspection areas".
  - "All parts" has `aria-pressed="true"` by default.
  - Clicking "Wheels" gives the list the heading "Wheels parts" with 4 rows, and the
    Wheels button shows "0/4".
  - After `mark('wheel-fr','pass')` it shows "1/4".
- [X] T053 [P] [US4] Write a Playwright test, `tests/e2e/navigation.spec.ts`:
  - Click each `group` "Camera view" button in turn.
  - After each one, check with a test hook (`window.__carInspector.getCameraAngles()`,
    added to `testHooks.ts`) that the azimuth and polar angles are within 0.05 rad of
    `PRESET_VIEWS`, given that reduced motion is on, so changes are instant.
  - SC-005 accuracy, in `tests/e2e/pick-accuracy.spec.ts`: for each preset, click the
    projected centre of every part that is on screen and where `isPartCoveredAt` is false.
    Check that the live region names that part each time.

### Implementation for User Story 4

- [X] T054 [P] [US4] Implement `src/ui/ZoneNav.tsx`. It renders a button per zone in
  `ZONES`, plus "All parts" first, each with an inline stroke SVG icon (`aria-hidden`), the
  name and `checked/total` from `zoneSummary`, using `aria-pressed` and a selected
  background of `#E2E2E4` with a font weight of 600. Clicking calls `setActiveZone`. Set
  the PartsList heading to "<Zone> parts" or "All parts". This makes T052 pass. Depends on
  T047.
- [X] T055 [P] [US4] Implement `src/ui/CameraPresets.tsx`. It renders a `group` "Camera
  view" of six buttons ("3/4", "Front", "Right", "Rear", "Left", "Top") that call
  `cameraBus.lookAtView(PRESET_VIEWS[label])`. Extend `testHooks.ts` with
  `getCameraAngles()`.
- [X] T056 [US4] Wire `ZoneNav` into the sidebar and `CameraPresets` into the toolbar row in
  `App.tsx`. When a part is picked on the canvas while a specific zone is active, switch to
  that part's zone, as in inspiration line 727. Run T053. Depends on T054 and T055.

**Checkpoint**: User Stories 1 to 4 all work, and a full walk-around is quick.

---

## Phase 7: User Story 5 – switch vehicle type (P3)

**Goal**: SUV, Saloon, Hatch, Pickup and Van, each with its own shape and parts, with a
confirmation before clearing a non-empty inspection. Also the paint swatches (FR-019).

**Independent test**: switch to Pickup. The model shows a cab and an open load bed, and the
list includes "Load bed" and "Rear cab window" with no quarter windows and 0/25. With data
recorded, Cancel keeps it and "Switch and clear" resets it (quickstart checks 13–14).

### Tests for User Story 5 (write first and make sure they fail)

- [X] T057 [P] [US5] Write a unit test for switching vehicles in
  `tests/unit/store-vehicle.test.ts`. Check that `switchVehicle('pickup')` resets
  `conditions`, `notes`, `status`, `finishedAt` and `selectedPart` and keeps `paint`. Check
  that `needsSwitchConfirm(state)` is false for an empty inspection and true when there is
  a condition or a note.
- [X] T058 [P] [US5] Write a component test for the switch dialog in
  `tests/component/vehicle-switch.test.tsx`:
  - With an empty inspection, clicking "Pickup" switches right away.
  - With a condition recorded, clicking "Van" opens the `dialog` "Start a new
    inspection?". Cancel (or Esc) closes it, keeps the data and returns focus to "Van".
  - "Switch and clear" switches and empties the data.
  - The paint buttons "White paint" and so on toggle `aria-pressed`.

### Implementation for User Story 5

- [X] T059 [US5] Add `switchVehicle(type)` and the exported pure helper
  `needsSwitchConfirm(state)` to `src/state/inspectionStore.ts`. This makes T057 pass.
- [X] T060 [P] [US5] Implement `src/ui/ConfirmSwitchDialog.tsx`, a native `<dialog>`
  opened with `showModal()`, titled "Start a new inspection?". The body text reads "Switching
  to <Type> clears the conditions and notes recorded so far." with the buttons "Switch and
  clear" and "Cancel". It handles `cancel` events (Esc) and returns focus to the button
  that opened it.
- [X] T061 [P] [US5] Implement `src/ui/VehicleTypeSwitch.tsx`, a `group` "Vehicle type"
  segmented control for the 5 types with `aria-pressed`, a car icon and the label "Vehicle
  type". It uses `needsSwitchConfirm` to decide whether to open the dialog.
- [X] T062 [P] [US5] Implement `src/ui/PaintPicker.tsx`, a `group` "Paint" with three
  44 px round swatch buttons ("Grey paint", "White paint", "Black paint") using
  `aria-pressed` and a 2 px accent ring when selected. They call `setPaint`.
- [X] T063 [US5] Wire `VehicleTypeSwitch` and `PaintPicker` into the toolbar in `App.tsx`,
  with paint after the camera presets as in research R8. In `VehicleMesh`, `PartSeams` and
  `SelectionOutline`, make sure that changing the vehicle type disposes of the old
  geometry and builds the new one, and that changing paint only rewrites colours. Run T058
  and quickstart checks 13–14. Depends on T059 to T062.

**Checkpoint**: all five user stories work on their own and together.

---

## Phase 8: Polish and cross-cutting concerns

- [X] T064 Handle WebGL context loss in `src/scene/VehicleCanvas.tsx`. In `onCreated`,
  attach `webglcontextlost` (with `preventDefault`, setting the store's `webgl` to
  `'lost'` and showing a "Restoring 3D view…" overlay) and `webglcontextrestored`
  (remounting the canvas by bumping a `key` and setting `webgl` to `'ok'`). Inspection
  state must survive. Add a Playwright step that calls
  `WEBGL_lose_context.loseContext()` and then `restoreContext()`, and checks that the
  counts are unchanged.
- [X] T065 [P] Write `tests/e2e/no-webgl.spec.ts`. An `addInitScript` makes
  `HTMLCanvasElement.prototype.getContext` return null for 'webgl' and 'webgl2'. Check that
  the fallback text shows, then complete an inspection from the list only: zone, part,
  condition, "Pass the rest" and Save (FR-023, SC-006).
- [X] T066 [P] Write `tests/e2e/keyboard.spec.ts`. Using only Tab, the arrow keys, Enter,
  Space and Esc, select a zone, move through the list, mark a part, type a note, switch
  vehicle (confirming through the dialog), choose "Pass the rest" and Save. Check that every
  focused element has a visible outline (computed `outline-style` isn't `none`) (FR-021).
- [X] T067 [P] Write `tests/e2e/responsive.spec.ts`. At a 390 × 844 viewport, check that
  `document.documentElement.scrollWidth <= 390`, that the sections stack (the aside's top
  is below the canvas's bottom) and that every button is at least 44 px tall and 44 px
  wide (FR-024).
- [X] T068 [P] Write `tests/e2e/reduced-motion.spec.ts`. With `reducedMotion: 'reduce'`,
  check that the camera angles equal the 3/4 preset right after load (no intro move) and
  that presets apply instantly. With `'no-preference'`, check that the intro move happens
  (the angle changes between 100 ms and 1,500 ms).
- [X] T069 Check performance against Principle II:
  - Run `npm run build && npm run size` and confirm the entry chunk is 300 KB gzipped or
    less. If it's over, make sure `three` is only reachable through the lazy `scene/`
    chunk.
  - Confirm with `renderer.info.render.calls` (logged through the test hooks) that a frame
    makes under 10 draw calls.
  - Confirm with the DevTools Performance timeline that no frames render while idle.
  - Write `tests/e2e/load-time.spec.ts` (Chromium only) for SC-004. It uses the DevTools
    protocol (`Network.emulateNetworkConditions`) to limit the network to 20 Mbps down
    with 20 ms latency. It measures the time from navigation start to
    `window.__carInspector.firstFrameAt`, a `performance.now()` mark set by `testHooks.ts`
    on the canvas's first rendered frame, and requires 3,000 ms or less.
  Record the results in `specs/001-car-parts-selector/perf-notes.md`.
- [ ] T070 [P] Optional: write `tests/e2e/visual.spec.ts`, taking Playwright screenshots of
  the 3/4 preset for each of the 5 vehicle types in Chromium, at pixel ratio 1 with reduced
  motion and `maxDiffPixelRatio: 0.02`.
- [X] T071 [P] Write `README.md` covering what the demo is, the scripts (from
  quickstart.md), the architecture (one paragraph per folder from plan.md), the
  constitution exception (generated models) and the licences.
- [X] T072 Run every check in quickstart.md (`typecheck`, `lint`, `test`, `test:e2e` and
  `size`) and manual checks 1–19. Fix any failures, then tick off this tasks list.

---

## Dependencies and execution order

### Phases

```text
Phase 1 Setup ──▶ Phase 2 Foundational ──▶ US1 (P1) ──▶ US2 (P1) ──▶ US3 (P2)
                                              │
                                              ├──────────▶ US4 (P2)
                                              └──────────▶ US5 (P3)

                    all stories done ──▶ Phase 8 Polish
```

### User stories

- **US1** depends only on Phase 2. This is the MVP.
- **US2** depends on US1, because the condition panel acts on the selected part.
- **US3** depends on US2 (its actions need `mark`). Persistence wraps the store from T016.
- **US4** depends on US1 only. `zoneSummary` comes from T047 in Phase 2.
- **US5** depends on US1. `needsSwitchConfirm` reads conditions and notes, so it is fully
  meaningful once US2 is done.

### Inside each story

The tests come first and must fail. Then store and pure logic, then scene and UI
components, then wiring in `App.tsx`, then the story's end-to-end test.

## Running tasks in parallel

- **Setup**: T003 to T008 can all run at once after T001 and T002.
- **Foundational**: the tests T009, T010, T011 and T043 together. Then T012, T015, T017 and
  T019 together. T047 follows T016. T013 → T014 → T021 is the critical path. T022 and T023 run alongside T021.
- **US1**: tests T024, T025 and T026 together. Then T030, T031, T032 and T033 together once
  T021 is done.
- **US2**: tests T037 and T038 together.
- **US3**: tests T044, T045 and T046 together.
- **US4**: T052 and T053 together, then T054 and T055 together.
- **US5**: T057 and T058 together, then T060, T061 and T062 together.
- **Polish**: T065 to T068, T070 and T071 together.

Example for US1:

```text
Task: "T024 camera math unit test in tests/unit/cameraMath.test.ts"
Task: "T025 PartsList component test in tests/component/parts-list.test.tsx"
Task: "T026 Playwright smoke test in tests/e2e/smoke.spec.ts"
# then
Task: "T030 SelectionOutline in src/scene/SelectionOutline.tsx"
Task: "T031 Callout in src/scene/Callout.tsx"
Task: "T032 HintLine in src/ui/HintLine.tsx"
Task: "T033 LiveAnnouncer in src/ui/LiveAnnouncer.tsx"
```

## Implementation strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup, then Phase 2 Foundational. The SUV renders.
2. Phase 3, US1: select a part on the car or in the list.
3. **Stop and check**: T026 and quickstart checks 1–5. This can be demoed already.

### Adding to it step by step

1. Add US2 (conditions and notes). That makes a real inspection, without saving.
2. Add US3 (progress, automatic saving and Save). The inspection now survives a reload.
3. Add US4 (zones and presets) for a faster walk-around.
4. Add US5 (vehicle types and paint) to show the full range.
5. Then Polish, which covers the resilience, accessibility, performance and size gates.

## Notes

- [P] means different files with no dependency on unfinished tasks.
- Each story ends with a checkpoint and an end-to-end test that can be run on its own.
- Every PR touching `src/scene/` reports the measured fps and the change in bundle size
  (constitution workflow).
- Commit after each task or logical group, once the folder is a git repository.

## Implementation notes (2026-11-18)

- **T002**: TypeScript 6.0.3 and ESLint 9.39, not 7.0 and 10. typescript-eslint and
  eslint-plugin-jsx-a11y don't support the newer versions yet (see research.md).
- **T020 and T021**: the car, seams and shadow use small `ShaderMaterial`s ported from the
  inspiration's GLSL instead of `MeshStandardMaterial` and scene lights, so the look matches
  the design exactly. Adaptive pixel ratio is the custom `useAdaptiveDpr` hook (F6).
- **T029**: picking re-casts the full ray against the mesh (`pickAlongRay`). React Three
  Fiber keeps only the nearest hit per object, which broke picking through the wheel-arch
  cut-outs (found by the SC-005 test).
- **T031**: the callout follows the part while the camera moves instead of hiding. It is
  updated through a ref, so tracking costs nothing.
- **T064**: if the browser never fires `webglcontextrestored`, the canvas rebuilds itself
  after 1.5 s. Context events from replaced canvases are ignored.
- **T070 (optional) was not done**: visual snapshots taken with this machine's software GPU
  wouldn't be stable reference images. Add them on CI hardware if wanted.
- **Firefox**: Playwright's Firefox could not launch in this sandboxed environment ("Could
  not find profile folder"). The Firefox project is configured but has not been run here.
- **Frame-rate targets**: not measured, because only a headless software GPU was available.
  See perf-notes.md.

## Follow-up: real models (2026-11-18, requested by the owner)

- [X] R001 Add `scripts/build-model.mjs`, which converts a binary STL or OBJ into a
  Meshopt-compressed GLB in app space, keeping OBJ groups and materials as "group|material" tags.
- [X] R002 Build `public/models/suv.glb` from `~/Downloads/bmwx1f48.stl` (500k → 150k
  triangles, 476 KB).
- [X] R003 Build `public/models/van.glb` from `~/Downloads/Van_Car_1/Van Car 1/Van Car 1.obj`
  (15.6k triangles, 67 KB).
- [X] R004 Split the models into parts in `src/vehicles/modelSegmentation.ts`: per-vehicle
  classifiers using measured landmarks plus tags, crease-aware normals, part boundaries,
  anchors on each part's surface, and long-edge subdivision for the van. Tests in
  `tests/unit/modelSegmentation.test.ts`.
- [X] R005 Load the models in `src/scene/vehicleModels.ts` (GLTFLoader + Meshopt, suspending,
  falling back to the drawn shape). VehicleMesh, PartSeams and SelectionOutline use
  `useVehicleGeometry`. Picking uses three-mesh-bvh and `face.a`, because the BVH reorders
  triangles.
- [X] R006 Update the tests for the real models: wait for the car before measuring the first
  frame, and use a full-height viewport in the accuracy test. All unit and e2e tests pass.
- [X] R008 Add GLB input to `scripts/build-model.mjs`. Build `public/models/saloon.glb` from the
  W222 GLB (27.8k triangles, 133 KB). Add `classifySaloonFace`, which uses the named wheel
  objects, the glass materials and measured landmarks.
- [X] R009 Remove Hatch and Pickup, at the owner's request: catalog, load-bed code, the stored
  data contract, and the unit, component and e2e tests.
- [ ] R007 Record the source and licence of all three models in `public/LICENSES.md` (owner to
  supply).

## Follow-up: demo simplifications (2026-11-18, owner)

- [X] D001 Remove saving entirely (it's a demo): delete `src/state/persistence.ts`, the
  persist middleware, the Save button, the "finished" state and the persisted-data contract.
  Tests updated; `tests/e2e/progress.spec.ts` checks that a reload starts fresh.
- [X] D002 Add "Pass the rest" to the phone footer.
- [X] D003 Desktop: the parts list fills the Parts column, matching the 3D view's height.
