import { describe, expect, it } from 'vitest';
import { arenaById, ARENAS } from '../data/arenas';
import { sha256 } from './sha256';
import {
  AD_COOLDOWN_MS, AD_DAILY_CAP, AD_REWARD, adStatus, applyDelta, buyCosmetic, canClaimRelief, canEnter, checkAchievements,
  claimChallenge, claimLogin, claimRelief, createProfile, dailyChallenges, equip, grantAd, grantPurchase, levelOf,
  loginPreview, payFee, settleMatch, verifyProfile, DEFAULT_SETTINGS, migrateSettings, type MatchSummary,
  LEVEL_GOHAR, bigMarginAt, matchXp, xpForLevel, xpShare, forfeitXpLoss, XP_QUIT,
  honorUnlocked, currentTitle, stageUnlocked, clearStage,
} from './economy';
import { HONORS } from '../data/honors';
import { STAGES } from '../data/stages';

const NOW = 1_700_000_000_000;
const win = (over: Partial<MatchSummary> = {}): MatchSummary => ({ arenaId: 'persepolis', players: 2, outcome: 'win', surs: 0, sarbaz: 0, paid: true, fee: 20, margin: 0, target: 62, ...over });

describe('sha256', () => {
  it('matches known vectors', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('a'.repeat(100))).toBe('2816597888e4a0d3a36b82b83316ab32680eb8f00f8cd3b904d681246d285a0e');
  });
});

describe('wallet + ledger', () => {
  it('starts with 500 Shahi, 0 Gohar, valid ledger', () => {
    const p = createProfile(NOW);
    expect([p.shahi, p.gohar]).toEqual([500, 0]);
    expect(verifyProfile(p, NOW)).toBe(p);
  });
  it('refuses to overspend', () => {
    expect(() => applyDelta(createProfile(NOW), -501, 0, 'x', NOW)).toThrow();
    expect(() => applyDelta(createProfile(NOW), 0, -1, 'x', NOW)).toThrow();
  });
  it('detects an edited balance and rolls back', () => {
    let p = createProfile(NOW);
    p = applyDelta(p, 100, 0, 'win', NOW + 1);
    const cheated = { ...p, shahi: 999999, gohar: 500 };
    const fixed = verifyProfile(cheated, NOW + 2);
    expect(fixed.shahi).toBe(600);
    expect(fixed.gohar).toBe(0);
    expect(fixed.tampered).toBe(1);
  });
  it('detects an edited ledger entry', () => {
    let p = createProfile(NOW);
    p = applyDelta(p, 50, 0, 'a', NOW + 1);
    p = applyDelta(p, 50, 0, 'b', NOW + 2);
    const ledger = p.ledger.map((e, i) => (i === 2 ? { ...e, dS: 9999, s: 10599 } : e));
    const fixed = verifyProfile({ ...p, shahi: 10599, ledger }, NOW + 3);
    expect(fixed.shahi).toBe(550); // last valid entry
    expect(fixed.tampered).toBe(1);
  });
  it('survives ledger truncation to 40 entries', () => {
    let p = createProfile(NOW);
    for (let i = 0; i < 100; i++) p = applyDelta(p, 1, 0, 'tick', NOW + i);
    expect(p.ledger.length).toBe(40);
    expect(verifyProfile(p, NOW)).toBe(p);
  });
});

