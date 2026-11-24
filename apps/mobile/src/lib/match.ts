import { DEFAULT_RULES, chooseMove, legalMoves, mulberry32, newMatch, targetOptions, type DealState, type Move, type Rng, type RulesConfig } from '@chaharbarg/engine';
import { timeOfDayFor, type Arena } from '../data/arenas';
import { BOTS, botById } from '../data/bots';
import { stageUnlocked, type Profile } from '../economy/economy';
import { arenaById } from '../data/arenas';
import { STAGES } from '../data/stages';
import type { MatchCtx, SeatInfo } from './store';

export function rulesFrom(p: Profile, players: 2 | 3 | 4): RulesConfig {
  const s = p.settings;
  return {
    ...DEFAULT_RULES,
    players,
    target: targetOptions(players)[s.target === 'long' ? 1 : 0],
    openingJack: s.openingJack,
    mustCapture: s.mustCapture,
    noSurInLastRound: s.noSurInLastRound,
    surSarbazPoints: s.surSarbazPoints,
  };
}

/** Saved matches from older builds may hold a target that is no longer allowed (62 / 100 / 'single'): map it to the nearest option. */
export function fixMatchTarget(c: MatchCtx): MatchCtx {
  const players = c.match.config.players;
  const opts = targetOptions(players);
  const old: unknown = c.match.config.target;
  if ((opts as readonly unknown[]).includes(old)) return c;
  const target = old === 100 ? opts[1] : old === 62 ? 65 : opts[0];
  return {
    ...c,
    match: {
      ...c.match,
      config: { ...c.match.config, target },
      deal: { ...c.match.deal, config: { ...c.match.deal.config, target } },
    },
  };
}

export function buildCtx(p: Profile, arena: Arena, players: 2 | 3 | 4, mode: 'bots' | 'pnp'): MatchCtx {
  const lang = p.settings.lang;
  const rng = mulberry32((Date.now() ^ 0x5bd1e995) >>> 0);
  let seats: SeatInfo[];
  if (mode === 'pnp') {
    seats = Array.from({ length: players }, (_, i) => ({
      name: lang === 'fa' ? `بازیکن ${'۱۲۳۴'[i]}` : `Player ${i + 1}`, botId: null, hue: [210, 20, 140, 290][i],
    }));
  } else {
    const pool = [...arena.botPool].sort(() => rng() - 0.5);
    seats = [
      { name: p.name || (lang === 'fa' ? 'شما' : 'You'), botId: null, hue: p.avatar.hue, glyph: p.avatar.glyph },
      ...pool.slice(0, players - 1).map((id) => ({ name: lang === 'fa' ? botById(id).fa : botById(id).en, botId: id, hue: botById(id).hue })),
    ];
  }
  const tod = p.settings.timeOfDay === 'auto' ? timeOfDayFor() : p.settings.timeOfDay;
  return {
    match: newMatch(rulesFrom(p, players), rng),
    arenaId: arena.id, seats, mode, paid: mode === 'bots', fee: mode === 'bots' ? arena.fee : 0, tod,
  };
}

/** A free 2-player match against the stage's arena bots; null if the stage is unknown or still locked. No fee, trophies or pot. */
export function stageCtx(p: Profile, stageId: string): MatchCtx | null {
  const st = STAGES.find((s) => s.id === stageId);
  if (!st || !stageUnlocked(p, stageId)) return null;
  return { ...buildCtx(p, arenaById(st.arenaId), 2, 'bots'), paid: false, fee: 0, stageId };
}

export const botCount = BOTS.length;

export const TURN_SECONDS = { off: 0, normal: 15, speed: 5 } as const;
export const MAX_TIMEOUTS = 3;

/** Move played for a player who ran out of time: the biggest capture if any exists, else the best drop. */
export function timeoutMove(deal: DealState, seat: number, rng: Rng): Move {
  const caps = legalMoves(deal, seat).filter((m) => m.captureIds.length);
  // ponytail: biggest capture by card count, not by points; rank by points if players complain
  if (caps.length) return caps.reduce((a, b) => (b.captureIds.length > a.captureIds.length ? b : a));
  return chooseMove(deal, seat, 'hard', rng);
}
