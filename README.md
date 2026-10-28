# چهاربرگ (Chaharbarg / Pasur)

Offline-first Persian card game for Android and iOS (web/PWA + Capacitor). Persian first, English second.
Play against bots or pass-and-play, in 10 arenas built on Iranian historical sites.

```
packages/engine   pure TypeScript rules engine + bots (no UI deps; reusable on a server)
apps/mobile       React + Vite app, Capacitor shell (android/), economy, art
docs/             rules-spec · research · features · design · plan · screenshots
```

```sh
npm install
npm run dev        # http://localhost:5173  (add ?fast for quick bots)
npm test           # engine + economy tests
npm run build
```

Start with `docs/plan.md` (status and decisions to review), then `docs/rules-spec.md` and `docs/design.md`.
