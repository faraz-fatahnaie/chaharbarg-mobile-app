import type { CSSProperties } from 'react';
import type { Card } from '@chaharbarg/engine';
import { BACK_STYLES } from '../data/cosmetics';

const GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const RANK = (r: number) => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

const L = 28, C = 50, R = 72;
// classic playing-card layouts: side columns, optional centre column; spacing keeps every pip clear of its neighbours
const PIPS: Record<number, [number, number][]> = {
  1: [[C, 50]],
  2: [[C, 20], [C, 80]],
  3: [[C, 20], [C, 50], [C, 80]],
  4: [[L, 20], [R, 20], [L, 80], [R, 80]],
  5: [[L, 20], [R, 20], [C, 50], [L, 80], [R, 80]],
  6: [[L, 20], [R, 20], [L, 50], [R, 50], [L, 80], [R, 80]],
  7: [[L, 20], [R, 20], [C, 35], [L, 50], [R, 50], [L, 80], [R, 80]],
  8: [[L, 20], [R, 20], [C, 35], [L, 50], [R, 50], [C, 65], [L, 80], [R, 80]],
  9: [[L, 16], [R, 16], [L, 38], [R, 38], [C, 50], [L, 62], [R, 62], [L, 84], [R, 84]],
  10: [[L, 16], [R, 16], [C, 27], [L, 38], [R, 38], [L, 62], [R, 62], [C, 73], [L, 84], [R, 84]],
};

export function backStyle(id: string): CSSProperties {
  const { a, b } = BACK_STYLES[id] ?? BACK_STYLES['back-indigo'];
  const star = `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><path d='M11 1l2.4 7.2L21 11l-7.6 2.8L11 21l-2.4-7.2L1 11l7.6-2.8z' fill='${b}' opacity='.7'/></svg>`;
  return {
    backgroundColor: a,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(star)}")`,
    backgroundSize: id === 'back-eslimi' ? '16px 16px' : '22px 22px',
    ['--bk' as string]: b,
  };
}

/** One hidden sprite with the four suit shapes; mount once at the app root. */
export function SuitSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <symbol id="s-S" viewBox="0 0 24 24"><path d="M12 1.5C16 6.5 21.5 9.5 21.5 14.2c0 2.7-2.1 4.6-4.6 4.6-1.7 0-3.1-.8-4-2.1.1 2 .7 3.8 2.1 5.3H7c1.4-1.5 2-3.3 2.1-5.3-.9 1.3-2.3 2.1-4 2.1-2.5 0-4.6-1.9-4.6-4.6C2.5 9.5 8 6.5 12 1.5z" /></symbol>
      <symbol id="s-H" viewBox="0 0 24 24"><path d="M12 21.5C5 15.6 2 12.2 2 8.3 2 5.2 4.3 3 7.1 3c1.9 0 3.7 1 4.9 2.8C13.2 4 15 3 16.9 3 19.7 3 22 5.2 22 8.3c0 3.9-3 7.3-10 13.2z" /></symbol>
      <symbol id="s-D" viewBox="0 0 24 24"><path d="M12 1.5C14 6 17.5 9.5 21.5 12 17.5 14.5 14 18 12 22.5 10 18 6.5 14.5 2.5 12 6.5 9.5 10 6 12 1.5z" /></symbol>
      <symbol id="s-C" viewBox="0 0 24 24"><path d="M12 2A4.8 4.8 0 0 0 8.4 10 4.8 4.8 0 1 0 10.7 16.6C10.8 19 10 20.6 8.3 22H15.7C14 20.6 13.2 19 13.3 16.6A4.8 4.8 0 1 0 15.6 10 4.8 4.8 0 0 0 12 2Z" /></symbol>
    </svg>
  );
}

export const Suit = ({ s }: { s: Card['suit'] }) => <svg className="suit" viewBox="0 0 24 24" aria-hidden="true"><use href={`#s-${s}`} /></svg>;

