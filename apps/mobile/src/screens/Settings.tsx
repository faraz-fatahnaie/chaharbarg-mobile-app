import { useState, type ChangeEvent } from 'react';
import { useLang } from '../lib/i18n';
import { NAME_MAX, checkName, readPhoto } from '../lib/identity';
import { resetAll, setPhoto, update, useProfile, usePhoto } from '../lib/store';
import type { Settings as S } from '../economy/economy';
import { Header } from './Home';
import { remindersSupported, setReminder } from '../lib/reminders';
import { SUPPORT_EMAIL, feedbackHref, supportHref } from '../lib/support';

export function Settings({ onTutorial }: { onTutorial: () => void }) {
  const { tr, n } = useLang();
  const p = useProfile();
  const s = p.settings;
  const [confirm, setConfirm] = useState(false);
  const photo = usePhoto();
  const [draft, setDraft] = useState(p.name);
  const [nameErr, setNameErr] = useState('');
  const [picErr, setPicErr] = useState('');
  const saveName = () => {
    const r = checkName(draft);
    if ('error' in r) {
      setNameErr(r.error === 'empty' ? tr('نام نمی‌تواند خالی باشد.', "Name can't be empty.")
        : tr(`نام حداکثر ${n(NAME_MAX)} حرف باشد.`, `Name can be at most ${NAME_MAX} characters.`));
      return;
    }
    update((q) => ({ ...q, name: r.name }));
    setDraft(r.name);
    setNameErr('');
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      setPicErr(setPhoto(await readPhoto(file)) ? '' : tr('ذخیرهٔ تصویر ممکن نشد.', "Couldn't save the picture."));
    } catch (err) {
      setPicErr((err as Error).message === 'too-big' ? tr('تصویر بزرگ‌تر از ۱۰ مگابایت است.', 'Picture is larger than 10 MB.')
        : tr('این فایل تصویر نیست یا باز نشد.', "That file isn't a picture we can open."));
    }
    input.value = '';
  };
  const set = <K extends keyof S>(k: K, v: S[K]) => update((q) => ({ ...q, settings: { ...q.settings, [k]: v } }));
  const [remFailed, setRemFailed] = useState(false);
  const Tog = ({ k, label }: { k: 'music' | 'effects' | 'hints' | 'noSurInLastRound' | 'mustCapture'; label: string }) => (
    <label className="tog"><span>{label}</span><input type="checkbox" checked={s[k]} onChange={(e) => set(k, e.target.checked)} /></label>
  );
  return (
    <div className="scroll col" style={{ padding: 0, gap: 12 }}>
      <Header />
      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('پروفایل', 'Profile')}</h3>
        <div className="row" style={{ alignItems: 'center', gap: 10 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--panel2)', fontSize: 28, fontWeight: 800, flex: 'none' }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ([...p.name][0] ?? '👤')}
          </div>
          <label className="btn">{tr('انتخاب تصویر', 'Choose picture')}
            <input type="file" accept="image/*" hidden onChange={onFile} /></label>
          {photo && <button className="btn ghost" onClick={() => { setPhoto(null); setPicErr(''); }}>{tr('حذف تصویر', 'Remove picture')}</button>}
        </div>
        <div className="row" style={{ alignItems: 'center', gap: 8 }}>
          <span>{tr('نام شما', 'Your name')}</span>
          <input value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)}
            style={{ font: 'inherit', background: 'var(--panel2)', color: 'var(--ink)', border: 0, borderRadius: 10, padding: 7, width: 130 }} />
          <button className="btn" onClick={saveName}>{tr('ذخیره', 'Save')}</button>
        </div>
        {(nameErr || picErr) && <span role="alert">{nameErr || picErr}</span>}
        <span className="mute">{tr('تصویر پروفایل فقط روی همین گوشی ذخیره می‌شود و با آواتار بازی فرق دارد.', 'Your profile picture stays on this device and is separate from your in-game avatar.')}</span>
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('عمومی', 'General')}</h3>
        <label className="tog"><span>{tr('زبان', 'Language')}</span>
          <select value={s.lang} onChange={(e) => set('lang', e.target.value as S['lang'])}><option value="fa">فارسی</option><option value="en">English</option></select></label>
        <Tog k="music" label={tr('موسیقی', 'Music')} />
        <Tog k="effects" label={tr('جلوه‌های صوتی', 'Sound effects')} />
        <Tog k="hints" label={tr('نمایش راهنما (برجسته‌کردن برداشت‌های ممکن)', 'Hints (highlight valid captures)')} />
        <label className="tog"><span>{tr('زمان روز در آرنا', 'Time of day')}</span>
          <select value={s.timeOfDay} onChange={(e) => set('timeOfDay', e.target.value as S['timeOfDay'])}>
            <option value="auto">{tr('خودکار (ساعت گوشی)', 'Automatic')}</option>
            <option value="day">{tr('روز', 'Day')}</option><option value="dusk">{tr('غروب', 'Dusk')}</option><option value="night">{tr('شب', 'Night')}</option></select></label>
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('قوانین (برای بازی‌های جدید)', 'House rules (new matches)')}</h3>
        <Tog k="noSurInLastRound" label={tr('در نوبت آخر سور حساب نمی‌شود', 'No sur in the last round')} />
        <Tog k="mustCapture" label={tr('کارتی که می‌تواند بردارد نباید روی زمین بیفتد', 'A card that can capture may not be dropped')} />
        <label className="tog"><span>{tr('زمین اول: سرباز', 'Opening floor jack')}</span>
          <select value={s.openingJack} onChange={(e) => set('openingJack', e.target.value as S['openingJack'])}>
            <option value="replace">{tr('جایگزین شود', 'Replace it')}</option><option value="allow">{tr('بماند', 'Allow it')}</option></select></label>
        <label className="tog"><span>{tr('امتیاز سور سرباز', 'Sur Sarbaz points')}</span>
          <select value={s.surSarbazPoints} onChange={(e) => set('surSarbazPoints', Number(e.target.value) as 5 | 10)}><option value="10">۱۰</option><option value="5">۵</option></select></label>
        <span className="mute">{tr('پیش‌فرض‌ها طبق فایل قوانین و منابع معتبر است؛ جزئیات در docs/rules-spec.md', 'Defaults follow your rules file and validated sources; see docs/rules-spec.md')}</span>
      </div>

      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('اعلان‌ها', 'Notifications')}</h3>
        <label className="tog"><span>{tr('یادآوری روزانه (ساعت ۲۰)', 'Daily reminder (8 pm)')}</span>
          <input type="checkbox" checked={s.notifications} disabled={!remindersSupported()}
            onChange={(e) => {
              const checked = e.target.checked;
              void setReminder(checked, s.lang).then((ok) => { set('notifications', ok); setRemFailed(checked && !ok); });
            }} /></label>
        {remFailed && <span className="mute">{tr('اجازهٔ اعلان داده نشد. آن را در تنظیمات گوشی برای چهاربرگ روشن کنید.', 'Notifications were not allowed. Turn them on for Chaharbarg in your phone settings.')}</span>}
        {!remindersSupported() && <span className="mute">{tr('فقط در نسخهٔ نصبی', 'Only in the installed app')}</span>}
        <span className="mute">{tr('یادآوری روی همین گوشی؛ بدون سرور.', 'Reminders are local to this device; no server.')}</span>
      </div>

      <div className="panel col" style={{ margin: '0 14px 14px' }}>
        <button className="btn" onClick={onTutorial}>📖 {tr('آموزش بازی', 'How to play')}</button>
        <a className="btn" href={supportHref(s.lang)}>✉️ {tr('تماس با پشتیبانی', 'Contact support')}</a>
        <a className="btn" href={feedbackHref(s.lang)}>💬 {tr('ارسال نظر و پیشنهاد', 'Send feedback / suggestions')}</a>
        <span className="mute">{SUPPORT_EMAIL}</span>
        {!confirm ? <button className="btn danger" onClick={() => setConfirm(true)}>{tr('پاک‌کردن همهٔ اطلاعات', 'Erase all data')}</button>
          : <div className="row"><button className="btn danger grow" onClick={() => { void setReminder(false, s.lang); resetAll(); setDraft(''); setNameErr(''); setPicErr(''); setConfirm(false); }}>{tr('مطمئنم، پاک شود', 'Yes, erase')}</button><button className="btn ghost" onClick={() => setConfirm(false)}>{tr('نه', 'No')}</button></div>}
        <span className="mute">{tr('چهاربرگ — نسخهٔ ۰٫۱ · همه‌چیز روی همین گوشی ذخیره می‌شود.', 'Chaharbarg v0.1 · everything is stored on this device.')}</span>
      </div>
    </div>
  );
}
