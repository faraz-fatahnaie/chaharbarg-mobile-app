import type { CSSProperties, KeyboardEvent } from 'react';
import type { Card } from '@chaharbarg/engine';
import { BACK_STYLES } from '../data/cosmetics';
import { useLang, type Lang } from '../lib/i18n';

const RANK = (r: number) => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));

const L = 28, C = 50, R = 72;
// classic playing-card layouts: side columns, optional centre column; neighbouring pip boxes touch only at their empty corners
const PIPS: Record<number, [number, number][]> = {
  1: [[C, 50]],
  2: [[C, 20], [C, 80]],
  3: [[C, 20], [C, 50], [C, 80]],
  4: [[L, 20], [R, 20], [L, 80], [R, 80]],
  5: [[L, 20], [R, 20], [C, 50], [L, 80], [R, 80]],
  6: [[L, 20], [R, 20], [L, 50], [R, 50], [L, 80], [R, 80]],
  7: [[L, 20], [R, 20], [C, 35], [L, 50], [R, 50], [L, 80], [R, 80]],
  8: [[L, 20], [R, 20], [C, 35], [L, 50], [R, 50], [C, 65], [L, 80], [R, 80]],
  // 9/10: outer rows at 23/77, not 16/84 — at 16% the corner pips sat under the "10" index (~2.5px overlap at 56px)
  9: [[L, 23], [R, 23], [L, 41], [R, 41], [C, 50], [L, 59], [R, 59], [L, 77], [R, 77]],
  10: [[L, 23], [R, 23], [C, 32], [L, 41], [R, 41], [L, 59], [R, 59], [C, 68], [L, 77], [R, 77]],
};

const RANK_WORD = {
  fa: ['', 'آس', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'سرباز', 'بی‌بی', 'شاه'],
  en: ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'],
};
const SUIT_WORD = { fa: { S: 'پیک', H: 'دل', D: 'خشت', C: 'خاج' }, en: { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' } };
/** Spoken name of a card, e.g. "ده خشت" / "Ten of Diamonds". */
export const cardName = (c: Card, lang: Lang) =>
  lang === 'fa' ? `${RANK_WORD.fa[c.rank]} ${SUIT_WORD.fa[c.suit]}` : `${RANK_WORD.en[c.rank]} of ${SUIT_WORD.en[c.suit]}`;

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

/** One hidden sprite with the four suit shapes and the face-card gradient; mount once at the app root. */
export function SuitSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs><linearGradient id="fa-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0a8" /><stop offset="1" stopColor="#ffd24a" /></linearGradient></defs>
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
    <g transform="translate(11 14) scale(.78)" stroke="var(--outline)" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M16 68 Q50 36 84 68Z" fill="var(--bust-robe)" />
      <path d="M30 56 Q50 44 70 56" fill="none" stroke="var(--gold)" strokeWidth="3" />
      {rank === 12 && <path d="M37 26 Q26 46 30 64 L40 56Z M63 26 Q74 46 70 64 L60 56Z" fill="var(--turq)" opacity=".85" />}
      <circle cx="50" cy="35" r="13" fill="#f3c9a0" />
      <circle cx="45" cy="34" r="1.4" fill="var(--outline)" stroke="none" /><circle cx="55" cy="34" r="1.4" fill="var(--outline)" stroke="none" />
      <path d="M46 41 Q50 44 54 41" fill="none" strokeWidth="1.2" />
      {rank === 13 && <>
        <path d="M39 38 Q50 58 61 38 Q50 46 39 38Z" fill="var(--bust-beard)" />
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
        <path d="M36 28 Q50 4 64 28Z" fill="var(--bust-hat)" />
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
      {half}
      <g transform="rotate(180 50 70)">{half}</g>
      <use href={`#s-${suit}`} x="5" y="5" width="30" height="30" fill="currentColor" stroke="var(--outline)" strokeWidth="1" />
      <use href={`#s-${suit}`} x="65" y="105" width="30" height="30" fill="currentColor" stroke="var(--outline)" strokeWidth="1" transform="rotate(180 80 120)" />
    </svg>
  );
}

export interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  deck?: string;
  back?: string;
  selected?: boolean;
  /** aria-pressed without the hand's lifted `.sel` look (e.g. a picked floor card); defaults to `selected` */
  pressed?: boolean;
  glow?: boolean;
  dim?: boolean;
  onClick?: () => void;
  /** Announced as aria-disabled on a tappable card (e.g. not your turn); does not block onClick. */
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function CardView({ card, faceDown, deck = 'deck-classic', back = 'back-indigo', selected, pressed = selected, glow, dim, onClick, disabled, style, className }: CardViewProps) {
  const { lang, tr } = useLang();
  const cls = ['card', deck, selected && 'sel', glow && 'glow', dim && 'dim', onClick && 'tap', className].filter(Boolean).join(' ');
  const label = faceDown || !card ? tr('برگ پنهان', 'Hidden card') : cardName(card, lang);
  // tappable cards are keyboard/screen-reader buttons; a <button> can't hold the card's block children
  const a11y = onClick
    ? { role: 'button', tabIndex: 0, 'aria-label': label, 'aria-pressed': pressed, 'aria-disabled': disabled || undefined, onClick,
        onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } }
    : { role: 'img', 'aria-label': label };
  if (faceDown || !card) {
    return <div className={`${cls} back`} style={{ ...backStyle(back), ...style }} {...a11y} />;
  }
  const r = RANK(card.rank);
  return (
    <div className={`${cls} s-${card.suit}`} style={style} {...a11y}>
      <div className="idx tl" aria-hidden="true"><b>{r}</b></div>
      <div className="idx br" aria-hidden="true"><b>{r}</b></div>
      {card.rank >= 11 ? (
        <FaceArt rank={card.rank} suit={card.suit} />
      ) : (
        <div className="pips">
          {PIPS[card.rank].map(([x, y], i) => (
            <svg key={i} className={`pip${y > 50 ? ' flip' : ''}${card.rank === 1 ? ' ace' : card.rank >= 9 ? ' sm' : card.rank >= 7 ? ' md' : card.rank <= 4 ? ' lg' : ''}`} viewBox="0 0 24 24" style={{ left: `${x}%`, top: `${y}%` }}><use href={`#s-${card.suit}`} /></svg>
          ))}
        </div>
      )}
    </div>
  );
}
