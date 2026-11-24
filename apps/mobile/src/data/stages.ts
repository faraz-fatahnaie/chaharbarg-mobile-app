import { ARENAS } from './arenas';

// Solo stages, beginner to advanced. Each reuses an arena (which fixes the bot level and bot pool).
// Prizes are one-time Shahi, paid on the first win only. All prizes are [review]: a proposal for the person to confirm.
export interface Stage { id: string; arenaId: string; prize: number }

const PRIZES = [100, 150, 250, 400, 600, 900, 1400, 2200, 3500, 5500];

// One stage per arena, in arena order (already easy → hard).
export const STAGES: Stage[] = ARENAS.map((a, i) => ({ id: `stage-${i + 1}`, arenaId: a.id, prize: PRIZES[i] }));

/** Saved progress: the ids of cleared stages. Prize is paid exactly when a stage is added, so "cleared" is also "prize claimed". */
export function cleanStages(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set(STAGES.map((s) => s.id));
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && known.has(x)))];
}
