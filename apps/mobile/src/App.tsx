import { useEffect, useState } from 'react';
import { arenaById, type Arena } from './data/arenas';
import { canEnter, payFee, settleMatch, todayKey } from './economy/economy';
import { buildCtx } from './lib/match';
import { useLang } from './lib/i18n';
import { registerAdUI, registerPayUI } from './lib/services';
import { setSoundEnabled } from './lib/sound';
import { getProfile, loadMatch, saveMatch, update, useProfile, type MatchCtx } from './lib/store';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { Stats } from './screens/Stats';
import { Tutorial } from './screens/Tutorial';
import { GOHAR_PACKS } from './data/cosmetics';

type Tab = 'home' | 'shop' | 'stats' | 'settings';

const ICONS: Record<Tab, string> = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  shop: 'M4 7h16l-1.5 12H5.5zM8 7a4 4 0 0 1 8 0',
  stats: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3l-2-.6a6.6 6.6 0 0 0-.6-1.4l1-1.8-1.6-1.6-1.8 1a6.6 6.6 0 0 0-1.4-.6L12 4l-2 .0-.6 2a6.6 6.6 0 0 0-1.4.6l-1.8-1L4.6 7.2l1 1.8c-.3.4-.5.9-.6 1.4L3 12l.0 2 2 .6c.1.5.3 1 .6 1.4l-1 1.8 1.6 1.6 1.8-1c.4.3.9.5 1.4.6L12 20l2 0 .6-2c.5-.1 1-.3 1.4-.6l1.8 1 1.6-1.6-1-1.8c.3-.4.5-.9.6-1.4z',
};

function AdModal() {
  const { tr, n } = useLang();
  const [res, setRes] = useState<((ok: boolean) => void) | null>(null);
  const [left, setLeft] = useState(5);
  useEffect(() => { registerAdUI((r) => { setLeft(5); setRes(() => r); }); return () => registerAdUI(null); }, []);
  useEffect(() => {
    if (!res || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [res, left]);
  if (!res) return null;
  const close = (ok: boolean) => { res(ok); setRes(null); };
  return (
    <div className="modal" style={{ zIndex: 90, background: '#000' }}>
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <div style={{ fontSize: 48 }}>📺</div>
        <b>{tr('تبلیغ آزمایشی', 'Demo ad')}</b>
        <span className="mute">{tr('در نسخهٔ واقعی، اینجا تبلیغ ویدیویی شبکهٔ تبلیغاتی ایرانی نمایش داده می‌شود.', 'The real build shows a rewarded video from an Iran-reachable ad network here.')}</span>
        <div className="pbar" style={{ width: 220 }}><i style={{ width: `${((5 - left) / 5) * 100}%` }} /></div>
        {left > 0 ? <button className="btn ghost" onClick={() => close(false)}>{tr('بستن', 'Close')} ({n(left)})</button>
          : <button className="btn primary" onClick={() => close(true)}>{tr('دریافت جایزه', 'Claim reward')}</button>}
      </div>
    </div>
  );
}

function PayModal() {
  const { tr, n } = useLang();
  const [req, setReq] = useState<{ sku: string; res: (t: string | null) => void } | null>(null);
  useEffect(() => { registerPayUI((sku, res) => setReq({ sku, res })); return () => registerPayUI(null); }, []);
  if (!req) return null;
  const pack = GOHAR_PACKS.find((g) => g.sku === req.sku)!;
  const done = (t: string | null) => { req.res(t); setReq(null); };
  return (
    <div className="modal" style={{ zIndex: 90 }}>
      <div className="sheet col" style={{ textAlign: 'center' }}>
        <h2>{tr('پرداخت آزمایشی', 'Demo checkout')}</h2>
        <b>{n(pack.gohar)} {tr('گوهر', 'Gohar')} — {n(pack.toman)} {tr('تومان', 'Toman')}</b>
        <span className="mute">{tr('پولی کسر نمی‌شود. در نسخهٔ بازار یا مایکت، پرداخت با درگاه همان فروشگاه انجام می‌شود.', 'No money is charged. Bazaar/Myket builds use that store’s billing.')}</span>
        <button className="btn primary" onClick={() => done(`mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)}>{tr('تأیید', 'Confirm')}</button>
        <button className="btn ghost" onClick={() => done(null)}>{tr('انصراف', 'Cancel')}</button>
      </div>
    </div>
  );
}

export default function App() {
  const p = useProfile();
  const { dir } = useLang();
  const [tab, setTab] = useState<Tab>('home');
  const [playing, setPlaying] = useState<{ ctx: MatchCtx; key: number } | null>(null);
  const [saved, setSaved] = useState<MatchCtx | null>(() => loadMatch());
  const [tutorial, setTutorial] = useState(false);
  const { tr } = useLang();

  useEffect(() => {
    document.documentElement.lang = p.settings.lang;
    document.documentElement.dir = dir;
    setSoundEnabled(p.settings.sound);
  }, [p.settings.lang, p.settings.sound, dir]);

  const begin = (ctx: MatchCtx) => { saveMatch(ctx); setSaved(ctx); setPlaying({ ctx, key: Date.now() }); };

  function start(arena: Arena, players: 2 | 3 | 4, mode: 'bots' | 'pnp') {
    if (mode === 'bots') {
      if (!canEnter(getProfile(), arena)) return;
      update((q) => payFee(q, arena, Date.now()));
    }
    begin(buildCtx(getProfile(), arena, players, mode));
  }

  function forfeit() {
    if (saved && saved.mode === 'bots' && saved.paid) {
      const hu = 0;
      void hu;
      update((q) => settleMatch(q, { arenaId: saved.arenaId, players: saved.match.config.players, outcome: 'loss', surs: 0, sarbaz: 0, paid: true, fee: saved.fee }, todayKey(), Date.now()).profile);
    }
    saveMatch(null);
    setSaved(null);
  }

  const exit = () => { setSaved(loadMatch()); setPlaying(null); };
  const again = () => {
    if (!playing) return;
    const c = playing.ctx;
    saveMatch(null);
    setPlaying(null);
    setSaved(null);
    start(arenaById(c.arenaId), c.match.config.players, c.mode);
  };

  return (
    <div className="app">
      {playing ? (
        <Game key={playing.key} ctx={playing.ctx} onExit={exit} onAgain={again} />
      ) : (
        <>
          {tab === 'home' && <Home saved={saved} onStart={start} onResume={() => saved && setPlaying({ ctx: saved, key: Date.now() })} onForfeit={forfeit} onTutorial={() => setTutorial(true)} />}
          {tab === 'shop' && <Shop />}
          {tab === 'stats' && <Stats />}
          {tab === 'settings' && <Settings onTutorial={() => setTutorial(true)} />}
          <nav className="tabs">
            {(['home', 'shop', 'stats', 'settings'] as Tab[]).map((k) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[k]} /></svg>
                {{ home: tr('خانه', 'Home'), shop: tr('فروشگاه', 'Shop'), stats: tr('آمار', 'Stats'), settings: tr('تنظیمات', 'Settings') }[k]}
              </button>
            ))}
          </nav>
        </>
      )}
      {tutorial && <Tutorial onClose={() => setTutorial(false)} />}
      <AdModal />
      <PayModal />
    </div>
  );
}
