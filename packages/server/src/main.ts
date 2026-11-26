import { mkdirSync } from 'node:fs';
import { createApp } from './server';
import { openDb } from './db';

process.on('uncaughtException', (e) => console.error('uncaught exception', e));
process.on('unhandledRejection', (e) => console.error('unhandled rejection', e));

const port = Number(process.env.PORT ?? 8787);
// Loopback by default; set HOST=0.0.0.0 to serve a phone on the LAN. In production put a TLS proxy in front:
// bearer tokens travel in every request and must never cross the internet over plain HTTP.
const host = process.env.HOST ?? '127.0.0.1';
mkdirSync('data', { recursive: true });
// TRUST_PROXY=1 only behind your own reverse proxy: per-IP limits then use the proxy's X-Forwarded-For hop.
const app = createApp({ db: openDb(process.env.DB_PATH ?? 'data/server.db'), trustProxy: process.env.TRUST_PROXY === '1' });
app.server.listen(port, host, () => console.log(`chaharbarg server on http://${host}:${port}`));

// Graceful shutdown: stop accepting, end matches in progress as aborted (see createApp's close), close the database.
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    console.log(`${sig}: shutting down`);
    app.close();
    process.exit(0);
  });
}
