// Tiny Chrome DevTools driver (no dependencies): `npm run dev` in another shell, then
//   CHROME=/path/to/chrome PLAYERS=2|3|4 MODE=bots|pnp node e2e/cdp.mjs smoke
// Plays a whole match with random moves, takes screenshots into $OUT and reports console errors.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const OUT = process.env.OUT || `${tmpdir()}/chaharbarg-shots`;
mkdirSync(OUT, { recursive: true });
const PORT = 9333;
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--user-data-dir=' + OUT + '/profile', '--no-first-run',
  '--window-size=430,900', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no chrome');
}
const ws = new WebSocket(await connect());
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value || a.description).join(' '));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
export const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description));
  return r.result?.result?.value;
};
export const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
export const go = async (url) => { await send('Page.navigate', { url }); await sleep(1500); };
export const clickText = (text, sel = 'button') => ev(`(()=>{const b=[...document.querySelectorAll('${sel}')].find(x=>x.textContent.includes(${JSON.stringify(text)})&&!x.disabled);if(b){b.click();return true}return false})()`);
export { sleep, errors };

const scenario = await import(`./${process.argv[2] || 'smoke'}.mjs`);
try { await scenario.default({ ev, shot, go, clickText, sleep, errors }); }
catch (e) { console.log('SCENARIO ERROR', e.message); }
console.log('console errors:', JSON.stringify(errors, null, 1));
ws.close(); chrome.kill(); process.exit(0);
