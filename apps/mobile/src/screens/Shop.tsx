import { useState } from 'react';
import { CardView, backStyle } from '../art/CardView';
import { makeCard } from '@chaharbarg/engine';
import { COSMETICS, GOHAR_PACKS, TABLE_COLORS, type CosmeticKind } from '../data/cosmetics';
import { buyCosmetic, equip, grantPurchase } from '../economy/economy';
import { useLang } from '../lib/i18n';
import { storeProvider } from '../lib/services';
import { sfx } from '../lib/sound';
import { update, useProfile } from '../lib/store';
import { Header } from './Home';

const KINDS: { k: CosmeticKind; fa: string; en: string }[] = [
  { k: 'deck', fa: 'دسته کارت', en: 'Decks' },
  { k: 'back', fa: 'پشت کارت', en: 'Card backs' },
  { k: 'table', fa: 'رومیزی', en: 'Tables' },
];

export function Shop() {
  const { tr, n, lang } = useLang();
  const p = useProfile();
  const [kind, setKind] = useState<CosmeticKind>('deck');
  const [msg, setMsg] = useState('');

  async function buyPack(sku: string) {
    const r = await storeProvider.purchase(sku);
    if (!r) return;
    update((q) => grantPurchase(q, sku, r.token, Date.now()));
    sfx('coin');
    setMsg(tr('گوهر به حساب اضافه شد', 'Gohar added'));
  }
  async function restore() {
    const list = await storeProvider.restore();
    update((q) => list.reduce((acc, x) => grantPurchase(acc, x.sku, x.token, Date.now()), q));
    setMsg(tr(`${n(list.length)} خرید بررسی شد؛ خریدهای تکراری دوباره اعمال نمی‌شوند.`, `${list.length} purchases checked; duplicates are never re-applied.`));
  }

  return (
    <div className="scroll col" style={{ padding: 0, gap: 12 }}>
      <Header />
      <div className="panel col" style={{ margin: '0 14px' }}>
        <h3>{tr('گوهر', 'Gohar')} <span className="gem" /></h3>
        <span className="mute">{tr('گوهر فقط برای ظاهر بازی است و هرگز در شرط‌بندی یا ورودی آرنا استفاده نمی‌شود.', 'Gohar only buys cosmetics. It is never used for entry fees or stakes.')}</span>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {GOHAR_PACKS.map((g) => (
            <button key={g.sku} className="btn col" style={{ alignItems: 'center', gap: 2 }} onClick={() => buyPack(g.sku)}>
              <b style={{ color: 'var(--gohar)' }}>{n(g.gohar)} <span className="gem" /></b>
              <small>{n(g.toman)} {tr('تومان', 'Toman')}</small>
            </button>
          ))}
        </div>
        {storeProvider.isMock && <span className="mute">⚠ {tr('نسخهٔ آزمایشی: خرید واقعی نیست. در نسخهٔ بازار/مایکت به درگاه بازار/مایکت وصل می‌شود.', 'Demo build: no real payment. Bazaar/Myket builds use the store billing.')}</span>}
        <button className="btn sm ghost" onClick={restore}>{tr('بازیابی خریدها', 'Restore purchases')}</button>
        {msg && <span className="mute">{msg}</span>}
      </div>

      <div style={{ padding: '0 14px' }}>
        <div className="seg">
          {KINDS.map((x) => <button key={x.k} className={kind === x.k ? 'on' : ''} onClick={() => setKind(x.k)}>{lang === 'fa' ? x.fa : x.en}</button>)}
        </div>
      </div>
      <div className="grid2" style={{ padding: '0 14px 14px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {COSMETICS.filter((c) => c.kind === kind).map((c) => {
          const owned = p.owned.includes(c.id);
          const eq = p.equipped[c.kind] === c.id;
          return (
            <div key={c.id} className={`item ${eq ? 'eq' : ''}`}>
              {c.kind === 'deck' && <div className="swatch" style={{ background: '#0d1830' }}><CardView card={makeCard('H', 12)} deck={c.id} /></div>}
              {c.kind === 'back' && <div className="swatch" style={{ background: '#0d1830' }}><CardView faceDown back={c.id} style={{ ...backStyle(c.id), ['--cw' as string]: '34px' }} /></div>}
              {c.kind === 'table' && <div className="swatch" style={{ background: TABLE_COLORS[c.id]?.felt ?? 'linear-gradient(90deg,#7a5c3a,#2d5b8c,#2f6b3f)' }} />}
              <b>{lang === 'fa' ? c.fa : c.en}</b>
              {owned ? (
                <button className="btn sm" disabled={eq} onClick={() => update((q) => equip(q, c.id))}>{eq ? tr('فعال', 'Equipped') : tr('استفاده', 'Equip')}</button>
              ) : (
                <button className="btn sm primary" disabled={p.gohar < c.gohar} onClick={() => { update((q) => buyCosmetic(q, c.id, Date.now())); sfx('coin'); }}>
                  <span className="gem" /> {n(c.gohar)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
