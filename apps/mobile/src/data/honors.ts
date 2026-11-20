// Honors: non-cash titles worked out from level, wins and surs. They pay no currency and are never saved.
// All thresholds are [review]: a proposal for the person to confirm or change.
export type HonorKind = 'level' | 'wins' | 'surs';
export interface Honor { id: string; kind: HonorKind; at: number; fa: string; en: string }

export const HONORS: Honor[] = [
  { id: 'lvl-5', kind: 'level', at: 5, fa: 'شاگرد', en: 'Apprentice' },
  { id: 'lvl-10', kind: 'level', at: 10, fa: 'کارکشته', en: 'Seasoned' },
  { id: 'lvl-20', kind: 'level', at: 20, fa: 'استاد', en: 'Master' },
  { id: 'lvl-35', kind: 'level', at: 35, fa: 'استاد بزرگ', en: 'Grandmaster' },
  { id: 'lvl-50', kind: 'level', at: 50, fa: 'افسانه', en: 'Legend' },
  { id: 'wins-25', kind: 'wins', at: 25, fa: 'پیروزمند', en: 'Victor' },
  { id: 'wins-50', kind: 'wins', at: 50, fa: 'سردار', en: 'Commander' },
  { id: 'wins-100', kind: 'wins', at: 100, fa: 'قهرمان', en: 'Champion' },
  { id: 'wins-250', kind: 'wins', at: 250, fa: 'جهان‌پهلوان', en: 'World champion' },
  { id: 'wins-500', kind: 'wins', at: 500, fa: 'اسطوره', en: 'Myth' },
  { id: 'surs-10', kind: 'surs', at: 10, fa: 'سورزن', en: 'Sur maker' },
  { id: 'surs-25', kind: 'surs', at: 25, fa: 'سورباز', en: 'Sur player' },
  { id: 'surs-50', kind: 'surs', at: 50, fa: 'استاد سور', en: 'Sur master' },
  { id: 'surs-100', kind: 'surs', at: 100, fa: 'سلطان سور', en: 'Sur sultan' },
  { id: 'surs-250', kind: 'surs', at: 250, fa: 'افسانهٔ سور', en: 'Sur legend' },
];
