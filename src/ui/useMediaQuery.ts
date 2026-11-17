import { useSyncExternalStore } from 'react';

/** Phone layout (design artboard "Parts selector · mobile", 390 × 844). */
export const MOBILE_QUERY = '(max-width: 640px)';

export type LayoutVariant = 'desktop' | 'mobile';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
