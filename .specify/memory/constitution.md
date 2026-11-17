<!--
Sync Impact Report
==================
Version change: (template, unversioned) → 1.0.0
Bump rationale: First ratification; all placeholder tokens replaced with concrete governance.

Modified principles (template placeholder → adopted title):
  - [PRINCIPLE_1_NAME] → I. Declarative, Component-Driven Scenes
  - [PRINCIPLE_2_NAME] → II. Performance Budgets (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Type Safety & Test-First Logic
  - [PRINCIPLE_4_NAME] → IV. Accessible & Resilient by Default
  - [PRINCIPLE_5_NAME] → V. Simplicity & Asset Discipline

Added sections:
  - Technology & Asset Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])
  - Governance (filled)

Removed sections: none

Templates reviewed (read the constitution at runtime; not modified by this command):
  - .specify/templates/plan-template.md ("Constitution Check" gate) ✅ compatible
  - .specify/templates/spec-template.md ✅ compatible
  - .specify/templates/tasks-template.md ✅ compatible

Follow-up TODOs:
  - Product scope and build tool supplied by the user: a demo 3D car-model selector
    built with Vite. Revisit performance budgets once the first spec defines target devices.
-->

# 3D Car Selector Constitution

## Core Principles

### I. Declarative, Component-Driven Scenes

- The 3D scene MUST be expressed as React components (React Three Fiber over three.js);
  imperative three.js code is permitted only inside hooks (`useFrame`, `useEffect`,
  custom hooks) and MUST be encapsulated behind a component or hook boundary.
- Each scene object (model, light rig, camera controller, effect) MUST live in its own
  component with typed props; scene composition happens in a small number of
  top-level scene files.
- Every GPU resource created imperatively (geometries, materials, textures, render
  targets) MUST be disposed on unmount.
- Per-frame updates MUST mutate refs, not React state, to avoid re-rendering the tree
  every frame.

**Rationale**: Declarative scenes keep 3D code reviewable and composable like the rest
of the React app, while ref-based frame updates and explicit disposal prevent the two
most common R3F failures: render thrashing and GPU memory leaks.

### II. Performance Budgets (NON-NEGOTIABLE)

- The demo MUST sustain 60 fps on a mid-range laptop integrated GPU and MUST NOT drop
  below 30 fps on a mid-range mobile device at the default quality setting.
- Initial JavaScript MUST stay ≤ 300 KB gzipped; heavy scenes, models, and
  post-processing MUST be lazy-loaded behind `Suspense` with a visible loading state.
- Draw calls per frame SHOULD stay ≤ 200; exceeding that requires instancing, merging,
  or a documented justification in the plan's Complexity Tracking.
- Rendering MUST be on-demand (`frameloop="demand"`) for static views and MUST pause
  when the tab is hidden or the canvas is off-screen.
- Device pixel ratio MUST be capped (≤ 2) and quality MUST degrade adaptively when
  frame time exceeds budget.

**Rationale**: A 3D demo is judged first by how smooth it feels. Fixed, measurable
budgets make performance a gate rather than an afterthought.

### III. Type Safety & Test-First Logic

- All source MUST be TypeScript with `strict` enabled; `any` requires an inline
  justification comment.
- Non-visual logic (state stores, math/animation utilities, loaders, input mapping)
  MUST be written test-first: failing unit test → implementation → refactor.
- Each user-facing scene MUST have at least one automated smoke test that mounts the
  canvas and asserts it renders without runtime errors; visual regression snapshots
  SHOULD be added for scenes whose appearance is part of the feature's acceptance criteria.
- Lint, type-check, and tests MUST pass before merge.

**Rationale**: GPU output is hard to assert on, so correctness pressure belongs on the
logic around it. Strict types and test-first utilities keep the hard-to-test layer thin.

### IV. Accessible & Resilient by Default

