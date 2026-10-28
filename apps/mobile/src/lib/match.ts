import { DEFAULT_RULES, mulberry32, newMatch, type RulesConfig } from '@chaharbarg/engine';
import { timeOfDayFor, type Arena } from '../data/arenas';
import { BOTS, botById } from '../data/bots';
import type { Profile } from '../economy/economy';
import type { MatchCtx, SeatInfo } from './store';

export function rulesFrom(p: Profile, players: 2 | 3 | 4): RulesConfig {
  const s = p.settings;
  return {
    ...DEFAULT_RULES,
    players,
    target: s.target,
    openingJack: s.openingJack,
    mustCapture: s.mustCapture,
    noSurInLastRound: s.noSurInLastRound,
    surCap: s.surCap ? 50 : null,
    surSarbazPoints: s.surSarbazPoints,
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
      { name: p.name || (lang === 'fa' ? 'شما' : 'You'), botId: null, hue: 45 },
      ...pool.slice(0, players - 1).map((id) => ({ name: lang === 'fa' ? botById(id).fa : botById(id).en, botId: id, hue: botById(id).hue })),
    ];
  }
  const tod = p.settings.timeOfDay === 'auto' ? timeOfDayFor() : p.settings.timeOfDay;
  return {
    match: newMatch(rulesFrom(p, players), rng),
    arenaId: arena.id, seats, mode, paid: mode === 'bots', fee: mode === 'bots' ? arena.fee : 0, tod,
  };
}

export const botCount = BOTS.length;