describe('arena entry and match settlement', () => {
  it('needs trophies and enough Shahi', () => {
    const p = createProfile(NOW);
    expect(canEnter(p, arenaById('persepolis'))).toBe(true);
    expect(canEnter(p, arenaById('naqsh-e-jahan'))).toBe(false); // 250 trophies
    expect(canEnter({ ...p, shahi: 10 }, arenaById('persepolis'))).toBe(false);
  });
  it('2p win pays 1.8x fee (10% rake); loss loses only the fee', () => {
    let p = payFee(createProfile(NOW), arenaById('persepolis'), NOW);
    expect(p.shahi).toBe(480);
    const r = settleMatch(p, win(), '2026-10-28', NOW);
    expect(r.payout).toBe(36);
    expect(r.profile.shahi).toBe(516);
    expect(r.trophyDelta).toBe(25);
    const l = settleMatch(p, win({ outcome: 'loss' }), '2026-10-28', NOW);
    expect(l.payout).toBe(0);
    expect(l.profile.shahi).toBe(480);
    expect(l.trophyDelta).toBe(0); // can't go below zero trophies
  });
  it('3p winner takes 2.7x; 4p each winner gets 1.8x', () => {
    expect(settleMatch(createProfile(NOW), win({ players: 3 }), 'd', NOW).payout).toBe(54);
    expect(settleMatch(createProfile(NOW), win({ players: 4 }), 'd', NOW).payout).toBe(36);
  });
  it('draw refunds; free (pass-and-play) games touch no coins or trophies', () => {
    expect(settleMatch(createProfile(NOW), win({ outcome: 'draw' }), 'd', NOW).payout).toBe(20);
    const r = settleMatch(createProfile(NOW), win({ paid: false }), 'd', NOW);
    expect([r.payout, r.trophyDelta, r.profile.shahi]).toEqual([0, 0, 500]);
  });
  it('updates stats, streaks and levels (Gohar on level-up)', () => {
    let p = createProfile(NOW);
    for (let i = 0; i < 3; i++) p = settleMatch(p, win({ surs: 1 }), 'd', NOW).profile;
    expect(p.stats).toMatchObject({ games: 3, wins: 3, streak: 3, bestStreak: 3, surs: 3 });
    expect(p.xp).toBe(3 * (20 + 30 + 5));
    expect(levelOf(p.xp)).toBe(2);
    expect(p.gohar).toBe(2);
    p = settleMatch(p, win({ outcome: 'loss' }), 'd', NOW).profile;
    expect([p.stats.streak, p.stats.bestStreak]).toEqual([0, 3]);
  });
  it('arena fees rise monotonically and unlock thresholds too', () => {
    for (let i = 1; i < ARENAS.length; i++) {
      expect(ARENAS[i].fee).toBeGreaterThan(ARENAS[i - 1].fee);
      expect(ARENAS[i].minTrophies).toBeGreaterThan(ARENAS[i - 1].minTrophies);
    }
  });
});

describe('single-deal XP (F-051)', () => {
  const single = (over: Partial<MatchSummary> = {}) => win({ target: 'single', ...over });
  it('single-deal loss and win earn 0.2x, rounded', () => {
    expect(settleMatch(createProfile(NOW), single({ outcome: 'loss' }), 'd', NOW).xpGain).toBe(4);
    expect(settleMatch(createProfile(NOW), single({ surs: 1, sarbaz: 1 }), 'd', NOW).xpGain).toBe(13);
  });
  it('62 and 100 matches are unchanged', () => {
    expect(settleMatch(createProfile(NOW), win({ surs: 1 }), 'd', NOW).xpGain).toBe(55);
    expect(settleMatch(createProfile(NOW), win({ surs: 1, target: 100 }), 'd', NOW).xpGain).toBe(55);
  });
  it('xpShare', () => {
    expect([xpShare(35), xpShare(100), xpShare('single')]).toEqual([1, 1, 0.2]);
  });
  it('the forfeit penalty is not scaled', () => {
    expect(matchXp(single({ quit: true }))).toBe(matchXp(win({ quit: true })));
  });
  it('a single deal cannot buy a level', () => {
    const p = { ...createProfile(NOW), xp: 90 };
    const r = settleMatch(p, single({ outcome: 'loss' }), 'd', NOW);
    expect([r.profile.xp, r.levelUps, r.profile.gohar]).toEqual([94, 0, p.gohar]);
    expect(settleMatch(p, win({ outcome: 'loss' }), 'd', NOW).levelUps).toBe(1);
  });
});

