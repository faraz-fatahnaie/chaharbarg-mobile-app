// Screenshots of the non-game screens: node e2e/cdp.mjs tabs
export default async ({ ev, shot, go, clickText, sleep }) => {
  const url = (process.env.URL || 'http://127.0.0.1:5173/') + '?fast';
  await go(url);
  await ev('localStorage.clear()');
  await go(url);
  await clickText('دریافت جایزه'); // daily login
  await sleep(200);
  await clickText('فروشگاه', '.tabs button'); await sleep(300); await shot('tab-shop');
  await clickText('آمار', '.tabs button'); await sleep(300); await shot('tab-stats');
  await clickText('تنظیمات', '.tabs button'); await sleep(300); await shot('tab-settings');
  await clickText('خانه', '.tabs button'); await sleep(300);
  await clickText('آموزش بازی'); await sleep(300); await shot('tutorial-1');
  for (let i = 0; i < 4; i++) { await clickText('بعدی'); await sleep(120); }
  await shot('tutorial-5');
};
