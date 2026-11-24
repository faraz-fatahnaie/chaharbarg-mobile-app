import { ACH_NAMES } from '../data/achievements';
import { ARENAS } from '../data/arenas';
import { HONORS } from '../data/honors';
import { ACHIEVEMENTS, currentTitle, honorUnlocked, honorValue, levelOf } from '../economy/economy';
import { useLang } from '../lib/i18n';
import { update, useProfile } from '../lib/store';
import { Header } from './Home';

export function Stats() {
  const { tr, n, lang } = useLang();
  const p = useProfile();
  const s = p.stats;
  const rate = s.games ? Math.round((s.wins / s.games) * 100) : 0;
  return (
    <div className="scroll col" style={{ padding: 0, gap: 12 }}>
      <Header />
      <div className="grid2" style={{ padding: '0 14px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {([
          [tr('بازی', 'Games'), s.games], [tr('برد', 'Wins'), s.wins], [tr('درصد برد', 'Win rate'), `${rate}%`],
          [tr('سور', 'Sur'), s.surs], [tr('سور سرباز', 'Sarbaz'), s.sarbaz], [tr('بهترین رکورد پیاپی', 'Best streak'), s.bestStreak],
          [tr('جام', 'Trophies'), p.trophies], [tr('سطح', 'Level'), levelOf(p.xp)], [tr('مساوی', 'Draws'), s.draws],
        ] as [string, number | string][]).map(([k, v]) => (
          <div key={k} className="stat"><b>{typeof v === 'number' ? n(v) : n(v)}</b><span className="mute">{k}</span></div>
        ))}
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('دستاوردها', 'Achievements')}</h3>
        {ACHIEVEMENTS.map((a) => {
          const done = p.achievements.includes(a.id);
          const t = ACH_NAMES[a.id];
          return (
            <div key={a.id} className="row" style={{ opacity: done ? 1 : 0.55 }}>
              <span>{done ? '🏅' : '🔒'}</span>
              <div className="grow"><b>{lang === 'fa' ? t.fa : t.en}</b><div className="mute">{lang === 'fa' ? t.descFa : t.descEn}</div></div>
              <span className="chip gohar"><span className="gem" />{n(a.gohar)}</span>
            </div>
          );
        })}
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <div className="row"><h3 className="grow">{tr('افتخارات', 'Honors')}</h3>
          {p.title && <button className="btn ghost" onClick={() => update((q) => ({ ...q, title: null }))}>{tr('عنوان خودکار', 'Auto title')}</button>}</div>
        {HONORS.map((h) => {
          const done = honorUnlocked(p, h);
          const desc = h.kind === 'level' ? tr(`به سطح ${n(h.at)} برس`, `Reach level ${n(h.at)}`)
            : h.kind === 'wins' ? tr(`${n(h.at)} بازی ببر`, `Win ${n(h.at)} matches`)
            : tr(`${n(h.at)} سور بزن`, `Score ${n(h.at)} surs`);
          return (
            <div key={h.id} className="row" style={{ opacity: done ? 1 : 0.55 }}>
              <span>{done ? '🏆' : '🔒'}</span>
              <div className="grow"><b>{lang === 'fa' ? h.fa : h.en}</b><div className="mute">{desc}</div></div>
              {done ? <button className={currentTitle(p)?.id === h.id ? 'btn primary' : 'btn ghost'} onClick={() => update((q) => ({ ...q, title: h.id }))}>{currentTitle(p)?.id === h.id ? '✓ ' + tr('عنوان', 'Title') : tr('انتخاب عنوان', 'Use as title')}</button>
                : <span className="mute">{n(Math.min(honorValue(p, h.kind), h.at))} / {n(h.at)}</span>}
            </div>
          );
        })}
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('بر اساس تعداد بازیکن', 'By player count')}</h3>
        {([2, 3, 4] as const).map((k) => {
          const r = s.byPlayers[k] ?? { games: 0, wins: 0, surs: 0 };
          return <div key={k} className="row"><span className="grow">{n(k)} {tr('نفره', 'players')}</span>
            <span className="mute">{n(r.games)} {tr('بازی', 'games')} · {n(r.wins)} {tr('برد', 'wins')} · {n(r.games ? Math.round((r.wins / r.games) * 100) : 0)}% · {n(r.surs)} {tr('سور', 'sur')}</span></div>;
        })}
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('آرناها', 'Arenas')}</h3>
        {ARENAS.map((a) => {
          const r = s.byArena[a.id];
          return <div key={a.id} className="row" style={{ opacity: p.trophies >= a.minTrophies ? 1 : 0.45 }}>
            <span className="grow">{lang === 'fa' ? a.fa : a.en}</span><span className="mute">{r ? `${n(r.wins)} / ${n(r.games)}` : '—'}</span></div>;
        })}
      </div>

      <div className="panel col" style={{ margin: '0 14px 14px' }}>
        <h3>{tr('تراکنش‌ها', 'Recent transactions')}</h3>
        {p.tampered > 0 && <div className="mute" style={{ color: 'var(--bad)' }}>⚠ {tr('دست‌کاری در ذخیره‌سازی تشخیص داده و اصلاح شد.', 'Tampering with saved data was detected and rolled back.')}</div>}
        {[...p.ledger].reverse().slice(0, 10).map((e) => (
          <div key={e.h} className="row mute">
            <span className="grow">{e.reason}</span>
            {e.dS !== 0 && <span>{e.dS > 0 ? '+' : ''}{n(e.dS)} <span className="coin" /></span>}
            {e.dG !== 0 && <span>{e.dG > 0 ? '+' : ''}{n(e.dG)} <span className="gem" /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}
