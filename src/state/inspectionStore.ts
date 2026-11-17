import { createStore, useStore } from 'zustand';
import type { PaintId, VehicleTypeId, ZoneFilter } from '../vehicles/catalog';
import { buildParts, findPart, partIndexById, type PartId } from '../vehicles/parts';
import { NOTE_MAX, type Condition, type Inspection, type UiState, type WebGLState } from './types';

// The inspection lives in memory only: this is a demo, so nothing is saved, and every visit or
// reload starts a fresh inspection.

export interface InspectionActions {
  selectPart: (id: PartId | null) => void;
  /** A pick on the 3D model: selects it and, if a zone filter hides it, shows its zone. */
  selectFromCanvas: (id: PartId) => void;
  setActiveZone: (zone: ZoneFilter) => void;
  setPaint: (paint: PaintId) => void;
  setWebgl: (state: WebGLState) => void;
  /** Set a condition; setting the active one again clears it (FR-009). */
  mark: (id: PartId, condition: Condition) => void;
  setNote: (id: PartId, text: string) => void;
  /** Remove the part's condition and note (FR-012). */
  clear: (id: PartId) => void;
  /** Mark every unchecked part as Pass (FR-014). */
  passRest: () => void;
  /** Start a new inspection on another body style, keeping the paint (FR-017). */
  switchVehicle: (type: VehicleTypeId) => void;
}

export type InspectionState = Inspection & UiState & InspectionActions;

export function freshInspection(vehicleType: VehicleTypeId = 'suv', paint: PaintId = 'grey'): Inspection {
  return { vehicleType, paint, conditions: {}, notes: {} };
}

const initialUi: UiState = {
  selectedPart: null,
  activeZone: 'all',
  webgl: 'checking',
};

export function createInspectionStore() {
  return createStore<InspectionState>()((set, get) => {
    const isPart = (id: PartId) => partIndexById(get().vehicleType).has(id);

    return {
      ...freshInspection(),
      ...initialUi,

      selectPart: (id) => {
        if (id !== null && !isPart(id)) return;
        set({ selectedPart: id });
      },
      selectFromCanvas: (id) => {
        const s = get();
        const part = findPart(s.vehicleType, id);
        if (!part) return;
        // As in the inspiration: keep "All parts", otherwise follow the picked part's zone.
        set({ selectedPart: id, activeZone: s.activeZone === 'all' ? 'all' : part.zone });
      },
      setActiveZone: (activeZone) => set({ activeZone }),
      setPaint: (paint) => set({ paint }),
      setWebgl: (webgl) => set({ webgl }),

      mark: (id, condition) => {
        if (!isPart(id)) return;
        const conditions = { ...get().conditions };
        if (conditions[id] === condition) delete conditions[id];
        else conditions[id] = condition;
        set({ conditions });
      },
      setNote: (id, text) => {
        if (!isPart(id)) return;
        const notes = { ...get().notes };
        const value = text.slice(0, NOTE_MAX);
        if (value.trim() === '') delete notes[id];
        else notes[id] = value;
        set({ notes });
      },
      clear: (id) => {
        const { conditions, notes } = get();
        if (!(id in conditions) && !(id in notes)) return;
        const c = { ...conditions };
        const n = { ...notes };
        delete c[id];
        delete n[id];
        set({ conditions: c, notes: n });
      },
      passRest: () => {
        const { conditions, vehicleType } = get();
        const unchecked = buildParts(vehicleType).filter((p) => !conditions[p.id]);
        if (!unchecked.length) return;
        const next = { ...conditions };
        for (const p of unchecked) next[p.id] = 'pass';
        set({ conditions: next });
      },
      switchVehicle: (type) => {
        if (type === get().vehicleType) return;
        set({ ...freshInspection(type, get().paint), selectedPart: null });
      },
    };
  });
}

/** Switching type throws away recorded work, so ask first only when there is some (FR-018). */
export function needsSwitchConfirm(s: Pick<Inspection, 'conditions' | 'notes'>): boolean {
  return Object.keys(s.conditions).length > 0 || Object.keys(s.notes).length > 0;
}

/** The app-wide store. Tests may create their own with createInspectionStore(). */
export const inspectionStore = createInspectionStore();

export function useInspection<T>(selector: (s: InspectionState) => T): T {
  return useStore(inspectionStore, selector);
}
