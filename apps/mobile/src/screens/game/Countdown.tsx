import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../lib/sound';

/**
 * Local turn timer. Owns its ticking state so a tick re-renders only this text, not the whole table.
 * Restarts from `limit` whenever `resetKey` changes or it becomes active again; calls onExpire once at zero.
 */
export function Countdown({ limit, active, resetKey, onExpire, fmt }: { limit: number; active: boolean; resetKey: unknown; onExpire: () => void; fmt: (x: number) => string }) {
  const [left, setLeft] = useState(limit);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (!active) return;
    let s = limit;
    setLeft(s);
    const id = setInterval(() => {
      s -= 1;
      setLeft(s);
      if (s > 0 && s <= 5) sfx('timer', s <= 3 ? 1 : 0);
      if (s > 0) return;
      clearInterval(id);
      expire.current();
    }, 1000);
    return () => clearInterval(id);
  }, [limit, active, resetKey]);
  return <>{fmt(Math.max(left, 0))}</>;
}

/** Online turn clock: seconds left until the server's deadline, or nothing once it has passed. */
export function ServerClock({ deadline, fmt }: { deadline: number; fmt: (x: number) => string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [deadline]);
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  return left > 0 ? <b>⏱ {fmt(left)} · </b> : null;
}