describe('levels and XP', () => {
  it('curve boundaries', () => {
    expect([0, 99].map(levelOf)).toEqual([1, 1]);
    expect([100, 219].map(levelOf)).toEqual([2, 2]);
    expect(levelOf(220)).toBe(3);
    expect(xpForLevel(1)).toBe(0);
  });
  it('is unbounded and exact at large XP', () => {
    for (const xp of [1e6, 1e9, 1e12]) {
      const L = levelOf(xp);
      expect(xpForLevel(L)).toBeLessThanOrEqual(xp);
      expect(xp).toBeLessThan(xpForLevel(L + 1));
    }
    expect(levelOf(xpForLevel(1000))).toBe(1000);
    expect(levelOf(xpForLevel(1000) - 1)).toBe(999);
    expect(xpForLevel(5001)).toBeGreaterThan(xpForLevel(5000));
  });
  it('bad input gives level 1', () => {
    expect(levelOf(-5)).toBe(1);
    expect(levelOf(NaN)).toBe(1);
  });
  it('bigMarginAt', () => {
    expect([35, 62, 65, 100, 112, 'single'].map((t) => bigMarginAt(t as number | 'single'))).toEqual([9, 16, 17, 25, 28, 10]);
  });
  it('matchXp', () => {
    expect(matchXp(win({ outcome: 'loss' }))).toBe(20);
    expect(matchXp(win({ outcome: 'draw' }))).toBe(20);
    expect(matchXp(win({ margin: 15 }))).toBe(50);
    expect(matchXp(win({ margin: 16 }))).toBe(70);
    expect(matchXp(win({ outcome: 'loss', margin: 30 }))).toBe(20);
    expect(matchXp(win({ outcome: 'loss', surs: 1, sarbaz: 1 }))).toBe(35);
    expect(matchXp(win({ outcome: 'loss', surs: 20 }))).toBe(70);
  });
  it('forfeit never goes below 0 or below the current level start', () => {
    const fresh = settleMatch(createProfile(NOW), win({ outcome: 'loss', quit: true }), 'd', NOW);
    expect([fresh.profile.xp, fresh.xpGain, fresh.profile.gohar, levelOf(fresh.profile.xp)]).toEqual([0, 0, 0, 1]);
    const a = settleMatch({ ...createProfile(NOW), xp: 650 }, win({ outcome: 'loss', quit: true }), 'd', NOW);
    expect([a.profile.xp, a.xpGain]).toEqual([610, -40]);
    const b = settleMatch({ ...createProfile(NOW), xp: 530 }, win({ outcome: 'loss', quit: true }), 'd', NOW);
    expect([b.profile.xp, b.levelUps]).toEqual([520, 0]);
    const c = settleMatch({ ...createProfile(NOW), xp: 650 }, win({ quit: true, surs: 3, margin: 99 }), 'd', NOW);
    expect(c.xpGain).toBeLessThanOrEqual(0);
  });
  it('forfeitXpLoss: full penalty mid-level, clamped near level start', () => {
    expect(forfeitXpLoss(650)).toBe(XP_QUIT);
    expect(forfeitXpLoss(530)).toBe(10);
  });
  it('forfeitXpLoss: nothing to lose at 0 or at a level start', () => {
    expect(forfeitXpLoss(0)).toBe(0);
    expect(forfeitXpLoss(xpForLevel(5))).toBe(0);
  });
  it('forfeitXpLoss matches the real settlement', () => {
    for (const xp of [0, 99, 530, 650, 5000]) {
      const r = settleMatch({ ...createProfile(NOW), xp }, win({ outcome: 'loss', quit: true }), 'd', NOW);
      expect(forfeitXpLoss(xp)).toBe(0 - r.xpGain);
    }
  });
  it('level-up Gohar on the new curve', () => {
    const r = settleMatch({ ...createProfile(NOW), xp: 210 }, win(), 'd', NOW);
    expect(levelOf(r.profile.xp)).toBe(3);
    expect(r.profile.gohar).toBe(LEVEL_GOHAR);
  });
});

