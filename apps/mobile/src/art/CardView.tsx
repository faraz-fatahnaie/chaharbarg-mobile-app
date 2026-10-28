import type { CSSProperties } from 'react';
import type { Card } from '@chaharbarg/engine';
import { BACK_STYLES } from '../data/cosmetics';

const GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const RANK = (r: number) => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

const L = 30, C = 50, R = 70;
const PIPS: Record<number, [number, number][]> = {
  1: [[C, 50]],
  2: [[C, 22], [C, 78]],
  3: [[C, 22], [C, 50], [C, 78]],
  4: [[L, 22], [R, 22], [L, 78], [R, 78]],
  5: [[L, 22], [R, 22], [C, 50], [L, 78], [R, 78]],
  6: [[L, 22], [R, 22], [L, 50], [R, 50], [L, 78], [R, 78]],
  7: [[L, 22], [R, 22], [C, 36], [L, 50], [R, 50], [L, 78], [R, 78]],
  8: [[L, 22], [R, 22], [C, 36], [L, 50], [R, 50], [C, 64], [L, 78], [R, 78]],
  9: [[L, 20], [R, 20], [L, 40], [R, 40], [C, 50], [L, 60], [R, 60], [L, 80], [R, 80]],
  10: [[L, 20], [R, 20], [C, 30], [L, 40], [R, 40], [L, 60], [R, 60], [C, 70], [L, 80], [R, 80]],
};

export function backStyle(id: string): CSSProperties {
  const { a, b } = BACK_STYLES[id] ?? BACK_STYLES['back-indigo'];
  const star = `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><path d='M11 1l2.4 7.2L21 11l-7.6 2.8L11 21l-2.4-7.2L1 11l7.6-2.8z' fill='${b}' opacity='.85'/></svg>`;
  return {
    backgroundColor: a,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(star)}")`,
    backgroundSize: id === 'back-eslimi' ? '16px 16px' : '22px 22px',
    boxShadow: `inset 0 0 0 3px ${a}, inset 0 0 0 4px ${b}, 0 2px 6px rgba(0,0,0,.35)`,
  };
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
  const cls = ['card', deck.replace('deck-', 'deck-'), selected && 'sel', glow && 'glow', dim && 'dim', onClick && 'tap', className].filter(Boolean).join(' ');
  if (faceDown || !card) {
    return <div className={`${cls} back`} style={{ ...backStyle(back), ...style }} onClick={onClick} />;
  }
  const red = card.suit === 'H' || card.suit === 'D';
  const g = GLYPH[card.suit];
  const face = card.rank >= 11;
  return (
    <div className={`${cls} ${red ? 'red' : 'blk'}`} style={style} onClick={onClick} role="img" aria-label={`${RANK(card.rank)} ${g}`}>
      <div className="idx tl"><b>{RANK(card.rank)}</b><i>{g}</i></div>
      <div className="idx br"><b>{RANK(card.rank)}</b><i>{g}</i></div>
      {face ? (
        <div className="faceart">
          <span className="crown">{card.rank === 13 ? '♛' : card.rank === 12 ? '❀' : '⚔'}</span>
          <span className="big">{RANK(card.rank)}</span>
          <span className="s">{g}</span>
        </div>
      ) : (
        <div className="pips">
          {PIPS[card.rank].map(([x, y], i) => (
            <span key={i} className={y > 50 ? 'pip flip' : 'pip'} style={{ left: `${x}%`, top: `${y}%` }}>{g}</span>
          ))}
        </div>
      )}
    </div>
  );
}
