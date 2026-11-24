import { arenaById } from '../data/arenas';
import { STAGES } from '../data/stages';
import { stageUnlocked } from '../economy/economy';
import { useLang } from '../lib/i18n';
import { sfx } from '../lib/sound';
import { useProfile } from '../lib/store';

export function Stages({ busy, onPlay, onClose }: { busy: boolean; onPlay: (id: string) => void; onClose: () => void }) {
  const { tr, n, lang } = useLang();
  const p = useProfile();
  return (
    <div className="modal" style={{ zIndex: 60 }}>
      <div className="sheet col">
        <h2>{tr('مرحله‌های تک‌نفره', 'Solo stages')}</h2>
        <span className="mute">{tr('رایگان؛ جایزهٔ هر مرحله فقط بار اول برد پرداخت می‌شود.', 'Free to play; each prize is paid on the first win only.')}</span>
        {busy && <span className="mute">{tr('اول بازی نیمه‌تمامت را تمام کن یا انصراف بده.', 'Finish or forfeit your match in progress first.')}</span>}
        {STAGES.map((s, i) => {
          const a = arenaById(s.arenaId);
          const done = p.stages.includes(s.id);
          const open = stageUnlocked(p, s.id);
          return (
            <div key={s.id} className="row panel" style={{ opacity: open ? 1 : 0.55 }}>
              <div className="grow">
                <b>{n(i + 1)}. {lang === 'fa' ? a.fa : a.en}</b>
                <div className="mute">
                  {done ? '✓ ' + tr('انجام شد', 'Cleared') : open ? tr('باز', 'Open') : '🔒 ' + tr('قفل', 'Locked')}
                  {' · '}{n(s.prize)} {tr('شاهی', 'Shahi')}
                </div>
              </div>
              <button className="btn primary" disabled={!open || busy} onClick={() => { sfx('click'); onPlay(s.id); }}>
                {done ? tr('دوباره', 'Replay') : tr('شروع', 'Start')}
              </button>
            </div>
          );
        })}
        <button className="btn ghost" onClick={onClose}>{tr('بستن', 'Close')}</button>
      </div>
    </div>
  );
}
