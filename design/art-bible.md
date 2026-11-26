# Chaharbarg Art Bible v1

Pillar: **juicy, chunky, saturated, Persian**. Benchmark is Clash Royale's readability and weight (thick outlines, bevels, glossy gradients, big numerals), dressed in lapis, turquoise, saffron, pomegranate and gold. Secular motifs only: eslimi, girih, ganjifeh. No religious imagery, no calligraphic verses. All art is SVG/CSS, no raster, fully offline.

Rules of thumb: (1) every interactive object has a dark outline, a top highlight and a bottom shade; (2) nothing is flat, nothing is grey; (3) gold means value, never decoration only; (4) one hero colour per screen, the rest supports it; (5) 60fps on a mid Android: animate only `transform`/`opacity`, cap particles at 24 per scene.

## 1. Palette (paste into `:root`)

```css
:root{
  /* base: lapis night, light-on-dark */
  --bg:#0a1230; --bg2:#101c47; --panel:#1a2c6b; --panel2:#243b8c; --panel-hi:#3a56b8;
  --ink:#fff8e6; --mute:#aab8e8; --outline:#070d24;       /* outline = near-black lapis */
  /* brand */
  --lapis:#2447b8; --turq:#18c2b4; --turq-d:#0b8a85; --saffron:#ffb21e; --saffron-d:#c97a00;
  --pomegranate:#e0263f; --pom-d:#8f1226; --emerald:#2fcf72; --emerald-d:#168a43;
  --gold:#ffd24a; --gold-hi:#fff0a8; --gold-d:#b8791a;   /* gold ramp: hi/base/d */
  --gohar:#6ef0ff;                                         /* gem currency */
  --ok:var(--emerald); --bad:var(--pomegranate);
  /* rarity: common/rare/epic/legendary */
  --r-common:#8fa3d6; --r-rare:#2fa8ff; --r-epic:#b455ff; --r-legend:#ffb21e;
  /* suits (on card paper #fffaf0) */
  --suit-S:#14183a; --suit-C:#0e6b57; --suit-H:#d4193a; --suit-D:#f07a14;
  --paper:#fffaf0; --paper-d:#ecdcb4;
  /* shadows */
  --sh-1:0 2px 0 var(--outline),0 4px 8px rgba(0,0,0,.4);
  --sh-2:0 4px 0 var(--outline),0 10px 18px rgba(0,0,0,.5);
  --bevel:inset 0 2px 0 rgba(255,255,255,.45),inset 0 -4px 0 rgba(0,0,0,.28);
}
```
Traditional two-colour suits (hearts and diamonds red, spades and clubs black), as players expect. Never use pure `#000`/`#fff`.

## 2. Typography

- Display: **Lalezar** (`@fontsource/lalezar`, weight **400** only; it ships Arabic + Latin subsets). Use for titles, buttons, numbers, banners, card ranks on `deck-ganjifeh`.
- Body: **Vazirmatn** weights **400, 600, 800** (already installed).
- `--f-display:'Lalezar','Vazirmatn',system-ui,sans-serif; --f-body:'Vazirmatn',system-ui,sans-serif;`
- Import in `main.tsx`: `import '@fontsource/lalezar/400.css'` (and Vazirmatn 400/600/800 if not yet).

| Token | Size | Font/weight | Tracking | Use |
|---|---|---|---|---|
| `--t-hero` | 44px/1 | Lalezar | 0 | splash banners |
| `--t-h1` | 30px/1.1 | Lalezar | 0 | screen titles |
| `--t-h2` | 22px/1.2 | Lalezar | 0 | panel headers, buttons |
| `--t-num` | 26px/1 | Lalezar | .02em | scores, trophies, prices |
| `--t-body` | 16px/1.5 | Vazirmatn 600 | 0 | text |
| `--t-small` | 13px/1.4 | Vazirmatn 400 | 0 | captions (min size; never below 12) |
| `--t-tag` | 11px | Vazirmatn 800 | .06em, uppercase for Latin only | rarity chips |

