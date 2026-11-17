// Static catalog: body styles, zones and paints. Shape numbers are ported unchanged from the
// inspiration design (specs/001-car-parts-selector/reference/inspiration-Main.dc.html, l.151–178).
// Pure data: no React, no three.js.

export const VEHICLE_TYPE_IDS = ['suv', 'saloon', 'van'] as const;
export type VehicleTypeId = (typeof VEHICLE_TYPE_IDS)[number];

/** A profile knot: [x along the car, height]. */
export type Knot = readonly [number, number];

export interface ShapeConfig {
  /** Length scale applied to x. */
  lx: number;
  /** Underbody height. */
  y0: number;
  /** Belt-line maximum height. */
  bmax: number;
  /** Wheel radius. */
  wr: number;
  /** Front and rear wheel x positions (before lx scaling). */
  wxf: number;
  wxr: number;
  /** Panel break points along x: bonnet/windscreen, windscreen/roof, doors, rear roof, tailgate. */
  XD1: number;
  XR: number;
  XD2: number;
  XD3: number;
  XRR: number;
  XT: number;
  /** Has rear quarter glass. */
  qGlass: boolean;
  /** Rear cap carries glass (van rear doors). */
  capGlass?: boolean;
  /** Roof/height profile from front (x=2.25) to rear (x=-2.25). */
  HK: readonly Knot[];
}

export interface VehicleType {
  id: VehicleTypeId;
  label: string;
  shape: ShapeConfig;
  /** Base part ids (without -left/-right) this body style doesn't have. */
  skipParts: readonly string[];
  /** Body-style names by base part id; `{s}` becomes the side. */
  renames: Readonly<Record<string, string>>;
}

export const VEHICLE_TYPES: Readonly<Record<VehicleTypeId, VehicleType>> = {
  suv: {
    id: 'suv',
    label: 'SUV',
    skipParts: [],
    renames: {},
    shape: {
      lx: 1, y0: 0.36, bmax: 1.15, wr: 0.36, wxf: 1.38, wxr: -1.38,
      XD1: 0.95, XR: 0.25, XD2: -0.15, XD3: -1.05, XRR: -1.7, XT: -9, qGlass: true,
      HK: [[2.25, 0.98], [2.2, 1.03], [2.1, 1.06], [1.95, 1.08], [0.95, 1.17], [0.25, 1.62], [-0.3, 1.66], [-1.7, 1.58], [-2.15, 1.22], [-2.25, 1.1]],
    },
  },
  saloon: {
    id: 'saloon',
    label: 'Saloon',
    skipParts: ['quarter-window'],
    renames: { tailgate: 'Boot lid' },
    shape: {
      lx: 1.02, y0: 0.3, bmax: 1.0, wr: 0.33, wxf: 1.42, wxr: -1.42,
      XD1: 0.85, XR: 0.15, XD2: -0.2, XD3: -1.05, XRR: -1.0, XT: -1.6, qGlass: false,
      HK: [[2.25, 0.86], [2.2, 0.9], [2.1, 0.93], [1.95, 0.95], [0.85, 1.03], [0.15, 1.42], [-0.4, 1.45], [-1.0, 1.4], [-1.6, 1.06], [-2.15, 1.03], [-2.25, 0.96]],
    },
  },
  van: {
    id: 'van',
    label: 'Van',
    skipParts: [],
    renames: { tailgate: 'Rear doors', 'rear-windscreen': 'Rear door glass', 'rear-door': 'Sliding {s} door' },
    shape: {
      lx: 1.05, y0: 0.4, bmax: 1.25, wr: 0.38, wxf: 1.42, wxr: -1.42,
      XD1: 1.45, XR: 0.9, XD2: 0.2, XD3: -1.0, XRR: -2.1, XT: -9, qGlass: true, capGlass: true,
      HK: [[2.25, 1.0], [2.2, 1.08], [2.1, 1.12], [1.95, 1.15], [1.45, 1.25], [0.9, 1.95], [0, 2.0], [-2.1, 1.98], [-2.25, 1.9]],
    },
  },
};

export const ZONE_IDS = ['Front', 'Top', 'Right side', 'Left side', 'Rear', 'Wheels'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];
/** The list filter: a zone, or every part. */
export type ZoneFilter = ZoneId | 'all';

export interface Zone {
  id: ZoneFilter;
  name: string;
  /** SVG path `d` for a 24×24 stroke icon. */
  icon: string;
}

export const ALL_PARTS_ZONE: Zone = { id: 'all', name: 'All parts', icon: 'M4 6h16M4 12h16M4 18h16' };

export const ZONES: readonly (Zone & { id: ZoneId })[] = [
  { id: 'Front', name: 'Front', icon: 'M5 17h14M6 17v-6l2-4h8l2 4v6M8 14h.01M16 14h.01' },
  { id: 'Top', name: 'Top', icon: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM6 9h12M6 16h12' },
  { id: 'Right side', name: 'Right side', icon: 'M4 15v-3l3-4h8l4 4h1v3H4zM8 18h.01M16 18h.01' },
  { id: 'Left side', name: 'Left side', icon: 'M20 15v-3l-3-4H9l-4 4H4v3h16zM8 18h.01M16 18h.01' },
  { id: 'Rear', name: 'Rear', icon: 'M5 17h14M6 17v-6l2-4h8l2 4v6M9 13h6' },
  { id: 'Wheels', name: 'Wheels', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
];

export const PAINT_IDS = ['grey', 'white', 'black'] as const;
export type PaintId = (typeof PAINT_IDS)[number];

export const PAINTS: Readonly<Record<PaintId, { label: string; hex: string }>> = {
  grey: { label: 'Grey', hex: '#6B6E74' },
  white: { label: 'White', hex: '#E6E7E9' },
  black: { label: 'Black', hex: '#1F2124' },
};
