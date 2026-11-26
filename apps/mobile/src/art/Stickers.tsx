import type { ReactNode } from 'react';

/* Animated quick-chat stickers: 96x96 SVG characters, one CSS loop each (see stickers.css). */
const O = { stroke: '#070d24', strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const Eyes = ({ y = 50, dx = 11 }: { y?: number; dx?: number }) => <g className="eyes"><circle cx={48 - dx} cy={y} r="3.5" fill="#070d24" /><circle cx={48 + dx} cy={y} r="3.5" fill="#070d24" /><circle cx={47 - dx} cy={y - 1.3} r="1.2" fill="#fff" /><circle cx={47 + dx} cy={y - 1.3} r="1.2" fill="#fff" /></g>;

export const STICKERS: Record<string, ReactNode> = {
  anar: <>
    <g className="body"><circle cx="48" cy="54" r="30" fill="#e0263f" {...O} /><path d="M38 28 L41 16 L48 24 L55 16 L58 28Z" fill="#b01430" {...O} /><path d="M30 44 Q34 36 42 35" fill="none" stroke="#ff9aa8" strokeWidth="4" /><Eyes y={52} /><path d="M38 62 Q48 74 58 62Z" fill="#fff" {...O} /><circle cx="32" cy="60" r="4" fill="#ff7a8a" /><circle cx="64" cy="60" r="4" fill="#ff7a8a" /></g>
    {[[18, 24], [78, 22], [86, 56], [10, 58]].map(([x, y], i) => <circle key={i} className={`seed s${i}`} cx={x} cy={y} r="3.5" fill="#ff5a6e" stroke="#070d24" strokeWidth="1.5" />)}</>,
  crocus: <>
    <g className="body"><path className="st" d="M42 40 L38 18 M48 38 L48 12 M54 40 L58 18" stroke="#ff9d0a" strokeWidth="4" fill="none" strokeLinecap="round" />
      {[-30, 0, 30].map((r) => <ellipse key={r} cx="48" cy="58" rx="13" ry="26" fill="#a455e8" transform={`rotate(${r} 48 70)`} {...O} />)}
      <Eyes y={58} dx={9} /><ellipse cx="48" cy="70" rx="4" ry="5" fill="#5a1a8a" {...O} strokeWidth="2" /></g></>,
  tea: <>
    <g className="body"><path d="M24 38 H72 Q72 76 48 78 Q24 76 24 38Z" fill="#fff8e6" fillOpacity=".55" {...O} /><path d="M27 48 H69 Q68 74 48 75 Q28 74 27 48Z" fill="#c8561a" /><ellipse cx="48" cy="80" rx="30" ry="6" fill="#ffd24a" {...O} /><Eyes y={56} /><path d="M40 64 Q48 70 56 64" fill="none" stroke="#070d24" strokeWidth="3" /></g>
    <path className="steam a" d="M40 32 Q34 24 40 16 Q46 8 40 2" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" strokeLinecap="round" /><path className="steam b" d="M56 32 Q50 24 56 16 Q62 8 56 2" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" strokeLinecap="round" /></>,
  camel: <>
    <g className="body"><path d="M14 84 Q10 54 30 52 Q38 36 48 50 Q56 34 62 50 L62 26 Q64 14 76 14 Q88 16 86 28 L80 30 Q70 28 72 40 Q78 56 78 84Z" fill="#d9a066" {...O} /><circle cx="76" cy="24" r="2.8" fill="#070d24" /><path className="lid" d="M70 21 H82" stroke="#070d24" strokeWidth="3.5" /><path d="M72 32 Q78 37 84 31" fill="none" stroke="#070d24" strokeWidth="2.5" /><path d="M70 14 l-3 -8 5 4z" fill="#b87a40" {...O} strokeWidth="2" /></g></>,
  bulbul: <>
    <g className="body"><ellipse cx="44" cy="58" rx="26" ry="20" fill="#2f8ff0" {...O} /><circle cx="64" cy="40" r="14" fill="#2f8ff0" {...O} /><path className="beak" d="M76 38 L90 42 L76 46Z" fill="#ffb21e" {...O} strokeWidth="2" /><circle cx="66" cy="37" r="3" fill="#070d24" /><path d="M30 56 Q42 44 56 60 Q42 70 30 56Z" fill="#8fc8ff" {...O} strokeWidth="2" /><path d="M20 70 L6 82 M24 74 L14 90" stroke="#1d5fb0" strokeWidth="4" strokeLinecap="round" /></g>
    <text className="note n1" x="68" y="26" fontSize="18" fill="#ffd24a" stroke="#070d24" strokeWidth="1">♪</text><text className="note n2" x="80" y="30" fontSize="14" fill="#fff">♫</text></>,
  coin: <>
    <g className="body"><circle cx="48" cy="48" r="32" fill="#ffd24a" {...O} /><circle cx="48" cy="48" r="24" fill="none" stroke="#b8791a" strokeWidth="3" /><circle cx="38" cy="44" r="3.5" fill="#070d24" /><path d="M54 44 H64" stroke="#070d24" strokeWidth="3.5" /><path d="M36 58 Q48 70 60 58" fill="none" stroke="#070d24" strokeWidth="3.5" /><path d="M24 34 Q30 26 38 24" stroke="#fff0a8" strokeWidth="4" fill="none" /></g>
    <path className="spark" d="M80 14 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fff" /></>,
  rose: <>
    <g className="body"><path d="M48 86 V58" stroke="#2f8f4a" strokeWidth="5" /><path d="M48 76 Q64 70 66 82 Q54 84 48 76Z" fill="#2f8f4a" {...O} strokeWidth="2" /><circle cx="48" cy="40" r="22" fill="#e0263f" {...O} /><path d="M48 40 m-10 0 a10 10 0 1 1 10 10 a6 6 0 1 1 -6 -6" fill="none" stroke="#8f1226" strokeWidth="3" /><Eyes y={36} dx={8} /></g>
    <path className="drop" d="M72 22 Q78 32 72 36 Q66 32 72 22Z" fill="#6ef0ff" {...O} strokeWidth="2" /></>,
  samovar: <>
    <g className="body"><path className="lid" d="M32 30 Q48 8 64 30Z" fill="#ffd24a" {...O} /><path d="M26 32 H70 Q76 60 68 80 H28 Q20 60 26 32Z" fill="#e8b830" {...O} /><path d="M70 50 H82 V58" fill="none" stroke="#070d24" strokeWidth="4" /><rect x="34" y="80" width="28" height="7" fill="#b8791a" {...O} /><circle cx="40" cy="52" r="4.5" fill="#fff" /><circle cx="56" cy="52" r="4.5" fill="#fff" /><circle className="pu" cx="41" cy="50" r="2.3" fill="#070d24" /><circle className="pu" cx="57" cy="50" r="2.3" fill="#070d24" /><path d="M42 66 H54" stroke="#070d24" strokeWidth="3" /></g>
    {[24, 36, 48].map((x, i) => <circle key={x} className={`bub b${i}`} cx={x + 20} cy="10" r="3" fill="#fff" />)}</>,
  cat: <>
    <g className="body"><path d="M18 40 L22 12 L40 26Z M78 40 L74 12 L56 26Z" fill="#ff9d3a" {...O} /><circle cx="48" cy="54" r="30" fill="#ff9d3a" {...O} /><circle cx="30" cy="62" r="6" fill="#ff5a6e" opacity=".6" /><circle cx="66" cy="62" r="6" fill="#ff5a6e" opacity=".6" /><path d="M30 42 L44 48 M66 42 L52 48" stroke="#070d24" strokeWidth="4" /><circle cx="38" cy="52" r="3.5" fill="#070d24" /><circle cx="58" cy="52" r="3.5" fill="#070d24" /><path d="M42 68 Q48 62 54 68" fill="none" stroke="#070d24" strokeWidth="3" /><path d="M46 58 h4 l-2 3z" fill="#ff5a6e" /></g>
    <circle className="puff p1" cx="16" cy="12" r="5" fill="#fff" opacity=".85" /><circle className="puff p2" cx="80" cy="12" r="5" fill="#fff" opacity=".85" /></>,
};
export const STICKER_KEYS = Object.keys(STICKERS);

export function Sticker({ k, className = '' }: { k: string; className?: string }) {
  return <svg className={`stk stk-${k} ${className}`} viewBox="0 0 96 96" aria-hidden="true">{STICKERS[k]}</svg>;
}
