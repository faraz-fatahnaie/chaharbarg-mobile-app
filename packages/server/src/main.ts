import { mkdirSync } from 'node:fs';
import { createApp } from './server';
import { openDb } from './db';

const port = Number(process.env.PORT ?? 8787);
mkdirSync('data', { recursive: true });
const app = createApp({ db: openDb(process.env.DB_PATH ?? 'data/server.db') });
app.server.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`chaharbarg server on http://localhost:${port}`));
