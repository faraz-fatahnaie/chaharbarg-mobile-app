import { useEffect, useState, type KeyboardEvent } from 'react';
import type { MatchState, UnitScore } from '@chaharbarg/engine';
import { Avatar } from '../../art/Avatar';
import type { Arena } from '../../data/arenas';
import { useLang } from '../../lib/i18n';
import type { SeatInfo } from '../../lib/store';
import { Dialog } from '../../ui/Dialog';
import { scoreRows, type ScoreUnit } from '../Scoreboard';

const keyActivate = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

/** Opening "A vs B" splash; any tap or key skips it. */
export function VsSplash({ units, arena, target, onDone }: { units: ScoreUnit[]; arena: Arena; target: number; onDone: () => void }) {
  const { tr, n } = useLang();
  return (
    <div className="vs-splash" role="button" tabIndex={0} aria-label={tr('رد کردن', 'Skip')} onClick={onDone} onKeyDown={keyActivate(onDone)}>
      <div className="half l">
        <div className="row">{units[0].avatars.map((a, k) => <Avatar key={k} hue={a.hue} glyph={a.glyph} name="" aria-hidden="true" />)}</div>
        <div className="pn"><bdi>{units[0].name}</bdi></div>
      </div>
      <div className="half r">
        <div className="row">{units.slice(1).flatMap((u) => u.avatars).map((a, k) => <Avatar key={k} hue={a.hue} glyph={a.glyph} name="" aria-hidden="true" />)}</div>
        <div className="pn">{units.slice(1).map((u, k) => <span key={k}>{k > 0 && ' · '}<bdi>{u.name}</bdi></span>)}</div>
      </div>
      <div className="vs">VS</div>
      <div className="arena-tag"><span>{tr(arena.fa, arena.en)} · {tr('اولین نفر به', 'First to')} {n(target)}</span></div>
    </div>
  );
}

/** Pass-and-play cover: hides the table until the next player says they're ready. */
export function Handoff({ seat, onReady, delay = 0 }: { seat: SeatInfo; onReady: () => void; delay?: number }) {
  const { tr, lang } = useLang();
  // the hand is already hidden and play blocked by the caller; waiting only lets the last move's animation be seen
  const [shown, setShown] = useState(!delay);
  useEffect(() => {
    if (shown) return;
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [shown, delay]);
  if (!shown) return null;
  const who = <bdi>{seat.name}</bdi>;
  return (
    <Dialog label={tr(`گوشی را به ${seat.name} بدهید`, `Pass the phone to ${seat.name}`)} className="handoff">
      <div className="col" style={{ alignItems: 'center', gap: 14 }}>
        <Avatar hue={seat.hue} glyph={seat.glyph} name={seat.name} aria-hidden="true" style={{ width: 72, height: 72, fontSize: 30 }} />
        <h2>{lang === 'fa' ? <>گوشی را به {who} بدهید</> : <>Pass the phone to {who}</>}</h2>
        <span className="mute">{tr('بقیه نگاه نکنند!', 'Everyone else look away!')}</span>
        <button className="btn primary" onClick={onReady}>{tr('آماده‌ام', "I'm ready")}</button>
      </div>
    </Dialog>
  );
}

export function MenuSheet({ arena, online, onResume, onLeave }: { arena: Arena; online: boolean; onResume: () => void; onLeave: () => void }) {
  const { tr } = useLang();
  return (
    <Dialog label={tr('منو', 'Menu')} onClose={onResume} onBackdrop={onResume}>
      <div className="sheet col">
        <h2>{tr(arena.fa, arena.en)}</h2>
        <button className="btn" onClick={onResume}>{tr('ادامهٔ بازی', 'Resume')}</button>
        <button className="btn ghost" onClick={onLeave}>{online ? tr('خروج از میز', 'Leave the table') : tr('ذخیره و رفتن به خانه', 'Save and go home')}</button>
        <span className="mute">{online ? tr('با کد اتاق می‌توانی برگردی؛ تا آن موقع نوبت‌هایت خودکار بازی می‌شود.', 'You can rejoin with the room code; meanwhile your turns are played for you.') : tr('بازی ذخیره می‌شود و بعداً ادامه پیدا می‌کند.', 'The match is saved and can be resumed later.')}</span>
      </div>
    </Dialog>
  );
}

/** End-of-deal table. Not dismissable: its button is the only way on (it may settle the match). */
export function DealSummary({ mc, last, unitName, onNext }: { mc: MatchState; last: UnitScore[]; unitName: (u: number) => string; onNext: () => void }) {
  const { tr, n } = useLang();
  const title = tr(`پایان دست ${n(mc.dealNo)}`, `Deal ${n(mc.dealNo)} complete`);
  return (
    <Dialog label={title}>
      <div className="sheet col pop">
        <h2>{title}</h2>
        <table className="sc">
          <thead>
            <tr><th />{last.map((_, u) => <th key={u}><bdi>{unitName(u)}</bdi></th>)}</tr>
          </thead>
          <tbody>
            {scoreRows(tr, n).map(([label, f], i) => (
              <tr key={label} style={{ ['--i' as string]: i }}><td>{label}</td>{last.map((s, u) => <td key={u}>{f(s)}</td>)}</tr>
            ))}
            <tr className="tot"><td>{tr('امتیاز این دست', 'This deal')}</td>{last.map((s, u) => <td key={u}>{n(s.total)}</td>)}</tr>
            <tr className="tot"><td>{tr('مجموع بازی', 'Match total')}</td>{mc.scores.map((s, u) => <td key={u}>{n(s)}</td>)}</tr>
          </tbody>
        </table>
        <button className="btn primary" onClick={onNext}>
          {mc.phase === 'dealOver' ? tr('دست بعد', 'Next deal') : tr('نتیجهٔ بازی', 'Match result')}
        </button>
      </div>
    </Dialog>
  );
}
