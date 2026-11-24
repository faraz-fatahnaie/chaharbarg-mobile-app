import { useEffect, useRef, useState } from 'react';
import { targetOptions } from '@chaharbarg/engine';
import { useLang } from '../lib/i18n';
import {
  createRoom, getFriends, getMe, getServerUrl, inviteFriend, joinQueue, joinRoom, leaveQueue, leaveRoom, rematch, sendMove, sendReady,
  setServerUrl, signIn, startRoom, watchMe, watchRoom, type FriendsList, type PushEvent, type RoomView,
} from '../lib/online';
import { useProfile, type MatchCtx } from '../lib/store';
import { Game } from './Game';
import { Friends, PublicChat, Rankings } from './Social';

const HUES = [45, 210, 140, 290];
const noop = () => {};
const field: React.CSSProperties = { font: 'inherit', background: 'var(--panel2)', color: 'var(--ink)', border: 0, borderRadius: 10, padding: 8, minWidth: 0 };

function InviteFriends({ code }: { code: string }) {
  const { tr } = useLang();
  const [list, setList] = useState<FriendsList['friends']>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  useEffect(() => { getFriends().then((f) => setList(f.friends)).catch(() => {}); }, []);
  const online = list.filter((f) => f.online);
  if (!online.length) return <span className="mute">{tr('دوستی آنلاین نیست. کد اتاق را برایشان بفرست.', 'No friend is online. Send them the room code.')}</span>;
  return (
    <div className="col" style={{ gap: 4 }}>
      <b>{tr('دعوت دوستان', 'Invite friends')}</b>
      {online.map((f) => (
        <div key={f.id} className="row"><span>🟢</span><span className="grow">{f.name}</span>
          <button className="btn" disabled={sent[f.id]} onClick={() => { void inviteFriend(code, f.id).then(() => setSent((s) => ({ ...s, [f.id]: true }))).catch(() => {}); }}>{sent[f.id] ? tr('دعوت شد', 'Invited') : tr('دعوت', 'Invite')}</button></div>
      ))}
    </div>
  );
}

