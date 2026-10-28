import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/900.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// test hook: only present in builds made with VITE_AUTOPILOT=<players>:<bots|pnp>
if (import.meta.env.VITE_AUTOPILOT) void import('./lib/autopilot').then((m) => m.run(String(import.meta.env.VITE_AUTOPILOT)));

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
