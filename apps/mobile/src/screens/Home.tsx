import { useState } from 'react';
import { Scene } from '../art/Scene';
import { ARENAS, timeOfDayFor, type Arena } from '../data/arenas';
import {
  AD_REWARD, adStatus, canClaimRelief, claimChallenge, claimLogin, claimRelief, dailyChallenges, grantAd,
  levelOf, loginPreview, todayKey, xpForLevel, LOGIN_SHAHI,
} from '../economy/economy';
import { useLang } from '../lib/i18n';
import { adProvider } from '../lib/services';
import { sfx } from '../lib/sound';
import { update, useProfile, type MatchCtx } from '../lib/store';

export function Header() {
  const { n } = useLang();
  const p = useProfile();
  const lvl = levelOf(p.xp);
  const pct = ((p.xp - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl))) * 100;
  return (
    <div className="topbar">
      <div className="avatar" style={{ background: 'hsl(45 55% 38%)' }}>{n(lvl)}</div>
      <div className="grow">
        <div style={{ fontWeight: 800, fontSize: 14 }}>{p.name || 'چهاربرگ'}</div>
        <div className="xpbar"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <span className="chip shahi"><span className="coin" />{n(p.shahi)}</span>
      <span className="chip gohar"><span className="gem" />{n(p.gohar)}</span>
    </div>
  );
}

