import { ARENAS } from './arenas';

// Solo stages, beginner to advanced. Each reuses an arena (which fixes the bot level and bot pool).
// Prizes are one-time Shahi, paid on the first win only. All prizes are [review]: a proposal for the person to confirm.
export interface Stage { id: string; arenaId: string; prize: number; tip?: { fa: string; en: string } }

const PRIZES = [100, 150, 250, 400, 600, 900, 1400, 2200, 3500, 5500];

// Guided tips for the first stages.
const TIPS = [
  { fa: 'برگ را بزن و دوباره بزن تا برداشته شود. جمع ۱۱ را بساز.', en: 'Tap a card, tap again to play it. Make eleven.' },
  { fa: 'سرباز همهٔ زمین را می‌برد، جز بی‌بی و شاه. برای سور آن را نگه دار.', en: 'A Jack sweeps the floor except Queens and Kings. Save it for a sur.' },
  { fa: 'خاج‌ها و ده خشت را بشمار؛ بیشترین برگ ارزشمند برنده است.', en: 'Count clubs and the 10♦: the most valuable cards win.' },
];

// One stage per arena, in arena order (already easy → hard).
export const STAGES: Stage[] = ARENAS.map((a, i) => ({ id: `stage-${i + 1}`, arenaId: a.id, prize: PRIZES[i], tip: TIPS[i] }));

/** Saved progress: the ids of cleared stages. Prize is paid exactly when a stage is added, so "cleared" is also "prize claimed". */
export function cleanStages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set(STAGES.map((s) => s.id));
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && known.has(x)))];
}
