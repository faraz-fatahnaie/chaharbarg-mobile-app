// Checks a build made with VITE_AUTOPILOT=...: waits for the in-app autopilot overlay to report DONE.
// VITE_AUTOPILOT=2:bots npm run build && npx vite preview --port 4173  then  URL=http://127.0.0.1:4173/ node e2e/cdp.mjs autopilot
export default async ({ ev, go, sleep, shot }) => {
  await go(process.env.URL || 'http://127.0.0.1:4173/');
  // the service worker is cache-first: drop it and its cache so a fresh build is what loads
  await ev(`(async()=>{localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k);})()`);
  await go(process.env.URL || 'http://127.0.0.1:4173/');
  let text = '';
  for (let i = 0; i < 240; i++) {
    await sleep(1000);
    text = await ev(`[...document.body.children].map(e=>e.textContent).find(t=>t.startsWith('AUTOPILOT')) || ''`);
    if (/DONE|FAILED|TIMEOUT/.test(text)) break;
  }
  console.log(text);
  await shot('autopilot-done');
};