describe('daily login, ads, relief, challenges', () => {
  it('login streak continues on consecutive days and resets after a gap', () => {
    let p = createProfile(NOW);
    let r = claimLogin(p, '2026-10-28', NOW);
    expect(r.shahi).toBe(40);
    p = r.profile;
    expect(claimLogin(p, '2026-10-28', NOW).shahi).toBe(0); // same day: nothing
    r = claimLogin(p, '2026-10-29', NOW);
    expect(r.shahi).toBe(60);
    expect(loginPreview(r.profile, '2026-10-31').streak).toBe(1);
    let q = r.profile;
    for (const d of ['30', '31']) q = claimLogin(q, `2026-10-${d}`, NOW).profile;
    expect(q.login.streak).toBe(4);
  });
  it('day 7 gives Gohar', () => {
    let p = createProfile(NOW);
    let last = { shahi: 0, gohar: 0 };
    for (let d = 1; d <= 7; d++) { const r = claimLogin(p, `2026-11-0${d}`, NOW); p = r.profile; last = r; }
    expect(last.gohar).toBe(3);
    expect(p.gohar).toBe(3);
  });
  it('ads: cooldown and daily cap', () => {
    let p = createProfile(NOW);
    expect(adStatus(p, NOW, 'd').ok).toBe(true);
    p = grantAd(p, 'd', NOW);
    expect(p.shahi).toBe(500 + AD_REWARD);
    expect(adStatus(p, NOW + 1000, 'd').ok).toBe(false);
    expect(() => grantAd(p, 'd', NOW + 1000)).toThrow();
    let t = NOW;
    for (let i = 1; i < AD_DAILY_CAP; i++) { t += AD_COOLDOWN_MS; p = grantAd(p, 'd', t); }
    expect(adStatus(p, t + AD_COOLDOWN_MS, 'd').ok).toBe(false);
    expect(adStatus(p, t + AD_COOLDOWN_MS, 'd2').ok).toBe(true); // next day
  });
  it('relief gift only when nearly broke, then every 3 hours', () => {
    const rich = createProfile(NOW);
    expect(canClaimRelief(rich, NOW)).toBe(false);
    let poor = { ...rich, shahi: 5 };
    poor = applyDelta({ ...rich }, -495, 0, 'spend', NOW);
    expect(canClaimRelief(poor, NOW)).toBe(true);
    const r = claimRelief(poor, NOW);
    expect(r.shahi).toBe(105);
    expect(canClaimRelief({ ...r, shahi: 0 }, NOW + 1000)).toBe(false);
  });
  it('a forfeit does not advance the games challenge but still records the loss', () => {
    const today = '2026-10-28';
    const p = settleMatch(createProfile(NOW), win({ outcome: 'loss', quit: true }), today, NOW).profile;
    expect(p.daily.progress.games ?? 0).toBe(0);
    expect(p.stats.games).toBe(1);
    expect(p.stats.losses).toBe(1);
    expect(p.stats.streak).toBe(0);
  });

  it('a completed game still counts toward the games challenge', () => {
    const today = '2026-10-28';
    expect(settleMatch(createProfile(NOW), win({ outcome: 'loss' }), today, NOW).profile.daily.progress.games).toBe(1);
    expect(settleMatch(createProfile(NOW), win(), today, NOW).profile.daily.progress.games).toBe(1);
  });

  it('forfeits cannot be used to claim the games challenge', () => {
    const today = '2026-10-28';
    const c = dailyChallenges(today);
    let p = createProfile(NOW);
    for (let i = 0; i < c[0].goal; i++) p = settleMatch(p, win({ outcome: 'loss', quit: true }), today, NOW).profile;
    const after = claimChallenge(p, c[0].id, today, NOW);
    expect(after.shahi).toBe(p.shahi);
    expect(after.daily.claimed).not.toContain(c[0].id);
  });

  it('challenges are deterministic per day and claimable once', () => {
    const c = dailyChallenges('2026-10-28');
    expect(c.map((x) => x.kind)).toEqual(['games', 'wins', 'surs']);
    expect(dailyChallenges('2026-10-28')).toEqual(c);
    let p = createProfile(NOW);
    expect(claimChallenge(p, c[0].id, '2026-10-28', NOW)).toMatchObject({ shahi: 500 }); // no progress yet
    for (let i = 0; i < c[0].goal; i++) p = settleMatch(p, win({ paid: false }), '2026-10-28', NOW).profile;
    const claimed = claimChallenge(p, c[0].id, '2026-10-28', NOW);
    expect(claimed.shahi).toBe(p.shahi + c[0].shahi);
    expect(claimChallenge(claimed, c[0].id, '2026-10-28', NOW).shahi).toBe(claimed.shahi);
    // new day resets progress
    expect(claimChallenge(claimed, c[0].id, '2026-10-29', NOW).daily.progress).toEqual({});
  });
  it('achievements pay Gohar once', () => {
    let p = createProfile(NOW);
    p = settleMatch(p, win({ surs: 1 }), 'd', NOW).profile;
    const a = checkAchievements(p, NOW);
    expect(a.unlocked.sort()).toEqual(['first-sur', 'first-win']);
    expect(checkAchievements(a.profile, NOW).unlocked).toEqual([]);
    expect(a.profile.gohar).toBe(p.gohar + 5);
  });
});

