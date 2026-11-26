// Layout check for every number card in every deck at three sizes: the corner rank must not touch a pip.
//   npm run dev, then: URL=http://localhost:5173/ node e2e/cards.mjs   (prints "card overlaps: []" when clean)
export default async ({ ev, go, shot }) => {
  await go(process.env.URL || 'http://127.0.0.1:5173/');
  const overlaps = await ev(`(async () => {
    // reuse the exact React copies the app loaded, so hooks inside CardView work
    const dep = (n) => performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes('/deps/' + n + '.js'));
    const React = (await import(dep('react'))).default;
    const rd = await import(dep('react-dom_client'));
    const createRoot = rd.createRoot ?? rd.default.createRoot; // CJS interop shape varies
    const { CardView } = await import('/src/art/CardView.tsx');
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#123;display:flex;flex-wrap:wrap;gap:6px;padding:6px;overflow:auto';
    document.body.append(host);
    const cards = [];
    for (const deck of ['deck-classic', 'deck-large', 'deck-ganjifeh'])
      for (const w of [44, 56, 90])
        for (let rank = 1; rank <= 10; rank++)
          cards.push(React.createElement(CardView, { key: deck + w + rank, deck, card: { id: 'D' + rank, suit: 'D', rank }, style: { '--cw': w + 'px' }, className: 'chk', 'data-k': deck + ' ' + w + 'px rank ' + rank }));
    createRoot(host).render(React.createElement(React.Fragment, null, cards));
    await document.fonts.ready; await new Promise((r) => setTimeout(r, 400));
    // ink boxes, not element boxes: the glyph from canvas metrics, the pip from its drawn shape
    const ctx = document.createElement('canvas').getContext('2d');
    const ink = (b) => {
      const cs = getComputedStyle(b), r = b.getBoundingClientRect();
      ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const m = ctx.measureText(b.textContent);
      const flip = b.parentElement.classList.contains('br'); // the bottom index is rotated 180deg
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize);
      const base = (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      let top = base - m.actualBoundingBoxAscent, bottom = base + m.actualBoundingBoxDescent;
      let left = -m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
      if (flip) [top, bottom, left, right] = [r.height - bottom, r.height - top, r.width - right, r.width - left];
      return { left: r.left + left, right: r.left + right, top: r.top + top, bottom: r.top + bottom };
    };
    const out = [];
    host.querySelectorAll('.card').forEach((c, i) => {
      const meta = ['deck-classic', 'deck-large', 'deck-ganjifeh'].find((d) => c.classList.contains(d)) + ' ' + c.getBoundingClientRect().width + 'px rank ' + (i % 10 + 1);
      for (const b of c.querySelectorAll('.idx b')) {
        const a = ink(b);
        for (const p of c.querySelectorAll('.pip use')) {
          const q = p.getBoundingClientRect();
          const x = Math.min(a.right, q.right) - Math.max(a.left, q.left), y = Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top);
          if (x > 0.5 && y > 0.5) { out.push(meta + ': ' + x.toFixed(1) + 'x' + y.toFixed(1) + 'px'); break; }
        }
      }
    });
    return [...new Set(out)];
  })()`);
  await shot('cards');
  console.log('card overlaps:', JSON.stringify(overlaps, null, 1));
};