Persian digits: render all numerals through one helper `fa(n)` using `n.toLocaleString('fa-IR')` when locale is fa, else `en-US`; always set `font-variant-numeric:tabular-nums` on score counters and `direction:ltr` on number spans so `+۱۲` never flips. Card ranks stay Latin (A 2-10 J Q K) in every locale, same as the physical deck. Persian text never gets letter-spacing (breaks joins).

Display text recipe (chunky stroked title):
```css
.title{font-family:var(--f-display);color:var(--gold-hi);
  -webkit-text-stroke:5px var(--outline);paint-order:stroke fill;
  text-shadow:0 3px 0 var(--gold-d),0 6px 0 var(--outline),0 10px 14px rgba(0,0,0,.5)}
```

## 3. Cards

### 3.1 Geometry
Ratio 5:7 (`height = width*1.4`), radius `0.12*w`, paper `linear-gradient(160deg,#fff 0,var(--paper) 55%,var(--paper-d))`, 2px outline `var(--outline)` plus inner 1px `rgba(0,0,0,.12)` hairline, `--bevel`, drop `--sh-1`. Corner index: rank in Lalezar at `0.30*w`, suit mark 0.22*w beneath, inset 0.07*w from edges, bottom-right rotated 180deg. Cards are always `direction:ltr`, so the index stays top-left in every locale.

### 3.2 Suit shapes (24x24, `fill="currentColor"`, set `color:var(--suit-X)`)
```svg
<symbol id="s-S" viewBox="0 0 24 24"><path d="M12 1.5C16 6.5 21.5 9.5 21.5 14.2c0 2.7-2.1 4.6-4.6 4.6-1.7 0-3.1-.8-4-2.1.1 2 .7 3.8 2.1 5.3H7c1.4-1.5 2-3.3 2.1-5.3-.9 1.3-2.3 2.1-4 2.1-2.5 0-4.6-1.9-4.6-4.6C2.5 9.5 8 6.5 12 1.5z"/></symbol>
<symbol id="s-H" viewBox="0 0 24 24"><path d="M12 21.5C5 15.6 2 12.2 2 8.3 2 5.2 4.3 3 7.1 3c1.9 0 3.7 1 4.9 2.8C13.2 4 15 3 16.9 3 19.7 3 22 5.2 22 8.3c0 3.9-3 7.3-10 13.2z"/></symbol>
<symbol id="s-D" viewBox="0 0 24 24"><path d="M12 1.5C14 6 17.5 9.5 21.5 12 17.5 14.5 14 18 12 22.5 10 18 6.5 14.5 2.5 12 6.5 9.5 10 6 12 1.5z"/></symbol>
<symbol id="s-C" viewBox="0 0 24 24"><path d="M12 2A4.8 4.8 0 0 0 8.4 10 4.8 4.8 0 1 0 10.7 16.6C10.8 19 10 20.6 8.3 22H15.7C14 20.6 13.2 19 13.3 16.6A4.8 4.8 0 1 0 15.6 10 4.8 4.8 0 0 0 12 2Z"/></symbol>
```
Mount one hidden `<svg>` with these symbols once in `App`; `CardView` uses `<svg class="suit"><use href="#s-H"/></svg>`. Replaces unicode glyphs everywhere (also scoreboard and chat). Pip shine: layer a second `<use>` scaled .55 at top-left filled `#fff` opacity .22 (clip not needed).

### 3.3 Pips
Keep the existing `PIPS` grid. Pip size `0.26*w` (`0.22*w` for 9/10). Lower-half pips rotate 180deg. Ace: single pip at `0.55*w` with a girih 8-point star ring behind it (`stroke:var(--suit-X);opacity:.18;stroke-width:1.5`). Pips get `filter:drop-shadow(0 1px 0 rgba(0,0,0,.25))`.