describe('shop and purchases', () => {
  it('buys with Gohar only, equips only owned items', () => {
    let p = createProfile(NOW);
    expect(() => buyCosmetic(p, 'deck-ganjifeh', NOW)).toThrow(); // 0 Gohar
    expect(equip(p, 'deck-ganjifeh').equipped.deck).toBe('deck-classic');
    p = grantPurchase(p, 'gohar_60', 'tok-1', NOW);
    p = buyCosmetic(p, 'deck-ganjifeh', NOW);
    expect(p.gohar).toBe(20);
    expect(equip(p, 'deck-ganjifeh').equipped.deck).toBe('deck-ganjifeh');
    expect(buyCosmetic(p, 'deck-ganjifeh', NOW)).toBe(p); // already owned: no double charge
  });
  it('a purchase token is granted once (restore / replay safe)', () => {
    let p = grantPurchase(createProfile(NOW), 'gohar_20', 'tok-A', NOW);
    p = grantPurchase(p, 'gohar_20', 'tok-A', NOW + 1);
    expect(p.gohar).toBe(20);
    expect(grantPurchase(p, 'bogus', 'tok-B', NOW).gohar).toBe(20);
  });
});

describe('settings migration', () => {
  it('splits an old sound=false into music and effects', () => {
    const s = migrateSettings({ sound: false, lang: 'en' });
    expect(s).toMatchObject({ music: false, effects: false, notifications: false, lang: 'en' });
    expect('sound' in s).toBe(false);
  });
  it('splits sound=true', () => {
    expect(migrateSettings({ sound: true })).toMatchObject({ music: true, effects: true });
  });
  it('keeps music and effects independent', () => {
    expect(migrateSettings({ music: false, effects: true })).toMatchObject({ music: false, effects: true });
  });
  it('returns defaults for non-objects', () => {
    for (const raw of [undefined, null, 'garbage']) expect(migrateSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });
  it('rejects non-boolean values', () => {
    expect(migrateSettings({ music: 'yes' }).music).toBe(true);
  });
  it('new profiles have notifications off', () => {
    expect(createProfile(NOW).settings.notifications).toBe(false);
  });
});

describe('honors', () => {
  const base = () => createProfile(NOW);
  const withStats = (over: Record<string, unknown>) => { const b = base(); return { ...b, stats: { ...b.stats, ...over } }; };
  const maxed = () => ({ ...withStats({ wins: 1000, surs: 1000 }), xp: xpForLevel(60) });

  it('unlocks exactly at each threshold', () => {
    for (const h of HONORS) {
      const mk = (v: number) => h.kind === 'level' ? { ...base(), xp: xpForLevel(v) } : withStats({ [h.kind]: v });
      expect(honorUnlocked(mk(h.at - 1), h), h.id).toBe(false);
      expect(honorUnlocked(mk(h.at), h), h.id).toBe(true);
    }
  });
  it('title is the highest level honor', () => {
    expect(currentTitle({ ...base(), xp: xpForLevel(5) - 1 })).toBeNull();
    expect(currentTitle({ ...base(), xp: xpForLevel(5) })?.id).toBe('lvl-5');
    expect(currentTitle({ ...base(), xp: xpForLevel(60) })?.id).toBe('lvl-50');
    expect(currentTitle(withStats({ wins: 500 }))).toBeNull();
  });
  it('pays nothing and is not an achievement', () => {
    const p = maxed();
    const before = JSON.stringify([p.shahi, p.gohar, p.ledger, p.achievements]);
    HONORS.forEach((h) => honorUnlocked(p, h));
    currentTitle(p);
    expect(JSON.stringify([p.shahi, p.gohar, p.ledger, p.achievements])).toBe(before);
    const ids = HONORS.map((h) => h.id);
    expect(checkAchievements(p, NOW).unlocked.some((id: string) => ids.includes(id))).toBe(false);
  });
  it('existing player keeps earned honors', () => {
    const p = withStats({ wins: 120, surs: 30 });
    const got = HONORS.filter((h) => honorUnlocked(p, h)).map((h) => h.id);
    expect(got).toEqual(expect.arrayContaining(['wins-25', 'wins-50', 'wins-100', 'surs-10', 'surs-25']));
    expect(got).not.toContain('wins-250');
    expect(got).not.toContain('surs-50');
  });
  it('bad saved data locks everything and does not throw', () => {
    const bad = [
      { ...withStats({ wins: undefined, surs: 'x' }), xp: NaN },
      { ...withStats({ wins: NaN, surs: -3 }), xp: NaN },
      { ...withStats({ wins: -3 }), xp: NaN },
      { ...base(), stats: undefined, xp: NaN },
    ] as any[];
    for (const p of bad) {
      expect(HONORS.some((h) => honorUnlocked(p, h))).toBe(false);
      expect(currentTitle(p)).toBeNull();
    }
  });
  it('data is sane', () => {
    expect(new Set(HONORS.map((h) => h.id)).size).toBe(HONORS.length);
    for (const h of HONORS) {
      expect(Number.isInteger(h.at) && h.at > 0).toBe(true);
      expect(h.fa && h.en).toBeTruthy();
    }
    for (const k of ['level', 'wins', 'surs']) {
      const at = HONORS.filter((h) => h.kind === k).map((h) => h.at);
      expect(at).toEqual([...at].sort((a, b) => a - b));
      expect(new Set(at).size).toBe(at.length);
    }
  });
});

describe('solo stages', () => {
  it('only the first stage is open at the start; clearing one opens the next', () => {
    let p = createProfile(NOW);
    expect(STAGES.map((s) => stageUnlocked(p, s.id)).filter(Boolean)).toHaveLength(1);
    p = clearStage(p, STAGES[0].id, NOW);
    expect(stageUnlocked(p, STAGES[1].id)).toBe(true);
    expect(stageUnlocked(p, STAGES[2].id)).toBe(false);
    expect(stageUnlocked(p, 'nope')).toBe(false);
  });
  it('pays the prize once, to the ledger', () => {
    const p0 = createProfile(NOW);
    const p1 = clearStage(p0, STAGES[0].id, NOW);
    expect(p1.shahi).toBe(p0.shahi + STAGES[0].prize);
    expect(p1.stages).toEqual([STAGES[0].id]);
    expect(clearStage(p1, STAGES[0].id, NOW)).toBe(p1);
    expect(verifyProfile(p1, NOW)).toBe(p1);
  });
  it('pays nothing for a locked or unknown stage', () => {
    const p = createProfile(NOW);
    expect(clearStage(p, STAGES[3].id, NOW)).toBe(p);
    expect(clearStage(p, 'nope', NOW)).toBe(p);
  });
});

describe('stats by player count', () => {
  it('splits games, wins and surs per player count', () => {
    let p = createProfile(NOW);
    p = settleMatch(p, win({ players: 2, surs: 2 }), '2025-01-01', NOW).profile;
    p = settleMatch(p, win({ players: 2, outcome: 'loss', surs: 1 }), '2025-01-01', NOW).profile;
    p = settleMatch(p, win({ players: 4, surs: 3 }), '2025-01-01', NOW).profile;
    expect(p.stats.byPlayers).toEqual({ 2: { games: 2, wins: 1, surs: 3 }, 4: { games: 1, wins: 1, surs: 3 } });
    expect(p.stats.games).toBe(3);
  });
});

describe('turnTimer setting', () => {
  it('defaults to off and rejects bad saved values', () => {
    expect(migrateSettings({}).turnTimer).toBe('off');
    expect(migrateSettings({ turnTimer: 'speed' }).turnTimer).toBe('speed');
    expect(migrateSettings({ turnTimer: 99 }).turnTimer).toBe('off');
  });
});
