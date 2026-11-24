import { useEffect, useMemo, useRef, useState } from 'react';
import {
  captureOptions, chooseMove, matchNextDeal, matchPlay, mulberry32, unitOf, unitCount,
  type Card, type MatchState,
} from '@chaharbarg/engine';
import { CardView } from '../art/CardView';
import { Scoreboard, scoreRows, type ScoreUnit } from './Scoreboard';
import { Scene } from '../art/Scene';
import { arenaById } from '../data/arenas';
import { ACH_NAMES } from '../data/achievements';
import { botById, CHAT_GAP_MS, EMOTES } from '../data/bots';
import { TABLE_COLORS } from '../data/cosmetics';
import { adStatus, checkAchievements, clearStage, grantAd, honorUnlocked, LEVEL_GOHAR, settleMatch, todayKey } from '../economy/economy';
import { STAGES } from '../data/stages';
import { HONORS, type Honor } from '../data/honors';
import { useLang } from '../lib/i18n';
import type { RoomView } from '../lib/online';
import { MAX_TIMEOUTS, TURN_SECONDS, timeoutMove } from '../lib/match';
import { adProvider } from '../lib/services';
import { sfx, startAmbient, stopAmbient } from '../lib/sound';
import { saveMatch, update, useProfile, type MatchCtx } from '../lib/store';

