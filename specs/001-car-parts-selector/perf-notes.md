# Performance Notes: 3D Car Parts Selector

**Date**: 2026-11-18 | **Constitution**: Principle II (performance budgets)

Measured on a production build. The automated measurements come from
`tests/e2e/load-time.spec.ts` (Chromium, headless, software GPU) and `npm run size`.

| Check | Budget | Measured | Result |
|-------|--------|----------|--------|
| Entry JavaScript (gzipped), entry plus static imports | ≤ 300 KB | **75.2 KB** | ✅ |
| Lazy 3D chunk (three.js + React Three Fiber + drei CameraControls), gzipped | not counted | 250.5 KB | n/a |
| CSS (gzipped) | — | 3.0 KB | — |
| First 3D frame at 20 Mbps down / 20 ms latency, cache off | ≤ 3,000 ms (SC-004) | **~500 ms** | ✅ |
| Draw calls per frame (car, seams, shadow, plus the outline when a part is selected) | < 10 (plan) / ≤ 200 (constitution) | **3–4** | ✅ |
| Frames rendered during 1 s idle | 0 (`frameloop="demand"`) | **0** | ✅ |
| Test hooks in the production `dist/` build | none | none | ✅ |

### After adding the real models

| Check | Measured |
|-------|----------|
| `models/suv.glb` (150k triangles, Meshopt) | 476 KB |
| `models/van.glb` (15.6k triangles, 178k after subdivision at load) | 67 KB |
| Lazy 3D chunk, now including three-mesh-bvh and GLTFLoader (gzipped) | 289 KB |
| Entry JS (gzipped) | 75.2 KB, unchanged ✅ |
| First car frame with the SUV model, 20 Mbps / 20 ms | ~1.2 s (≤ 3 s ✅) |
| Splitting the SUV model into parts (Node) | ~130 ms |
| Draw calls per frame | 2–3 ✅ |

## Not measured here

The frame-rate targets (60 fps on a laptop with integrated graphics, 30 fps or more on a
mid-range phone) **have not been measured**. This environment renders with a headless
software GPU, so any fps figure from it would say nothing about real hardware. Before
release, measure them by hand as described in quickstart.md › Performance check: DevTools
Performance while drag-rotating for 5 s, on a laptop and on a phone through remote
debugging. Record the results here.

What keeps rendering cheap:
- About 4,000 triangles per car, in a single vertex-coloured mesh.
- Colour changes rewrite one buffer instead of rebuilding geometry.
- Pixel ratio is capped at 2 and lowered automatically by `useAdaptiveDpr` when frames
  take more than 20 ms while the camera is moving.
