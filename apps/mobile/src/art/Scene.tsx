import type { ReactNode } from 'react';
import type { TimeOfDay } from '../data/arenas';

/*
 * Original stylised arena scenes: flat shapes, no photographs and no traced artwork.
 * Secular landmarks only. A scene is drawn into a 400x300 box, ground line at y=230.
 */

interface Pal { top: string; bot: string; ink: string; mid: string; light: string; glow: string; sun: string; stars: boolean; moon: boolean; ground: string; water: string }

const PAL: Record<TimeOfDay, Pal> = {
  day: { top: '#5aaee6', bot: '#fbe8c3', ink: '#6d5238', mid: '#a88562', light: '#e0c192', glow: 'rgba(0,0,0,0)', sun: '#fff3c4', stars: false, moon: false, ground: '#c9a56f', water: '#6bb7d6' },
  dusk: { top: '#34285c', bot: '#f4a05a', ink: '#2c1d38', mid: '#6b3d55', light: '#eca572', glow: '#ffd27a', sun: '#ffc27a', stars: false, moon: false, ground: '#7a4a4a', water: '#b6668a' },
  night: { top: '#050a1f', bot: '#1c2a5c', ink: '#080d1d', mid: '#18233f', light: '#2c3a63', glow: '#ffd978', sun: '#f5f1d8', stars: true, moon: true, ground: '#10162b', water: '#16254a' },
};

const arches = (x0: number, y: number, w: number, h: number, n: number, fill: string) =>
  Array.from({ length: n }, (_, i) => {
    const x = x0 + i * w;
    return <path key={i} d={`M${x + 2} ${y}v${-h * 0.55}a${(w - 4) / 2} ${h * 0.45} 0 0 1 ${w - 4} 0v${h * 0.55}z`} fill={fill} />;
  });

const windows = (xs: number[], y: number, p: Pal, w = 3, h = 6) => xs.map((x) => <rect key={x} x={x} y={y} width={w} height={h} fill={p.glow} opacity={p.glow === 'rgba(0,0,0,0)' ? 0 : 0.9} />);

