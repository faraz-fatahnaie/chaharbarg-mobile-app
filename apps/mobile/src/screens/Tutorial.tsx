import { useState } from 'react';
import { makeCard } from '@chaharbarg/engine';
import { CardView } from '../art/CardView';
import { applyDelta } from '../economy/economy';
import { useLang } from '../lib/i18n';
import { sfx } from '../lib/sound';
import { update, useProfile } from '../lib/store';

const c = (s: 'S' | 'H' | 'D' | 'C', r: number) => makeCard(s, r);

export function Tutorial({ onClose }: { onClose: () => void }) {
  const { tr } = useLang();
  const p = useProfile();
  const [i, setI] = useState(0);
  const deck = p.equipped.deck;
  const row = (cards: ReturnType<typeof c>[], mark?: number) => (
    <div className="demo">{cards.map((k, j) => <CardView key={j} card={k} deck={deck} glow={mark === j} />)}</div>
  );
  const slides = [
    { t: tr('هدف بازی', 'Goal'), b: tr('با برداشتن برگ‌های ارزشمند از روی زمین، امتیاز جمع کن. خاج‌ها ۷ امتیاز، هر آس و سرباز ۱، ده خشت ۳، دو خاج ۲ و هر سور ۵ امتیاز دارد.', 'Collect valuable cards from the floor. Seven clubs = 7, each Ace and Jack = 1, 10♦ = 3, 2♣ = 2, each sur = 5.'), d: row([c('C', 2), c('D', 10), c('S', 1), c('H', 11)]) },
    { t: tr('جمع یازده', 'Make eleven'), b: tr('کارتت را بازی کن؛ اگر با یک یا چند کارت زمین جمعش ۱۱ شود، همه را برمی‌داری. آس ۱ حساب می‌شود.', 'Play a card; if it adds up to 11 with one or more floor cards, you take them. Ace counts 1.'), d: <><div className="mute">{tr('۵ + ۶ = ۱۱', '5 + 6 = 11')}</div>{row([c('C', 5), c('H', 6)])}<div className="mute">{tr('۳ + ۶ + ۲ = ۱۱', '3 + 6 + 2 = 11')}</div>{row([c('S', 3), c('D', 6), c('H', 2)])}</> },
    { t: tr('سرباز', 'The Jack'), b: tr('سرباز همهٔ برگ‌های زمین را می‌برد، جز بی‌بی و شاه — مهم نیست جمعشان چند باشد. اگر فقط بی‌بی و شاه روی زمین باشد، سرباز چیزی نمی‌برد.', 'A Jack takes every floor card except Queens and Kings, whatever the sum. If only Queens and Kings are there, it takes nothing.'), d: row([c('S', 11), c('H', 4), c('D', 9), c('C', 7)], 0) },
    { t: tr('بی‌بی و شاه', 'Queens & Kings'), b: tr('بی‌بی فقط بی‌بی را می‌برد و شاه فقط شاه را — یکی در هر نوبت.', 'A Queen only takes a Queen and a King only a King — one per turn.'), d: <>{row([c('S', 12), c('H', 12)])}{row([c('D', 13), c('C', 13)])}</> },
    { t: tr('سور!', 'Sur!'), b: tr('اگر برداشتنت زمین را کاملاً خالی کند، سور زده‌ای (۵ امتیاز). با سرباز و در نوبت آخر سور حساب نمی‌شود. اگر سربازی تنها روی زمین باشد و حریف با سرباز آن را ببرد، «سور سرباز» است (۱۰ امتیاز).', 'Clear the whole floor and you score a Sur (5). A Jack never scores one, nor does the last round. If a lone Jack sits on the floor and the next player takes it with a Jack, that is a Sur Sarbaz (10).'), d: <div style={{ fontSize: 54, color: 'var(--gold)', fontWeight: 900 }}>{tr('سور!', 'Sur!')}</div> },
    { t: tr('آرناها', 'Arenas'), b: tr('در هر آرنا ورودیِ شاهی می‌پردازی و با بردن، جام می‌گیری. با جام بیشتر، آرنای بعدی باز می‌شود. شاهی هیچ ارزش پولی ندارد.', 'Each arena has a Shahi entry fee; winning earns trophies that unlock the next arena. Shahi has no real-money value.'), d: <div style={{ fontSize: 46 }}>🏛 → 🌉 → 🏯</div> },
  ];
  const s = slides[i];
  const last = i === slides.length - 1;
  return (
    <div className="modal" style={{ zIndex: 60 }}>
      <div className="sheet col">
        <div className="slide"><h2>{s.t}</h2>{s.d}<p style={{ margin: 0, lineHeight: 1.9 }}>{s.b}</p></div>
        <div className="dots">{slides.map((_, j) => <i key={j} className={j === i ? 'on' : ''} />)}</div>
        <div className="row">
          <button className="btn ghost" onClick={onClose}>{tr('بستن', 'Close')}</button>
          <span className="grow" />
          {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>{tr('قبلی', 'Back')}</button>}
          <button className="btn primary" onClick={() => {
            sfx('click');
            if (!last) return setI(i + 1);
            update((q) => (q.tutorialDone ? q : { ...applyDelta(q, 0, 5, 'tutorial', Date.now()), tutorialDone: true }));
            onClose();
          }}>{last ? tr('تمام', 'Done') : tr('بعدی', 'Next')}</button>
        </div>
      </div>
    </div>
  );
}