### 3.4 Face cards J/Q/K (inset frame, 70% x 72% of card, 100x140 art box)
Frame: rounded rect, 2px `var(--suit-X)`, fill `linear-gradient(var(--gold-hi),var(--gold))` at 35% opacity, split diagonally: bottom-right half is the 180deg mirror (true playing-card look). Each half is a bust built from five primitives, filled in suit colour + saffron/gold, outlined 1.5px `--outline`:

1. **Body**: trapezoid robe `M10 70 Q50 45 90 70 V70 L90 100 H10 Z` in the suit colour with a gold collar band (2 stripes) and 3 gold dot buttons.
2. **Head**: circle r=17 at (50,40), skin `#f3c9a0`, outline, two dot eyes, curved brow stroke, small mouth arc.
3. **Headwear** (the rank identity):
   - **K**: tall tiered crown, `M30 28 L34 10 L42 22 L50 6 L58 22 L66 10 L70 28 Z` gold, with a turquoise gem circle on the middle point, plus a full beard `M36 46 Q50 76 64 46 Q50 56 36 46` and moustache.
   - **Q**: a jewelled diadem band (gold arc + 3 gem dots) with a sheer veil drawn as two flowing Beziers falling to shoulders, no beard, rosy cheek dots, a pomegranate-blossom held at the chest.
   - **J**: a Safavid-style soft turban cap, or a plumed cap: ellipse in suit colour, gold band, one tall feather path in turquoise; clean-shaven, a small sword hilt held diagonally (two rects, gold).
4. **Attribute** next to the bust: K = sceptre (thin gold rect + circle), Q = flower, J = sword.
5. **Suit tag**: big suit mark (0.2*w) at the frame's outer corner.

Keep each half under 25 SVG elements. Ship as 3 components `<KingArt/>`, `<QueenArt/>`, `<JackArt/>` taking `color` and rendering twice (second `transform="rotate(180 50 70)"` clipped to the other triangle). Large-index deck: same art at 70% scale, index rank at `0.42*w`.

### 3.5 Decks
- **deck-classic**: paper white, four-colour suits, gold faces as above.
- **deck-large**: index rank `0.42*w`, suit 0.3*w, pips reduced to 0.2*w, faces simplified (no gradients, solid fills), high contrast: `--suit-S:#000a33`, `--suit-H:#c80028`. Accessibility deck; must remain the most legible.
- **deck-ganjifeh** (premium): circular-card inspiration without breaking 5:7 layout: paper `#f6e2b4` aged, border 3px lapis with inner gold line, a lacquer red/black/lapis/green palette (S `#1c2250`, C `#0f6b4f`, H `#a4161a`, D `#c46a00`), girih tile watermark behind pips (`opacity:.1`), face cards get an eslimi-vine border and a lapis background instead of gold, ranks in Lalezar with gold stroke.

### 3.6 Backs (all: 2px outline, 6px inner border, central medallion)
Use a repeating girih/eslimi SVG data-URI tile (extend `backStyle`), a centre medallion (circle r=0.26*w, gold ring, 8-point star inside) and corner quarter-arcs.
- **back-indigo (lapis)** `#1d3a9a` + gold `#ffd24a`: eight-point star tile.
- **back-turquoise** `#12a79e` + cream `#fff4d6`: interlocking hexagon girih.
- **back-pomegranate** `#b01430` + `#ffd98a`: pomegranate-crown motif (circle with 5 triangles), diamond lattice.
- **back-eslimi** `#4a2f78` + `#f4c26b`: spiral eslimi vine tile (two mirrored S-curves with leaf ends), the premium back, add a slow gold shimmer (`::after` diagonal gradient sweep, 4s, transform only).

