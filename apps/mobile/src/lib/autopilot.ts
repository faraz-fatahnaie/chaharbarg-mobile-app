// Test hook, compiled in only when the build sets VITE_AUTOPILOT: "<players>:<bots|pnp>[:slow]".
// It clicks the real UI (cards, buttons, modals) with random choices and paints its progress on screen so a simulator
// screenshot or video shows the outcome. ":slow" paces it like a person and tours the whole app first (for recordings).
// Normal builds never include this file.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];

function clickText(text: string, sel = 'button') {
  const b = qa<HTMLButtonElement>(sel).find((x) => x.textContent?.includes(text) && !x.disabled);
  b?.click();
  return !!b;
}

export async function run(spec: string) {
  const [players = '2', mode = 'bots', pace = ''] = spec.split(':');
  const slow = pace === 'slow';
  const wait = (ms: number) => sleep(slow ? ms : Math.min(ms, 25));
  let errors = 0;
  window.addEventListener('error', () => errors++);
  window.addEventListener('unhandledrejection', () => errors++);

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:6px;right:6px;top:calc(env(safe-area-inset-top) + 2px);z-index:9999;pointer-events:none;background:rgba(0,0,0,.72);color:#7CFC9A;font:10px/1.35 monospace;padding:4px 6px;border-radius:8px;direction:ltr;white-space:pre-wrap';
  document.body.appendChild(box);
  const show = (s: string) => {
    box.textContent = `AUTOPILOT ${spec}\n${s}`;
    console.log(`AUTOPILOT_STATUS ${s.replace(/\n/g, ' | ')}`); // visible in the device log (Capacitor forwards console.log)
  };
  const tabs: string[] = [];

  await sleep(slow ? 2500 : 1500);

  if (slow) {
    // ---- tour: tabs, settings (single-deal target so the recorded match is short), tutorial, daily reward ----
    show('tour: shop · stats · settings');
    for (const t of ['فروشگاه', 'آمار', 'تنظیمات']) {
      clickText(t, '.tabs button');
      await wait(1800);
      tabs.push(`${t}:${(q('.scroll')?.textContent ?? '').length > 50 ? 'ok' : 'EMPTY'}`);
      if (t === 'فروشگاه') { clickText('پشت کارت'); await wait(1200); clickText('رومیزی'); await wait(1200); }
      if (t === 'تنظیمات') {
        const sel = qa<HTMLSelectElement>('select').find((s) => [...s.options].some((o) => o.value === 'single'));
        if (sel) { sel.value = 'single'; sel.dispatchEvent(new Event('change', { bubbles: true })); await wait(1200); }
        q('.scroll')?.scrollTo({ top: 400, behavior: 'smooth' });
        await wait(1500);
      }
    }
    clickText('خانه', '.tabs button');
    await wait(1500);
    show('tour: tutorial + daily reward');
    clickText('دریافت جایزه');
    await wait(1200);
    if (clickText('آموزش بازی')) {
      await wait(1500);
      for (let i = 0; i < 6; i++) { if (!clickText('بعدی')) clickText('تمام'); await wait(1500); }
    }
    q('.arenas')?.scrollTo({ left: -300, behavior: 'smooth' });
    await wait(1500);
  }

  if (players !== '2') clickText(`${'۰۱۲۳۴'[Number(players)]} نفره`);
  if (mode === 'pnp') clickText('یک گوشی');
  await wait(800);
  if (!clickText('شروع بازی')) { show('FAILED: start button not found'); return; }

  const t0 = Date.now();
  let steps = 0;
  let deals = 0;
  let summary = '';
  while (steps++ < 8000 && Date.now() - t0 < 420_000) {
    const txt = q('.modal')?.textContent ?? '';
    if (txt.includes('بازی دوباره')) { await wait(3500); summary = txt.slice(0, 90); break; }
    const hand = q('.handoff .btn');
    if (hand) { await wait(600); hand.click(); await wait(300); continue; }
    if (txt.includes('پایان دست')) {
      deals++;
      await wait(3500);
      clickText('دست بعد') || clickText('نتیجهٔ بازی');
      await wait(300);
      continue;
    }
    if (q('.hint-line')?.textContent) {
      const cards = qa('.myhand .card');
      if (cards.length) cards[Math.floor(Math.random() * cards.length)].click();
      await wait(700);
      const h = q('.hint-line')?.textContent ?? '';
      if (/دوباره بزن/.test(h)) { await wait(400); q('.myhand .card.sel')?.click(); }
      else if (/یک ترکیب/.test(h)) { q('.optchip')?.click(); await wait(700); clickText('بردار'); }
      await wait(500);
    }
    if (steps % 40 === 0) show(`deal ${deals + 1} · steps ${steps} · errors ${errors}`);
    await sleep(slow ? 150 : 25);
  }
  if (!summary) { show(`TIMEOUT/STUCK after ${steps} steps, ${deals} deals, errors ${errors}`); return; }

  clickText('خانه');
  await wait(1500);
  if (!slow) {
    for (const t of ['فروشگاه', 'آمار', 'تنظیمات', 'خانه']) {
      clickText(t, '.tabs button');
      await sleep(300);
      tabs.push(`${t}:${(q('.scroll')?.textContent ?? '').length > 50 ? 'ok' : 'EMPTY'}`);
    }
  }
  await wait(2500);
  show(`DONE ✔ ${deals + 1} deal(s) · errors ${errors}\nresult: ${summary}\ntabs ${tabs.join(' ')}`);
}
