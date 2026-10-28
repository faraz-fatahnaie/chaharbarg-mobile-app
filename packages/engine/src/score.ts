import { type DealState, unitCount, unitOf } from './deal';

export interface UnitScore {
  clubCount: number;
  clubs: number;
  aces: number;
  jacks: number;
  tenD: number;
  twoC: number;
  sur: number;
  sarbaz: number;
  total: number;
}

/** Score a finished (or in-progress) deal per unit: player (2/3p) or team (4p). */
export function scoreDeal(s: DealState): UnitScore[] {
  const n = s.config.players;
  const units: UnitScore[] = Array.from({ length: unitCount(n) }, () => ({
    clubCount: 0, clubs: 0, aces: 0, jacks: 0, tenD: 0, twoC: 0, sur: 0, sarbaz: 0, total: 0,
  }));
  s.piles.forEach((pile, seat) => {
    const u = units[unitOf(n, seat)];
    for (const c of pile) {
      if (c.suit === 'C') u.clubCount++;
      if (c.rank === 1) u.aces++;
      if (c.rank === 11) u.jacks++;
      if (c.id === 'D10') u.tenD += 3;
      if (c.id === 'C2') u.twoC += 2;
    }
    u.sur += s.surs[seat] * 5;
    u.sarbaz += s.sarbaz[seat] * s.config.surSarbazPoints;
  });

  // clubs (R19)
  const counts = units.map((u) => u.clubCount);
  const max = Math.max(...counts);
  const leaders = counts.flatMap((c, i) => (c === max ? [i] : []));
  if (n === 3) {
    if (leaders.length === 1) units[leaders[0]].clubs = 7;
    else if (leaders.length === 2) units[[0, 1, 2].find((i) => !leaders.includes(i))!].clubs = 7;
  } else if (max >= 7 && leaders.length === 1) {
    units[leaders[0]].clubs = 7;
  }

  for (const u of units) u.total = u.clubs + u.aces + u.jacks + u.tenD + u.twoC + u.sur + u.sarbaz;
  return units;
}