### 3.7 States
```css
.card{transition:transform .14s cubic-bezier(.3,1.6,.5,1),box-shadow .14s}
.card.sel{transform:translateY(-14px) scale(1.06);box-shadow:0 0 0 3px var(--gold),0 14px 18px rgba(0,0,0,.5)}
.card.glow{animation:pulse 1.1s ease-in-out infinite;box-shadow:0 0 0 3px var(--turq),0 0 18px 4px rgba(24,194,180,.7)}
.card.dim{filter:saturate(.5) brightness(.7)}
@keyframes pulse{50%{box-shadow:0 0 0 3px var(--turq),0 0 28px 8px rgba(24,194,180,.9)}}
```
`sel` = your chosen card (gold); `glow` = legal capture target (turquoise); `dim` = unplayable. On deal, cards fly with overshoot (`cubic-bezier(.3,1.6,.5,1)`, 280ms, 40ms stagger). Captured sets show a gold ring burst (scale 1 to 1.5, opacity 1 to 0, 300ms).

## 4. UI components

**Panel** (the chunky box): 
```css
.panel{background:linear-gradient(180deg,var(--panel2),var(--panel));border:3px solid var(--outline);
  border-radius:18px;box-shadow:inset 0 2px 0 var(--panel-hi),inset 0 -5px 0 rgba(0,0,0,.25),var(--sh-2);padding:14px}
.panel.hdr::before{content:"";display:block;margin:-14px -14px 10px;height:40px;border-radius:15px 15px 0 0;
  background:linear-gradient(180deg,var(--lapis),#183488);border-bottom:3px solid var(--outline)}
```
Subtle girih pattern overlay on panels at 6% opacity (SVG data-URI, `background-blend-mode:overlay`).

**Buttons** (3D press; one primary per screen):
```css
.btn{font:400 22px var(--f-display);color:#fff;padding:10px 22px;border:3px solid var(--outline);border-radius:14px;
  background:linear-gradient(180deg,var(--c1),var(--c2));box-shadow:inset 0 3px 0 rgba(255,255,255,.5),0 5px 0 var(--c3),0 8px 10px rgba(0,0,0,.45);
  text-shadow:0 2px 0 rgba(0,0,0,.45);transition:transform .08s,box-shadow .08s}
.btn:active{transform:translateY(4px);box-shadow:inset 0 3px 0 rgba(255,255,255,.4),0 1px 0 var(--c3)}
.btn.primary{--c1:#ffd24a;--c2:#ff9d0a;--c3:var(--saffron-d);color:#4a2a00;text-shadow:0 1px 0 #fff6}
.btn.go{--c1:#58e68a;--c2:var(--emerald-d);--c3:#0d5a2b}
.btn.alt{--c1:#4f7bff;--c2:var(--lapis);--c3:#142a73}
.btn.danger{--c1:#ff5a6e;--c2:var(--pomegranate);--c3:var(--pom-d)}
.btn:disabled{filter:grayscale(.7) brightness(.8)}
```
Primary buttons idle-bounce subtly (`scale 1 to 1.04`, 1.6s) only when they are the next required action.

**Scoreboard** (top strip, replaces current): a row of player plates, each `.panel` 64px tall: avatar frame left, name (Vazirmatn 800 14px), big score in `--t-num` gold with outline-stroke, a stack of small chips: Sur count (turquoise lozenge), clubs count (`#s-C` icon), ten-of-diamonds/two-of-clubs flags (small card icons). Leader plate: gold border, crown icon above avatar, `scale(1.04)`. Active turn: plate border pulses `--turq`, a small triangle pointer under it. Score change: number scales 1.5 and flashes white, `+N` floats up in saffron and fades (600ms). Target score shown as a thin gold progress bar under each plate (4px, rounded, inner shadow).

**Avatar frame**: round 52px, 3px outline, 4px ring by rank/rarity (common `--r-common`, rare, epic, legend with animated conic-gradient rotation 6s). Octagonal girih-star notch at top as a mount for the crown. Tiny level badge bottom-right: circle 20px saffron, Lalezar 12px number. Bot faces: flat vector busts in the same toolkit as face cards.

