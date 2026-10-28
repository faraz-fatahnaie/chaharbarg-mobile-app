export type Suit = 'S' | 'H' | 'D' | 'C'; // پیک، دل، خشت، گشنیز(خاج)
export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

/** rank: 1 = Ace, 2..10, 11 = Jack (سرباز), 12 = Queen (بی‌بی), 13 = King (شاه) */
export interface Card {
  id: string;
  suit: Suit;
  rank: number;
}

export const makeCard = (suit: Suit, rank: number): Card => ({ id: `${suit}${rank}`, suit, rank });
export const parseCard = (id: string): Card => makeCard(id[0] as Suit, Number(id.slice(1)));

export const newDeck = (): Card[] => SUITS.flatMap((s) => Array.from({ length: 13 }, (_, i) => makeCard(s, i + 1)));

export const isJack = (c: Card) => c.rank === 11;
export const isQueen = (c: Card) => c.rank === 12;
export const isKing = (c: Card) => c.rank === 13;
export const isNumeric = (c: Card) => c.rank <= 10;

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
