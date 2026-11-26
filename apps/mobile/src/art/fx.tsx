import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CardView } from './CardView';
import type { Card } from '@chaharbarg/engine';

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A flying card or text that lives in the .fx-layer, animated with WAAPI (transform/opacity only). */
export interface FlySpec {
  id: number;
  /** box the flight starts from, in fx-layer coordinates */
  x: number; y: number; w: number;
  card?: Card; deck?: string; back?: string;
  text?: string;
  frames: Keyframe[]; ms: number; delay?: number; ease?: string;
}

function Fly({ f, done }: { f: FlySpec; done: (id: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const a = el.current!.animate(f.frames, { duration: f.ms, delay: f.delay ?? 0, easing: f.ease ?? 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    a.onfinish = () => done(f.id);
    return () => a.cancel();
  }, []);
  return (
    <div ref={el} className={f.text ? 'fly txt' : 'fly'} style={{ left: f.x, top: f.y, width: f.w, ['--cw' as string]: `${f.w}px` }}>
      {f.card ? <CardView card={f.card} deck={f.deck} back={f.back} /> : f.text}
    </div>
  );
}

export function FxLayer({ flies, done }: { flies: FlySpec[]; done: (id: number) => void }) {
  return <div className="fx-layer">{flies.map((f) => <Fly key={f.id} f={f} done={done} />)}</div>;
}

/** Counts from 0 to `to` over `ms` (shows the final value at once when motion is reduced). */
export function CountUp({ to, ms = 900, delay = 0, fmt }: { to: number; ms?: number; delay?: number; fmt: (n: number) => string }) {
  const [v, setV] = useState(reducedMotion() ? to : 0);
  useEffect(() => {
    if (reducedMotion() || to === 0) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      setV(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{fmt(v)}</>;
}

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({ x: (i * 97) % 100, d: (i * 53) % 900, r: (i * 41) % 360, c: ['#ffd24a', '#18c2b4', '#e0263f', '#4f7bff', '#fff0a8'][i % 5], t: 2200 + ((i * 131) % 1200) }));
export function Confetti() {
  return <div className="confetti" aria-hidden="true">{CONFETTI.map((c, i) => <i key={i} style={{ left: `${c.x}%`, background: c.c, animationDelay: `${c.d}ms`, animationDuration: `${c.t}ms`, ['--r' as string]: `${c.r}deg` }} />)}</div>;
}

export function Burst({ children }: { children?: ReactNode }) { return <div className="burst" aria-hidden="true">{children}</div>; }
