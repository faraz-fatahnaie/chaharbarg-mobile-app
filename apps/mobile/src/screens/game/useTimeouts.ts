import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that is cleared when the component unmounts (no state updates or sounds after leaving the screen). */
export function useTimeouts() {
  const ids = useRef(new Set<ReturnType<typeof setTimeout>>());
  // clear, but stay usable: StrictMode runs this cleanup once on a simulated unmount
  useEffect(() => () => { ids.current.forEach(clearTimeout); ids.current.clear(); }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { ids.current.delete(id); fn(); }, ms);
    ids.current.add(id);
  }, []);
}