/** J/Q/K: a gold-framed bust drawn once and mirrored for the lower half, like a real deck. */
function FaceArt({ rank, suit }: { rank: number; suit: Card['suit'] }) {
  const half = (
    <g stroke="var(--outline)" strokeWidth="1.4" strokeLinejoin="round">
      <use href={`#s-${suit}`} x="5" y="5" width="20" height="20" fill="currentColor" stroke="none" />
      <path d="M16 68 Q50 36 84 68Z" fill="currentColor" />
      <path d="M30 56 Q50 44 70 56" fill="none" stroke="var(--gold)" strokeWidth="3" />
      {rank === 12 && <path d="M37 26 Q26 46 30 64 L40 56Z M63 26 Q74 46 70 64 L60 56Z" fill="var(--turq)" opacity=".85" />}
      <circle cx="50" cy="35" r="13" fill="#f3c9a0" />
      <circle cx="45" cy="34" r="1.4" fill="var(--outline)" stroke="none" /><circle cx="55" cy="34" r="1.4" fill="var(--outline)" stroke="none" />
      <path d="M46 41 Q50 44 54 41" fill="none" strokeWidth="1.2" />
      {rank === 13 && <>
        <path d="M39 38 Q50 58 61 38 Q50 46 39 38Z" fill="currentColor" />
        <path d="M36 25 L38 8 L44 17 L50 4 L56 17 L62 8 L64 25Z" fill="var(--gold)" />
        <circle cx="50" cy="14" r="3" fill="var(--turq)" />
        <rect x="79" y="26" width="3" height="34" fill="var(--gold)" /><circle cx="80.5" cy="24" r="4.5" fill="var(--pomegranate)" />
      </>}
      {rank === 12 && <>
        <path d="M36 27 Q50 11 64 27" fill="none" stroke="var(--gold)" strokeWidth="5" />
        <circle cx="50" cy="17" r="3" fill="var(--pomegranate)" />
        <circle cx="80" cy="50" r="6" fill="var(--pomegranate)" /><circle cx="80" cy="50" r="2" fill="var(--gold)" stroke="none" />
      </>}
      {rank === 11 && <>
        <path d="M36 28 Q50 4 64 28Z" fill="currentColor" />
        <rect x="36" y="25" width="28" height="4" fill="var(--gold)" />
        <path d="M60 18 Q76 10 74 0 Q68 8 58 13Z" fill="var(--turq)" />
        <path d="M78 62 L84 30" stroke="var(--gold)" strokeWidth="3" /><rect x="74" y="58" width="10" height="3" fill="var(--gold)" />
      </>}
    </g>
  );
  return (
    <svg className="faceart" viewBox="0 0 100 140" aria-hidden="true">
      <rect x="1" y="1" width="98" height="138" rx="7" fill="url(#fa-g)" stroke="currentColor" strokeWidth="2" />
      <path d="M99 1 V139 H1Z" fill="rgba(255,255,255,.18)" />
      <defs><linearGradient id="fa-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0a8" /><stop offset="1" stopColor="#ffd24a" /></linearGradient></defs>
      {half}
      <g transform="rotate(180 50 70)">{half}</g>
    </svg>
  );
}

export interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  deck?: string;
  back?: string;
  selected?: boolean;
  glow?: boolean;
  dim?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

export function CardView({ card, faceDown, deck = 'deck-classic', back = 'back-indigo', selected, glow, dim, onClick, style, className }: CardViewProps) {
  const cls = ['card', deck, selected && 'sel', glow && 'glow', dim && 'dim', onClick && 'tap', className].filter(Boolean).join(' ');
  if (faceDown || !card) {
    return <div className={`${cls} back`} style={{ ...backStyle(back), ...style }} onClick={onClick} />;
  }
  const g = GLYPH[card.suit];
  const r = RANK(card.rank);
  return (
    <div className={`${cls} s-${card.suit}`} style={style} onClick={onClick} role="img" aria-label={`${r} ${g}`}>
      <div className="idx tl"><b>{r}</b></div>
      <div className="idx br"><b>{r}</b></div>
      {card.rank >= 11 ? (
        <FaceArt rank={card.rank} suit={card.suit} />
      ) : (
        <div className="pips">
          {PIPS[card.rank].map(([x, y], i) => (
            <svg key={i} className={`pip${y > 50 ? ' flip' : ''}${card.rank === 1 ? ' ace' : card.rank >= 9 ? ' sm' : card.rank >= 6 ? ' md' : ''}`} viewBox="0 0 24 24" style={{ left: `${x}%`, top: `${y}%` }}><use href={`#s-${card.suit}`} /></svg>
          ))}
        </div>
      )}
    </div>
  );
}
