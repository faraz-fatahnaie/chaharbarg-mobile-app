import { useId, type ReactNode } from 'react';
import type { TimeOfDay } from '../data/arenas';
import './scene.css';

/*
 * Original stylised arena scenes (art bible s5): flat shapes, no photographs, no traced artwork.
 * Secular landmarks only. 400x300 box, ground line at y=230. Layers, back to front:
 * sky, far, mid (hero landmark), near props, particles, rays, vignette. Motion is CSS transform/opacity only.
 */

interface Pal { sky: [string, string, string]; ink: string; mid: string; light: string; glow: string; sun: string; stars: boolean; moon: boolean; ground: string; water: string; over: string; ray: string; rayO: number; cloud: string }

const PAL: Record<TimeOfDay, Pal> = {
  day: { sky: ['#6ec8ff', '#a9ddf8', '#d8f3ff'], ink: '#6d5238', mid: '#a88562', light: '#e0c192', glow: 'rgba(0,0,0,0)', sun: '#fff3b0', stars: false, moon: false, ground: '#c9a56f', water: '#6bb7d6', over: 'rgba(0,0,0,0)', ray: '#fff1b8', rayO: 0.15, cloud: '#ffffff' },
  dusk: { sky: ['#2a2a6a', '#8a3d8f', '#ff8a3d'], ink: '#2c1d38', mid: '#6b3d55', light: '#eca572', glow: '#ffcf6a', sun: '#ffb25e', stars: false, moon: false, ground: '#7a4a4a', water: '#b6668a', over: 'rgba(255,120,40,.12)', ray: '#ffc27a', rayO: 0.26, cloud: '#ffb08a' },
  night: { sky: ['#0a1030', '#142250', '#1c2f6b'], ink: '#080d1d', mid: '#18233f', light: '#2c3a63', glow: '#ffcf6a', sun: '#f4f1d0', stars: true, moon: true, ground: '#10162b', water: '#16254a', over: 'rgba(10,20,70,.35)', ray: '#fff1b8', rayO: 0, cloud: '#5a6aa0' },
};

const arches = (x0: number, y: number, w: number, h: number, n: number, fill: string) =>
  Array.from({ length: n }, (_, i) => {
    const x = x0 + i * w;
    return <path key={i} d={`M${x + 2} ${y}v${-h * 0.55}a${(w - 4) / 2} ${h * 0.45} 0 0 1 ${w - 4} 0v${h * 0.55}z`} fill={fill} />;
  });

const lit = (p: Pal) => p.glow !== 'rgba(0,0,0,0)';
const windows = (xs: number[], y: number, p: Pal, w = 3, h = 6) => xs.map((x) => <rect key={x} className={lit(p) ? 'scn-lit' : undefined} x={x} y={y} width={w} height={h} fill={p.glow} opacity={lit(p) ? 0.9 : 0} />);

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


/* far: 'hills' ridge or 'city' roofline, one hue, hazed */
const CITY = new Set(['naqsh-e-jahan', 'yazd', 'tabriz-bazaar', 'golestan']);
const far = (id: string, p: Pal) => CITY.has(id)
  ? <g fill={p.mid} opacity=".38">{Array.from({ length: 22 }, (_, i) => { const h = 22 + ((i * 37) % 31); return <rect key={i} x={-20 + i * 20} y={200 - h} width={16 + (i % 3) * 3} height={h + 32} />; })}</g>
  : <path d="M-20 214 L30 170 L70 196 L130 150 L190 192 L250 160 L310 194 L360 156 L420 190 V240 H-20z" fill={p.mid} opacity=".38" />;

