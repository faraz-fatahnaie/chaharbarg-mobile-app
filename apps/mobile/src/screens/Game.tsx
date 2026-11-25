import { useEffect, useMemo, useRef, useState } from 'react';
import {
  captureOptions, chooseMove, matchNextDeal, matchPlay, mulberry32, unitOf, unitCount,
  type Card, type MatchState,
} from '@chaharbarg/engine';
import { CardView } from '../art/CardView';
import { Avatar } from '../art/Avatar';
import { Sticker } from '../art/Stickers';
import { Confetti, CountUp, FxLayer, reducedMotion, type FlySpec } from '../art/fx';
import { Scoreboard, type ScoreUnit } from './Scoreboard';
import { Countdown, ServerClock } from './game/Countdown';
import { DealSummary, Handoff, MenuSheet, VsSplash } from './game/parts';
import { settleLocal, SUR_POINTS, type Settled } from './game/settle';
import { useFloorFx } from './game/useFloorFx';
import { useTimeouts } from './game/useTimeouts';
import { Dialog } from '../ui/Dialog';
import { Scene } from '../art/Scene';
import { arenaById } from '../data/arenas';
import { ACH_NAMES } from '../data/achievements';
import { botById, CHAT_GAP_MS, EMOTES } from '../data/bots';
import { TABLE_COLORS } from '../data/cosmetics';
import { adStatus, grantAdBonus, LEVEL_GOHAR, todayKey } from '../economy/economy';
import { STAGES } from '../data/stages';
import { useLang } from '../lib/i18n';
import type { RoomView } from '../lib/online';
import { MAX_TIMEOUTS, TURN_SECONDS, timeoutMove } from '../lib/match';
import { adProvider } from '../lib/services';
import { sfx, startAmbient, stopAmbient } from '../lib/sound';
import { saveMatch, update, useProfile, type MatchCtx } from '../lib/store';