export function Home({ saved, onStart, onResume, onForfeit, onTutorial }: {
  saved: MatchCtx | null;
  onStart: (arena: Arena, players: 2 | 3 | 4, mode: 'bots' | 'pnp') => void;
  onResume: () => void;
  onForfeit: () => void;
  onTutorial: () => void;
}) {
  const { tr, n, date, lang } = useLang();
  const p = useProfile();
  const today = todayKey();
  const now = Date.now();
  const unlocked = ARENAS.filter((a) => p.trophies >= a.minTrophies);
  const [sel, setSel] = useState(unlocked[unlocked.length - 1].id);
  const [players, setPlayers] = useState<2 | 3 | 4>(2);
  const [mode, setMode] = useState<'bots' | 'pnp'>('bots');
  const [msg, setMsg] = useState('');
  const [adBusy, setAdBusy] = useState(false);
  const arena = ARENAS.find((a) => a.id === sel)!;
  const locked = p.trophies < arena.minTrophies;
  const broke = mode === 'bots' && p.shahi < arena.fee;
  const tod = p.settings.timeOfDay === 'auto' ? timeOfDayFor() : p.settings.timeOfDay;
  const login = loginPreview(p, today);
  const ad = adStatus(p, now, today);
  const challenges = dailyChallenges(today);
  const nextArena = ARENAS.find((a) => p.trophies < a.minTrophies);

  async function watch() {
    setAdBusy(true);
    const ok = await adProvider.showRewarded('home');
    setAdBusy(false);
    if (ok) { update((q) => grantAd(q, todayKey(), Date.now())); sfx('coin'); setMsg(tr(`+${n(AD_REWARD)} شاهی`, `+${n(AD_REWARD)} Shahi`)); }
  }

  return (
    <div className="scroll col" style={{ gap: 12, padding: 0 }}>
      <Header />
      {saved && (
        <div className="panel col" style={{ margin: '0 14px' }}>
          <b>{tr('بازی نیمه‌تمام داری', 'You have a match in progress')}</b>
          <div className="row">
            <button className="btn primary grow" onClick={onResume}>{tr('ادامه', 'Resume')}</button>
            {saved.mode === 'bots' && <button className="btn ghost" onClick={onForfeit}>{tr('انصراف (باخت)', 'Forfeit (loss)')}</button>}
            {saved.mode === 'pnp' && <button className="btn ghost" onClick={onForfeit}>{tr('لغو', 'Discard')}</button>}
          </div>
        </div>
      )}

      <div className="arenas">
        {ARENAS.map((a) => {
          const isLocked = p.trophies < a.minTrophies;
          return (
            <div key={a.id} className={`acard ${a.id === sel ? 'sel' : ''}`} onClick={() => { setSel(a.id); sfx('click'); }}>
              <div className="pic"><Scene id={a.id} tod={tod} /></div>
              {isLocked && (
                <div className="lock"><div>🔒<br />{tr(`با ${n(a.minTrophies)} جام باز می‌شود`, `Unlocks at ${n(a.minTrophies)} trophies`)}</div></div>
              )}
              <div className="info">
                <div className="row"><h3 className="grow">{lang === 'fa' ? a.fa : a.en}</h3>
                  <span className="chip shahi"><span className="coin" />{n(a.fee)}</span></div>
                <div className="mute">{lang === 'fa' ? a.place : a.placeEn} · {lang === 'fa' ? a.blurb : a.blurbEn}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="col" style={{ padding: '0 14px' }}>
        <div className="seg">
          {([2, 3, 4] as const).map((k) => (
            <button key={k} className={players === k ? 'on' : ''} onClick={() => setPlayers(k)}>
              {n(k)} {tr('نفره', 'players')}{k === 4 ? ` (${tr('تیمی', 'teams')})` : ''}
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={mode === 'bots' ? 'on' : ''} onClick={() => setMode('bots')}>{tr('با ربات‌ها', 'Vs bots')}</button>
          <button className={mode === 'pnp' ? 'on' : ''} onClick={() => setMode('pnp')}>{tr('یک گوشی، چند نفر', 'Pass & play')}</button>
        </div>
        <button className="btn primary block" style={{ fontSize: 18, padding: 14 }} disabled={mode === 'bots' && locked}
          onClick={() => {
            if (broke) { setMsg(tr('شاهی کافی نداری؛ هدیه یا ویدیو را امتحان کن.', 'Not enough Shahi — try the gift or a video.')); return; }
            sfx('click');
            onStart(arena, players, mode);
          }}>
          {mode === 'bots'
            ? `${tr('شروع بازی', 'Play')} · ${n(arena.fee)} ${tr('شاهی', 'Shahi')}`
            : tr('شروع بازی (بدون هزینه)', 'Play (free)')}
        </button>
        {mode === 'pnp' && <span className="mute">{tr('بازی روی یک گوشی؛ بدون شاهی و جام.', 'One device, no Shahi or trophies at stake.')}</span>}
        {nextArena && <span className="mute">{tr(`آرنای بعدی: ${nextArena.fa} — ${n(nextArena.minTrophies - p.trophies)} جام دیگر`, `Next arena: ${nextArena.en} — ${n(nextArena.minTrophies - p.trophies)} trophies to go`)} · 🏆 {n(p.trophies)}</span>}
        {msg && <div className="panel" style={{ textAlign: 'center' }}>{msg}</div>}
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <div className="row"><h3 className="grow">{tr('پاداش روزانه', 'Daily reward')}</h3><span className="mute">{date()}</span></div>
        <div className="row" style={{ gap: 4 }}>
          {LOGIN_SHAHI.map((v, i) => {
            const day = (login.streak - 1) % 7;
            const done = login.claimable ? i < day : i <= (p.login.streak - 1) % 7;
            return <div key={i} className="stat grow" style={{ padding: 4, opacity: done ? 0.45 : 1, outline: i === day && login.claimable ? '2px solid var(--gold)' : 'none' }}>
              <span className="mute" style={{ fontSize: 10 }}>{n(i + 1)}</span><b style={{ fontSize: 13 }}>{i === 6 ? '💎' : n(v)}</b></div>;
          })}
        </div>
        <button className="btn good" disabled={!login.claimable} onClick={() => { update((q) => claimLogin(q, today, Date.now()).profile); sfx('coin'); }}>
          {login.claimable ? tr('دریافت جایزه', 'Claim') : tr('امروز گرفتی ✓', 'Claimed today ✓')}
        </button>
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('چالش‌های امروز', "Today's challenges")}</h3>
        {challenges.map((c) => {
          const prog = Math.min(c.goal, p.daily.date === today ? p.daily.progress[c.kind] ?? 0 : 0);
          const claimed = p.daily.date === today && p.daily.claimed.includes(c.id);
          const label = { games: tr(`${n(c.goal)} بازی انجام بده`, `Play ${c.goal} matches`), wins: tr(`${n(c.goal)} بازی ببر`, `Win ${c.goal} matches`), surs: tr(`${n(c.goal)} سور بزن`, `Score ${c.goal} sur`) }[c.kind];
          return (
            <div key={c.id} className="row">
              <div className="grow"><div>{label}</div><div className="pbar"><i style={{ width: `${(prog / c.goal) * 100}%` }} /></div></div>
              <button className="btn sm good" disabled={claimed || prog < c.goal} onClick={() => { update((q) => claimChallenge(q, c.id, today, Date.now())); sfx('coin'); }}>
                {claimed ? '✓' : <><span className="coin" /> {n(c.shahi)}</>}
              </button>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ padding: '0 14px' }}>
        <button className="btn grow" disabled={!ad.ok || adBusy} onClick={watch}>
          ▶ {ad.ok ? tr(`${n(AD_REWARD)} شاهی رایگان (ویدیو)`, `${AD_REWARD} free Shahi (video)`) : ad.left <= 0 ? tr('سقف ویدیوهای امروز', 'Daily video limit') : tr(`صبر کن ${n(Math.ceil(ad.waitMs / 1000))} ثانیه`, `Wait ${Math.ceil(ad.waitMs / 1000)}s`)}
        </button>
        {canClaimRelief(p, now) && <button className="btn good" onClick={() => { update((q) => claimRelief(q, Date.now())); sfx('coin'); }}>🎁 {tr('هدیه', 'Gift')}</button>}
      </div>
      {!p.tutorialDone && (
        <button className="btn ghost" style={{ margin: '0 14px 14px' }} onClick={onTutorial}>📖 {tr('آموزش بازی (۵ گوهر جایزه)', 'Learn to play (+5 Gohar)')}</button>
      )}
      {p.tutorialDone && <div style={{ height: 6 }} />}
    </div>
  );
}
