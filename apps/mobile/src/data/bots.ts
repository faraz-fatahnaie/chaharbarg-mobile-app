export interface BotPersona {
  id: string;
  fa: string;
  en: string;
  hue: number; // avatar colour
  /** avatar emblem, "e:<key>" from art/Avatar */
  glyph: string;
  trait: 'playful' | 'careful' | 'greedy';
  /** quick-chat lines: sur / bigCapture / losing / win */
  lines: { sur: string[]; big: string[]; losing: string[]; win: string[] };
}

const L = (sur: string[], big: string[], losing: string[], win: string[]) => ({ sur, big, losing, win });

export const BOTS: BotPersona[] = [
  { id: 'kamran', fa: 'کامران', en: 'Kamran', hue: 18, glyph: 'e:rostam', trait: 'greedy', lines: L(['سور!'], ['همه‌اش مال من!'], ['شانس نیاوردم'], ['حیف شد، دفعهٔ بعد']) },
  { id: 'mahtab', fa: 'مهتاب', en: 'Mahtab', hue: 210, glyph: 'e:khayyam', trait: 'careful', lines: L(['سور شد!'], ['حساب‌شده بود'], ['هنوز تموم نشده'], ['بازی قشنگی بود']) },
  { id: 'agha-mehdi', fa: 'آقا مهدی', en: 'Agha Mehdi', hue: 35, glyph: 'e:hafez', trait: 'playful', lines: L(['سور، قربونت!'], ['ای جان!'], ['این‌بار شانس با شما'], ['نوش جان']) },
  { id: 'golnar', fa: 'گلنار', en: 'Golnar', hue: 330, glyph: 'e:anar', trait: 'playful', lines: L(['سور! سور!'], ['آخ جون'], ['اوه اوه'], ['مبارکه!']) },
  { id: 'siavash', fa: 'سیاوش', en: 'Siavash', hue: 150, glyph: 'e:arash', trait: 'careful', lines: L(['سور زدم'], ['این رو می‌خواستم'], ['باید بیشتر حواسم باشه'], ['دست‌مریزاد']) },
  { id: 'khanom-goli', fa: 'خانم گلی', en: 'Khanom Goli', hue: 300, glyph: 'e:boteh', trait: 'greedy', lines: L(['سور، عزیزم!'], ['تا ته می‌برم'], ['ای بابا'], ['به سلامتی']) },
  { id: 'parvaneh', fa: 'پروانه', en: 'Parvaneh', hue: 270, glyph: 'e:simurgh', trait: 'playful', lines: L(['سور!'], ['هوراا'], ['نه بابا!'], ['خسته نباشی']) },
  { id: 'nader', fa: 'نادر', en: 'Nader', hue: 0, glyph: 'e:lionsun', trait: 'greedy', lines: L(['سور، تمیز!'], ['همه‌اش رو جمع کردم'], ['خوب بازی کردی'], ['بازی بعدی؟']) },
  { id: 'shirin', fa: 'شیرین', en: 'Shirin', hue: 190, glyph: 'e:siosepol', trait: 'careful', lines: L(['سور!'], ['به موقع بود'], ['صبر می‌کنم'], ['ممنون از بازی']) },
  { id: 'bahram', fa: 'بهرام', en: 'Bahram', hue: 95, glyph: 'e:cyrus', trait: 'careful', lines: L(['سور شد'], ['حساب‌کتاب داشت'], ['هوم...'], ['آفرین به تو']) },
  { id: 'mahmonir', fa: 'ماه‌منیر', en: 'Mahmonir', hue: 45, glyph: 'e:badgir', trait: 'playful', lines: L(['سور، به به!'], ['چه کاری!'], ['اِ، ای وای'], ['دستت درد نکنه']) },
  { id: 'jamshid', fa: 'جمشید', en: 'Jamshid', hue: 240, glyph: 'e:persepolis', trait: 'greedy', lines: L(['سور!'], ['این مال منه'], ['یه دست دیگه'], ['خوب بود']) },
  { id: 'azadeh', fa: 'آزاده', en: 'Azadeh', hue: 165, glyph: 'e:damavand', trait: 'careful', lines: L(['سور!'], ['درست سر وقت'], ['اشکال نداره'], ['تبریک!']) },
];

export const botById = (id: string) => BOTS.find((b) => b.id === id) ?? BOTS[0];

/** Quick-chat stickers the human can send (no free text in v1): art in art/Stickers, animation in stickers.css. */
export const EMOTES = [
  { k: 'anar', fa: 'آفرین!', en: 'Well done!' }, { k: 'crocus', fa: 'وای!', en: 'Wow!' }, { k: 'tea', fa: 'به سلامتی', en: 'Cheers' },
  { k: 'camel', fa: 'هوم...', en: 'Hmph' }, { k: 'bulbul', fa: 'قشنگ بود', en: 'Nice one' }, { k: 'coin', fa: 'دمت گرم', en: 'Thanks' },
  { k: 'rose', fa: 'ای وای', en: 'Oh no' }, { k: 'samovar', fa: 'فکر کن...', en: 'Think...' }, { k: 'cat', fa: 'عصبانی شدم', en: 'Grr' },
];
/** Minimum gap between two quick-chat messages from the player, in ms. */
export const CHAT_GAP_MS = 2500;
