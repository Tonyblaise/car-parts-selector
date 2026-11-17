// One polite live region for the whole app (FR-022). Anything can announce; LiveAnnouncer renders it.
type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function announce(message: string): void {
  listeners.forEach((l) => l(message));
}

export function onAnnounce(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
