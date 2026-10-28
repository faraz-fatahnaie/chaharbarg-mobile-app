export interface BotPersona {
  id: string;
  fa: string;
  en: string;
  hue: number; // avatar colour
  trait: 'playful' | 'careful' | 'greedy';
  /** quick-chat lines: sur / bigCapture / losing / win */
  lines: { sur: string[]; big: string[]; losing: string[]; win: string[] };
}

const L = (sur: string[], big: string[], losing: string[], win: string[]) => ({ sur, big, losing, win });

export const BOTS: BotPersona[] = [
  { id: 'kamran', fa: 'کامران', en: 'Kamran', hue: 18, trait: 'greedy', lines: L(['سور!'], ['همه‌اش مال من!'], ['شانس نیاوردم'], ['حیف شد، دفعهٔ بعد']) },
  { id: 'mahtab', fa: 'مهتاب', en: 'Mahtab', hue: 210, trait: 'careful', lines: L(['سور شد!'], ['حساب‌شده بود'], ['هنوز تموم نشده'], ['بازی قشنگی بود']) },
  { id: 'agha-mehdi', fa: 'آقا مهدی', en: 'Agha Mehdi', hue: 35, trait: 'playful', lines: L(['سور، قربونت!'], ['ای جان!'], ['این‌بار شانس با شما'], ['نوش جان']) },
  { id: 'golnar', fa: 'گلنار', en: 'Golnar', hue: 330, trait: 'playful', lines: L(['سور! سور!'], ['آخ جون'], ['اوه اوه'], ['مبارکه!']) },
  { id: 'siavash', fa: 'سیاوش', en: 'Siavash', hue: 150, trait: 'careful', lines: L(['سور زدم'], ['این رو می‌خواستم'], ['باید بیشتر حواسم باشه'], ['دست‌مریزاد']) },
  { id: 'khanom-goli', fa: 'خانم گلی', en: 'Khanom Goli', hue: 300, trait: 'greedy', lines: L(['سور، عزیزم!'], ['تا ته می‌برم'], ['ای بابا'], ['به سلامتی']) },
  { id: 'parvaneh', fa: 'پروانه', en: 'Parvaneh', hue: 270, trait: 'playful', lines: L(['سور!'], ['هوراا'], ['نه بابا!'], ['خسته نباشی']) },
  { id: 'nader', fa: 'نادر', en: 'Nader', hue: 0, trait: 'greedy', lines: L(['سور، تمیز!'], ['همه‌اش رو جمع کردم'], ['خوب بازی کردی'], ['بازی بعدی؟']) },
  { id: 'shirin', fa: 'شیرین', en: 'Shirin', hue: 190, trait: 'careful', lines: L(['سور!'], ['به موقع بود'], ['صبر می‌کنم'], ['ممنون از بازی']) },
  { id: 'bahram', fa: 'بهرام', en: 'Bahram', hue: 95, trait: 'careful', lines: L(['سور شد'], ['حساب‌کتاب داشت'], ['هوم...'], ['آفرین به تو']) },
  { id: 'mahmonir', fa: 'ماه‌منیر', en: 'Mahmonir', hue: 45, trait: 'playful', lines: L(['سور، به به!'], ['چه کاری!'], ['اِ، ای وای'], ['دستت درد نکنه']) },
  { id: 'jamshid', fa: 'جمشید', en: 'Jamshid', hue: 240, trait: 'greedy', lines: L(['سور!'], ['این مال منه'], ['یه دست دیگه'], ['خوب بود']) },
  { id: 'azadeh', fa: 'آزاده', en: 'Azadeh', hue: 165, trait: 'careful', lines: L(['سور!'], ['درست سر وقت'], ['اشکال نداره'], ['تبریک!']) },
];

export const botById = (id: string) => BOTS.find((b) => b.id === id) ?? BOTS[0];

/** Quick-chat stickers the human can send (no free text in v1). */
export const EMOTES = ['آفرین!', 'ای وای', 'سور!', 'قشنگ بود', 'فکر کن...', 'دمت گرم'];
