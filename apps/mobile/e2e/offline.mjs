// Production-bundle check: service worker registers, caches the shell, and the app has no network requests to other hosts.
// node e2e/cdp.mjs offline  (against `vite preview`, e.g. URL=http://127.0.0.1:4173/)
export default async ({ ev, go, sleep, shot }) => {
  const url = process.env.URL || 'http://127.0.0.1:4173/';
  await go(url);
  await sleep(2500);
  const sw = await ev(`(async()=>{const r=await navigator.serviceWorker.getRegistration(); const keys=await caches.keys(); const entries=keys.length?(await (await caches.open(keys[0])).keys()).map(x=>new URL(x.url).pathname):[]; return {registered:!!r, active:!!(r&&r.active), caches:keys, entries}})()`);
  console.log('service worker:', JSON.stringify(sw));
  const hosts = await ev(`[...new Set(performance.getEntriesByType('resource').map(e=>new URL(e.name).host))]`);
  console.log('hosts contacted:', JSON.stringify(hosts));
  await shot('prod-home');
};
