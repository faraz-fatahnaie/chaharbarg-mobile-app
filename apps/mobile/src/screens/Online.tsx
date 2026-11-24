import { useEffect, useRef, useState } from 'react';
import { targetOptions } from '@chaharbarg/engine';
import { useLang } from '../lib/i18n';
import { createRoom, joinRoom, sendMove, sendReady, signIn, startRoom, watchRoom, type RoomView } from '../lib/online';
import { useProfile, type MatchCtx } from '../lib/store';
import { Game } from './Game';

const HUES = [45, 210, 140, 290];
const noop = () => {};

export function Online({ onClose }: { onClose: () => void }) {
  const { tr, n } = useLang();
  const p = useProfile();
  const [myId, setMyId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [players, setPlayers] = useState<2 | 3 | 4>(2);
  const [targetIx, setTargetIx] = useState(0);
  const [timer, setTimer] = useState<0 | 15 | 5>(0);
  const [joinCode, setJoinCode] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [online, setOnline] = useState(true);
  const stop = useRef<() => void>(noop);

  useEffect(() => {
    signIn(p.name || `${tr('مهمان', 'Guest')} ${100 + Math.floor(Math.random() * 900)}`).then(setMyId).catch(() => setErr(tr('به سرور وصل نشد. آیا سرور روشن است؟', 'Cannot reach the server. Is it running?')));
    return () => stop.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enter = (c: string) => { stop.current(); setCode(c); setView(null); stop.current = watchRoom(c, setView, setOnline); };
  const leave = () => { stop.current(); stop.current = noop; setCode(null); setView(null); };
  const run = async (f: () => Promise<unknown>) => { setErr(''); try { await f(); } catch (e) { setErr((e as Error).message); } };

  if (code && view?.match && view.status !== 'lobby') {
    const ctx: MatchCtx = {
      match: view.match, arenaId: 'persepolis', mode: 'bots', paid: false, fee: 0, tod: 'day',
      seats: view.seats.map((s, i) => ({
        name: s.name + (s.bot ? ' 🤖' : !s.connected ? ' …' : ''), botId: null,
        hue: i === view.mySeat ? p.avatar.hue : HUES[i], glyph: i === view.mySeat ? p.avatar.glyph : undefined,
      })),
    };
    return (
      <Game key={code} ctx={ctx} onExit={leave} onAgain={leave} onStage={noop} onForfeit={leave}
        online={{ view, move: (c, ids) => void sendMove(code, c, ids).catch(() => {}), ready: () => void sendReady(code).catch(() => {}), leave }} />
    );
  }

  const full = view ? view.seats.length >= view.config.players : false;
  return (
    <div className="scroll col" style={{ padding: 14, gap: 12 }}>
      <div className="row"><h2 className="grow">🌐 {tr('بازی آنلاین', 'Online play')}</h2><button className="btn ghost" onClick={() => { leave(); onClose(); }}>{tr('بستن', 'Close')}</button></div>
      {err && <div className="panel" role="alert">{err}</div>}
      {!online && <div className="panel">{tr('اتصال قطع شد؛ در حال تلاش دوباره…', 'Disconnected, retrying…')}</div>}
      {!code && (
        <>
          <div className="panel col">
            <h3>{tr('ساخت اتاق', 'Create a room')}</h3>
            <div className="seg">{([2, 3, 4] as const).map((k) => <button key={k} className={players === k ? 'on' : ''} onClick={() => { setPlayers(k); setTargetIx(0); }}>{n(k)} {tr('نفره', 'players')}</button>)}</div>
            <div className="seg">{targetOptions(players).map((t, i) => <button key={t} className={targetIx === i ? 'on' : ''} onClick={() => setTargetIx(i)}>{tr('هدف', 'Goal')} {n(t)}</button>)}</div>
            <div className="seg">
              {([0, 15, 5] as const).map((t) => <button key={t} className={timer === t ? 'on' : ''} onClick={() => setTimer(t)}>{t ? `${n(t)} ${tr('ثانیه', 's')}` : tr('بدون زمان‌سنج', 'No timer')}</button>)}
            </div>
            <button className="btn primary" disabled={!myId} onClick={() => run(async () => enter((await createRoom(players, targetOptions(players)[targetIx], timer)).code))}>{tr('بساز', 'Create room')}</button>
          </div>
          <div className="panel col">
            <h3>{tr('ورود با کد', 'Join with a code')}</h3>
            <div className="row">
              <input value={joinCode} maxLength={5} autoCapitalize="characters" aria-label={tr('کد اتاق', 'Room code')} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{ font: 'inherit', letterSpacing: 4, textAlign: 'center', background: 'var(--panel2)', color: 'var(--ink)', border: 0, borderRadius: 10, padding: 8, width: 120 }} />
              <button className="btn primary" disabled={!myId || joinCode.length !== 5} onClick={() => run(async () => { await joinRoom(joinCode); enter(joinCode); })}>{tr('ورود', 'Join')}</button>
            </div>
          </div>
        </>
      )}
      {code && (
        <div className="panel col" style={{ textAlign: 'center' }}>
          <span className="mute">{tr('کد اتاق', 'Room code')}</span>
          <b style={{ fontSize: 34, letterSpacing: 6 }}>{code}</b>
          {view && <span className="mute">{n(view.config.players)} {tr('نفره', 'players')} · {tr('هدف', 'Goal')} {n(view.config.target)}{view.timer ? ` · ${n(view.timer)}s` : ''}</span>}
          {view?.seats.map((s, i) => <div key={i} className="row" style={{ justifyContent: 'center' }}><span>{s.connected ? '🟢' : '⚪'} {s.name}{i === view.mySeat ? ` (${tr('شما', 'you')})` : ''}</span></div>)}
          {view && !full && <span className="mute">{tr('منتظر بازیکنان دیگر… کد را به آن‌ها بده.', 'Waiting for players… share the code.')}</span>}
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
