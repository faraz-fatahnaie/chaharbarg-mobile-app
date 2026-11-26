import type { Level } from '@chaharbarg/engine';

export type TimeOfDay = 'day' | 'dusk' | 'night';

export interface Arena {
  id: string;
  fa: string;
  en: string;
  place: string;
  placeEn: string;
  blurb: string;
  blurbEn: string;
  /** trophies needed to enter */
  minTrophies: number;
  /** entry fee in Shahi, paid by every player */
  fee: number;
  botLevel: Level;
  botPool: string[];
  ambient: 'wind' | 'water' | 'bazaar' | 'garden' | 'desert';
  felt: string;
  rim: string;
}

// Secular sites only (ruins, palaces, bridges, gardens, bazaars). Scenes show no mosque or shrine.
export const ARENAS: Arena[] = [
  { id: 'persepolis', fa: 'تخت جمشید', en: 'Persepolis', place: 'مرودشت، فارس', placeEn: 'Marvdasht, Fars',
    blurb: 'ستون‌های آپادانا زیر آفتاب جنوب', blurbEn: 'The Apadana columns under the southern sun',
    minTrophies: 0, fee: 20, botLevel: 'easy', botPool: ['kamran', 'mahtab', 'agha-mehdi'], ambient: 'wind', felt: '#7a5c3a', rim: '#3d2b17' },
  { id: 'si-o-se-pol', fa: 'سی‌وسه‌پل', en: 'Si-o-se-pol', place: 'اصفهان', placeEn: 'Isfahan',
    blurb: 'سی‌وسه چشمهٔ پل بر زاینده‌رود', blurbEn: 'Thirty-three arches over the Zayanderud',
    minTrophies: 100, fee: 50, botLevel: 'easy', botPool: ['golnar', 'siavash', 'khanom-goli'], ambient: 'water', felt: '#2f6f6a', rim: '#17393a' },
  { id: 'naqsh-e-jahan', fa: 'نقش جهان', en: 'Naqsh-e Jahan', place: 'اصفهان', placeEn: 'Isfahan',
    blurb: 'میدان بزرگ با ایوان عالی‌قاپو', blurbEn: 'The great square and the Ali Qapu portico',
    minTrophies: 250, fee: 100, botLevel: 'medium', botPool: ['parvaneh', 'nader', 'shirin'], ambient: 'bazaar', felt: '#2d5b8c', rim: '#15304d' },
  { id: 'yazd', fa: 'یزد و بادگیرها', en: 'Yazd Wind-towers', place: 'یزد', placeEn: 'Yazd',
    blurb: 'بادگیرهای شهر خشتی در کویر', blurbEn: 'Wind-catchers of the mud-brick desert city',
    minTrophies: 450, fee: 200, botLevel: 'medium', botPool: ['bahram', 'mahmonir', 'jamshid'], ambient: 'desert', felt: '#a8672c', rim: '#5a3412' },
  { id: 'chehel-sotoun', fa: 'چهل‌ستون', en: 'Chehel Sotoun', place: 'اصفهان', placeEn: 'Isfahan',
    blurb: 'تالار ستون‌دار و بازتابش در آب', blurbEn: 'The columned hall mirrored in its pool',
    minTrophies: 700, fee: 350, botLevel: 'medium', botPool: ['azadeh', 'siavash', 'nader'], ambient: 'garden', felt: '#7a2e3a', rim: '#3f141b' },
  { id: 'eram', fa: 'باغ ارم', en: 'Eram Garden', place: 'شیراز', placeEn: 'Shiraz',
    blurb: 'سرو و نارنج و عمارت قاجاری', blurbEn: 'Cypress, bitter orange and a Qajar pavilion',
    minTrophies: 1000, fee: 600, botLevel: 'hard', botPool: ['golnar', 'khanom-goli', 'kamran'], ambient: 'garden', felt: '#2f6b3f', rim: '#173a22' },
  { id: 'golestan', fa: 'کاخ گلستان', en: 'Golestan Palace', place: 'تهران', placeEn: 'Tehran',
    blurb: 'تخت مرمر و آینه‌کاری قاجار', blurbEn: 'The marble throne and Qajar mirror-work',
    minTrophies: 1400, fee: 1000, botLevel: 'hard', botPool: ['mahtab', 'bahram', 'shirin'], ambient: 'garden', felt: '#5a3a7a', rim: '#2b1b3d' },
  { id: 'tabriz-bazaar', fa: 'بازار تبریز', en: 'Tabriz Bazaar', place: 'تبریز', placeEn: 'Tabriz',
    blurb: 'تیمچه‌ها و طاق‌های آجری زیر نور', blurbEn: 'Brick vaults and caravanserai courtyards',
    minTrophies: 1900, fee: 1600, botLevel: 'hard', botPool: ['jamshid', 'parvaneh', 'agha-mehdi'], ambient: 'bazaar', felt: '#8c3b2a', rim: '#4a1d14' },
  { id: 'chogha-zanbil', fa: 'چغازنبیل', en: 'Chogha Zanbil', place: 'شوش، خوزستان', placeEn: 'Khuzestan',
    blurb: 'زیگورات ایلامی، کهن‌ترین بنای پلکانی', blurbEn: 'The Elamite ziggurat, a stepped ancient ruin',
    minTrophies: 2500, fee: 2500, botLevel: 'hard', botPool: ['nader', 'mahmonir', 'siavash'], ambient: 'desert', felt: '#8a7a3a', rim: '#463d17' },
  { id: 'arg-e-bam', fa: 'ارگ بم', en: 'Arg-e Bam', place: 'بم، کرمان', placeEn: 'Kerman',
    blurb: 'قلعهٔ خشتی در دل کویر لوت', blurbEn: 'The mud-brick citadel at the edge of the Lut',
    minTrophies: 3200, fee: 4000, botLevel: 'hard', botPool: ['kamran', 'azadeh', 'bahram'], ambient: 'desert', felt: '#b3702f', rim: '#5c3512' },
];

export const arenaById = (id: string) => ARENAS.find((a) => a.id === id) ?? ARENAS[0];

export function timeOfDayFor(d = new Date()): TimeOfDay {
  const h = d.getHours();
  return h >= 6 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night';
}