/* near: foreground props, ~70% dark, framing the lower/side areas */
const dark = (p: Pal) => ({ fill: p.ink, opacity: 0.78 });
const lamp = (x: number, y: number, p: Pal, key?: number) => (
  <g key={key ?? x}><path d={`M${x} ${y - 30}V${y}`} stroke={p.ink} strokeWidth="1" /><path d={`M${x - 5} ${y}h10l-2 8h-6z`} fill={p.ink} /><circle className={lit(p) ? 'scn-lit' : undefined} cx={x} cy={y + 5} r="3" fill={p.glow} opacity={lit(p) ? 0.95 : 0.25} /></g>
);
const NEAR: Record<string, (p: Pal) => ReactNode> = {
  persepolis: (p) => (
    <g {...dark(p)}>
      <rect x="6" y="258" width="46" height="18" rx="2" /><rect x="14" y="244" width="32" height="14" rx="2" /><rect x="352" y="262" width="40" height="16" rx="2" />
      {[70, 86, 330, 312].map((x, i) => <path key={x} d={`M${x} 290l3 -${14 + (i % 2) * 6}l3 ${14}l3 -${10}l3 ${10}z`} />)}
    </g>
  ),
  'si-o-se-pol': (p) => (
    <g fill="none" stroke={p.ink} strokeWidth="1.4" opacity=".78">
      {[-4, 10, 24, 40].map((x, i) => <path key={x} d={`M${x} 150 q${14 + i * 3} 40 ${6 + i * 4} ${100 + i * 12}`} />)}
      {[386, 372, 358].map((x, i) => <path key={x} d={`M${x} 160 q-${14 + i * 3} 40 -${6 + i * 4} ${96 + i * 10}`} />)}
      <path d="M60 268q20 -4 40 0t40 0M250 276q20 -4 40 0t40 0" stroke={p.light} opacity=".5" />
    </g>
  ),
  'naqsh-e-jahan': (p) => (
    <g>
      <path d="M-10 250 L40 230 L96 250z" fill={p.mid} opacity=".85" /><path d="M300 252 L360 230 L412 250z" fill={p.mid} opacity=".85" />
      <rect x="-10" y="250" width="106" height="50" {...dark(p)} /><rect x="300" y="252" width="112" height="48" {...dark(p)} />
      {lamp(120, 262, p)}{lamp(280, 262, p)}
    </g>
  ),
  yazd: (p) => (
    <g {...dark(p)}>
      <path d="M-10 300V170h40a60 60 0 0 1 0 0v130z" /><path d="M370 300V170h40v130z" />
      <path d="M-10 300V210a40 52 0 0 1 90 0V300z" opacity=".5" />
      <path d="M40 300q-10 -22 0 -34h14q10 12 0 34z" /><path d="M330 300q-8 -18 0 -28h12q8 10 0 28z" />
    </g>
  ),
  'chehel-sotoun': (p) => (
    <g {...dark(p)}>
      {[22, 380].map((x) => <path key={x} d={`M${x} 300C${x - 14} 250 ${x - 12} 190 ${x} 140C${x + 12} 190 ${x + 14} 250 ${x} 300z`} />)}
      <rect x="0" y="282" width="400" height="18" opacity=".7" />
    </g>
  ),
  eram: (p) => (
    <g>
      <path d="M-10 150 q60 20 110 -10 M410 130 q-70 28 -120 -6" fill="none" stroke={p.ink} strokeWidth="2.4" opacity=".8" />
      {[[20, 156], [60, 156], [90, 140], [372, 140], [336, 150], [306, 128]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="#f08a2a" opacity={p.glow === 'rgba(0,0,0,0)' ? 0.9 : 0.55} />)}
      {[40, 90, 320, 360].map((x) => <circle key={x} cx={x} cy={282} r="6" fill="#e0587a" opacity=".7" />)}
      <rect x="0" y="286" width="400" height="14" {...dark(p)} />
    </g>
  ),
  golestan: (p) => (
    <g>
      <path d="M-10 -10h70q-30 90 -14 200q-20 -30 -56 -30z" fill="#7a2030" opacity=".78" /><path d="M410 -10h-70q30 90 14 200q20 -30 56 -30z" fill="#7a2030" opacity=".78" />
      <path d="M180 300q-16 -30 -6 -50h52q10 20 -6 50z" {...dark(p)} /><path d="M196 250v-14h8v14" stroke={p.ink} strokeWidth="2" />
    </g>
  ),
  'tabriz-bazaar': (p) => (
    <g>
      {[50, 130, 270, 350].map((x, i) => lamp(x, 70 + (i % 2) * 20, p))}
      <ellipse cx="40" cy="288" rx="26" ry="14" {...dark(p)} /><ellipse cx="370" cy="290" rx="30" ry="13" {...dark(p)} /><ellipse cx="82" cy="294" rx="18" ry="10" {...dark(p)} />
    </g>
  ),
  'chogha-zanbil': (p) => (
    <g>
      <path d="M0 262h400V300H0z" {...dark(p)} />
      <path d="M40 262l10 14 -6 10M120 262l-8 16 12 8M250 262l8 12 -10 14M340 262l-6 18" fill="none" stroke={p.mid} strokeWidth="1.2" />
      <path d="M340 262l6 -22 6 8 6 -16 6 14 6 -10 4 26z" {...dark(p)} />
    </g>
  ),
  'arg-e-bam': (p) => (
    <g {...dark(p)}>
      <path d="M-10 300V262q60 -22 130 0t140 0q60 -14 150 0V300z" />
      {[30, 372].map((x, i) => <g key={x}><path d={`M${x} 262V170`} stroke={p.ink} strokeWidth="3" fill="none" /><path d={`M${x} 172q-26 -4 -34 14M${x} 172q26 -4 34 14M${x} 172q-18 -16 -30 -10M${x} 172q18 -16 30 -10`} stroke={p.ink} strokeWidth="2.4" fill="none" /></g>)}
    </g>
  ),
};

