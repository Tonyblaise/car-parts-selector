// Hovered part, shared between the canvas and the hint line without React state in the
// canvas tree: pointer moves would otherwise re-render the scene (Principle I).
import type { PartId } from '../vehicles/parts';

type Listener = (id: PartId | null) => void;

let current: PartId | null = null;
const listeners = new Set<Listener>();

export const hoverBus = {
  get: (): PartId | null => current,
  set(id: PartId | null) {
    if (id === current) return;
    current = id;
    listeners.forEach((l) => l(id));
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