// test hook: quick bots. `?fast` only counts in dev or autopilot builds, never in a shipped app.
const AUTOPILOT = import.meta.env.VITE_AUTOPILOT ? String(import.meta.env.VITE_AUTOPILOT) : '';
const FAST = (!!AUTOPILOT && !AUTOPILOT.endsWith(':slow'))
  || ((import.meta.env.DEV || !!AUTOPILOT) && typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast'));
// visually hidden but read by screen readers (no shared CSS class for it)
const SR_ONLY = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const;
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const byRank = (a: Card, b: Card) => a.rank - b.rank || a.suit.localeCompare(b.suit);
const label = (c: Card) => `${({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[c.rank] ?? c.rank}${{ S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit]}`;

const Bubble = ({ text }: { text: string }) => (text[0] === '#' ? <div className="bubble stk-b"><Sticker k={text.slice(1)} /></div> : <div className="bubble">{text}</div>);

/** Online mode: the server owns the match; this screen shows the view it sends and posts moves. */
export interface OnlineCtl { view: RoomView; move: (cardId: string, captureIds: string[]) => void; ready: () => void; leave: () => void; rematch: () => void; again: () => void }

export function Game({ ctx, onExit, onAgain, onStage, onForfeit, online }: { ctx: MatchCtx; onExit: () => void; onAgain: () => void; onStage: (id: string) => void; onForfeit: () => void; online?: OnlineCtl }) {
  const { tr, n, lang } = useLang();
  const profile = useProfile();
  const [mcLocal, setMc] = useState<MatchState>(ctx.match);
  const mc = online ? online.view.match ?? ctx.match : mcLocal;
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
  const gameRef = useRef<HTMLDivElement>(null);
  const [flies, setFlies] = useState<FlySpec[]>([]);
  const [surfx, setSurfx] = useState(false);
  const noFx = FAST || reducedMotion();
  const [vs, setVs] = useState(() => !online && !noFx && mc.dealNo === 1 && mc.history.length === 0 && mc.deal.round === 0 && mc.deal.hands.every((h) => h.length === 4));
  const settled = useRef(false);
  const lastChat = useRef(0);
  const rng = useMemo(() => mulberry32((Date.now() ^ 0x9e3779b9) >>> 0), []);
  const later = useTimeouts();

  const arena = arenaById(ctx.arenaId);
  const players = mc.config.players;
  const deal = mc.deal;
  const isBot = (seat: number) => !online && ctx.seats[seat].botId !== null;
  const view = online ? online.view.mySeat : ctx.mode === 'pnp' ? deal.turn : 0;
  const myTurn = mc.phase === 'playing' && (online ? deal.turn === view : !isBot(deal.turn)) && !handoff && !summary && !result;
  const table = TABLE_COLORS[profile.equipped.table] ?? { felt: arena.felt, rim: arena.rim };

  // persist for resume, including a finished match until finish() has settled it (settleLocal drops the save)
  useEffect(() => {
    if (online || settled.current) return;
    saveMatch({ ...ctx, match: mc });
  }, [mc, ctx]);

  useEffect(() => {
    if (profile.settings.music) startAmbient(arena.ambient, arena.id);
    return () => stopAmbient();
  }, [arena.ambient, profile.settings.music]);

  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (myTurn && !wasMyTurn.current && !noFx) sfx('turn');
    wasMyTurn.current = myTurn;
  }, [myTurn]);
  useEffect(() => { if (!vs && !noFx) sfx('deal'); }, [vs, mc.dealNo, deal.round]);

  useEffect(() => {
    if (!vs) return;
    const t = setTimeout(() => setVs(false), 1500);
    return () => clearTimeout(t);
  }, [vs]);

  const say = (seat: number, text: string) => {
    setBubbles((b) => ({ ...b, [seat]: text }));
    later(() => setBubbles((b) => (b[seat] === text ? { ...b, [seat]: '' } : b)), text[0] === '#' ? 2600 : 1800);
  };

  function announce(seat: number, r: NonNullable<MatchState['lastResult']>) {
    sfx(r.captured.length ? 'capture' : 'card');
    if (r.sur) {
      sfx(r.sur === 'sarbaz' ? 'sarbaz' : 'sur');
      setBanner(r.sur === 'sarbaz'
        ? { a: tr('سور سرباز!', 'Sur Sarbaz!'), b: `+${n(mc.config.surSarbazPoints)}` }
        : { a: tr('سور!', 'Sur!'), b: `+${n(SUR_POINTS)}` });
      later(() => setBanner(null), 1100);
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
      later(() => setSummary(true), m2.lastResult!.sur ? 1300 : 700);
    } else if (ctx.mode === 'pnp') {
      // same render as the move: the next player's hand must never show before the cover (myTurn is false while it is up)
      setHandoff(true);
    }
  }

  // turn timer (vs bots only): 3 timeouts in a row forfeit the match
  const limit = ctx.mode === 'bots' && !online ? TURN_SECONDS[profile.settings.turnTimer] : 0;
  const timeouts = useRef(0);
  const play = (cardId: string, ids: string[]) => { timeouts.current = 0; commit(cardId, ids); };
  const onTimeout = () => {
    if (++timeouts.current >= MAX_TIMEOUTS) { onForfeit(); return; }
    const mv = timeoutMove(deal, deal.turn, rng);
    commit(mv.cardId, mv.captureIds);
  };

  // online: announce each new play and follow the deal summary (the turn clock is <ServerClock/>)
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

  // bots take their turn
  useEffect(() => {
    if (mc.phase !== 'playing' || summary || result || menu || vs || !isBot(deal.turn)) return;
    const seat = deal.turn;
    const t = setTimeout(() => {
      const mv = chooseMove(deal, seat, arena.botLevel, rng);
      commit(mv.cardId, mv.captureIds);
    }, FAST ? 20 : 700 + rng() * 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mc, summary, result, menu, vs]);

  const hand = [...deal.hands[view]].sort(byRank);
  const card = sel ? hand.find((c) => c.id === sel) : undefined;
  const opts = card ? captureOptions(card, deal.floor) : [];
  const dropAllowed = !!card && (opts.length === 0 || !mc.config.mustCapture);
  const matched = opts.find((o) => sameSet(o.map((c) => c.id), pick));
  const hintIds = new Set(profile.settings.hints ? opts.flat().map((c) => c.id) : []);

  function tapHand(c: Card) {
    if (!myTurn) return;
    sfx('select');
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
    const r = settleLocal(settled, ctx, mc, unitOf(players, view));
    if (!r) return;
    sfx(r.outcome === 'win' ? 'win' : r.outcome === 'loss' ? 'lose' : 'click');
    setSummary(false);
    setResult(r);
  }

  async function doubleUp() {
    if (!result || adBusy) return;
    setAdBusy(true);
    const ok = await adProvider.showRewarded('result');
    setAdBusy(false);
    if (!ok) return;
    const extra = Math.round(result.payout * 0.5);
    update((p) => grantAdBonus(p, extra, Date.now()));
    sfx('coin');
    setResult({ ...result, bonus: extra });
  }

  const si = STAGES.findIndex((s) => s.id === ctx.stageId);
  const nextStage = result?.outcome === 'win' && si >= 0 ? STAGES[si + 1]?.id : undefined;
  const now = Date.now();
  const adOk = adStatus(profile, now, todayKey()).ok;
  const last = mc.history[mc.history.length - 1];
  const hint = !myTurn
    ? ''
    : !card
      ? tr('یک کارت از دست خودت انتخاب کن', 'Pick a card from your hand')
      : opts.length === 0
        ? tr('کارتی برای برداشتن نیست؛ دوباره بزن تا بیفتد', 'Nothing to capture — tap again to drop it')
        : opts.length === 1
          ? tr('دوباره بزن تا برداشته شود', 'Tap again to capture')
          : tr('یک ترکیب را انتخاب کن (یا کارت‌های زمین را بزن)', 'Choose a combination (or tap floor cards)');
  const waitText = tr(`نوبت ${ctx.seats[deal.turn].name}…`, `${ctx.seats[deal.turn].name}'s turn…`);

  const { slots, kinds } = useFloorFx(gameRef, mc, {
    noFx, look: profile.equipped, fmt: n, later, setSurfx, addFlies: (f) => setFlies((x) => [...x, ...f]), relayout: [mc, vs, handoff, sel, pick],
  });

  const units: ScoreUnit[] = Array.from({ length: unitCount(players) }, (_, u) => {
    const seats = Array.from({ length: players }, (_, s) => s).filter((s) => unitOf(players, s) === u);
    const av = (s: number) => ({ hue: ctx.seats[s].hue, glyph: ctx.seats[s].glyph || [...ctx.seats[s].name][0] });
    return { name: unitName(u), avatars: seats.map(av), me: u === u0 };
  });
  const cols = { 2: [2], 3: [3, 1], 4: [3, 2, 1] }[players as 2 | 3 | 4];
  const hasOpts = myTurn && !!card && opts.length > 1;
  const pileOf = (seat: number) => deal.piles[seat].length;

  return (
    <div className="game" ref={gameRef} style={{ ['--felt' as string]: table.felt, ['--rim' as string]: table.rim }}>
      <div className="scene"><Scene id={arena.id} tod={ctx.tod} /></div>

      <Scoreboard mc={mc} units={units} onMenu={() => setMenu(true)} />

      <div className="opps">
        {Array.from({ length: players - 1 }, (_, i) => {
          const seat = (view + i + 1) % players;
          const info = ctx.seats[seat];
          const mate = players === 4 && unitOf(4, seat) === u0;
          return (
            <div key={seat} className={`seat ${mate ? 'mate' : ''} ${deal.turn === seat && mc.phase === 'playing' ? 'turn' : ''}`} style={{ gridColumn: cols[i], gridRow: 1 }}>
              <Avatar data-seat={seat} hue={info.hue} glyph={info.glyph} name={info.name} aria-hidden="true" />
              <div className="nm" title={mate ? tr('هم‌تیمی', 'partner') : undefined}><bdi>{info.name}</bdi></div>
              <div className="hand">
                {!vs && deal.hands[seat].slice(0, 6).map((_, k) => <CardView key={k} faceDown back={profile.equipped.back} style={{ ['--i' as string]: k }} />)}
              </div>
              <span className="chip2" data-pile={seat}><i />{n(pileOf(seat))}</span>
              {bubbles[seat] && <Bubble text={bubbles[seat]} />}
            </div>
          );
        })}
      </div>

      <div className={`floor ${surfx ? 'surfx' : ''}`} data-zone="floor">
        <div className="felt" />
        {deal.floor.length === 0 && <div className="center-tag">{tr('زمین خالی است', 'Floor is empty')}</div>}
        {!vs && deal.floor.map((c) => {
          const si = slots[c.id];
          const row = [1, 0, 2][Math.floor(si / 7)], col = [3, 2, 4, 1, 5, 0, 6][si % 7];
          return (
            <div key={c.id} data-cid={c.id} className={`fslot ${kinds[c.id] === 'deal' ? 'deal' : ''}`} style={{ ['--c' as string]: col, ['--r' as string]: row, ['--i' as string]: si }}>
              <CardView card={c} deck={profile.equipped.deck} back={profile.equipped.back}
                className={pick.includes(c.id) ? 'pick' : ''}
                glow={hintIds.has(c.id) && !pick.includes(c.id)} dim={!!card && opts.length > 0 && profile.settings.hints && !hintIds.has(c.id)}
                disabled={!myTurn || !card || opts.length === 0} onClick={() => tapFloor(c)} />
            </div>
          );
        })}
      </div>

      <div className="action" data-zone="action">
        <div className="hint-line">
          {!!online?.view.deadline && myTurn && <ServerClock deadline={online.view.deadline} fmt={n} />}
          {!online && limit > 0 && myTurn && <b>⏱ <Countdown limit={limit} active={!menu} resetKey={mc} onExpire={onTimeout} fmt={n} />{timeouts.current > 0 && ` · ${tr('وقت تمام شد', 'Timeouts')} ${n(timeouts.current)}/${n(MAX_TIMEOUTS)}`} · </b>}
          <span aria-hidden="true">{hint}</span>
        </div>
        {/* one polite live region for what to do next / whose turn it is (not the ticking clock) */}
        <span aria-live="polite" style={SR_ONLY}>{hint || (mc.phase === 'playing' && !myTurn && !handoff ? waitText : '')}</span>
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
            !myTurn && mc.phase === 'playing' && !handoff && <span className="mute wait" aria-hidden="true">{waitText}</span>
          )}
        </div>
      </div>

      <div className="hand-zone" data-zone="hand">
        {!handoff && !vs && hand.map((c, i) => (
          <div key={c.id} data-cid={c.id} className="hslot" style={{ ['--i' as string]: i, ['--d' as string]: i - (hand.length - 1) / 2, zIndex: sel === c.id ? 5 : i }}>
            <CardView card={c} deck={profile.equipped.deck} className="dealin" selected={sel === c.id} dim={!myTurn} disabled={!myTurn} onClick={() => tapHand(c)} />
          </div>
        ))}
      </div>

      <div className={`foot ${myTurn ? 'turn' : ''}`}>
        <Avatar data-seat={view} hue={ctx.seats[view].hue} glyph={ctx.seats[view].glyph} name={ctx.seats[view].name} />
        <span className="chip2" data-pile={view}>{tr('برداشته', 'Won')} {n(pileOf(view))}</span>
        <span className="chip2"><i />{tr('دسته', 'Stock')} {n(deal.stock.length)}</span>
        <span className="sp" />
        {bubbles[0] && <Bubble text={bubbles[0]} />}
        {ctx.mode === 'bots' && !online && <button className="iconbtn" onClick={() => setChat((c) => !c)} aria-label={tr('پیام سریع', 'Quick chat')}>💬</button>}
        {chat && ctx.mode === 'bots' && !online && (
          <div className="emotes grid">
            {EMOTES.map((e) => (
              <button key={e.en} onClick={() => {
                if (Date.now() - lastChat.current < CHAT_GAP_MS) return;
                lastChat.current = Date.now();
                say(0, `#${e.k}`); sfx('sticker'); setChat(false);
                if (rng() < 0.5) { const s = 1 + Math.floor(rng() * (players - 1)); const b = ctx.seats[s].botId; if (b) later(() => { say(s, `#${EMOTES[Math.floor(rng() * EMOTES.length)].k}`); sfx('sticker'); }, 900); }
              }}><Sticker k={e.k} /><small>{tr(e.fa, e.en)}</small></button>
            ))}
          </div>
        )}
      </div>

      <FxLayer flies={flies} done={(id) => setFlies((f) => f.filter((x) => x.id !== id))} />

      {vs && <VsSplash units={units} arena={arena} target={mc.config.target} onDone={() => setVs(false)} />}

      {banner && <div className="banner"><b>{banner.a}{banner.b && <small>{banner.b}</small>}</b></div>}

      {handoff && mc.phase === 'playing' && <Handoff seat={ctx.seats[deal.turn]} delay={noFx ? 0 : 450} onReady={() => setHandoff(false)} />}

      {menu && <MenuSheet arena={arena} online={!!online} onResume={() => setMenu(false)} onLeave={online ? online.leave : onExit} />}

      {summary && last && <DealSummary mc={mc} last={last} unitName={unitName} onNext={finish} />}

      {result && (
        <Dialog label={result.outcome === 'win' ? tr('بردی!', 'You won!') : result.outcome === 'loss' ? tr('این‌بار نشد', 'Not this time') : tr('مساوی', 'Draw')}>
          <div className={`sheet col pop ${result.outcome === 'win' ? 'win' : result.outcome === 'loss' ? 'lose' : ''}`} style={{ textAlign: 'center' }}>
            {result.outcome === 'win' && <Confetti />}
            <h1 style={{ fontSize: 30, color: result.outcome === 'win' ? 'var(--gold)' : 'var(--ink)' }}>
              {ctx.mode === 'pnp'
                ? mc.winner === null ? tr('مساوی!', 'Draw!') : tr(`${players === 4 ? unitName(mc.winner) : ctx.seats[mc.winner].name} برنده شد!`, `${players === 4 ? unitName(mc.winner) : ctx.seats[mc.winner].name} wins!`)
                : result.outcome === 'win' ? tr('بردی! 🎉', 'You won! 🎉') : result.outcome === 'loss' ? tr('این‌بار نشد', 'Not this time') : tr('مساوی', 'Draw')}
            </h1>
            {ctx.mode === 'bots' && !online && result.paid && (
              <div className="grid2">
                <div className="stat"><b className="row" style={{ justifyContent: 'center' }}><span className="coin" />{result.payout + result.bonus > 0 ? '+' : ''}<CountUp to={result.payout + result.bonus} fmt={n} delay={500} /></b><span className="mute">{tr('شاهی جایزه', 'Shahi prize')}</span></div>
                <div className="stat"><b>{result.trophyDelta > 0 ? '+' : ''}<CountUp to={result.trophyDelta} fmt={n} delay={300} /></b><span className="mute">{tr('جام', 'Trophies')}</span></div>
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
            {ctx.mode === 'bots' && !online && result.outcome === 'win' && result.paid && result.payout > 0 && result.bonus === 0 && adOk && (
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
        </Dialog>
      )}
    </div>
  );
}