**Banners** (ribbon shape: central rect 220x64 plus swallowtail ends, SVG path, fill gradient, 3px outline, gold trim lines):
- **Sur splash**: full-width turquoise ribbon, text "سور!" in `--t-hero` gold-stroked, 12 gold confetti stars burst radially, screen shake 6px 200ms, entry `scale(0 to 1.25 to 1)` 450ms with overshoot, hold 700ms, exit up and fade. A shock-ring (turq circle stroke, scale 0.3 to 2.5) behind.
- **VS splash**: two diagonal halves (lapis from the left, pomegranate from the right) slide in with 8deg skew, avatars large on each half, central gold "VS" (Lalezar 64px, stroke) slams in with a white flash, speed lines (repeating-linear-gradient) behind. Arena name under on a small ribbon. 1.4s total, skippable by tap.
- **Win**: gold sunburst (24 rays, conic-gradient, rotating 20s) behind a big "برنده!/Victory" ribbon, trophy count ticking up, 30 falling petals/confetti, primary green "Continue" button. Chests/rewards pop with stagger.
- **Lose**: desaturate scene 40%, ribbon in `--pom-d` to `#5a0b19`, text "باخت" in pale gold, no confetti, a gentle downward ember drift, buttons "Rematch" (primary) and "Home". Tone: encouraging, never mocking.

## 5. Arena environments

Every scene is an SVG 360x640 stack of `<g>` layers with a CSS parallax drift (the whole stack is static unless noted; drift via `transform: translateX` keyframes, 40-120s, linear, alternate). Layer order and speed:

| Layer | Content | Drift |
|---|---|---|
| L0 sky | gradient + sun/moon + stars/clouds | clouds 120s |
| L1 far | skyline silhouette, 1 hue, 40% haze | 90s, 6px |
| L2 mid | hero landmark, simple shapes, 2 tones + rim light | static (anchor) |
| L3 near | foreground props, framing arches, planters, 70% dark | 50s, 10px |
| L4 particles | ambient (below), max 24 | per type |
| L5 rays | 2-3 skewed white-gold gradient polygons, `mix-blend-mode:screen`, opacity .15, pulse 8s | pulse |
| L6 vignette | radial gradient to `rgba(0,0,0,.45)` at edges | none |

Table felt sits over the lower 55%, with a rim: 6px `--rim` border, inner highlight, girih border strip in gold at 20% opacity, subtle felt noise (`feTurbulence` baked once as data-URI, 4% opacity).

**Time of day** (applied as palette ramp + overlay, not new art): 
- day: sky `#6ec8ff to #d8f3ff`, sun `#fff3b0`, rays on, overlay none.
- dusk: sky `#ff8a3d to #8a3d8f to #2a2a6a`, sun low `#ffb25e`, overlay `rgba(255,120,40,.12)`, rays strong and warm.
- night: sky `#0a1030 to #1c2f6b`, moon `#f4f1d0`, 40 tiny star dots twinkling (opacity only), overlay `rgba(10,20,70,.35)`, windows/lanterns lit `#ffcf6a` with glow, rays off, fireflies/sparks substitute.

