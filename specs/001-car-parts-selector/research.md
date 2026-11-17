# Research: 3D Car Parts Selector

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-18

Versions were checked against the npm registry on 2026-11-18: vite 8.3.8, react 19.3.1, three
0.187.0, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, zustand 5.1.0, vitest 5.1.0,
@playwright/test 1.65.1, typescript 7.0.2, @testing-library/react 16.3.3. Local runtime: Node
22.22.2, npm 11.14.0.

**Change during implementation (T002)**: the project uses TypeScript **6.0.3** and ESLint
**9.39**, not TypeScript 7.0 and ESLint 10. The latest typescript-eslint (8.73) supports
TypeScript below 6.1 only, and eslint-plugin-jsx-a11y (6.10) supports ESLint up to 9 only.
Both are needed for the lint gate in constitution Principle III, so the versions were
lowered to keep linting working. Revisit once those plugins support the newer releases.

---

## R1. How the vehicle shapes are built

**Decision**: Port the inspiration's generator into a pure TypeScript module
(`src/vehicles/geometry.ts`). It takes a vehicle-type config and returns typed arrays:
positions, normals, a per-vertex material kind (body, glass, underside, tyre, hub), a
per-vertex part index, the part-boundary edge list, and each part's centre point. React
components turn the arrays into a `BufferGeometry` inside `useMemo` and dispose of it on
change and on unmount.

**Rationale**:
- Clarification Q2 chose app-drawn shapes. The inspiration already solves the hard parts:
  the profile curves for five body styles, the part layout, the wheel arches cut out of the
  body, and the boundaries between parts.
- A pure function can be unit-tested without a GPU (Principle III). Tests can check part
  counts per body style, that every part has triangles, that edges reference real parts, and
  that the output doesn't change between runs.
- The whole car is a single mesh, so it costs one draw call (Principle II).

**Alternatives considered**:
- One three.js primitive per part (boxes, cylinders): looks crude, and the seams between
  panels are hard to get right.
- glTF/GLB models: rejected in Clarification Q2.
- Keeping the inspiration's hand-written WebGL: it bypasses React Three Fiber and breaks
  Principle I.

## R2. Rendering and picking parts

**Decision**:
- **Car body**: a single `mesh` with per-vertex colors (`vertexColors`) and a
  `MeshStandardMaterial`. Glass gets its tint and shine from the colors plus a second, small
  glass-only mesh with lower roughness and a little transparency. Condition tints, hover and
  selection are written into the color buffer (`needsUpdate`), so the geometry is never
  rebuilt.
- **Picking**: React Three Fiber pointer events on the body mesh. `event.faceIndex * 3`
  gives the first vertex of the hit triangle, and the per-vertex part index gives the part.
  React Three Fiber already sorts hits so the nearest one comes first, which meets FR-003's
  "frontmost part". Hits on wheel-arch cut-outs are filtered out with the same test the
  shader uses to hide them.
- **Seams and selection**: `lineSegments` for all part-boundary seams, plus a thicker
  highlight built from the selected part's edges, drawn as camera-facing ribbons as in the
  inspiration. These are rebuilt only when the selection changes.
- **Telling a drag from a tap**: in `onClick`, ignore the click when `event.delta`, the pixel
  distance moved since pointer-down, is over 5. That way a rotation drag never selects a
  part, as the spec's edge case requires.

**Rationale**: one body mesh plus two line meshes plus a shadow plane comes to under 10 draw
calls. Picking by face index is exact and needs no extra GPU picking pass.

**Alternatives considered**:
- GPU colour-ID picking: more complex, and not needed at about 4,000 triangles.
- A separate mesh per part: around 35 draw calls, and the vertex normals no longer blend
  smoothly across seams.

## R3. Camera control

**Decision**: use drei's `<CameraControls>` (which wraps camera-controls):
- **Limits**: polar angle from 0 to about 1.52 rad (never below ground level) and an azimuth
  that rotates freely. Zoom is limited to a small range, with the wheel and pinch kept
  conservative so page scrolling still works.
- **Presets** use `rotateTo(azimuth, polar, enableTransition)`. Passing
  `enableTransition = !prefersReducedMotion` meets FR-008 and Principle IV.
- **List picks** rotate to the part's preferred view angle, taken from the part definition
  (FR-007).
- **Touch**: one finger rotates. The canvas uses `touch-action: pan-y`, so a vertical swipe
  still scrolls the page on phones (spec edge case).

**Rationale**: smooth damped transitions, limits and touch handling come built in, and only
the controls are bundled because drei supports tree-shaking.

**Alternatives considered**:
- Porting the inspiration's own yaw/pitch maths: more code to test, with the same result.
- drei `OrbitControls`: it has no built-in animated `rotateTo`.

## R4. Rendering only when needed, and performance budgets

**Decision**:
- `<Canvas frameloop="demand" dpr={[1, 2]}>`. Camera-controls redraws automatically while
  moving, and store changes that affect the scene call `invalidate()`. A static view
  therefore draws nothing, and a hidden tab draws nothing (Principle II).
- **Adaptive quality** comes from a small custom hook, `useAdaptiveDpr`. It averages frame
  times only while the camera is moving or being dragged. Above 20 ms it lowers the pixel
  ratio in steps of 0.25, to a minimum of 1. drei `PerformanceMonitor` was rejected because
  it relies on a steady stream of frames, which an app that only redraws on change produces
  only during movement.
