import type { MatchState } from '@chaharbarg/engine';
import { HONORS, type Honor } from '../../data/honors';
import { checkAchievements, clearStage, honorUnlocked, settleMatch, todayKey, type MatchSummary } from '../../economy/economy';
import { loadMatch, saveMatch, update, type MatchCtx } from '../../lib/store';

/** Points per sur. The engine (score.ts) hard-codes it and RulesConfig has no field for it. */
export const SUR_POINTS = 5;

export interface Settled {
  outcome: 'win' | 'loss' | 'draw';
  payout: number; trophyDelta: number; xpGain: number; levelUps: number; unlocked: string[]; honors: Honor[]; paid: boolean; bonus: number; stagePrize: number;
}

/** What a finished match means for the human unit `hu`. */
export function matchSummary(ctx: MatchCtx, mc: MatchState, hu: number): MatchSummary {
  const outcome: Settled['outcome'] = mc.winner === null ? 'draw' : mc.winner === hu ? 'win' : 'loss';
  let surs = 0;
  let sarbaz = 0;
  for (const d of mc.history) { surs += d[hu].sur / SUR_POINTS; sarbaz += d[hu].sarbaz / mc.config.surSarbazPoints; }
  const margin = outcome === 'win' ? mc.scores[hu] - Math.max(...mc.scores.filter((_, u) => u !== hu)) : 0;
  return { arenaId: ctx.arenaId, players: mc.config.players, outcome, surs, sarbaz, paid: ctx.mode === 'bots' && ctx.paid, fee: ctx.fee, margin, target: mc.config.target };
}

/**
 * Settles a finished local match into the profile, then drops the resume save (only now, so a crash before this keeps
 * the finished match resumable and the fee is never lost). Returns null when `guard` says it already ran (double tap).
 */
export function settleLocal(guard: { current: boolean }, ctx: MatchCtx, mc: MatchState, hu: number, now = Date.now()): Settled | null {
  if (guard.current) return null;
  guard.current = true;
  const m = matchSummary(ctx, mc, hu);
  const r: Settled = { outcome: m.outcome, payout: 0, trophyDelta: 0, xpGain: 0, levelUps: 0, unlocked: [], honors: [], paid: m.paid, bonus: 0, stagePrize: 0 };
  if (ctx.mode === 'bots') {
    update((p) => {
      const s = settleMatch(p, m, todayKey(), now);
      Object.assign(r, { payout: s.payout, trophyDelta: s.trophyDelta, xpGain: s.xpGain, levelUps: s.levelUps });
      const a = checkAchievements(s.profile, now);
      r.unlocked = a.unlocked;
      r.honors = HONORS.filter((h) => !honorUnlocked(p, h) && honorUnlocked(a.profile, h));
      if (ctx.stageId && m.outcome === 'win') {
        const c = clearStage(a.profile, ctx.stageId, now);
        r.stagePrize = c.shahi - a.profile.shahi;
        return c;
      }
      return a.profile;
    });
  }
  saveMatch(null);
  return r;
}

/** Forfeit whatever match is saved right now: a paid match in progress is a quit loss; one that already ended settles with its real result. */
export function forfeitSaved(now = Date.now()) {
  const s = loadMatch();
  if (!s) return;
  if (s.match.phase === 'matchOver') { settleLocal({ current: false }, s, s.match, 0, now); return; }
  if (s.mode === 'bots' && s.paid) {
    update((q) => settleMatch(q, { ...matchSummary(s, s.match, 0), outcome: 'loss', surs: 0, sarbaz: 0, margin: 0, quit: true }, todayKey(), now).profile);
  }
  saveMatch(null);
}
