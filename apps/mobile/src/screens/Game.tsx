import { useEffect, useMemo, useRef, useState } from 'react';
import {
  captureOptions, chooseMove, matchNextDeal, matchPlay, mulberry32, unitOf, unitCount,
  type Card, type MatchState,
} from '@chaharbarg/engine';
import { CardView } from '../art/CardView';
import { Scene } from '../art/Scene';
import { arenaById } from '../data/arenas';
import { ACH_NAMES } from '../data/achievements';
import { botById, EMOTES } from '../data/bots';
import { TABLE_COLORS } from '../data/cosmetics';
import { adStatus, checkAchievements, grantAd, settleMatch, todayKey } from '../economy/economy';
import { useLang } from '../lib/i18n';
import { adProvider } from '../lib/services';
import { sfx, startAmbient, stopAmbient } from '../lib/sound';
import { saveMatch, update, useProfile, type MatchCtx } from '../lib/store';

const FAST = (!!import.meta.env.VITE_AUTOPILOT && !String(import.meta.env.VITE_AUTOPILOT).endsWith(':slow')) ||(typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast')); // test hook: quick bots
const POS: Record<number, string[]> = { 2: ['top'], 3: ['tr', 'tl'], 4: ['right', 'top', 'left'] };
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const byRank = (a: Card, b: Card) => a.rank - b.rank || a.suit.localeCompare(b.suit);
const label = (c: Card) => `${({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[c.rank] ?? c.rank}${{ S: '♠', H: '♥', D: '♦', C: '♣' }[c.suit]}`;

interface Settled {
  outcome: 'win' | 'loss' | 'draw';
  payout: number; trophyDelta: number; xpGain: number; levelUps: number; unlocked: string[]; paid: boolean; bonus: number;
}

export function Game({ ctx, onExit, onAgain }: { ctx: MatchCtx; onExit: () => void; onAgain: () => void }) {
  const { tr, n } = useLang();
  const profile = useProfile();
  const [mc, setMc] = useState<MatchState>(ctx.match);
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
  const rng = useMemo(() => mulberry32((Date.now() ^ 0x9e3779b9) >>> 0), []);

  const arena = arenaById(ctx.arenaId);
  const players = mc.config.players;
  const deal = mc.deal;
  const isBot = (seat: number) => ctx.seats[seat].botId !== null;
  const view = ctx.mode === 'pnp' ? deal.turn : 0;
  const myTurn = mc.phase === 'playing' && !isBot(deal.turn) && !handoff && !summary && !result;
  const table = TABLE_COLORS[profile.equipped.table] ?? { felt: arena.felt, rim: arena.rim };

  // persist for resume; clear when the match is finished
  useEffect(() => {
    saveMatch(mc.phase === 'matchOver' ? null : { ...ctx, match: mc });
  }, [mc, ctx]);

  useEffect(() => {
    if (profile.settings.sound) startAmbient(arena.ambient);
    return () => stopAmbient();
  }, [arena.ambient, profile.settings.sound]);

  const say = (seat: number, text: string) => {
    setBubbles((b) => ({ ...b, [seat]: text }));
    setTimeout(() => setBubbles((b) => (b[seat] === text ? { ...b, [seat]: '' } : b)), 1800);
  };

  function commit(cardId: string, ids: string[]) {
    const seat = deal.turn;
    const m2 = matchPlay(mc, cardId, ids);
    setMc(m2);
    setSel(null);
    setPick([]);
    const r = m2.lastResult!;
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
    if (m2.phase !== 'playing') {
      setTimeout(() => setSummary(true), r.sur ? 1300 : 700);
    } else if (ctx.mode === 'pnp') {
      setTimeout(() => setHandoff(true), 450);
    }
  }

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
      if (o.length === 1) commit(c.id, o[0].map((x) => x.id));
      else if (o.length === 0) commit(c.id, []);
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
  const targetLabel = mc.config.target === 'single' ? tr('یک دست', 'Single deal') : n(mc.config.target);

  // ---- finishing ----
  function finish() {
    if (mc.phase === 'dealOver') {
      setMc(matchNextDeal(mc, rng));
      setSummary(false);
      if (ctx.mode === 'pnp') setHandoff(true);
      return;
    }
    if (settled.current) return;
    settled.current = true;
    const hu = unitOf(players, 0);
    const outcome: Settled['outcome'] = mc.winner === null ? 'draw' : mc.winner === hu ? 'win' : 'loss';
    let surs = 0;
    let sarbaz = 0;
    for (const d of mc.history) { surs += d[hu].sur / 5; sarbaz += d[hu].sarbaz / mc.config.surSarbazPoints; }
    const paid = ctx.mode === 'bots' && ctx.paid;
    let info = { payout: 0, trophyDelta: 0, xpGain: 0, levelUps: 0 };
    let unlocked: string[] = [];
    if (ctx.mode === 'bots') {
      update((p) => {
        const r = settleMatch(p, { arenaId: ctx.arenaId, players, outcome, surs, sarbaz, paid, fee: ctx.fee }, todayKey(), Date.now());
        info = r;
        const a = checkAchievements(r.profile, Date.now());
        unlocked = a.unlocked;
        return a.profile;
      });
    }
    sfx(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'click');
    setSummary(false);
    setResult({ outcome, ...info, unlocked, paid, bonus: 0 });
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

  const now = Date.now();
  const adOk = adStatus(profile, now, todayKey()).ok;
  const last = mc.history[mc.history.length - 1];
  const lastId = mc.lastResult?.card.id;
  const floorCls = deal.floor.length > 14 ? 'lots' : deal.floor.length > 9 ? 'many' : '';
  const hint = !myTurn
    ? ''
    : !card
      ? tr('یک کارت از دست خودت انتخاب کن', 'Pick a card from your hand')
      : opts.length === 0
        ? tr('کارتی برای برداشتن نیست؛ دوباره بزن تا بیفتد', 'Nothing to capture — tap again to drop it')
        : opts.length === 1
          ? tr('دوباره بزن تا برداشته شود', 'Tap again to capture')
          : tr('یک ترکیب را انتخاب کن (یا کارت‌های زمین را بزن)', 'Choose a combination (or tap floor cards)');

  return (
    <div className="game" style={{ ['--felt' as string]: table.felt, ['--rim' as string]: table.rim }}>
      <div className="scene"><Scene id={arena.id} tod={ctx.tod} /></div>

      <div className="hud">
        <button className="iconbtn" onClick={() => setMenu(true)} aria-label="menu">☰</button>
        <div className="score">
          {Array.from({ length: unitCount(players) }, (_, u) => (
            <div key={u} className={`u ${u === u0 ? 'me' : ''}`}>
              <small>{unitName(u)}</small>
              <b>{n(mc.scores[u])}</b>
            </div>
          ))}
        </div>
        <div className="col" style={{ gap: 0, alignItems: 'center' }}>
          <span className="chip" style={{ fontSize: 11 }}>{tr('هدف', 'Goal')} {targetLabel}</span>
          <span className="stockinfo">{tr('دست', 'Deal')} {n(mc.dealNo)} · {tr('نوبت', 'Rd')} {n(deal.round + 1)}</span>
        </div>
        {ctx.mode === 'bots' && <button className="iconbtn" onClick={() => setChat((c) => !c)} aria-label="chat">💬</button>}
      </div>
      {chat && ctx.mode === 'bots' && (
        <div className="emotes">
          {EMOTES.map((e) => (
            <button key={e} onClick={() => {
              say(0, e); setChat(false);
              if (Math.random() < 0.5) { const s = 1 + Math.floor(Math.random() * (players - 1)); const b = ctx.seats[s].botId; if (b) setTimeout(() => say(s, botById(b).lines.big[0]), 900); }
            }}>{e}</button>
          ))}
        </div>
      )}

      <div className="arena">
        <div className="felt" />
        {deal.floor.length === 0 && <div className="center-tag">{tr('زمین خالی است', 'Floor is empty')}</div>}
        <div className={`floor ${floorCls}`}>
          {deal.floor.map((c) => (
            <CardView key={c.id} card={c} deck={profile.equipped.deck} back={profile.equipped.back}
              className={c.id === lastId ? 'new' : pick.includes(c.id) ? 'pick' : ''}
              glow={hintIds.has(c.id) && !pick.includes(c.id)} dim={!!card && opts.length > 0 && profile.settings.hints && !hintIds.has(c.id)}
              onClick={() => tapFloor(c)} />
          ))}
        </div>
        {Array.from({ length: players - 1 }, (_, i) => {
          const seat = (view + i + 1) % players;
          const info = ctx.seats[seat];
          const mate = players === 4 && unitOf(4, seat) === u0;
          return (
            <div key={seat} className={`seat pos-${POS[players][i]} ${deal.turn === seat && mc.phase === 'playing' ? 'turn' : ''}`}>
              {bubbles[seat] && <div className="bubble">{bubbles[seat]}</div>}
              <div className="avatar" style={{ background: `hsl(${info.hue} 55% 38%)` }}>{[...info.name][0]}</div>
              <div className="nm">{info.name}{mate ? ` · ${tr('هم‌تیمی', 'partner')}` : ''}</div>
              <div className="hand">
                {deal.hands[seat].map((_, k) => <CardView key={k} faceDown back={profile.equipped.back} />)}
              </div>
              <div className="got">{n(deal.piles[seat].length)} {tr('برگ', 'cards')}</div>
            </div>
          );
        })}
      </div>

      <div className="myzone">
        <div className="hint-line">{hint}</div>
        {myTurn && card && opts.length > 1 && (
          <div className="opts">
            {opts.map((o, i) => {
              const oi = o.map((x) => x.id);
              return (
                <button key={i} className={`optchip ${sameSet(oi, pick) ? 'on' : ''}`} onClick={() => { sfx('click'); setPick(oi); }}>
                  {o.map(label).join(' + ')}
                </button>
              );
            })}
          </div>
        )}
        <div className="actions">
          {myTurn && card && (
            <>
              {opts.length > 0 && (
                <button className="btn good" disabled={!matched} onClick={() => matched && commit(card.id, matched.map((c) => c.id))}>
                  {tr('بردار', 'Capture')}{matched ? ` (${n(matched.length + 1)})` : ''}
                </button>
              )}
              {dropAllowed && <button className="btn" onClick={() => commit(card.id, [])}>{tr('بینداز', 'Drop')}</button>}
            </>
          )}
          {!myTurn && mc.phase === 'playing' && !handoff && (
            <span className="mute">{tr(`نوبت ${ctx.seats[deal.turn].name}…`, `${ctx.seats[deal.turn].name}'s turn…`)}</span>
          )}
        </div>
        <div className="myhand">
          {!handoff && hand.map((c) => (
            <CardView key={c.id} card={c} deck={profile.equipped.deck} selected={sel === c.id} dim={!myTurn} onClick={() => tapHand(c)} />
          ))}
        </div>
        <div className="stockinfo">{tr('باقی‌ماندهٔ دسته', 'Stock')}: {n(deal.stock.length)}</div>
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
            <button className="btn ghost" onClick={onExit}>{tr('ذخیره و رفتن به خانه', 'Save and go home')}</button>
            <span className="mute">{tr('بازی ذخیره می‌شود و بعداً ادامه پیدا می‌کند.', 'The match is saved and can be resumed later.')}</span>
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
                {([
                  [tr('خاج (۷ برگ یا بیشتر)', 'Clubs (7+)'), (s: typeof last[0]) => `${n(s.clubCount)} ← ${n(s.clubs)}`],
                  [tr('آس‌ها', 'Aces'), (s: typeof last[0]) => n(s.aces)],
                  [tr('سرباز‌ها', 'Jacks'), (s: typeof last[0]) => n(s.jacks)],
                  [tr('ده خشت', '10 ♦'), (s: typeof last[0]) => n(s.tenD)],
                  [tr('دو خاج', '2 ♣'), (s: typeof last[0]) => n(s.twoC)],
                  [tr('سور', 'Sur'), (s: typeof last[0]) => n(s.sur)],
                  [tr('سور سرباز', 'Sur Sarbaz'), (s: typeof last[0]) => n(s.sarbaz)],
                ] as [string, (s: typeof last[0]) => string][]).map(([label, f]) => (
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
            {ctx.mode === 'bots' && result.paid && (
              <div className="grid2">
                <div className="stat"><b className="row" style={{ justifyContent: 'center' }}><span className="coin" />{result.payout + result.bonus > 0 ? '+' : ''}{n(result.payout + result.bonus)}</b><span className="mute">{tr('شاهی جایزه', 'Shahi prize')}</span></div>
                <div className="stat"><b>{result.trophyDelta > 0 ? '+' : ''}{n(result.trophyDelta)}</b><span className="mute">{tr('جام', 'Trophies')}</span></div>
              </div>
            )}
            {ctx.mode === 'bots' && <div className="mute">+{n(result.xpGain)} XP{result.levelUps > 0 && ` · ${tr('ارتقا سطح!', 'Level up!')} +${n(result.levelUps * 2)} ${tr('گوهر', 'Gohar')}`}</div>}
            {result.unlocked.map((id) => (
              <div key={id} className="panel">🏅 {tr(ACH_NAMES[id].fa, ACH_NAMES[id].en)}</div>
            ))}
            {ctx.mode === 'bots' && result.outcome === 'win' && result.paid && result.bonus === 0 && adOk && (
              <button className="btn good" disabled={adBusy} onClick={doubleUp}>▶ {tr(`تماشای ویدیو: ${n(Math.round(result.payout * 0.5))} شاهی بیشتر`, `Watch a video: +${n(Math.round(result.payout * 0.5))} Shahi`)}</button>
            )}
            <button className="btn primary" onClick={onAgain}>{tr('بازی دوباره', 'Play again')}</button>
            <button className="btn ghost" onClick={onExit}>{tr('خانه', 'Home')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
