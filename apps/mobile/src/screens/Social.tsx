import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import {
  friendAction, friendRequest, getChat, getDms, getFriends, getRankings, postChat, reportChat, sendDm,
  type ChatMsg, type DmMsg, type FriendsList, type Person, type PushEvent, type RankRow,
} from '../lib/online';

type Bus = { on: (f: (e: PushEvent) => void) => () => void };
const input: React.CSSProperties = { font: 'inherit', background: 'var(--panel2)', color: 'var(--ink)', border: 0, borderRadius: 10, padding: 8, flex: 1, minWidth: 0 };

function useAction() {
  const [err, setErr] = useState('');
  const run = useCallback(async (f: () => Promise<unknown>) => { setErr(''); try { await f(); } catch (e) { setErr((e as Error).message); } }, []);
  return { err, run };
}

function Thread({ me, peer, bus, onBack }: { me: string; peer: Person; bus: Bus; onBack: () => void }) {
  const { tr } = useLang();
  const [msgs, setMsgs] = useState<DmMsg[]>([]);
  const [text, setText] = useState('');
  const { err, run } = useAction();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { getDms(peer.id).then((r) => setMsgs(r.messages)).catch(() => {}); }, [peer.id]);
  useEffect(() => bus.on((e) => { if (e.type === 'dm' && e.msg.from === peer.id) setMsgs((m) => [...m, e.msg]); }), [bus, peer.id]);
  useEffect(() => end.current?.scrollIntoView?.({ block: 'end' }), [msgs]);
  const send = () => run(async () => { const t = text.trim(); if (!t) return; const m = await sendDm(peer.id, t); setMsgs((x) => [...x, m]); setText(''); });
  return (
    <div className="panel col">
      <div className="row"><button className="btn ghost" onClick={onBack}>←</button><h3 className="grow">{peer.name}</h3></div>
      <div className="col" style={{ maxHeight: 240, overflowY: 'auto', gap: 4 }}>
        {msgs.map((m) => <div key={m.id} style={{ alignSelf: m.from === me ? 'flex-end' : 'flex-start', background: m.from === me ? 'var(--panel2)' : 'rgba(255,255,255,.08)', borderRadius: 10, padding: '4px 10px', maxWidth: '80%' }}>{m.text}</div>)}
        <div ref={end} />
      </div>
      {err && <span role="alert" className="mute">{err}</span>}
      <div className="row">
        <input style={input} value={text} maxLength={500} aria-label={tr('پیام', 'Message')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn primary" onClick={send}>{tr('ارسال', 'Send')}</button>
      </div>
    </div>
  );
}

export function Friends({ me, bus }: { me: string; bus: Bus }) {
  const { tr } = useLang();
  const [list, setList] = useState<FriendsList | null>(null);
  const [code, setCode] = useState('');
  const [peer, setPeer] = useState<Person | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const { err, run } = useAction();
  const reload = useCallback(() => { getFriends().then(setList).catch(() => {}); }, []);
  useEffect(reload, [reload]);
  useEffect(() => bus.on((e) => {
    if (e.type === 'friend-request' || e.type === 'friend-accepted') reload();
    if (e.type === 'dm' && e.msg.from !== peer?.id) setUnread((u) => ({ ...u, [e.msg.from]: (u[e.msg.from] ?? 0) + 1 }));
  }), [bus, reload, peer?.id]);
  const act = (a: Parameters<typeof friendAction>[0], id: string) => run(async () => { await friendAction(a, id); reload(); });

  if (peer) return <Thread me={me} peer={peer} bus={bus} onBack={() => setPeer(null)} />;
  if (!list) return <div className="panel">…</div>;
  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="panel col">
        <span className="mute">{tr('کد دوستی تو', 'Your friend code')}</span>
        <b style={{ fontSize: 26, letterSpacing: 5, textAlign: 'center' }}>{list.code}</b>
        <div className="row">
          <input style={input} value={code} maxLength={6} aria-label={tr('کد دوستی', 'Friend code')} placeholder={tr('کد دوست', "Friend's code")} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button className="btn primary" disabled={code.length !== 6} onClick={() => run(async () => { await friendRequest(code); setCode(''); reload(); })}>{tr('درخواست دوستی', 'Send request')}</button>
        </div>
        {err && <span role="alert" className="mute">{err}</span>}
      </div>
      {list.incoming.length > 0 && (
        <div className="panel col"><h3>{tr('درخواست‌ها', 'Requests')}</h3>
          {list.incoming.map((p) => <div key={p.id} className="row"><span className="grow">{p.name}</span>
            <button className="btn primary" onClick={() => act('accept', p.id)}>{tr('قبول', 'Accept')}</button>
            <button className="btn ghost" onClick={() => act('reject', p.id)}>{tr('رد', 'Reject')}</button>
            <button className="btn ghost" onClick={() => act('block', p.id)}>{tr('مسدود', 'Block')}</button></div>)}
        </div>
      )}
      <div className="panel col"><h3>{tr('دوستان', 'Friends')}</h3>
        {list.friends.length === 0 && <span className="mute">{tr('هنوز دوستی نداری.', 'No friends yet.')}</span>}
        {list.friends.map((p) => <div key={p.id} className="row"><span>{p.online ? '🟢' : '⚪'}</span><span className="grow">{p.name}</span>
          <button className="btn" onClick={() => { setUnread((u) => ({ ...u, [p.id]: 0 })); setPeer(p); }}>💬{unread[p.id] ? ` ${unread[p.id]}` : ''}</button>
          <button className="btn ghost" onClick={() => act('remove', p.id)}>{tr('حذف', 'Remove')}</button>
          <button className="btn ghost" onClick={() => act('block', p.id)}>{tr('مسدود', 'Block')}</button></div>)}
        {list.outgoing.map((p) => <div key={p.id} className="row mute"><span className="grow">{p.name} · {tr('در انتظار', 'pending')}</span><button className="btn ghost" onClick={() => act('remove', p.id)}>{tr('لغو', 'Cancel')}</button></div>)}
      </div>
      {list.blocked.length > 0 && (
        <div className="panel col"><h3>{tr('مسدودشده‌ها', 'Blocked')}</h3>
          {list.blocked.map((p) => <div key={p.id} className="row"><span className="grow">{p.name}</span><button className="btn ghost" onClick={() => act('unblock', p.id)}>{tr('رفع مسدودی', 'Unblock')}</button></div>)}
        </div>
      )}
    </div>
  );
}