| Arena | Mid (hero) | Near | Particles | Sky notes |
|---|---|---|---|---|
| Persepolis | Apadana column row, bull-capital top, carved stairs | broken column drums, grass tufts | dust motes drifting right, golden | wide, low cloud streaks |
| Si-o-se-pol | double-tier arch bridge, reflection | river ripples, willow fronds | water sparkles on surface, small bird flock | turquoise river, warm brick |
| Naqsh-e Jahan | Ali Qapu portico, tile blue domes silhouette (secular only: no minaret focus), square arcade | carpet vendors' awnings, lanterns | pigeons crossing, lantern glows, bazaar dust | warm plaza haze |
| Yazd | wind-tower skyline, mud-brick | arch window frame, jars | sand grains horizontal, heat shimmer (opacity wobble) | amber sky |
| Chehel Sotoun | 20-column portico + mirrored pool | cypress, pool edge | water sparkles, floating petals | symmetrical, calm |
| Eram | Qajar pavilion, tall cypress pair | bitter-orange branches, roses | falling blossom petals (pink/white), butterflies | green and pink bloom |
| Golestan | marble throne terrace, mirror-work wall (faceted gold/blue shards) | curtains, vase | gold glints (star twinkles), dust in rays | indoor-ish, strong rays |
| Tabriz Bazaar | brick vault arches, receding rows | hanging lamps, sacks | warm floating embers/dust in shafts, lamp flicker | dim, shafts of light |
| Chogha Zanbil | stepped ziggurat, 3 tiers, long shadow | cracked ground, thorn bush | dust devils, slow sand, bats at dusk | huge sky, low sun |
| Arg-e Bam | mud-brick citadel, towers | rocky dunes, palm silhouettes | embers/sparks rising, sand streaks | red-gold sunset skew |

Particle rule: 1-3 shapes per arena (circle, petal, line), size 2-6px, opacity .2-.8, `animation-delay` randomised once at mount (no per-frame JS). Respect `prefers-reduced-motion`: pause drift and particles.

## 6. Stickers and emotes

Format: 96x96 SVG character, chunky 4px outline, 2 shades per fill, big eyes, one signature animation (CSS, 0.8-1.6s, `transform`/`opacity` only), shown as a bubble above the avatar for 2s with pop-in overshoot. The cast is secular, Persian-flavoured everyday motifs (fruit, flowers, tea, animals).

1. **Pomegranate (Anar) "GG"**: red fruit with crown-calyx, grin, thumbs-up. Animation: bounce + seeds burst (4 small circles).
2. **Saffron Crocus "Wow"**: purple flower, three saffron stamens as eyebrows, mouth O. Animation: scale 1 to 1.3 with stamen wiggle.
3. **Tea Glass (Estekan) "Cheers"**: tulip-shaped glass, steam, happy face. Animation: tilt -12 to +12deg, steam path rising and fading.
4. **Camel "Hmph"**: head-and-hump, side-eye, lip curl, smug. Animation: slow head tilt and blink (scaleY on eyes).
5. **Nightingale (Bolbol) "Sing / Taunt"**: tiny blue bird with musical notes. Animation: beak open/close, notes float up and fade.
6. **Lucky Coin "Thanks"**: gold Shahi coin with face, wink. Animation: Y-axis spin flip (scaleX 1 to 0 to 1) then sparkle.
7. **Rose "Oops"**: wilting rose with sweat drop. Animation: head droops (rotate 0 to 20deg), drop slides down.
8. **Samovar "Think"**: samovar with steaming lid and eyes looking up. Animation: lid rattles (translateY -2px), 3 bubbling dots.
9. **Cat (Goorbeh) "Angry"**: orange cat, flat brows, red flush. Animation: shake 4px, steam puffs from ears.

Static fallback under reduced motion: first-frame pose, no loop. Each sticker ships as one `<svg>` component with a `.anim` class so the animation can be toggled. Palette: only tokens in section 1; outlines `--outline`; highlight white at 35% on the top-left curve. Naming: `sticker_[name]_[anim]_96.svg`, e.g. `sticker_anar_gg_96`.

## 7. Asset naming and budgets
`[category]_[name]_[variant]_[size]`, e.g. `env_persepolis_mid_day`, `ui_btn_primary_hover`, `char_king_art_01`. Budgets: card face <= 60 SVG nodes, scene <= 250 nodes, sticker <= 40 nodes, filters (`drop-shadow`, `blur`) never on animated elements, `feTurbulence` only baked once. Contrast: text on panels >= 4.5:1 (ink on `--panel` is 11:1).
