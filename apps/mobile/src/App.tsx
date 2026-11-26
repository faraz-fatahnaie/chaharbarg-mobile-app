import { useEffect, useRef, useState } from 'react';
import { arenaById, type Arena } from './data/arenas';
import { canEnter, payFee } from './economy/economy';
import { buildCtx, stageCtx } from './lib/match';
import { useLang } from './lib/i18n';
import { registerAdUI, registerPayUI } from './lib/services';
import { setEffectsEnabled, setMusicEnabled } from './lib/sound';
import { getProfile, loadMatch, saveMatch, update, useProfile, type MatchCtx } from './lib/store';
import { forfeitSaved } from './screens/game/settle';
import { Dialog, setScreenBack } from './ui/Dialog';
import { SuitSprite } from './art/CardView';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { Online } from './screens/Online';
import { PrizeModal } from './screens/Prizes';
import { Stages } from './screens/Stages';
import { Stats } from './screens/Stats';
import { Tutorial } from './screens/Tutorial';
import { STAGES } from './data/stages';
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
  const pending = useRef<((ok: boolean) => void) | null>(null);
  useEffect(() => {
    // a second request while one is showing: the first resolves as not rewarded instead of hanging forever
    registerAdUI((r) => { pending.current?.(false); pending.current = r; setLeft(5); setRes(() => r); });
    return () => registerAdUI(null);
  }, []);
  useEffect(() => {
    if (!res || left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [res, left]);
  if (!res) return null;
  const close = (ok: boolean) => { pending.current = null; res(ok); setRes(null); };
  return (
    <Dialog label={tr('تبلیغ آزمایشی', 'Demo ad')} onClose={left > 0 ? () => close(false) : undefined} style={{ zIndex: 90, background: '#000' }}>
      <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <div style={{ fontSize: 48 }}>📺</div>
        <b>{tr('تبلیغ آزمایشی', 'Demo ad')}</b>
        <span className="mute">{tr('در نسخهٔ واقعی، اینجا تبلیغ ویدیویی شبکهٔ تبلیغاتی ایرانی نمایش داده می‌شود.', 'The real build shows a rewarded video from an Iran-reachable ad network here.')}</span>
        <div className="pbar" style={{ width: 220 }}><i style={{ width: `${((5 - left) / 5) * 100}%` }} /></div>
        {left > 0 ? <button className="btn ghost" onClick={() => close(false)}>{tr('بستن', 'Close')} ({n(left)})</button>
          : <button className="btn primary" onClick={() => close(true)}>{tr('دریافت جایزه', 'Claim reward')}</button>}
      </div>
    </Dialog>
  );
}

function PayModal() {
  const { tr, n } = useLang();
  const [req, setReq] = useState<{ sku: string; res: (t: string | null) => void } | null>(null);
  useEffect(() => { registerPayUI((sku, res) => setReq({ sku, res })); return () => registerPayUI(null); }, []);
  if (!req) return null;
  const pack = GOHAR_PACKS.find((g) => g.sku === req.sku);
  const done = (t: string | null) => { req.res(t); setReq(null); };
  return (
    <Dialog label={tr('پرداخت آزمایشی', 'Demo checkout')} onClose={() => done(null)} style={{ zIndex: 90 }}>
      <div className="sheet col" style={{ textAlign: 'center' }}>
        <h2>{tr('پرداخت آزمایشی', 'Demo checkout')}</h2>
        {pack ? <b>{n(pack.gohar)} {tr('گوهر', 'Gohar')} — {n(pack.toman)} {tr('تومان', 'Toman')}</b>
          : <span role="alert">{tr('این بسته پیدا نشد.', 'Unknown pack.')}</span>}
        <span className="mute">{tr('پولی کسر نمی‌شود. در نسخهٔ بازار یا مایکت، پرداخت با درگاه همان فروشگاه انجام می‌شود.', 'No money is charged. Bazaar/Myket builds use that store’s billing.')}</span>
        {pack && <button className="btn primary" onClick={() => done(`mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)}>{tr('تأیید', 'Confirm')}</button>}
        <button className="btn ghost" onClick={() => done(null)}>{tr('انصراف', 'Cancel')}</button>
      </div>
    </Dialog>
  );
}

export default function App() {
  const p = useProfile();
  const { dir } = useLang();
  const [tab, setTab] = useState<Tab>('home');
  const [playing, setPlaying] = useState<{ ctx: MatchCtx; key: number } | null>(null);
  const [saved, setSaved] = useState<MatchCtx | null>(() => loadMatch());
  const [tutorial, setTutorial] = useState(false);
  const [stages, setStages] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null); // stage waiting for the first-time guide
  const [notice, setNotice] = useState('');
  const guided = useRef(false);
  const { tr } = useLang();

  useEffect(() => {
    document.documentElement.lang = p.settings.lang;
    document.documentElement.dir = dir;
    setMusicEnabled(p.settings.music);
    setEffectsEnabled(p.settings.effects);
  }, [p.settings.lang, p.settings.music, p.settings.effects, dir]);

  const begin = (ctx: MatchCtx) => { saveMatch(ctx); setSaved(ctx); setPlaying({ ctx, key: Date.now() }); };

  function start(arena: Arena, players: 2 | 3 | 4, mode: 'bots' | 'pnp') {
    // never overwrite a saved match (it would cost a second fee and skip the forfeit); storage, not `saved`, is current here
    if (loadMatch()) return;
    if (mode === 'bots') {
      if (!canEnter(getProfile(), arena)) return;
      update((q) => payFee(q, arena, Date.now()));
    }
    begin(buildCtx(getProfile(), arena, players, mode));
  }

  function startStage(id: string) {
    // guide first, once per session, for a player who never finished it; Close skips it
    if (!guided.current && !getProfile().tutorialDone && id === STAGES[0].id) {
      guided.current = true;
      setPending(id);
      setTutorial(true);
      setStages(false);
      return;
    }
    const ctx = stageCtx(getProfile(), id);
    if (!ctx) return;
    setStages(false);
    begin(ctx);
  }

  function forfeit() {
    forfeitSaved();
    setSaved(null);
  }

  const exit = () => { setSaved(loadMatch()); setPlaying(null); };
  // Android back with no dialog open: any other screen goes Home (a local match stays saved), Home minimizes
  const atHome = !playing && !onlineOpen && tab === 'home';
  useEffect(() => setScreenBack(atHome ? null : () => { if (playing) exit(); else if (onlineOpen) setOnlineOpen(false); else setTab('home'); }));
  const again = () => {
    if (!playing) return;
    const c = playing.ctx;
    saveMatch(null);
    setPlaying(null);
    setSaved(null);
    if (c.stageId) { startStage(c.stageId); return; }
    const a = arenaById(c.arenaId);
    if (c.mode === 'bots' && !canEnter(getProfile(), a)) {
      setNotice(getProfile().shahi < a.fee ? tr('شاهی کافی نداری؛ هدیه یا ویدیو را امتحان کن.', 'Not enough Shahi — try the gift or a video.') : tr('این آرنا برایت قفل شده است.', 'This arena is locked for you.'));
      return;
    }
    start(arenaById(c.arenaId), c.match.config.players, c.mode);
  };

  return (
    <div className="app">
      <SuitSprite />
      {onlineOpen ? (
        <Online onClose={() => setOnlineOpen(false)} />
      ) : playing ? (
        <Game key={playing.key} ctx={playing.ctx} onExit={exit} onAgain={again} onForfeit={() => { forfeit(); setPlaying(null); }} onStage={(id) => { saveMatch(null); setPlaying(null); setSaved(null); startStage(id); }} />
      ) : (
        <>
          {tab === 'home' && <Home saved={saved} notice={notice} onStart={(a, pl, m) => { setNotice(''); start(a, pl, m); }} onResume={() => saved && setPlaying({ ctx: saved, key: Date.now() })} onForfeit={forfeit} onTutorial={() => setTutorial(true)} onStages={() => setStages(true)} onOnline={() => setOnlineOpen(true)} />}
          {tab === 'shop' && <Shop />}
          {tab === 'stats' && <Stats />}
          {tab === 'settings' && <Settings onTutorial={() => setTutorial(true)} onErase={() => setSaved(null)} />}
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
      {stages && <Stages busy={!!saved} onPlay={startStage} onGuide={() => setTutorial(true)} onClose={() => setStages(false)} />}
      {tutorial && <Tutorial onClose={() => { setTutorial(false); if (pending) { const id = pending; setPending(null); startStage(id); } }} />}
      <PrizeModal />
      <AdModal />
      <PayModal />
    </div>
  );
}
