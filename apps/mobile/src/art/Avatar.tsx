import type { CSSProperties, ReactNode } from 'react';

/*
 * Avatar emblems: famous Persian figures, places and symbols as small flat SVGs (48x48).
 * Persons are iconic stylised busts (no likeness); everything is secular and original.
 */
const SK = '#f3c9a0', GOLD = '#ffd24a', INK = '#070d24', WHITE = '#fff8e6', RED = '#e0263f', TURQ = '#18c2b4';
const o = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' as const };
const Bust = ({ robe = WHITE }: { robe?: string }) => <><path d="M6 48 Q24 28 42 48Z" fill={robe} {...o} /><circle cx="24" cy="22" r="8" fill={SK} {...o} /><circle cx="21" cy="21.5" r="1" fill={INK} /><circle cx="27" cy="21.5" r="1" fill={INK} /></>;

export const EMBLEMS: Record<string, { fa: string; en: string; art: ReactNode }> = {
  hafez: { fa: 'حافظ', en: 'Hafez', art: <><Bust /><ellipse cx="24" cy="13" rx="11" ry="5.5" fill={WHITE} {...o} /><path d="M14 15 Q24 19 34 15" fill="none" stroke={GOLD} strokeWidth="2" /><circle cx="24" cy="38" r="3.5" fill={RED} {...o} /><path d="M20 27 Q24 30 28 27" fill="#3a2a1a" {...o} /></> },
  ferdowsi: { fa: 'فردوسی', en: 'Ferdowsi', art: <><Bust robe="#3f8f6a" /><path d="M16 24 Q24 40 32 24Z" fill="#ddd" {...o} /><path d="M16 17 Q24 6 32 17Z" fill="#3f8f6a" {...o} /><rect x="30" y="34" width="12" height="9" rx="1" fill={GOLD} {...o} /><path d="M32 37h8M32 40h8" stroke={INK} strokeWidth="1" /></> },
  khayyam: { fa: 'خیام', en: 'Khayyam', art: <><circle cx="24" cy="26" r="16" fill="none" stroke={GOLD} strokeWidth="4" /><circle cx="24" cy="26" r="9" fill="none" stroke={WHITE} strokeWidth="1.5" /><path d="M24 4 V10 M24 26 L34 16" stroke={WHITE} strokeWidth="2" strokeLinecap="round" /><circle cx="24" cy="6" r="3" fill="none" stroke={GOLD} strokeWidth="2" /><path d="M11 12 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1z" fill={WHITE} /></> },
  rumi: { fa: 'مولانا', en: 'Rumi', art: <><Bust robe="#b08a5a" /><path d="M18 16 L20 1 H28 L30 16Z" fill="#c9a36b" {...o} /><path d="M18 16 H30" stroke={INK} strokeWidth="1.4" /><path d="M17 25 Q24 38 31 25Z" fill="#7a5a3a" {...o} /><path d="M6 44 L42 30" stroke={GOLD} strokeWidth="3" strokeLinecap="round" /></> },
  cyrus: { fa: 'کورش', en: 'Cyrus', art: <><Bust robe="#8f3fd0" /><path d="M15 25 Q24 44 33 25 Q24 30 15 25Z" fill="#3a2a1a" {...o} /><path d="M15 15 L16 4 L20 10 L24 2 L28 10 L32 4 L33 15Z" fill={GOLD} {...o} /><circle cx="24" cy="9" r="1.8" fill={TURQ} /></> },
  rostam: { fa: 'رستم', en: 'Rostam', art: <><Bust robe="#a06a3a" /><path d="M14 20 Q14 4 24 4 Q34 4 34 20Z" fill="#aab8e8" {...o} /><path d="M24 4 Q30 -2 35 3 Q30 3 28 8" fill={RED} {...o} /><rect x="22.5" y="12" width="3" height="9" fill="#8896c4" /><path d="M20 28 Q24 31 28 28" fill="#3a2a1a" {...o} /></> },
  arash: { fa: 'آرش', en: 'Arash', art: <><path d="M12 4 Q40 24 12 44" fill="none" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" /><path d="M12 4 L12 44" stroke={WHITE} strokeWidth="1" /><path d="M8 24 H42" stroke={WHITE} strokeWidth="2" /><path d="M42 24 l-7 -4 v8z" fill={RED} /><path d="M8 24 l-3 -3 M8 24 l-3 3" stroke={RED} strokeWidth="2" /></> },
  simurgh: { fa: 'سیمرغ', en: 'Simurgh', art: <><path d="M10 40 Q4 24 16 14 Q22 24 20 36Z" fill={RED} {...o} /><path d="M14 44 Q2 32 8 20 Q18 28 24 40Z" fill={GOLD} {...o} /><ellipse cx="26" cy="26" rx="11" ry="8" fill={TURQ} {...o} /><circle cx="34" cy="17" r="5.5" fill={TURQ} {...o} /><path d="M39 16 l6 2 -6 2z" fill={GOLD} {...o} /><path d="M32 12 Q34 4 38 8 M30 12 Q30 4 34 5" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" /><circle cx="35" cy="16" r="1" fill={INK} /><path d="M22 24 Q28 18 32 28" fill="none" stroke={WHITE} strokeWidth="2" strokeLinecap="round" /></> },
  lionsun: { fa: 'شیر و خورشید', en: 'Lion & Sun', art: <><g stroke={GOLD} strokeWidth="3" strokeLinecap="round">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M24 24 L${24 + 21 * Math.cos((i * Math.PI) / 6)} ${24 + 21 * Math.sin((i * Math.PI) / 6)}`} />)}</g><circle cx="24" cy="24" r="14" fill="#ffb21e" {...o} /><circle cx="24" cy="25" r="8.5" fill="#f0a030" {...o} /><circle cx="21" cy="23" r="1.2" fill={INK} /><circle cx="27" cy="23" r="1.2" fill={INK} /><path d="M22 27 Q24 29 26 27 M24 25 v2" fill="none" stroke={INK} strokeWidth="1.2" /><path d="M17 17 l3 3 M31 17 l-3 3" stroke={INK} strokeWidth="1.2" /></> },
  boteh: { fa: 'بته‌جقه', en: 'Boteh', art: <><path d="M26 4 C40 6 44 22 36 33 C30 42 18 45 11 40 C20 39 27 32 24 23 C22 15 16 12 26 4Z" fill={GOLD} {...o} /><path d="M27 12 C34 14 36 22 31 29 C28 33 24 35 20 35 C26 31 28 24 25 18" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round" /><circle cx="30" cy="24" r="2" fill={TURQ} /></> },
  persepolis: { fa: 'تخت جمشید', en: 'Persepolis', art: <><rect x="4" y="40" width="40" height="4" fill={WHITE} {...o} />{[12, 24, 36].map((x) => <g key={x}><rect x={x - 3} y="12" width="6" height="28" fill={WHITE} {...o} /><path d={`M${x - 7} 12 h14 l-2 -6 h-10z`} fill={GOLD} {...o} /><path d={`M${x - 1.5} 14 v24 M${x + 1.5} 14 v24`} stroke="#c9bfa0" strokeWidth=".8" /></g>)}</> },
  azadi: { fa: 'برج آزادی', en: 'Azadi Tower', art: <><path d="M5 44 L12 22 H36 L43 44 H35 Q24 26 13 44Z" fill={WHITE} {...o} /><rect x="12" y="14" width="24" height="9" fill={WHITE} {...o} /><path d="M16 14 Q24 2 32 14Z" fill={TURQ} {...o} /><path d="M24 4 V0" stroke={GOLD} strokeWidth="2" /><path d="M17 17 h14" stroke={INK} strokeWidth="1" /></> },
  siosepol: { fa: 'سی‌وسه‌پل', en: 'Si-o-se-pol', art: <><rect x="2" y="16" width="44" height="6" fill="#c98f5a" {...o} /><path d="M2 22 H46 V34 H2Z" fill="#c98f5a" {...o} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M${5 + i * 10.5} 34 V28 a4.5 5 0 0 1 9 0 V34z`} fill="#1c3a6b" stroke={INK} strokeWidth="1" />)}<path d="M0 36 H48 V48 H0Z" fill={TURQ} {...o} /><path d="M6 41 q4 -2 8 0 t8 0 t8 0 t8 0" fill="none" stroke={WHITE} strokeWidth="1.5" /></> },
  badgir: { fa: 'بادگیر یزد', en: 'Yazd Windtower', art: <><path d="M14 46 V16 L24 4 L34 16 V46Z" fill="#d9a066" {...o} /><path d="M14 16 H34" stroke={INK} strokeWidth="1.4" />{[22, 28, 34].map((y) => <path key={y} d={`M19 ${y} V${y + 4} M24 ${y} V${y + 4} M29 ${y} V${y + 4}`} stroke={INK} strokeWidth="2" strokeLinecap="round" />)}<path d="M4 46 H44" stroke={INK} strokeWidth="2" /></> },
  damavand: { fa: 'دماوند', en: 'Damavand', art: <><path d="M2 42 L19 12 L24 17 L29 12 L46 42Z" fill="#8a5a8f" {...o} /><path d="M19 12 L24 17 L29 12 L33 19 L28 22 L24 19 L20 22 L15 19Z" fill={WHITE} {...o} /><circle cx="38" cy="10" r="4" fill={GOLD} /></> },
  anar: { fa: 'انار', en: 'Pomegranate', art: <><circle cx="24" cy="28" r="15" fill={RED} {...o} /><path d="M18 14 L20 8 L24 12 L28 8 L30 14Z" fill="#b01430" {...o} /><path d="M24 28 m-6 -4 q6 -6 12 0" fill="none" stroke="#ff8a9a" strokeWidth="2" strokeLinecap="round" /><path d="M24 8 q4 -5 9 -4" stroke="#2f8f4a" strokeWidth="2.5" fill="none" strokeLinecap="round" /></> },
};

export const EMBLEM_KEYS = Object.keys(EMBLEMS);
export const emblemGlyphs = EMBLEM_KEYS.map((k) => `e:${k}`);
export const emblemName = (glyph: string, fa: boolean) => { const e = EMBLEMS[glyph.slice(2)]; return e ? (fa ? e.fa : e.en) : ''; };

/** Round avatar: an emblem when `glyph` is "e:<key>", else the text/emoji glyph, else the name's first letter. */
export function Avatar({ hue, glyph, name, className = '', style, ...rest }: { hue: number; glyph?: string; name: string; className?: string; style?: CSSProperties } & Record<string, unknown>) {
  const e = glyph?.startsWith('e:') ? EMBLEMS[glyph.slice(2)] : undefined;
  return (
    <div className={`avatar ${e ? 'emb-av' : ''} ${className}`} style={{ background: `hsl(${hue} 55% 38%)`, ...style }} {...rest}>
      {e ? <svg viewBox="0 0 48 48" aria-hidden="true">{e.art}</svg> : glyph || [...name][0]}
    </div>
  );
}
