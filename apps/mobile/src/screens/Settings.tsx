import { useState } from 'react';
import { useLang } from '../lib/i18n';
import { resetAll, update, useProfile } from '../lib/store';
import type { Settings as S } from '../economy/economy';
import { Header } from './Home';

export function Settings({ onTutorial }: { onTutorial: () => void }) {
  const { tr } = useLang();
  const p = useProfile();
  const s = p.settings;
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof S>(k: K, v: S[K]) => update((q) => ({ ...q, settings: { ...q.settings, [k]: v } }));
  const Tog = ({ k, label }: { k: 'sound' | 'hints' | 'surCap' | 'noSurInLastRound' | 'mustCapture'; label: string }) => (
    <label className="tog"><span>{label}</span><input type="checkbox" checked={s[k]} onChange={(e) => set(k, e.target.checked)} /></label>
  );
  return (
    <div className="scroll col" style={{ padding: 0, gap: 12 }}>
      <Header />
      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('عمومی', 'General')}</h3>
        <label className="tog"><span>{tr('نام شما', 'Your name')}</span>
          <input value={p.name} maxLength={14} onChange={(e) => update((q) => ({ ...q, name: e.target.value }))}
            style={{ font: 'inherit', background: 'var(--panel2)', color: 'var(--ink)', border: 0, borderRadius: 10, padding: 7, width: 130 }} /></label>
        <label className="tog"><span>{tr('زبان', 'Language')}</span>
          <select value={s.lang} onChange={(e) => set('lang', e.target.value as S['lang'])}><option value="fa">فارسی</option><option value="en">English</option></select></label>
        <Tog k="sound" label={tr('صدا', 'Sound')} />
        <Tog k="hints" label={tr('نمایش راهنما (برجسته‌کردن برداشت‌های ممکن)', 'Hints (highlight valid captures)')} />
        <label className="tog"><span>{tr('زمان روز در آرنا', 'Time of day')}</span>
          <select value={s.timeOfDay} onChange={(e) => set('timeOfDay', e.target.value as S['timeOfDay'])}>
            <option value="auto">{tr('خودکار (ساعت گوشی)', 'Automatic')}</option>
            <option value="day">{tr('روز', 'Day')}</option><option value="dusk">{tr('غروب', 'Dusk')}</option><option value="night">{tr('شب', 'Night')}</option></select></label>
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('قوانین (برای بازی‌های جدید)', 'House rules (new matches)')}</h3>
        <label className="tog"><span>{tr('هدف امتیاز', 'Target score')}</span>
          <select value={String(s.target)} onChange={(e) => set('target', e.target.value === 'single' ? 'single' : (Number(e.target.value) as 62 | 100))}>
            <option value="62">۶۲</option><option value="100">۱۰۰</option><option value="single">{tr('فقط یک دست', 'Single deal')}</option></select></label>
        <Tog k="surCap" label={tr('با ۵۰ امتیاز یا بیشتر دیگر سور حساب نمی‌شود', 'No sur once a side has 50+ points')} />
        <Tog k="noSurInLastRound" label={tr('در نوبت آخر سور حساب نمی‌شود', 'No sur in the last round')} />
        <Tog k="mustCapture" label={tr('کارتی که می‌تواند بردارد نباید روی زمین بیفتد', 'A card that can capture may not be dropped')} />
        <label className="tog"><span>{tr('زمین اول: سرباز', 'Opening floor jack')}</span>
          <select value={s.openingJack} onChange={(e) => set('openingJack', e.target.value as S['openingJack'])}>
            <option value="replace">{tr('جایگزین شود', 'Replace it')}</option><option value="allow">{tr('بماند', 'Allow it')}</option></select></label>
        <label className="tog"><span>{tr('امتیاز سور سرباز', 'Sur Sarbaz points')}</span>
          <select value={s.surSarbazPoints} onChange={(e) => set('surSarbazPoints', Number(e.target.value) as 5 | 10)}><option value="10">۱۰</option><option value="5">۵</option></select></label>
        <span className="mute">{tr('پیش‌فرض‌ها طبق فایل قوانین و منابع معتبر است؛ جزئیات در docs/rules-spec.md', 'Defaults follow your rules file and validated sources; see docs/rules-spec.md')}</span>
      </div>

      <div className="panel col" style={{ margin: '0 14px 14px' }}>
        <button className="btn" onClick={onTutorial}>📖 {tr('آموزش بازی', 'How to play')}</button>
        {!confirm ? <button className="btn danger" onClick={() => setConfirm(true)}>{tr('پاک‌کردن همهٔ اطلاعات', 'Erase all data')}</button>
          : <div className="row"><button className="btn danger grow" onClick={() => { resetAll(); setConfirm(false); }}>{tr('مطمئنم، پاک شود', 'Yes, erase')}</button><button className="btn ghost" onClick={() => setConfirm(false)}>{tr('نه', 'No')}</button></div>}
        <span className="mute">{tr('چهاربرگ — نسخهٔ ۰٫۱ · همه‌چیز روی همین گوشی ذخیره می‌شود.', 'Chaharbarg v0.1 · everything is stored on this device.')}</span>
      </div>
    </div>
  );
}