/* particles: [kind, count]; day-only kinds become fireflies at night */
type Kind = 'dust' | 'spark' | 'petal' | 'ember' | 'sand' | 'glint';
const PARTS: Record<string, [Kind, number][]> = {
  persepolis: [['dust', 14]],
  'si-o-se-pol': [['spark', 12]],
  'naqsh-e-jahan': [['dust', 10]],
  yazd: [['sand', 12]],
  'chehel-sotoun': [['spark', 6], ['petal', 6]],
  eram: [['petal', 12]],
  golestan: [['glint', 6], ['dust', 8]],
  'tabriz-bazaar': [['ember', 14]],
  'chogha-zanbil': [['sand', 8], ['dust', 4]],
  'arg-e-bam': [['ember', 10], ['sand', 4]],
};
const FLY: Record<string, 'bird' | 'bat'> = { 'si-o-se-pol': 'bird', 'naqsh-e-jahan': 'bird', 'chogha-zanbil': 'bat' };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function particles(id: string, tod: TimeOfDay) {
  const r = rng(hash(id));
  const between = (a: number, b: number) => a + (b - a) * r();
  const out: ReactNode[] = [];
  (PARTS[id] ?? []).forEach(([k0, n]) => {
    const night = tod === 'night';
    const k: Kind | 'fly' = night && (k0 === 'dust' || k0 === 'sand' || k0 === 'petal') ? 'fly' : k0;
    for (let i = 0; i < n; i++) {
      const x = between(10, 390);
      const y = k === 'spark' ? between(232, 262) : k === 'ember' ? between(150, 260) : k === 'petal' ? between(20, 120) : k === 'glint' ? between(60, 200) : between(70, 240);
      const delay = `${-between(0, 14).toFixed(1)}s`;
      const dur = (k === 'spark' || k === 'glint' ? between(2.5, 5) : k === 'fly' ? between(6, 10) : between(8, 16)).toFixed(1);
      const s = { '--dur': `${dur}s`, '--del': delay, '--a': between(0.3, 0.8).toFixed(2) } as React.CSSProperties;
      const mv = (dx: number, dy: number, rot = 0) => Object.assign(s, { '--dx': `${dx}px`, '--dy': `${dy}px`, '--rot': `${rot}deg` });
      const key = `${k0}${i}`;
      if (k === 'spark' || k === 'glint') out.push(<circle key={key} className="scn-p scn-tw" style={s} cx={x} cy={y} r={k === 'glint' ? 1.8 : 1.4} fill={k === 'glint' ? '#ffe08a' : '#ffffff'} />);
      else if (k === 'fly') { mv(between(-14, 14), between(-12, 12)); out.push(<circle key={key} className="scn-p scn-ff" style={s} cx={x} cy={y} r="2.2" fill="#ffe27a" />); }
      else if (k === 'petal') { mv(between(20, 50), 150, between(120, 300)); out.push(<ellipse key={key} className="scn-p scn-mv" style={s} cx={x} cy={y} rx="3.2" ry="1.7" fill={i % 2 ? '#ffd0dc' : '#fff4f4'} />); }
      else if (k === 'ember') { mv(between(-12, 18), -between(80, 130)); out.push(<circle key={key} className="scn-p scn-mv" style={s} cx={x} cy={y} r={between(1.2, 2.4)} fill="#ff9a3c" />); }
      else if (k === 'sand') { mv(between(110, 180), between(2, 10)); out.push(<rect key={key} className="scn-p scn-mv" style={s} x={x - 100} y={y} width="7" height="1" fill="#f1d9a0" />); }
      else { mv(between(50, 90), between(-14, 6)); out.push(<circle key={key} className="scn-p scn-mv" style={s} cx={x - 40} cy={y} r={between(1, 2.2)} fill="#ffd978" />); }
    }
  });
  const fly = FLY[id];
  if (fly && !(fly === 'bird' && tod === 'night') && !(fly === 'bat' && tod === 'day')) {
    for (let i = 0; i < 3; i++) out.push(<g key={`f${i}`} transform={`translate(${-30 - i * 12} ${40 + i * 14})`}><path className="scn-p scn-fly" style={{ '--del': `${-i * 6 - 2}s`, '--dur': `${26 + i * 3}s`, '--a': '.8' } as React.CSSProperties} d="M0 0q4 -5 8 0q4 -5 8 0" fill="none" stroke={fly === 'bat' ? '#120c1c' : PAL[tod].ink} strokeWidth="1.6" /></g>);
  }
  return out;
}