export function PublicChat({ me, bus }: { me: string; bus: Bus }) {
  const { tr } = useLang();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const { err, run } = useAction();
  useEffect(() => { getChat().then((r) => setMsgs(r.messages)).catch(() => {}); }, []);
  useEffect(() => bus.on((e) => {
    if (e.type === 'chat') setMsgs((m) => [...m.slice(-99), e.msg]);
    if (e.type === 'chat-hide') setMsgs((m) => m.filter((x) => x.id !== e.id));
  }), [bus]);
  const send = () => run(async () => { const t = text.trim(); if (t) { await postChat(t); setText(''); } });
  return (
    <div className="panel col">
      <span className="mute">{tr('گفتگوی عمومی. محترمانه بنویس؛ پیام‌های توهین‌آمیز گزارش می‌شوند.', 'Public chat. Be kind: offensive messages get reported and hidden.')}</span>
      <div className="col" style={{ maxHeight: 280, overflowY: 'auto', gap: 4 }}>
        {msgs.map((m) => (
          <div key={m.id} className="row" style={{ alignItems: 'baseline' }}>
            <b>{m.name}:</b><span className="grow" style={{ overflowWrap: 'anywhere' }}>{m.text}</span>
            {m.from !== me && <button className="btn ghost" aria-label={tr('گزارش', 'Report')} onClick={() => run(async () => { await reportChat(m.id); setNote(tr('گزارش شد.', 'Reported.')); })}>⚑</button>}
          </div>
        ))}
      </div>
      {(err || note) && <span role="alert" className="mute">{err || note}</span>}
      <div className="row">
        <input style={input} value={text} maxLength={200} aria-label={tr('پیام', 'Message')} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn primary" onClick={send}>{tr('ارسال', 'Send')}</button>
      </div>
    </div>
  );
}

export function Rankings({ me }: { me: string }) {
  const { tr, n } = useLang();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [rows, setRows] = useState<RankRow[] | null>(null);
  useEffect(() => { setRows(null); getRankings(period).then((r) => setRows(r.rows)).catch(() => setRows([])); }, [period]);
  return (
    <div className="panel col">
      <div className="seg">
        <button className={period === 'week' ? 'on' : ''} onClick={() => setPeriod('week')}>{tr('هفتگی', 'Weekly')}</button>
        <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>{tr('ماهانه', 'Monthly')}</button>
      </div>
      {rows === null && <span className="mute">…</span>}
      {rows?.length === 0 && <span className="mute">{tr('هنوز بازی آنلاینی ثبت نشده.', 'No online matches recorded yet.')}</span>}
      {rows?.map((r, i) => (
        <div key={r.id} className="row" style={{ fontWeight: r.id === me ? 800 : 400 }}>
          <span style={{ width: 24 }}>{n(i + 1)}</span><span className="grow">{r.name}</span>
          <span>{n(r.wins)} {tr('برد', 'wins')}</span><span className="chip shahi"><span className="coin" />{n(r.coins)}</span>
        </div>
      ))}
    </div>
  );
}
