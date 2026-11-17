# Data Model: 3D Car Parts Selector

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

All data lives in the browser. There are two kinds:

- **Static catalog data**: vehicle types, parts and zones. It is defined in code, and
  derived data is computed by pure functions.
- **The inspection**: user data held in the store and saved automatically to
  `localStorage`. Its stored shape is in
  the persisted-data contract, now removed: since 2026-11-18 nothing is saved (it's a demo).

---

## Static catalog

### VehicleTypeId

`'suv' | 'saloon' | 'hatch' | 'pickup' | 'van'`. The default is `'suv'`.

### VehicleType

| Field | Type | Notes |
|-------|------|-------|
| `id` | `VehicleTypeId` | Unique |
| `label` | string | "SUV", "Saloon", "Hatch", "Pickup", "Van" |
| `shape` | `ShapeConfig` | Profile and proportion numbers ported from the inspiration: `lx`, `y0`, `bmax`, wheel radius and positions, door and pillar positions (`XD1`, `XR`, `XD2`, `XD3`, `XRR`, `XT`), the roof profile `HK`, and the `qGlass`, `capGlass` and `bed` flags |
| `skipParts` | `PartBaseId[]` | Parts this body style doesn't have (for example `quarter-window` on Saloon and Pickup) |
| `renames` | `Partial<Record<PartBaseId, string>>` | Names specific to the body style. `{s}` is replaced with the side, as in "Sliding {s} door" |

**Validation**: `shape` values are fixed constants checked by unit tests. Every resulting
part must have at least one triangle.

### ZoneId

`'Front' | 'Top' | 'Right side' | 'Left side' | 'Rear' | 'Wheels'`. The UI adds a filter
called `'all'` (shown as "All parts"), which is not a zone.

### Part

The part list is derived from a vehicle type by `buildParts(type)`. Its order is fixed and
matches the inspiration.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `PartId` (string) | Unique within a vehicle type, for example `front-door-left` or `wheel-rr` |
| `name` | string | Shown in the UI, after any renames are applied |
| `zone` | `ZoneId` | |
| `view` | `{ azimuth: number; polar: number }` | The camera angle used when the part is picked from the list (FR-007) |

**Part counts by body style**, pinned in unit tests: SUV 26, Saloon 24 (no quarter windows),
Hatch 26, Pickup 25 (no quarter windows, plus the load bed), Van 26.

### VehicleGeometry

The output of `buildGeometry(type)`. It is derived, never stored, and cached for each type.

| Field | Type | Notes |
|-------|------|-------|
| `positions` | `Float32Array` | xyz for each vertex, as non-indexed triangles |
| `normals` | `Float32Array` | |
| `kinds` | `Uint8Array` | 0 body, 1 glass, 2 underside, 3 tyre, 4 hub, 5 hub-dark |
| `partIndex` | `Int16Array` | The index into the parts array, or −1 for underside with no part |
| `edges` | `Edge[]` | `{ a: PartId \| null; b: PartId \| null; p1, p2, n1, n2 }`: part boundaries used for seams and the selection outline |
| `centroids` | `Float32Array` | The centre of each part, used to anchor the callout |
| `wheelCutout` | `[xf, xr, radius, r2]` | Used to hide the wheel arches when drawing and picking |

---

## Inspection (stored)

### Condition

`'pass' | 'advisory' | 'damage'`. A part with no entry is **Not checked**.

| Value | Label | Text colour | Tint on the model |
|-------|-------|-------------|-------------------|
| `pass` | Pass | #1F7A45 | green |
| `advisory` | Advisory | #9A5200 | amber |
| `damage` | Damage | #B3261E | red |

### PaintId

`'grey' | 'white' | 'black'`. These map to #6B6E74, #E6E7E9 and #1F2124. The default is
`'grey'`.

### Inspection

| Field | Type | Notes |
|-------|------|-------|
| `vehicleType` | `VehicleTypeId` | |
| `paint` | `PaintId` | |
| `conditions` | `Record<PartId, Condition>` | Keys must be part ids of `vehicleType`; unknown keys are dropped on load |
| `notes` | `Record<PartId, string>` | Same rule for keys. Empty strings are removed. Maximum 1,000 characters each |
| `status` | `'in-progress' \| 'finished'` | |
| `finishedAt` | string (ISO 8601) or null | Set by Save |
| `updatedAt` | string (ISO 8601) | Updated on every change |

The workshop name and vehicle registration are fixed placeholders (FR-020), so they aren't
stored.

### Status changes

```text
            any change to conditions / notes / paint / vehicleType
   ┌──────────────────────────────────────────────────────────┐
   ▼                                                          │
in-progress ──── Save (FR-015) ────▶ finished ─────────────────┘
   ▲   │
   │   └─ "Pass the rest", mark, clear, note: stays in-progress
   └───── switch vehicle type (after confirmation): new empty inspection
```

**Rules**:
- **Mark**: `mark(part, c)` sets `conditions[part] = c`. If the part already has `c`, the
  entry is removed (FR-009).
- **Clear**: `clear(part)` removes both the condition and the note (FR-012).
- **Pass the rest**: `passRest()` sets `pass` on every part with no condition and leaves the
  rest alone. If every part is already checked, nothing changes and `updatedAt` stays the
  same.
- **Switch type**: `switchVehicle(t)` resets `conditions`, `notes` and `status`, and keeps
  `paint`. The UI asks for confirmation first (FR-018), but only when `conditions` or
  `notes` aren't empty.
- **Finish**: `finish()` sets `status = 'finished'` and `finishedAt = now`.

## Temporary UI state (not stored)

| Field | Type | Notes |
|-------|------|-------|
| `selectedPart` | `PartId \| null` | |
| `hoveredPart` | `PartId \| null` | Written to the color buffer through a ref, not React state, to avoid re-rendering on every pointer move |
| `activeZone` | `ZoneId \| 'all'` | Default `'all'` |
| `webgl` | `'checking' \| 'ok' \| 'unavailable' \| 'lost'` | |
| `storageAvailable` | boolean | false shows the "changes won't be kept" notice |

## Derived values (selectors)

- **Progress**: `progress = { done, total, pass, advisory, damage }`, used for FR-013.
- **Zone summary**: `zoneSummary(zone) = { checked, total }`, used for FR-016.
- **Visible parts**: `visibleParts(activeZone)`, the filtered list.