const STARS = Array.from({ length: 30 }, (_, i) => ({ x: (i * 97) % 400, y: ((i * 53) % 130) + 6, r: (i % 3) * 0.4 + 0.5 }));
const STRONG = new Set(['golestan', 'tabriz-bazaar']);

export function Scene({ id, tod, className }: { id: string; tod: TimeOfDay; className?: string }) {
  const p = PAL[tod];
  const uid = useId().replace(/:/g, '');
  const sx = tod === 'day' ? 300 : tod === 'dusk' ? 90 : 326;
  const sy = tod === 'day' ? 56 : tod === 'dusk' ? 168 : 46;
  return (
    <svg className={`scn ${className ?? ''}`} viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`sk${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} /><stop offset=".55" stopColor={p.sky[1]} /><stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
        <linearGradient id={`ry${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.ray} stopOpacity="1" /><stop offset="1" stopColor={p.ray} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`vg${uid}`} cx=".5" cy=".5" r=".75">
          <stop offset=".55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".45" />
        </radialGradient>
      </defs>
      {/* L0 sky */}
      <g>
        <rect width="400" height="300" fill={`url(#sk${uid})`} />
        {p.stars && <g fill="#fff"><g className="scn-tw" style={{ '--dur': '4s', '--del': '0s' } as React.CSSProperties}>{STARS.filter((_, i) => i % 2).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} />)}</g><g className="scn-tw" style={{ '--dur': '5s', '--del': '-2s' } as React.CSSProperties}>{STARS.filter((_, i) => !(i % 2)).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} />)}</g></g>}
        <circle cx={sx} cy={sy} r={p.moon ? 16 : 24} fill={p.sun} opacity={tod === 'dusk' ? 0.95 : 0.9} />
        {p.moon && <circle cx={sx + 8} cy={sy - 3} r="14" fill={p.sky[0]} opacity=".92" />}
        <g className="scn-drift scn-cl" fill={p.cloud} opacity={tod === 'night' ? 0.12 : 0.45}>
          <rect x="20" y="70" width="120" height="6" rx="3" /><rect x="60" y="80" width="80" height="4" rx="2" />
          <rect x="230" y="100" width="130" height="6" rx="3" /><rect x="260" y="110" width="70" height="4" rx="2" />
          <rect x="120" y="40" width="90" height="5" rx="2.5" />
        </g>
      </g>
      {/* L1 far */}
      <g className="scn-drift scn-far">{far(id, p)}</g>
      {/* L2 mid (hero landmark + ground) */}
      <g>{LANDMARKS[id]?.(p)}<rect x="0" y="228" width="400" height="72" fill={p.ground} opacity=".92" /></g>
      {/* L3 near */}
      <g className="scn-drift scn-near">{NEAR[id]?.(p)}</g>
      <rect width="400" height="300" fill={p.over} />
      {/* L4 particles */}
      <g>{particles(id, tod)}</g>
      {/* L5 rays */}
      {p.rayO > 0 && (
        <g className="scn-rays" style={{ '--ray': p.rayO * (STRONG.has(id) ? 1.7 : 1) } as React.CSSProperties} fill={`url(#ry${uid})`}>
          <path d="M250 0h40l-70 240h-60z" /><path d="M320 0h26l-50 240h-44z" /><path d="M170 0h22l-60 240h-34z" />
        </g>
      )}
      {/* L6 vignette */}
      <rect width="400" height="300" fill={`url(#vg${uid})`} />
    </svg>
  );
}