const LANDMARKS: Record<string, (p: Pal) => ReactNode> = {
  persepolis: (p) => (
    <g>
      <path d="M0 200 L70 150 L130 185 L200 130 L290 190 L360 150 L400 175 V240 H0z" fill={p.mid} opacity=".6" />
      <rect x="40" y="214" width="320" height="16" fill={p.ink} />
      <rect x="30" y="222" width="340" height="10" fill={p.mid} />
      {[70, 110, 150, 190, 230, 270, 310].map((x, i) => (
        <g key={x}>
          <rect x={x} y={i % 3 === 1 ? 150 : 128} width="12" height={i % 3 === 1 ? 64 : 86} fill={p.ink} />
          <rect x={x - 4} y={i % 3 === 1 ? 144 : 122} width="20" height="8" fill={p.mid} />
          <path d={`M${x - 6} ${i % 3 === 1 ? 144 : 122} h24 l-4 -8 h-16z`} fill={p.ink} />
        </g>
      ))}
      <rect x="40" y="128" width="26" height="86" fill={p.mid} opacity=".0" />
      {windows([60, 300], 200, p)}
    </g>
  ),
  'si-o-se-pol': (p) => (
    <g>
      <rect x="0" y="222" width="400" height="30" fill={p.water} />
      <rect x="0" y="176" width="400" height="12" fill={p.ink} />
      {arches(0, 224, 25, 36, 16, p.ink)}
      {arches(0, 188, 25, 18, 16, p.mid)}
      <rect x="0" y="170" width="400" height="6" fill={p.mid} />
      {windows([60, 190, 310], 164, p)}
      <path d="M0 232h400" stroke={p.light} strokeWidth="1" opacity=".5" />
    </g>
  ),
  'naqsh-e-jahan': (p) => (
    <g>
      {arches(0, 224, 24, 44, 5, p.mid)}
      {arches(280, 224, 24, 44, 5, p.mid)}
      <rect x="140" y="110" width="120" height="116" fill={p.ink} />
      <rect x="130" y="100" width="140" height="14" fill={p.mid} />
      {[150, 172, 194, 216, 238].map((x) => <rect key={x} x={x} y="116" width="7" height="60" fill={p.light} opacity=".85" />)}
      <rect x="150" y="176" width="100" height="50" fill={p.mid} />
      <path d="M180 226v-34a20 20 0 0 1 40 0v34z" fill={p.ink} />
      <rect x="168" y="86" width="64" height="16" fill={p.ink} />
      <rect x="178" y="74" width="44" height="14" fill={p.mid} />
      {windows([160, 250, 200], 130, p, 4, 8)}
      <rect x="60" y="232" width="280" height="14" fill={p.water} opacity=".8" />
    </g>
  ),
  yazd: (p) => (
    <g>
      <rect x="0" y="206" width="400" height="30" fill={p.mid} />
      {[30, 120, 215, 300].map((x, i) => (
        <g key={x}>
          <rect x={x} y={i % 2 ? 100 : 80} width="40" height={i % 2 ? 110 : 130} fill={p.ink} />
          <rect x={x - 4} y={i % 2 ? 96 : 76} width="48" height="8" fill={p.mid} />
          {[8, 20, 32].map((dx) => <rect key={dx} x={x + dx - 2} y={(i % 2 ? 110 : 90)} width="4" height="40" fill={p.light} opacity=".7" />)}
        </g>
      ))}
      {[75, 170, 262, 352].map((x) => <path key={x} d={`M${x - 24} 206a24 24 0 0 1 48 0z`} fill={p.light} opacity=".8" />)}
      {windows([48, 140, 235, 320], 186, p)}
    </g>
  ),
  'chehel-sotoun': (p) => (
    <g>
      <rect x="40" y="226" width="320" height="26" fill={p.water} />
      <rect x="50" y="130" width="300" height="12" fill={p.mid} />
      <rect x="40" y="122" width="320" height="10" fill={p.ink} />
      <rect x="60" y="104" width="280" height="20" fill={p.ink} />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={64 + i * 24} y="142" width="6" height="76" fill={p.light} />)}
      <rect x="50" y="212" width="300" height="14" fill={p.mid} />
      <path d="M200 142v-20" stroke={p.ink} />
      {windows([100, 300], 160, p)}
      <g opacity=".35" transform="translate(0 454) scale(1 -1)">
        <rect x="50" y="212" width="300" height="14" fill={p.mid} />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x={64 + i * 24} y="226" width="6" height="22" fill={p.light} />)}
      </g>
    </g>
  ),
  eram: (p) => (
    <g>
      {[40, 80, 320, 360].map((x, i) => (
        <path key={x} d={`M${x} 226 C${x - 16} 190 ${x - 12} 150 ${x} ${90 + (i % 2) * 14} C${x + 12} 150 ${x + 16} 190 ${x} 226z`} fill={p.ink} />
      ))}
      <rect x="130" y="150" width="140" height="76" fill={p.mid} />
      <rect x="120" y="140" width="160" height="12" fill={p.ink} />
      <path d="M200 118 l22 22 h-44z" fill={p.ink} />
      <path d="M175 226v-40a25 25 0 0 1 50 0v40z" fill={p.light} />
      {[142, 252].map((x) => <path key={x} d={`M${x} 190v-18a8 8 0 0 1 16 0v18z`} fill={p.ink} />)}
      {windows([150, 246], 200, p)}
      <rect x="110" y="232" width="180" height="14" fill={p.water} />
    </g>
  ),
  golestan: (p) => (
    <g>
      <rect x="60" y="200" width="280" height="30" fill={p.mid} />
      <rect x="90" y="120" width="220" height="14" fill={p.ink} />
      <path d="M90 120 L200 78 L310 120z" fill={p.mid} />
      {[110, 150, 190, 230, 270].map((x) => <rect key={x} x={x} y="134" width="10" height="68" fill={p.light} />)}
      <rect x="86" y="200" width="228" height="10" fill={p.ink} />
      <rect x="160" y="160" width="80" height="40" fill={p.ink} />
      <path d="M170 200v-22a10 10 0 0 1 20 0v22zM210 200v-22a10 10 0 0 1 20 0v22z" fill={p.mid} />
      <rect x="20" y="170" width="46" height="60" fill={p.ink} />
      <rect x="334" y="170" width="46" height="60" fill={p.ink} />
      {windows([30, 44, 342, 356], 184, p)}
      <rect x="120" y="234" width="160" height="10" fill={p.water} opacity=".8" />
    </g>
  ),
  'tabriz-bazaar': (p) => (
    <g>
      <rect x="0" y="60" width="400" height="180" fill={p.ink} />
      {[0, 1, 2, 3].map((i) => {
        const w = 400 - i * 70;
        const x = i * 35;
        const y = 220 - i * 22;
        return <path key={i} d={`M${x} ${y}v${-(60 - i * 6)}a${w / 2} ${70 - i * 12} 0 0 1 ${w} 0v${60 - i * 6}z`} fill={i % 2 ? p.mid : p.light} opacity={0.85 - i * 0.1} />;
      })}
      {[110, 200, 290].map((x) => <path key={x} d={`M${x - 8} 230l8 -90l8 90z`} fill={p.glow} opacity={p.glow === 'rgba(0,0,0,0)' ? 0.18 : 0.35} />)}
      <rect x="150" y="190" width="100" height="40" fill={p.ink} />
      {windows([160, 184, 208, 232], 198, p, 6, 8)}
    </g>
  ),
  'chogha-zanbil': (p) => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={70 + i * 22} y={206 - i * 28 - 22} width={260 - i * 44} height="28" fill={i % 2 ? p.mid : p.ink} />
      ))}
      <rect x="186" y="46" width="28" height="16" fill={p.ink} />
      <path d="M190 206v-34h20v34z" fill={p.light} opacity=".7" />
      <path d="M0 232 q100 -28 200 -4 t200 -6 V250 H0z" fill={p.mid} />
      {windows([120, 270], 190, p)}
    </g>
  ),
  'arg-e-bam': (p) => (
    <g>
      <path d="M0 232 q80 -34 160 -6 t240 -14 V250 H0z" fill={p.mid} />
      <rect x="60" y="170" width="280" height="62" fill={p.ink} />
      {Array.from({ length: 15 }, (_, i) => <rect key={i} x={62 + i * 19} y="162" width="10" height="10" fill={p.ink} />)}
      <rect x="140" y="110" width="120" height="62" fill={p.mid} />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={142 + i * 17} y="102" width="10" height="10" fill={p.mid} />)}
      <rect x="180" y="62" width="40" height="50" fill={p.ink} />
      <path d="M180 62h40l-6 -12h-28z" fill={p.mid} />
      <rect x="40" y="130" width="34" height="100" fill={p.mid} />
      <rect x="326" y="130" width="34" height="100" fill={p.mid} />
      <path d="M190 232v-34a10 10 0 0 1 20 0v34z" fill={p.light} />
      {windows([46, 56, 332, 342, 195, 205], 150, p)}
    </g>
  ),
};

const STARS = Array.from({ length: 36 }, (_, i) => ({ x: (i * 97) % 400, y: ((i * 53) % 120) + 6, r: (i % 3) * 0.4 + 0.5 }));

export function Scene({ id, tod, className }: { id: string; tod: TimeOfDay; className?: string }) {
  const p = PAL[tod];
  const gid = `sky-${id}-${tod}`;
  return (
    <svg className={className} viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset="1" stopColor={p.bot} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${gid})`} />
      {p.stars && STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />)}
      <circle cx={tod === 'day' ? 300 : tod === 'dusk' ? 90 : 320} cy={tod === 'dusk' ? 150 : 48} r={p.moon ? 16 : 22} fill={p.sun} opacity={tod === 'night' ? 0.95 : 0.9} />
      {p.moon && <circle cx="328" cy="44" r="14" fill={p.top} opacity=".9" />}
      {LANDMARKS[id]?.(p)}
      <rect x="0" y="228" width="400" height="72" fill={p.ground} opacity=".92" />
    </svg>
  );
}