const FAST = (!!import.meta.env.VITE_AUTOPILOT && !String(import.meta.env.VITE_AUTOPILOT).endsWith(':slow')) ||(typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast')); // test hook: quick bots
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const byRank = (a: Card, b: Card) => a.rank - b.rank || a.suit.localeCompare(b.suit);
const label = (c: Card) => `${({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[c.rank] ?? c.rank}${{ S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit]}`;

interface Settled {
  outcome: 'win' | 'loss' | 'draw';
  payout: number; trophyDelta: number; xpGain: number; levelUps: number; unlocked: string[]; honors: Honor[]; paid: boolean; bonus: number; stagePrize: number;
}

/** Online mode: the server owns the match; this screen shows the view it sends and posts moves. */
export interface OnlineCtl { view: RoomView; move: (cardId: string, captureIds: string[]) => void; ready: () => void; leave: () => void; rematch: () => void; again: () => void }

export function Game({ ctx, onExit, onAgain, onStage, onForfeit, online }: { ctx: MatchCtx; onExit: () => void; onAgain: () => void; onStage: (id: string) => void; onForfeit: () => void; online?: OnlineCtl }) {
  const { tr, n, lang } = useLang();
  const profile = useProfile();
  const [mcLocal, setMc] = useState<MatchState>(ctx.match);
  const mc = online ? online.view.match! : mcLocal;
  const [sel, setSel] = useState<string | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [banner, setBanner] = useState<{ a: string; b?: string } | null>(null);
  const [bubbles, setBubbles] = useState<Record<number, string>>({});
  const [summary, setSummary] = useState(mc.phase !== 'playing');
  const [result, setResult] = useState<Settled | null>(null);
  const [handoff, setHandoff] = useState(ctx.mode === 'pnp' && mc.phase === 'playing');
  const [menu, setMenu] = useState(false);
  const [chat, setChat] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const settled = useRef(false);
  const lastChat = useRef(0);
  const rng = useMemo(() => mulberry32((Date.now() ^ 0x9e3779b9) >>> 0), []);

  const arena = arenaById(ctx.arenaId);
  const players = mc.config.players;
  const deal = mc.deal;
  const isBot = (seat: number) => !online && ctx.seats[seat].botId !== null;
  const view = online ? online.view.mySeat : ctx.mode === 'pnp' ? deal.turn : 0;
  const myTurn = mc.phase === 'playing' && (online ? deal.turn === view : !isBot(deal.turn)) && !handoff && !summary && !result;
  const table = TABLE_COLORS[profile.equipped.table] ?? { felt: arena.felt, rim: arena.rim };

  // persist for resume; clear when the match is finished
  useEffect(() => {
    if (online) return;
    saveMatch(mc.phase === 'matchOver' ? null : { ...ctx, match: mc });
  }, [mc, ctx]);

  useEffect(() => {
    if (profile.settings.music) startAmbient(arena.ambient);
    return () => stopAmbient();
  }, [arena.ambient, profile.settings.music]);

  const say = (seat: number, text: string) => {
    setBubbles((b) => ({ ...b, [seat]: text }));
    setTimeout(() => setBubbles((b) => (b[seat] === text ? { ...b, [seat]: '' } : b)), 1800);
  };

  function announce(seat: number, r: NonNullable<MatchState['lastResult']>) {
    sfx(r.captured.length ? 'capture' : 'card');
    if (r.sur) {
      sfx('sur');
      setBanner(r.sur === 'sarbaz'
        ? { a: tr('سور سرباز!', 'Sur Sarbaz!'), b: `+${n(mc.config.surSarbazPoints)}` }
        : { a: tr('سور!', 'Sur!'), b: '+۵'.replace('۵', n(5)) });
      setTimeout(() => setBanner(null), 1100);
      const bot = ctx.seats[seat].botId;
      if (bot) say(seat, botById(bot).lines.sur[0]);
    } else if (r.captured.length >= 4 && ctx.seats[seat].botId) {
      say(seat, botById(ctx.seats[seat].botId!).lines.big[0]);
    }
  }

  function commit(cardId: string, ids: string[]) {
    if (online) { online.move(cardId, ids); setSel(null); setPick([]); return; }
    const seat = deal.turn;
    const m2 = matchPlay(mc, cardId, ids);
    setMc(m2);
    setSel(null);
    setPick([]);
    announce(seat, m2.lastResult!);
    if (m2.phase !== 'playing') {
      setTimeout(() => setSummary(true), m2.lastResult!.sur ? 1300 : 700);
    } else if (ctx.mode === 'pnp') {
      setTimeout(() => setHandoff(true), 450);
    }
  }

  // turn timer (vs bots only): 3 timeouts in a row forfeit the match
  const limit = ctx.mode === 'bots' && !online ? TURN_SECONDS[profile.settings.turnTimer] : 0;
  const [left, setLeft] = useState(0);
  const timeouts = useRef(0);
  const play = (cardId: string, ids: string[]) => { timeouts.current = 0; commit(cardId, ids); };
  useEffect(() => {
    if (!limit || !myTurn || menu) return;
    let s = limit;
    setLeft(s);
    const id = setInterval(() => {
      s -= 1;
      setLeft(s);
      if (s > 0) return;
      clearInterval(id);
      if (++timeouts.current >= MAX_TIMEOUTS) { onForfeit(); return; }
      const mv = timeoutMove(deal, deal.turn, rng);
      commit(mv.cardId, mv.captureIds);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, myTurn, menu, mc]);

  // online: announce each new play, follow the deal summary, and tick the server's turn clock
  const [clock, setClock] = useState(() => Date.now());
  const playKey = online ? `${mc.dealNo}:${mc.deal.hands.reduce((a, h) => a + h.length, 0)}:${mc.deal.stock.length}` : '';
  useEffect(() => {
    if (online && mc.lastResult && mc.phase === 'playing') announce(mc.lastResult.seat, mc.lastResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);
  useEffect(() => {
    if (!online) return;
    if (mc.phase === 'playing') { setSummary(false); return; }
    const t = setTimeout(() => setSummary(true), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online && mc.phase, online && mc.dealNo]);
  useEffect(() => {
    if (!online?.view.deadline) return;
    const id = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(id);
  }, [online?.view.deadline]);
  const serverLeft = online?.view.deadline ? Math.max(0, Math.ceil((online.view.deadline - clock) / 1000)) : 0;

  // bots take their turn
  useEffect(() => {
    if (mc.phase !== 'playing' || summary || result || menu || !isBot(deal.turn)) return;
    const seat = deal.turn;
    const t = setTimeout(() => {
      const mv = chooseMove(deal, seat, arena.botLevel, rng);
      commit(mv.cardId, mv.captureIds);
    }, FAST ? 20 : 700 + Math.random() * 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mc, summary, result, menu]);

  const hand = [...deal.hands[view]].sort(byRank);
  const card = sel ? hand.find((c) => c.id === sel) : undefined;
  const opts = card ? captureOptions(card, deal.floor) : [];
  const dropAllowed = !!card && (opts.length === 0 || !mc.config.mustCapture);
  const matched = opts.find((o) => sameSet(o.map((c) => c.id), pick));
  const hintIds = new Set(profile.settings.hints ? opts.flat().map((c) => c.id) : []);

  function tapHand(c: Card) {
    if (!myTurn) return;
    sfx('click');
    if (sel === c.id) {
      const o = captureOptions(c, deal.floor);
      if (o.length === 1) play(c.id, o[0].map((x) => x.id));
      else if (o.length === 0) play(c.id, []);
      return;
    }
    setSel(c.id);
    const o = captureOptions(c, deal.floor);
    setPick(o.length === 1 ? o[0].map((x) => x.id) : []);
  }
  function tapFloor(c: Card) {
    if (!myTurn || !card || opts.length === 0) return;
    sfx('click');
    setPick((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]));
  }

  // ---- unit labels and scores ----
  const u0 = unitOf(players, view);
  const unitName = (u: number) =>
    ctx.mode === 'pnp'
      ? players === 4 ? tr(`تیم ${n(u + 1)}`, `Team ${u + 1}`) : ctx.seats[u].name
      : players === 4 ? (u === u0 ? tr('تیم شما', 'Your team') : tr('تیم حریف', 'Opponents')) : u === u0 ? tr('شما', 'You') : ctx.seats[u].name;
  const targetLabel = n(mc.config.target);

  // ---- finishing ----
  function finish() {
    if (online) {
      if (mc.phase === 'dealOver') { online.ready(); return; }
      if (settled.current) return;
      settled.current = true;
      const hu = unitOf(players, view);
      setSummary(false);
      setResult({ outcome: mc.winner === null ? 'draw' : mc.winner === hu ? 'win' : 'loss', payout: 0, trophyDelta: 0, xpGain: 0, levelUps: 0, unlocked: [], honors: [], paid: false, bonus: 0, stagePrize: 0 });
      return;
    }
    if (mc.phase === 'dealOver') {
      setMc(matchNextDeal(mc, rng));
      setSummary(false);
      if (ctx.mode === 'pnp') setHandoff(true);
      return;
    }
    if (settled.current) return;
    settled.current = true;
    const hu = unitOf(players, view);
    const outcome: Settled['outcome'] = mc.winner === null ? 'draw' : mc.winner === hu ? 'win' : 'loss';
    let surs = 0;
    let sarbaz = 0;
    for (const d of mc.history) { surs += d[hu].sur / 5; sarbaz += d[hu].sarbaz / mc.config.surSarbazPoints; }
    const paid = ctx.mode === 'bots' && ctx.paid;
    const margin = outcome === 'win' ? mc.scores[hu] - Math.max(...mc.scores.filter((_, u) => u !== hu)) : 0;
    let info = { payout: 0, trophyDelta: 0, xpGain: 0, levelUps: 0 };
    let unlocked: string[] = [];
    let stagePrize = 0;
    let honors: Honor[] = [];
    if (ctx.mode === 'bots') {
      update((p) => {
        const r = settleMatch(p, { arenaId: ctx.arenaId, players, outcome, surs, sarbaz, paid, fee: ctx.fee, margin, target: mc.config.target }, todayKey(), Date.now());
        info = r;
        const a = checkAchievements(r.profile, Date.now());
        unlocked = a.unlocked;
        honors = HONORS.filter((h) => !honorUnlocked(p, h) && honorUnlocked(a.profile, h));
        if (ctx.stageId && outcome === 'win') {
          const c = clearStage(a.profile, ctx.stageId, Date.now());
          stagePrize = c.shahi - a.profile.shahi;
          return c;
        }
        return a.profile;
      });
    }
    sfx(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'click');
    setSummary(false);
    setResult({ outcome, ...info, unlocked, honors, paid, bonus: 0, stagePrize });
  }

  async function doubleUp() {
    if (!result || adBusy) return;
    setAdBusy(true);
    const ok = await adProvider.showRewarded('result');
    setAdBusy(false);
    if (!ok) return;
    const extra = Math.round(result.payout * 0.5);
    update((p) => grantAd(p, todayKey(), Date.now(), extra));
    sfx('coin');
    setResult({ ...result, bonus: extra });
  }

  const si = STAGES.findIndex((s) => s.id === ctx.stageId);
  const nextStage = result?.outcome === 'win' && si >= 0 ? STAGES[si + 1]?.id : undefined;
  const now = Date.now();
  const adOk = adStatus(profile, now, todayKey()).ok;
  const last = mc.history[mc.history.length - 1];
  const lastId = mc.lastResult?.card.id;
  const hint = !myTurn
    ? ''
    : !card
      ? tr('یک کارت از دست خودت انتخاب کن', 'Pick a card from your hand')
      : opts.length === 0
        ? tr('کارتی برای برداشتن نیست؛ دوباره بزن تا بیفتد', 'Nothing to capture — tap again to drop it')
        : opts.length === 1
          ? tr('دوباره بزن تا برداشته شود', 'Tap again to capture')
          : tr('یک ترکیب را انتخاب کن (یا کارت‌های زمین را بزن)', 'Choose a combination (or tap floor cards)');

  // fixed floor slots: a card that stays never moves; new cards take the lowest free slot (centre-out)
  const slots = useRef<Record<string, number>>({});
  {
    const ids = new Set(deal.floor.map((c) => c.id));
    const used = new Set<number>();
    for (const id of Object.keys(slots.current)) { if (ids.has(id)) used.add(slots.current[id]); else delete slots.current[id]; }
    for (const c of deal.floor) {
      if (slots.current[c.id] != null) continue;
      let i = 0;
      while (used.has(i) && i < 20) i++;
      slots.current[c.id] = i; used.add(i);
    }
  }
  const units: ScoreUnit[] = Array.from({ length: unitCount(players) }, (_, u) => {
    const seats = Array.from({ length: players }, (_, s) => s).filter((s) => unitOf(players, s) === u);
    const av = (s: number) => ({ hue: ctx.seats[s].hue, glyph: ctx.seats[s].glyph || [...ctx.seats[s].name][0] });
    return { name: unitName(u), avatars: seats.map(av), me: u === u0 };
  });
  const cols = { 2: [2], 3: [3, 1], 4: [3, 2, 1] }[players as 2 | 3 | 4];
  const hasOpts = myTurn && !!card && opts.length > 1;
  const pileOf = (seat: number) => deal.piles[seat].length;

  return (
    <div className="game" style={{ ['--felt' as string]: table.felt, ['--rim' as string]: table.rim }}>
      <div className="scene"><Scene id={arena.id} tod={ctx.tod} /></div>

      <Scoreboard mc={mc} units={units} onMenu={() => setMenu(true)} />

      <div className="opps">
        {Array.from({ length: players - 1 }, (_, i) => {
          const seat = (view + i + 1) % players;
          const info = ctx.seats[seat];
          const mate = players === 4 && unitOf(4, seat) === u0;
          return (
            <div key={seat} className={`seat ${deal.turn === seat && mc.phase === 'playing' ? 'turn' : ''}`} style={{ gridColumn: cols[i], gridRow: 1 }}>
              <div className="avatar" data-seat={seat} style={{ background: `hsl(${info.hue} 55% 38%)` }}>{info.glyph || [...info.name][0]}</div>
              <div className="nm"><bdi>{info.name}</bdi>{mate ? ` · ${tr('هم‌تیمی', 'partner')}` : ''}</div>
              <div className="hand">
                {deal.hands[seat].slice(0, 6).map((_, k) => <CardView key={k} faceDown back={profile.equipped.back} />)}
              </div>
              <span className="chip2" data-pile={seat}><i />{n(pileOf(seat))}</span>
              {bubbles[seat] && <div className="bubble">{bubbles[seat]}</div>}
            </div>
          );
        })}
      </div>

      <div className="floor" data-zone="floor">
        <div className="felt" />
        {deal.floor.length === 0 && <div className="center-tag">{tr('زمین خالی است', 'Floor is empty')}</div>}
        {deal.floor.map((c) => {
          const si = slots.current[c.id];
          const row = [1, 0, 2][Math.floor(si / 7)], col = [3, 2, 4, 1, 5, 0, 6][si % 7];
          return (
            <div key={c.id} className="fslot" style={{ ['--c' as string]: col, ['--r' as string]: row }}>
              <CardView card={c} deck={profile.equipped.deck} back={profile.equipped.back}
                className={c.id === lastId ? 'new' : pick.includes(c.id) ? 'pick' : ''}
                glow={hintIds.has(c.id) && !pick.includes(c.id)} dim={!!card && opts.length > 0 && profile.settings.hints && !hintIds.has(c.id)}
                onClick={() => tapFloor(c)} />
            </div>
          );
        })}
      </div>

      <div className="action" data-zone="action">
        <div className="hint-line">{((online ? serverLeft > 0 : limit > 0) && myTurn) && <b>⏱ {n(online ? serverLeft : Math.max(left, 0))}{timeouts.current > 0 && ` · ${tr('وقت تمام شد', 'Timeouts')} ${n(timeouts.current)}/${n(MAX_TIMEOUTS)}`} · </b>}{hint}</div>
        <div className={`opts ${hasOpts ? '' : 'off'}`}>
          {hasOpts && opts.map((o, i) => {
            const oi = o.map((x) => x.id);
            return (
              <button key={i} className={`optchip ${sameSet(oi, pick) ? 'on' : ''}`} onClick={() => { sfx('click'); setPick(oi); }}>
                {o.map(label).join(' + ')}
              </button>
            );
          })}
        </div>
        <div className="actions">
          {myTurn && card ? (
            <>
              {dropAllowed ? <button className="btn" onClick={() => play(card.id, [])}>{tr('بینداز', 'Drop')}</button> : <span />}
              {opts.length > 0 ? (
                <button className="btn good" disabled={!matched} onClick={() => matched && play(card.id, matched.map((c) => c.id))}>
                  {tr('بردار', 'Capture')}{matched ? ` (${n(matched.length + 1)})` : ''}
                </button>
              ) : <span />}
            </>
          ) : (
            !myTurn && mc.phase === 'playing' && !handoff && <span className="mute wait">{tr(`نوبت ${ctx.seats[deal.turn].name}…`, `${ctx.seats[deal.turn].name}'s turn…`)}</span>
          )}
        </div>
      </div>

      <div className="hand-zone" data-zone="hand">
        {!handoff && hand.map((c, i) => (
          <div key={c.id} className="hslot" style={{ ['--d' as string]: i - (hand.length - 1) / 2, zIndex: sel === c.id ? 5 : i }}>
            <CardView card={c} deck={profile.equipped.deck} selected={sel === c.id} dim={!myTurn} onClick={() => tapHand(c)} />
          </div>
        ))}
      </div>

      <div className={`foot ${myTurn ? 'turn' : ''}`}>
        <div className="avatar" data-seat={view} style={{ background: `hsl(${ctx.seats[view].hue} 55% 38%)` }}>{ctx.seats[view].glyph || [...ctx.seats[view].name][0]}</div>
        <span className="chip2" data-pile={view}>{tr('برداشته', 'Won')} {n(pileOf(view))}</span>
        <span className="chip2"><i />{tr('دسته', 'Stock')} {n(deal.stock.length)}</span>
        <span className="sp" />
        {bubbles[0] && <div className="bubble">{bubbles[0]}</div>}
        {ctx.mode === 'bots' && !online && <button className="iconbtn" onClick={() => setChat((c) => !c)} aria-label={tr('پیام سریع', 'Quick chat')}>💬</button>}
        {chat && ctx.mode === 'bots' && !online && (
          <div className="emotes">
            {EMOTES.map((e) => (
              <button key={e.en} onClick={() => {
                if (Date.now() - lastChat.current < CHAT_GAP_MS) return;
                lastChat.current = Date.now();
                say(0, tr(e.fa, e.en)); setChat(false);
                if (Math.random() < 0.5) { const s = 1 + Math.floor(Math.random() * (players - 1)); const b = ctx.seats[s].botId; if (b) setTimeout(() => say(s, botById(b).lines.big[0]), 900); }
              }}>{tr(e.fa, e.en)}</button>
            ))}
          </div>
        )}
      </div>

      {banner && <div className="banner"><b>{banner.a}{banner.b && <small>{banner.b}</small>}</b></div>}

      {handoff && mc.phase === 'playing' && (
        <div className="handoff">
          <div className="col" style={{ alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ background: `hsl(${ctx.seats[deal.turn].hue} 55% 38%)`, width: 72, height: 72, fontSize: 30 }}>{[...ctx.seats[deal.turn].name][0]}</div>
            <h2>{tr(`گوشی را به ${ctx.seats[deal.turn].name} بدهید`, `Pass the phone to ${ctx.seats[deal.turn].name}`)}</h2>
            <span className="mute">{tr('بقیه نگاه نکنند!', 'Everyone else look away!')}</span>
            <button className="btn primary" onClick={() => setHandoff(false)}>{tr('آماده‌ام', "I'm ready")}</button>
          </div>
        </div>
      )}

      {menu && (
        <div className="modal" onClick={() => setMenu(false)}>
          <div className="sheet col" onClick={(e) => e.stopPropagation()}>
            <h2>{arena.fa}</h2>
            <button className="btn" onClick={() => setMenu(false)}>{tr('ادامهٔ بازی', 'Resume')}</button>
            <button className="btn ghost" onClick={online ? online.leave : onExit}>{online ? tr('خروج از میز', 'Leave the table') : tr('ذخیره و رفتن به خانه', 'Save and go home')}</button>
            <span className="mute">{online ? tr('با کد اتاق می‌توانی برگردی؛ تا آن موقع نوبت‌هایت خودکار بازی می‌شود.', 'You can rejoin with the room code; meanwhile your turns are played for you.') : tr('بازی ذخیره می‌شود و بعداً ادامه پیدا می‌کند.', 'The match is saved and can be resumed later.')}</span>
          </div>
        </div>
      )}

      {summary && last && (
        <div className="modal">
          <div className="sheet col">
            <h2>{tr(`پایان دست ${n(mc.dealNo)}`, `Deal ${n(mc.dealNo)} complete`)}</h2>
            <table className="sc">
              <thead>
                <tr><th />{last.map((_, u) => <th key={u}>{unitName(u)}</th>)}</tr>
              </thead>
              <tbody>
                {scoreRows(tr, n).map(([label, f]) => (
                  <tr key={label}><td>{label}</td>{last.map((s, u) => <td key={u}>{f(s)}</td>)}</tr>
                ))}
                <tr className="tot"><td>{tr('امتیاز این دست', 'This deal')}</td>{last.map((s, u) => <td key={u}>{n(s.total)}</td>)}</tr>
                <tr className="tot"><td>{tr('مجموع بازی', 'Match total')}</td>{mc.scores.map((s, u) => <td key={u}>{n(s)}</td>)}</tr>
              </tbody>
            </table>
            <button className="btn primary" onClick={finish}>
              {mc.phase === 'dealOver' ? tr('دست بعد', 'Next deal') : tr('نتیجهٔ بازی', 'Match result')}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="modal">
          <div className="sheet col" style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 30, color: result.outcome === 'win' ? 'var(--gold)' : 'var(--ink)' }}>
              {ctx.mode === 'pnp'
                ? mc.winner === null ? tr('مساوی!', 'Draw!') : tr(`${players === 4 ? unitName(mc.winner) : ctx.seats[mc.winner].name} برنده شد!`, `${players === 4 ? unitName(mc.winner) : ctx.seats[mc.winner].name} wins!`)
                : result.outcome === 'win' ? tr('بردی! 🎉', 'You won! 🎉') : result.outcome === 'loss' ? tr('این‌بار نشد', 'Not this time') : tr('مساوی', 'Draw')}
            </h1>
            {ctx.mode === 'bots' && !online && result.paid && (
              <div className="grid2">
                <div className="stat"><b className="row" style={{ justifyContent: 'center' }}><span className="coin" />{result.payout + result.bonus > 0 ? '+' : ''}{n(result.payout + result.bonus)}</b><span className="mute">{tr('شاهی جایزه', 'Shahi prize')}</span></div>
                <div className="stat"><b>{result.trophyDelta > 0 ? '+' : ''}{n(result.trophyDelta)}</b><span className="mute">{tr('جام', 'Trophies')}</span></div>
              </div>
            )}
            {ctx.mode === 'bots' && !online && <div className="mute">{result.xpGain > 0 ? '+' : ''}{n(result.xpGain)} XP{result.levelUps > 0 && ` · ${tr('ارتقا سطح!', 'Level up!')} +${n(result.levelUps * LEVEL_GOHAR)} ${tr('گوهر', 'Gohar')}`}</div>}
            {ctx.stageId && result.stagePrize > 0 && (
              <div className="stat"><b className="row" style={{ justifyContent: 'center' }}><span className="coin" />+{n(result.stagePrize)}</b><span className="mute">{tr('جایزهٔ مرحله', 'Stage prize')}</span></div>
            )}
            {result.honors.map((h) => (
              <div key={h.id} className="panel">🏆 {tr('افتخار جدید:', 'New honor:')} {lang === 'fa' ? h.fa : h.en}</div>
            ))}
            {result.unlocked.map((id) => (
              <div key={id} className="panel">🏅 {tr(ACH_NAMES[id].fa, ACH_NAMES[id].en)}</div>
            ))}
            {ctx.mode === 'bots' && !online && result.outcome === 'win' && result.paid && result.bonus === 0 && adOk && (
              <button className="btn good" disabled={adBusy} onClick={doubleUp}>▶ {tr(`تماشای ویدیو: ${n(Math.round(result.payout * 0.5))} شاهی بیشتر`, `Watch a video: +${n(Math.round(result.payout * 0.5))} Shahi`)}</button>
            )}
            {online && online.view.ranked && online.view.deltas?.[view] != null && (
              <div className="stat"><b>🏆 {online.view.deltas[view]! > 0 ? '+' : ''}{n(online.view.deltas[view]!)}</b><span className="mute">{tr('جام', 'Trophies')}</span></div>
            )}
            {online && !online.view.ranked && (
              <button className="btn primary" disabled={online.view.rematch.includes(view)} onClick={online.rematch}>
                {online.view.rematch.includes(view) ? tr('منتظر بقیه…', 'Waiting for the others…') : tr('بازی دوباره', 'Rematch')}
              </button>
            )}
            {online && online.view.ranked && <button className="btn primary" onClick={online.again}>{tr('حریف جدید', 'Find another match')}</button>}
            {online && <button className="btn ghost" onClick={online.leave}>{tr('بازگشت', 'Back')}</button>}
            {!online && nextStage && <button className="btn primary" onClick={() => onStage(nextStage)}>{tr('مرحلهٔ بعد', 'Next stage')}</button>}
            {!online && <button className={nextStage ? 'btn ghost' : 'btn primary'} onClick={onAgain}>{ctx.stageId ? tr('تلاش دوباره', 'Retry') : tr('بازی دوباره', 'Play again')}</button>}
            {!online && <button className="btn ghost" onClick={onExit}>{tr('خانه', 'Home')}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
