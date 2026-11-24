import { useState } from 'react';
import { liveScore, scoreDeal, type MatchState, type UnitScore } from '@chaharbarg/engine';
import { useLang } from '../lib/i18n';
import { Suit } from '../art/CardView';

export interface ScoreUnit { name: string; avatars: { hue: number; glyph: string }[]; me: boolean; team?: string }

/** Row definitions shared by the in-game detail panel and the end-of-deal summary so they never drift. */
export function scoreRows(tr: (fa: string, en: string) => string, n: (x: number) => string): [string, (s: UnitScore) => string][] {
  return [
    [tr('خاج (۷ برگ یا بیشتر)', 'Clubs (7+)'), (s) => `${n(s.clubCount)} ← ${n(s.clubs)}`],
    [tr('آس‌ها', 'Aces'), (s) => n(s.aces)],
    [tr('سرباز‌ها', 'Jacks'), (s) => n(s.jacks)],
    [tr('ده خشت', '10 ♦'), (s) => n(s.tenD)],
    [tr('دو خاج', '2 ♣'), (s) => n(s.twoC)],
    [tr('سور', 'Sur'), (s) => n(s.sur)],
    [tr('سور سرباز', 'Sur Sarbaz'), (s) => n(s.sarbaz)],
  ];
}

export function Scoreboard({ mc, units, onMenu }: { mc: MatchState; units: ScoreUnit[]; onMenu: () => void }) {
  const { tr, n } = useLang();
  const [open, setOpen] = useState(false);
  const deal = mc.deal;
  const live = liveScore(deal);
  const target = mc.config.target;
  const top = Math.max(...mc.scores);
  const leader = mc.scores.filter((s) => s === top).length === 1 ? mc.scores.indexOf(top) : -1;
  const place = (u: number) => 1 + mc.scores.filter((s, v) => s > mc.scores[u] || (s === mc.scores[u] && live[v].total > live[u].total)).length;
  const showPlace = units.length === 3;

  return (
    <div className="score-zone">
      <div className="topbar2">
        <button className="iconbtn" onClick={onMenu} aria-label="menu">☰</button>
        <span className="round">{tr('دست', 'Deal')} {n(mc.dealNo)} · {tr('نوبت', 'Round')} {n(deal.round + 1)}</span>
        <span className="goal">{tr('هدف', 'Goal')} <b>{n(target)}</b></span>
      </div>
      <div className="units" role="button" tabIndex={0} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen((o) => !o); }}>
        {units.map((u, i) => (
          <div key={i} className={`ucard ${u.me ? 'me' : ''}`} aria-label={`${u.name} ${mc.scores[i]} / ${target}, +${live[i].total}`}>
            {i === leader && <span className="crown" aria-hidden="true">♛</span>}
            {showPlace && <span className="place">{n(place(i))}</span>}
            <div className="r1">
              <span className="avs">{u.avatars.map((a, k) => <span key={k} className="avatar mini" style={{ background: `hsl(${a.hue} 55% 38%)` }}>{a.glyph}</span>)}</span>
              <span className="nm"><bdi>{u.name}</bdi></span>
              <span className="pill" key={live[i].total}>+{n(live[i].total)}</span>
            </div>
            <div className="r2">
              <span className="track"><i style={{ transform: `scaleX(${Math.min(1, mc.scores[i] / target)})` }} /></span>
              <span className="num"><b>{n(mc.scores[i])}</b><small>/{n(target)}</small></span>
            </div>
            <div className="r3">
              {live[i].clubCount > 0 && <span className={live[i].clubCount >= 7 ? 'hot' : ''}><Suit s="C" />{n(live[i].clubCount)}</span>}
              {live[i].points > 0 && <span>{tr('امتیاز', 'Pts')} {n(live[i].points)}</span>}
              {live[i].surs > 0 && <span className="hot">★{n(live[i].surs)}</span>}
            </div>
          </div>
        ))}
        {units.length === 2 && <span className="vs">VS</span>}
      </div>
      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} />
          <div className="detail">
            <table className="sc">
              <thead><tr><th />{units.map((u, i) => <th key={i}>{u.name}</th>)}</tr></thead>
              <tbody>
                {(() => {
                  const sd = scoreDeal(deal);
                  return (
                    <>
                      {scoreRows(tr, n).map(([label, f]) => <tr key={label}><td>{label}</td>{sd.map((s, u) => <td key={u}>{f(s)}</td>)}</tr>)}
                      <tr className="tot"><td>{tr('این دست (زنده)', 'This deal (live)')}</td>{live.map((l, u) => <td key={u}>+{n(l.total)}</td>)}</tr>
                      <tr className="tot"><td>{tr('مجموع بازی', 'Match total')}</td>{mc.scores.map((s, u) => <td key={u}>{n(s)}</td>)}</tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