- The app MUST detect missing or lost WebGL support and render a meaningful fallback
  (static image or explanatory message) instead of a blank page or crash; WebGL context
  loss MUST be handled.
- Camera and scene interactions MUST be operable by keyboard as well as pointer/touch.
- `prefers-reduced-motion` MUST be honored: auto-rotation, camera fly-throughs, and
  non-essential animation are disabled or reduced.
- The canvas MUST have an accessible name, and any information conveyed only visually
  in 3D MUST also be available as text in the DOM.
- 3D UI overlays (HUD, menus, tooltips) MUST be HTML/DOM, not text rendered into the
  WebGL scene, unless the feature requires in-world text.

**Rationale**: A canvas is opaque to assistive technology and fragile across devices;
explicit fallbacks and DOM-based information keep the demo usable for everyone.

### V. Simplicity & Asset Discipline

- Start with the simplest scene that demonstrates the feature; new dependencies
  (physics, post-processing, state libraries) MUST be justified in the plan.
- 3D models MUST be glTF/GLB, compressed (Draco or Meshopt) and with KTX2/WebP
  textures where supported; a single car model SHOULD be ≤ 5 MB, and switching between
  cars MUST NOT re-download a model already loaded in the session.
- Every third-party asset MUST have its source and license recorded alongside it.
- Dead scenes, unused assets, and experimental code MUST be removed rather than
  left commented out.

**Rationale**: Asset weight is the dominant cost in a 3D web app, and dependency sprawl
is the dominant cost in maintenance. YAGNI applies to polygons too.

## Technology & Asset Constraints

- **Runtime stack**: React 19+, TypeScript (strict), three.js via `@react-three/fiber`,
  with `@react-three/drei` for common helpers. Alternatives require a constitution
  amendment.
- **Build & tooling**: Vite (client-side SPA; no server rendering), ESLint, Prettier,
  Vitest for unit tests, Playwright for smoke/visual tests. Changing the build tool
  requires a constitution amendment.
- **Assets**: Stored under a dedicated `public/models` / `public/textures` tree (or a
  CDN/Blob store when size demands), never inlined into JS bundles.
- **Browsers**: Latest two versions of Chrome, Edge, Firefox, and Safari (desktop and
  iOS); WebGL 2 is the baseline, WebGPU is opt-in progressive enhancement only.
- **Secrets**: No API keys or credentials in client code or committed files.

## Development Workflow & Quality Gates

- Work proceeds through Spec Kit: `/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`. Every `plan.md` MUST complete the
  Constitution Check against Principles I–V before design work begins and again after.
- Each change MUST pass, in CI or locally before merge: type-check, lint, unit tests,
  and scene smoke tests.
- Changes touching rendering, assets, or bundle composition MUST report the measured
  fps (on the reference device class) and bundle-size delta in the PR description.
- Any violation of a MUST rule requires an entry in the plan's Complexity Tracking table
  stating why it is needed and why the simpler alternative was rejected.
- Code review MUST verify GPU resource disposal and fallback behavior for new scenes.

## Governance

- This constitution supersedes conflicting conventions, READMEs, and ad-hoc practices.
  Where guidance conflicts, the constitution wins until amended.
- **Amendments**: Proposed via `/speckit-constitution` with a written rationale; the
  change, version bump, and Sync Impact Report are committed together. Amendments that
  loosen a NON-NEGOTIABLE principle require explicit owner approval in the PR.
- **Versioning** (semantic):
  - MAJOR — a principle is removed or redefined in a backward-incompatible way.
  - MINOR — a principle or section is added or guidance is materially expanded.
  - PATCH — clarifications, wording, and typo fixes with no change in meaning.
- **Compliance review**: Every plan's Constitution Check and every PR review MUST
  confirm adherence; performance budgets (Principle II) are re-validated at each
  release. Unjustified complexity is grounds to reject a change.

**Version**: 1.0.0 | **Ratified**: 2026-11-18 | **Last Amended**: 2026-11-18
