export type CosmeticKind = 'deck' | 'back' | 'table';

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  fa: string;
  en: string;
  /** price in Gohar; 0 = owned from the start */
  gohar: number;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'deck-classic', kind: 'deck', fa: 'کلاسیک', en: 'Classic', gohar: 0 },
  { id: 'deck-large', kind: 'deck', fa: 'درشت‌خط (دسترس‌پذیر)', en: 'Large index', gohar: 0 },
  { id: 'deck-ganjifeh', kind: 'deck', fa: 'الهام‌گرفته از گنجفه', en: 'Ganjifeh-inspired', gohar: 40 },
  { id: 'back-indigo', kind: 'back', fa: 'لاجورد', en: 'Lapis', gohar: 0 },
  { id: 'back-turquoise', kind: 'back', fa: 'فیروزه', en: 'Turquoise', gohar: 15 },
  { id: 'back-pomegranate', kind: 'back', fa: 'انار', en: 'Pomegranate', gohar: 15 },
  { id: 'back-eslimi', kind: 'back', fa: 'اسلیمی', en: 'Eslimi', gohar: 25 },
  { id: 'table-arena', kind: 'table', fa: 'رنگ آرنا', en: 'Arena colour', gohar: 0 },
  { id: 'table-green', kind: 'table', fa: 'سبز کلاسیک', en: 'Classic green', gohar: 0 },
  { id: 'table-lapis', kind: 'table', fa: 'لاجوردی', en: 'Lapis blue', gohar: 20 },
  { id: 'table-saffron', kind: 'table', fa: 'زعفرانی', en: 'Saffron', gohar: 20 },
];

export const TABLE_COLORS: Record<string, { felt: string; rim: string } | null> = {
  'table-arena': null,
  'table-green': { felt: '#2c6b43', rim: '#143823' },
  'table-lapis': { felt: '#25498a', rim: '#11264a' },
  'table-saffron': { felt: '#b8861f', rim: '#5d4309' },
};

export const BACK_STYLES: Record<string, { a: string; b: string }> = {
  'back-indigo': { a: '#1d3557', b: '#e9c46a' },
  'back-turquoise': { a: '#1b8a8a', b: '#f1faee' },
  'back-pomegranate': { a: '#a4161a', b: '#f4d58d' },
  'back-eslimi': { a: '#3d2b56', b: '#f2cc8f' },
};

/** Gohar packs sold through the local store (prices in Toman are placeholders to tune). */
export const GOHAR_PACKS = [
  { sku: 'gohar_20', gohar: 20, toman: 29000 },
  { sku: 'gohar_60', gohar: 60, toman: 79000 },
  { sku: 'gohar_150', gohar: 150, toman: 169000 },
];
