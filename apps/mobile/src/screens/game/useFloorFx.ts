import { useLayoutEffect, useRef, type RefObject } from 'react';
import { liveScore, type MatchState } from '@chaharbarg/engine';
import type { FlySpec } from '../../art/fx';
import { sfx } from '../../lib/sound';

const MAX_SLOT = 20; // 21 slots (3 rows × 7); a 22nd floor card shares the last slot rather than leaving the grid

/**
 * Fixed floor slots (a card that stays never moves; new cards take the lowest free slot, centre-out) and the
 * play/capture animations. `relayout` lists what moves cards on screen, so the rect snapshot the next animation
 * starts from is retaken only then, not on every render.
 */
export function useFloorFx(root: RefObject<HTMLDivElement | null>, mc: MatchState, o: {
  noFx: boolean; look: { deck: string; back: string }; fmt: (x: number) => string;
  later: (fn: () => void, ms: number) => void; addFlies: (f: FlySpec[]) => void; setSurfx: (on: boolean) => void; relayout: unknown[];
}) {
  const deal = mc.deal;
  const slots = useRef<Record<string, number>>({});
  const kinds = useRef<Record<string, 'play' | 'deal'>>({});
  const snap = useRef<{ floor: Record<string, DOMRect>; hand: Record<string, DOMRect>; live: number[] }>({ floor: {}, hand: {}, live: [] });
  const flyId = useRef(0);
  const lr = mc.lastResult;
  const fxKey = lr ? `${mc.dealNo}:${lr.card.id}` : '';
  const prevKey = useRef(fxKey);
  {
    const ids = new Set(deal.floor.map((c) => c.id));
    const used = new Set<number>();
    for (const id of Object.keys(slots.current)) { if (ids.has(id)) used.add(slots.current[id]); else { delete slots.current[id]; delete kinds.current[id]; } }
    for (const c of deal.floor) {
      if (slots.current[c.id] != null) continue;
      let i = 0;
      while (used.has(i) && i < MAX_SLOT) i++;
      slots.current[c.id] = i; used.add(i);
      kinds.current[c.id] = c.id === lr?.card.id ? 'play' : 'deal';
    }
  }
  useLayoutEffect(() => {
    const g0 = root.current;
    if (!g0) return;
    const g = g0.getBoundingClientRect();
    const rel = (r: DOMRect) => ({ x: r.x - g.x, y: r.y - g.y, w: r.width, h: r.height });
    const ctr = (r: DOMRect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    if (fxKey && fxKey !== prevKey.current && lr && !o.noFx) {
      const srcEl = g0.querySelector(`[data-seat="${lr.seat}"]`);
      const sr = snap.current.hand[lr.card.id] ?? srcEl?.getBoundingClientRect();
      const S = sr && ctr(sr);
      const ease = 'cubic-bezier(.2,.8,.2,1)';
      if (sr && S && lr.captured.length === 0) {
        const el = g0.querySelector<HTMLElement>(`[data-cid="${lr.card.id}"] .card`);
        if (el) {
          const dr = el.getBoundingClientRect(); const D = ctr(dr);
          const dx = S.x - D.x, dy = S.y - D.y, sc = sr.width / dr.width;
          el.animate([
            { transform: `translate(${dx}px,${dy}px) scale(${sc}) rotate(-12deg)` },
            { transform: `translate(${dx * .4}px,${dy * .4 - 36}px) scale(1.18) rotate(5deg)`, offset: .6 },
            { transform: 'none' },
          ], { duration: 300, easing: ease });
        }
      } else if (sr && S) {
        const pileEl = g0.querySelector(`[data-pile="${lr.seat}"]`);
        const fl = g0.querySelector('.floor')!.getBoundingClientRect();
        if (pileEl) {
          const P = ctr(pileEl.getBoundingClientRect());
          const M = ctr(fl);
          const cap0 = lr.captured.map((c) => snap.current.floor[c.id]).find(Boolean);
          const cw = cap0?.width ?? sr.width;
          const land = 300, gap = lr.sur ? 480 : 140, fly = 380, st = 40, D = land + gap + fly + st * lr.captured.length;
          const out: FlySpec[] = [];
          const base = { deck: o.look.deck, back: o.look.back };
          out.push({ id: ++flyId.current, ...base, card: lr.card, x: M.x - g.x - cw / 2, y: M.y - g.y - cw * 0.7, w: cw, ms: D, ease: 'linear', frames: [
            { transform: `translate(${S.x - M.x}px,${S.y - M.y}px) scale(${sr.width / cw}) rotate(-12deg)`, easing: ease },
            { transform: 'translate(0,0) scale(1.15) rotate(3deg)', offset: land / D },
            { transform: 'translate(0,0) scale(1.15) rotate(3deg)', offset: (land + gap) / D, easing: 'cubic-bezier(.5,0,.9,.4)' },
            { transform: `translate(${P.x - M.x}px,${P.y - M.y}px) scale(.35)`, opacity: .3 },
          ] });
          lr.captured.forEach((c, i) => {
            const r = snap.current.floor[c.id];
            if (!r) return;
            const q = rel(r); const C = ctr(r);
            out.push({ id: ++flyId.current, ...base, card: c, x: q.x, y: q.y, w: q.w, ms: fly, delay: land + gap + i * st, ease: 'cubic-bezier(.5,0,.9,.4)', frames: [
              { transform: 'none', opacity: 1 }, { transform: `translate(${P.x - C.x}px,${P.y - C.y}px) scale(.35)`, opacity: .3 },
            ] });
          });
          // score pops: +N flies from the pile to the unit's scoreboard card
          const now = liveScore(deal).map((l) => l.total);
          const cards = g0.querySelectorAll('.ucard');
          now.forEach((t, u) => {
            const d = t - (snap.current.live[u] ?? t);
            const tgt = cards[u]?.querySelector('.pill');
            if (d <= 0 || !tgt) return;
            const T = ctr(tgt.getBoundingClientRect());
            out.push({ id: ++flyId.current, text: `+${o.fmt(d)}`, x: P.x - g.x - 14, y: P.y - g.y - 12, w: 28, ms: 650, delay: D - 120, ease, frames: [
              { transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: 'translate(0,-18px) scale(1.3)', opacity: 1, offset: .3 },
              { transform: `translate(${T.x - P.x}px,${T.y - P.y}px) scale(.8)`, opacity: .2 },
            ] });
          });
          o.addFlies(out);
          now.forEach((t, u) => {
            const d = t - (snap.current.live[u] ?? t);
            for (let k = 0; k < Math.min(d, 14); k++) o.later(() => sfx('score', k), D - 120 + 350 + k * 100);
          });
          const chip = pileEl as HTMLElement;
          o.later(() => { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }, D - 60);
          if (lr.sur) { o.later(() => o.setSurfx(true), land); o.later(() => o.setSurfx(false), land + 600); }
        }
      }
    }
    prevKey.current = fxKey;
    const f: Record<string, DOMRect> = {}, h: Record<string, DOMRect> = {};
    g0.querySelectorAll<HTMLElement>('.fslot').forEach((e) => { f[e.dataset.cid!] = e.firstElementChild!.getBoundingClientRect(); });
    g0.querySelectorAll<HTMLElement>('.hslot').forEach((e) => { h[e.dataset.cid!] = e.firstElementChild!.getBoundingClientRect(); });
    snap.current = { floor: f, hand: h, live: liveScore(deal).map((l) => l.total) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fxKey, ...o.relayout]);
  return { slots: slots.current, kinds: kinds.current };
}