export function Online({ onClose }: { onClose: () => void }) {
  const { tr, n } = useLang();
  const p = useProfile();
  const [myId, setMyId] = useState<string | null>(null);
  const [trophies, setTrophies] = useState(0);
  const [err, setErr] = useState('');
  const [players, setPlayers] = useState<2 | 3 | 4>(2);
  const [targetIx, setTargetIx] = useState(0);
  const [timer, setTimer] = useState<0 | 15 | 5>(0);
  const [joinCode, setJoinCode] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<{ players: number; since: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [invite, setInvite] = useState<{ code: string; from: string } | null>(null);
  const [tab, setTab] = useState<'play' | 'friends' | 'chat' | 'ranks'>('play');
  const [badge, setBadge] = useState('');
  const [serverDraft, setServerDraft] = useState<string | null>(null);
  const stop = useRef<() => void>(noop);
  const listeners = useRef(new Set<(e: PushEvent) => void>());
  const bus = useRef({ on: (f: (e: PushEvent) => void) => { listeners.current.add(f); return () => { listeners.current.delete(f); }; } }).current;

  const refreshMe = () => { getMe().then((m) => setTrophies(m.trophies)).catch(() => {}); };
  useEffect(() => {
    signIn(p.name || `${tr('مهمان', 'Guest')} ${100 + Math.floor(Math.random() * 900)}`).then((id) => { setMyId(id); refreshMe(); })
      .catch(() => setErr(tr('به سرور وصل نشد. آدرس سرور درست است و سرور روشن است؟', 'Cannot reach the server. Is the address right and the server running?')));
    return () => stop.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!myId) return;
    return watchMe((e) => {
      listeners.current.forEach((f) => f(e));
      if (e.type === 'friend-request') setBadge(tr('درخواست دوستی جدید', 'New friend request'));
      if (e.type === 'match-found') { setQueue(null); enter(e.code); }
      if (e.type === 'invite') setInvite({ code: e.code, from: e.from.name });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);
  useEffect(() => {
    if (!queue) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [queue]);
  useEffect(() => { if (view?.status === 'over') refreshMe(); }, [view?.status]);

  const enter = (c: string) => { stop.current(); setCode(c); setView(null); setInvite(null); stop.current = watchRoom(c, setView, setOnline); };
  const leave = () => { if (code) void leaveRoom(code).catch(() => {}); stop.current(); stop.current = noop; setCode(null); setView(null); };
  const run = async (f: () => Promise<unknown>) => { setErr(''); try { await f(); } catch (e) { setErr((e as Error).message); } };
  const find = (size: number) => run(async () => { await joinQueue(size); setQueue({ players: size, since: Date.now() }); setNow(Date.now()); });
  const cancel = () => run(async () => { await leaveQueue(); setQueue(null); });

  if (code && view?.match && view.status !== 'lobby') {
    const ctx: MatchCtx = {
      match: view.match, arenaId: 'persepolis', mode: 'bots', paid: false, fee: 0, tod: 'day',
      seats: view.seats.map((s, i) => ({
        name: s.name + (s.bot ? ' 🤖' : !s.connected ? ' …' : ''), botId: null,
        hue: i === view.mySeat ? p.avatar.hue : HUES[i], glyph: i === view.mySeat ? p.avatar.glyph : undefined,
      })),
    };
    return (
      <Game key={`${code}:${view.games}`} ctx={ctx} onExit={leave} onAgain={leave} onStage={noop} onForfeit={leave}
        online={{
          view, move: (c, ids) => void sendMove(code, c, ids).catch(() => {}), ready: () => void sendReady(code).catch(() => {}), leave,
          rematch: () => void rematch(code).catch(() => {}),
          again: () => { const size = view.config.players; leave(); void find(size); },
        }} />
    );
  }

  const full = view ? view.seats.length >= view.config.players : false;
  const waited = queue ? Math.floor((now - queue.since) / 1000) : 0;
  return (
    <div className="scroll col" style={{ padding: 14, gap: 12 }}>
      <div className="row"><h2 className="grow">🌐 {tr('بازی آنلاین', 'Online play')}</h2>
        <span className="chip" title={tr('جام‌های آنلاین', 'Online trophies')}>🏆 {n(trophies)}</span>
        <button className="btn ghost" onClick={() => { if (queue) void leaveQueue().catch(() => {}); leave(); onClose(); }}>{tr('بستن', 'Close')}</button></div>
      {err && <div className="panel" role="alert">{err}</div>}
      {!online && <div className="panel">{tr('اتصال قطع شد؛ در حال تلاش دوباره…', 'Disconnected, retrying…')}</div>}
      {invite && (
        <div className="panel row" role="alert">
          <span className="grow">{tr(`${invite.from} تو را به بازی دعوت کرد`, `${invite.from} invited you to play`)}</span>
          <button className="btn primary" onClick={() => run(async () => { await joinRoom(invite.code); enter(invite.code); })}>{tr('ورود', 'Join')}</button>
          <button className="btn ghost" onClick={() => setInvite(null)}>{tr('رد', 'Decline')}</button>
        </div>
      )}
      {!code && (
        <div className="seg">
          {(['play', 'friends', 'chat', 'ranks'] as const).map((k) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); if (k === 'friends') setBadge(''); }}>
              {{ play: tr('بازی', 'Play'), friends: tr('دوستان', 'Friends') + (badge ? ' •' : ''), chat: tr('گفتگو', 'Chat'), ranks: tr('رتبه‌ها', 'Ranks') }[k]}
            </button>
          ))}
        </div>
      )}
      {!code && myId && tab === 'friends' && <Friends me={myId} bus={bus} />}
      {!code && myId && tab === 'chat' && <PublicChat me={myId} bus={bus} />}
      {!code && myId && tab === 'ranks' && <Rankings me={myId} />}
      {!code && tab === 'play' && (
        <>
          <div className="panel col">
            <h3>🏆 {tr('بازی رتبه‌ای با ناشناس‌ها', 'Ranked: random opponents')}</h3>
            <span className="mute">{tr('حریف هم‌سطح پیدا می‌شود. برد +۲۵ جام، باخت −۱۲ جام.', 'Matched with players near your trophies. Win +25, loss −12.')}</span>
            {!queue ? (
              <>
                <div className="seg">{([2, 3, 4] as const).map((k) => <button key={k} className={players === k ? 'on' : ''} onClick={() => { setPlayers(k); setTargetIx(0); }}>{n(k)} {tr('نفره', 'players')}</button>)}</div>
                <button className="btn primary" disabled={!myId} onClick={() => find(players)}>{tr('پیدا کردن حریف', 'Find a match')}</button>
              </>
            ) : (
              <div className="col" style={{ alignItems: 'center' }}>
                <b>{tr('در حال جستجو…', 'Searching…')} {n(waited)}s</b>
                <span className="mute">{n(queue.players)} {tr('نفره', 'players')}</span>
                <button className="btn ghost" onClick={cancel}>{tr('لغو', 'Cancel')}</button>
              </div>
            )}
          </div>
          <div className="panel col">
            <h3>👥 {tr('بازی با دوستان (بدون جام)', 'Play with friends (no trophies)')}</h3>
            <div className="seg">{([2, 3, 4] as const).map((k) => <button key={k} className={players === k ? 'on' : ''} onClick={() => { setPlayers(k); setTargetIx(0); }}>{n(k)} {tr('نفره', 'players')}</button>)}</div>
            <div className="seg">{targetOptions(players).map((t, i) => <button key={t} className={targetIx === i ? 'on' : ''} onClick={() => setTargetIx(i)}>{tr('هدف', 'Goal')} {n(t)}</button>)}</div>
            <div className="seg">
              {([0, 15, 5] as const).map((t) => <button key={t} className={timer === t ? 'on' : ''} onClick={() => setTimer(t)}>{t ? `${n(t)} ${tr('ثانیه', 's')}` : tr('بدون زمان‌سنج', 'No timer')}</button>)}
            </div>
            <button className="btn primary" disabled={!myId} onClick={() => run(async () => enter((await createRoom(players, targetOptions(players)[targetIx], timer)).code))}>{tr('ساخت اتاق', 'Create room')}</button>
            <div className="row">
              <input value={joinCode} maxLength={5} autoCapitalize="characters" aria-label={tr('کد اتاق', 'Room code')} placeholder={tr('کد اتاق', 'Room code')} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ ...field, letterSpacing: 4, textAlign: 'center', width: 120 }} />
              <button className="btn primary" disabled={!myId || joinCode.length !== 5} onClick={() => run(async () => { await joinRoom(joinCode); enter(joinCode); })}>{tr('ورود', 'Join')}</button>
            </div>
          </div>
          <div className="panel col">
            <span className="mute">{tr('آدرس سرور', 'Server address')}: {getServerUrl()}</span>
            {serverDraft === null ? <button className="btn ghost" onClick={() => setServerDraft(getServerUrl())}>{tr('تغییر آدرس سرور', 'Change server')}</button> : (
              <div className="row">
                <input style={{ ...field, flex: 1 }} value={serverDraft} aria-label={tr('آدرس سرور', 'Server address')} placeholder="https://play.example.com" onChange={(e) => setServerDraft(e.target.value)} />
                <button className="btn primary" onClick={() => { if (setServerUrl(serverDraft)) location.reload(); else setErr(tr('آدرس باید با http:// یا https:// شروع شود.', 'The address must start with http:// or https://.')); }}>{tr('ذخیره', 'Save')}</button>
              </div>
            )}
          </div>
        </>
      )}
      {code && (
        <div className="panel col" style={{ textAlign: 'center' }}>
          <span className="mute">{tr('کد اتاق', 'Room code')}</span>
          <b style={{ fontSize: 34, letterSpacing: 6 }}>{code}</b>
          {view && <span className="mute">{n(view.config.players)} {tr('نفره', 'players')} · {tr('هدف', 'Goal')} {n(view.config.target)}{view.timer ? ` · ${n(view.timer)}s` : ''} · {tr('بدون جام', 'no trophies')}</span>}
          {view?.seats.map((s, i) => <div key={i} className="row" style={{ justifyContent: 'center' }}><span>{s.connected ? '🟢' : '⚪'} {s.name}{i === view.mySeat ? ` (${tr('شما', 'you')})` : ''}</span></div>)}
          {view && !full && <span className="mute">{tr('منتظر بازیکنان دیگر… کد را به آن‌ها بده یا دوستانت را دعوت کن.', 'Waiting for players… share the code or invite friends.')}</span>}
          {view && !full && <InviteFriends code={code} />}
          {view && myId === view.hostId && (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" disabled={!full} onClick={() => run(() => startRoom(code, false))}>{tr('شروع', 'Start')}</button>
              <button className="btn" onClick={() => run(() => startRoom(code, true))}>{tr('شروع با ربات', 'Start with bots')}</button>
            </div>
          )}
          <button className="btn ghost" onClick={leave}>{tr('خروج', 'Leave')}</button>
        </div>
      )}
    </div>
  );
}
