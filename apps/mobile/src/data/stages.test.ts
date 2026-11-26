import { describe, expect, it } from 'vitest';
import { ARENAS, arenaById } from './arenas';
import { STAGES, cleanStages } from './stages';

const rank = { easy: 0, medium: 1, hard: 2 } as const;

describe('stages', () => {
  it('have one stage and a defined prize per arena', () => {
    expect(STAGES).toHaveLength(ARENAS.length);
    STAGES.forEach((s) => expect(Number.isFinite(s.prize)).toBe(true));
  });
  it('have unique ids, real arenas, positive rising prizes', () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
    STAGES.forEach((s, i) => {
      expect(ARENAS.some((a) => a.id === s.arenaId)).toBe(true);
      expect(s.prize).toBeGreaterThan(i ? STAGES[i - 1].prize : 0);
    });
  });
  it('run from beginner to advanced bots', () => {
    const lv = STAGES.map((s) => rank[arenaById(s.arenaId).botLevel as keyof typeof rank]);
    expect(lv).toEqual([...lv].sort((a, b) => a - b));
    expect(lv[0]).toBe(0);
    expect(lv.at(-1)).toBe(2);
  });
  it('cleanStages keeps only known unique ids', () => {
    expect(cleanStages(['stage-1', 'stage-1', 'x', 3])).toEqual(['stage-1']);
    expect(cleanStages(undefined)).toEqual([]);
  });
});