- The 3D scene is `React.lazy`-loaded. The first paint shows the sidebar, parts list and
  controls from a small initial bundle, and three.js plus React Three Fiber load in a
  separate chunk behind `<Suspense>`. The fallback shows "Loading 3D view…".
- **Bundle check**: `vite build`, then a script that totals the gzipped size of the
  entry-chunk JavaScript. It must stay at or under 300 KB. The 3D chunk is reported but
  doesn't count toward that budget.

**Rationale**: these directly meet constitution Principle II and success criteria SC-003 and
SC-004.

## R5. State and automatic saving

**Decision**: a single zustand store for the inspection, using the `persist` middleware
(`localStorage`, key `car-inspection:v1`):
- Every change to an inspection field is stored automatically (Clarification Q3, FR-015).
  `partialize` keeps temporary UI state (hover, selection, active zone) out of storage.
- Stored data is checked on load against the schema in
  [contracts/persisted-inspection.schema.json](./contracts/persisted-inspection.schema.json).
  If it fails, the app falls back to a fresh inspection and logs a console warning (spec
  edge case: saved data unreadable).
- Any `localStorage` errors (private mode, storage full) are caught. The app keeps working
  from memory and shows a non-blocking notice that changes won't be kept.
- **Storage versioning**: `version: 1` plus a `migrate` hook, ready for later schema changes.
- The scene reads the store through narrow selectors, so React re-renders only what
  changed. Per-frame values (camera, hover tint) never go through React state (Principle I).

**Rationale**: about 1 KB gzipped. Selectors let the condition panel and the 3D colour
buffer update without re-rendering the whole tree. `persist` meets the autosave rule in
very little code.

**Alternatives considered**:
- `useReducer` plus Context plus a hand-written `localStorage` effect: no dependency, but
  every consumer re-renders on every change, and persistence edge cases have to be written
  by hand.
- Redux Toolkit: far more than this needs.

## R6. Fallback when 3D isn't available

**Decision**:
- **Detection before mounting**: `useWebGLSupport()` tries
  `canvas.getContext('webgl2') || getContext('webgl')`. If neither is available, the 3D area
  shows "3D view is not available here. Use the list." and the canvas chunk is never loaded
  (FR-023).
- **Context loss**: a `webglcontextlost` listener on `gl.domElement` calls
  `preventDefault()` and shows a "Restoring 3D view…" overlay. On
  `webglcontextrestored` the scene is remounted with a key change. Inspection state lives
  in the store, so nothing is lost.
- **Render errors**: an error boundary around the canvas shows the same fallback message.

## R7. Accessibility

**Decision**:
- **Canvas**: `role="img"` and an `aria-label` copied from the inspiration (FR-022).
- **Announcements**: a visually hidden `aria-live="polite"` region announces "<Part> selected
  · <Condition>" when the selection changes.
- **Controls**: every action is a real `<button>` with `aria-pressed` where it toggles,
  inside labelled groups. The parts list supports arrow keys through roving tabindex.
- **Callout**: a DOM element positioned each frame from the part's projected centre. It
  writes `transform` through a ref with no React re-render, and is `aria-hidden` because
  the live region carries the same information.
- **Confirmation for switching vehicle type**: a native `<dialog>` used as a modal. It traps
  focus and returns focus to the type button on close. Native `confirm()` is not used.
- **Colour contrast**: status colours come from the inspiration (Pass #1F7A45, Advisory
  #9A5200, Damage #B3261E on white). All meet 4.5:1 and always appear with a text label
  (FR-010).

## R8. Paint colour control

**Decision**: three swatch buttons (grey #6B6E74, white #E6E7E9, black #1F2124), each with
an `aria-label`, placed in the toolbar after the camera presets. Grey is the default. The
choice is saved with the inspection.

**Rationale**: this settles the one low-impact item left open after clarification. It sits
with the other view controls and adds no extra panel.

## R9. Testing approach

**Decision**:
- **Vitest unit tests**, written test-first for: vehicle configs and part lists for each
  body style, geometry output, the store's actions (mark, toggle off, clear, pass the rest,
  status changes between in progress and finished, vehicle switch reset), and loading,
  validating and migrating saved data.
- **Vitest with @testing-library/react** for DOM components in jsdom, with the canvas chunk
  mocked. This covers zone filtering, the condition panel and the confirmation dialog.
- **Playwright** smoke and end-to-end tests against `vite preview` in Chromium and WebKit:
  - The canvas renders with no console errors (Principle III).
  - A part can be picked by clicking the canvas, using a known screen position from the Top
    preset.
  - The inspection can be completed with the keyboard only.
  - With WebGL stubbed out by an `addInitScript` that makes `getContext` return null, the
    fallback shows and the list-only flow works.
  - A reload restores the inspection.
- **Visual snapshots** are optional for the 3/4 preset of each vehicle type, at a fixed
  pixel ratio and with reduced motion on.

## R10. Fonts and styling

**Decision**: Inter is self-hosted through `@fontsource-variable/inter` (one woff2 file, no
calls to Google at runtime). The CSS uses plain CSS custom properties copied from the
inspiration's palette, defined in `src/styles/tokens.css`. No CSS framework is used.

**Rationale**: there are few UI parts and the inspiration's styles are simple. Tailwind or a
component library would be unjustified dependencies (Principle V).
