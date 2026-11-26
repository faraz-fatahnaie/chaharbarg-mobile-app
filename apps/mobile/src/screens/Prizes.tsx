import { useEffect, useRef, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { applyDelta } from '../economy/economy';
import { useLang } from '../lib/i18n';
import { claimPrizeCall, getPrizes, hasCred, signIn, type PrizeInfo } from '../lib/online';
import { getProfile, update } from '../lib/store';

const SEEN = 'chaharbarg.prizes.seen.v1';
const seenList = (): string[] => { try { const v = JSON.parse(localStorage.getItem(SEEN) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; } };

/** At app start: if this device has played online, announce last week's and month's winners and offer any prize it won. */
export function PrizeModal() {
  const { tr, n } = useLang();
  const [info, setInfo] = useState<PrizeInfo | null>(null);
  const [claimed, setClaimed] = useState('');
  const claiming = useRef(false);

  useEffect(() => {
    if (!hasCred()) return;
    (async () => {
      try {
        await signIn(getProfile().name || 'Guest');
        const i = await getPrizes();
        const seen = seenList();
        const fresh = i.announcement.filter((a) => a.winners.length && !seen.includes(a.period));
        if (i.mine.length || fresh.length) setInfo({ mine: i.mine, announcement: fresh });
      } catch { /* server not reachable: stay silent, the offline game does not need it */ }
    })();
  }, []);

  if (!info) return null;
  const close = () => {
    try { localStorage.setItem(SEEN, JSON.stringify([...seenList(), ...info.announcement.map((a) => a.period)].slice(-20))); } catch { /* ignore */ }
    setInfo(null);
  };
  const claim = async () => {
    if (claiming.current) return;
    claiming.current = true;
    let shahi = 0, gohar = 0;
    for (const p of info.mine) {
      try {
        const r = await claimPrizeCall(p.id);
        update((q) => applyDelta(q, r.shahi, r.gohar, `prize:${p.id}`, Date.now()));
        shahi += r.shahi; gohar += r.gohar;
      } catch { /* already claimed elsewhere */ }
    }
    setClaimed(`+${n(shahi)} ${tr('شاهی', 'Shahi')}${gohar ? ` +${n(gohar)} ${tr('گوهر', 'Gohar')}` : ''}`);
    setInfo((i) => i && { ...i, mine: [] });
    claiming.current = false;
  };
  return (
    <Dialog label={tr('اعلام برندگان', 'Prize announcement')} onClose={close} style={{ zIndex: 80 }}>
      <div className="sheet col" style={{ textAlign: 'center' }}>
        <h2>🏆 {tr('برندگان آنلاین', 'Online winners')}</h2>
        {info.announcement.map((a) => (
          <div key={a.period} className="panel col">
            <b>{a.period.startsWith('week') ? tr('هفتهٔ گذشته', 'Last week') : tr('ماه گذشته', 'Last month')}</b>
            {a.winners.map((w) => <span key={w.rank}>{['🥇', '🥈', '🥉'][w.rank - 1]} <bdi>{w.name}</bdi></span>)}
          </div>
        ))}
        {info.mine.length > 0 && <button className="btn good" onClick={claim}>🎁 {tr('دریافت جایزهٔ تو', 'Claim your prize')}</button>}
        {claimed && <b role="status">{claimed}</b>}
        <button className="btn ghost" onClick={close}>{tr('بستن', 'Close')}</button>
      </div>
    </Dialog>
  );
}
