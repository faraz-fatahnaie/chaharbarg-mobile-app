export default async ({ ev, shot, go, clickText, sleep }) => {
  await go('' + (process.env.URL || 'http://127.0.0.1:5173/') + '?fast');
  await ev(`localStorage.clear()`);
  await go('' + (process.env.URL || 'http://127.0.0.1:5173/') + '?fast');
  const P = process.env.PLAYERS, MODE = process.env.MODE, TAG = process.env.TAG || '';
  if (P) await clickText(`${'۰۱۲۳۴'[P]} نفره`);
  if (MODE === 'pnp') await clickText('یک گوشی');
  await shot(TAG + '01-home');
  console.log('start', await clickText('شروع بازی'));
  await sleep(800);
  await shot(TAG + '02-game-start');

  const t0 = Date.now();
  let steps = 0, deals = 0, lastLog = 0;
  while (steps++ < 3000 && Date.now() - t0 < 150000) {
    const st = await ev(`(()=>{
      const modal=document.querySelector('.modal'); const txt=modal?modal.textContent:'';
      const btns=[...document.querySelectorAll('.actions .btn')].map(b=>b.textContent+(b.disabled?'(d)':''));
      return {txt: txt.slice(0,400), hint: document.querySelector('.hint-line')?.textContent||'', btns, floor: document.querySelectorAll('.floor .card').length}
    })()`);
    if (Date.now() - lastLog > 5000) { lastLog = Date.now(); console.log('t', Math.round((Date.now() - t0) / 1000), 'steps', steps, 'deals', deals, JSON.stringify(st)); }
    if (/بازی دوباره|Play again/.test(st.txt)) break;
    if (await ev(`(()=>{const b=document.querySelector('.handoff .btn'); if(b){b.click(); return true} return false})()`)) { await sleep(60); continue; }
    if (/پایان دست/.test(st.txt)) {
      deals++;
      if (deals === 1) await shot(TAG + '03-deal-summary');
      (await clickText('دست بعد')) || (await clickText('نتیجهٔ بازی'));
      await sleep(80);
      continue;
    }
    if (st.hint) {
      await ev(`(()=>{const cs=[...document.querySelectorAll('.myhand .card')]; if(cs.length) cs[Math.floor(Math.random()*cs.length)].click();})()`);
      await sleep(25);
      const h = await ev(`document.querySelector('.hint-line').textContent`);
      if (/دوباره بزن/.test(h)) {
        await ev(`document.querySelector('.myhand .card.sel')?.click()`);
      } else if (/یک ترکیب/.test(h)) {
        const chips = await ev(`document.querySelectorAll('.optchip').length`);
        await ev(`document.querySelectorAll('.optchip')[${Math.floor(Math.random() * 3) % 1 + 0}]?.click()`);
        await sleep(20);
        await clickText('بردار');
      }
    }
    await sleep(20);
  }
  await shot(TAG + '04-result');
  console.log('steps', steps, 'deals', deals);
  await clickText('خانه');
  await sleep(300);
  await shot('05-home-after');
};
