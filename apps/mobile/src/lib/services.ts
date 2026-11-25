/*
 * Distribution-specific services behind small interfaces, so the app code never imports a vendor SDK.
 *
 *  Android (Cafe Bazaar / Myket builds): AdProvider -> Tapsell / Adivery / Yektanet native SDK,
 *  StoreProvider -> Poolakey (Bazaar) or Myket billing, wired through a Capacitor plugin.
 *  Web / PWA build (iOS Safari in Iran, demo): the mock providers below.
 *
 * Mock providers are clearly labelled in the UI and carry no real money.
 */

export interface AdProvider {
  readonly name: string;
  /** Resolves true only when the viewer finished the ad. Never call this while a hand is in progress. */
  showRewarded(placement: 'home' | 'result' | 'shop'): Promise<boolean>;
}

export interface StoreProvider {
  readonly name: string;
  readonly isMock: boolean;
  purchase(sku: string): Promise<{ token: string } | null>;
  /** Tokens of purchases the store still has on record (for "restore purchases"). */
  restore(): Promise<{ sku: string; token: string }[]>;
}

type AdUI = (resolve: (ok: boolean) => void) => void;
let adUI: AdUI | null = null;
export const registerAdUI = (f: AdUI | null) => { adUI = f; };

export const adProvider: AdProvider = {
  name: 'mock',
  showRewarded: () => new Promise<boolean>((res) => (adUI ? adUI(res) : res(false))),
};

type PayUI = (sku: string, resolve: (token: string | null) => void) => void;
let payUI: PayUI | null = null;
export const registerPayUI = (f: PayUI | null) => { payUI = f; };

/** The mock store hands out Gohar for free, so only dev builds or an explicit VITE_MOCK_STORE=1 build (demo / PWA) get it. */
export const mockStoreAllowed = (env: { DEV?: boolean; VITE_MOCK_STORE?: string } = import.meta.env) =>
  !!env.DEV || env.VITE_MOCK_STORE === '1';
const MOCK = mockStoreAllowed();

const bought: { sku: string; token: string }[] = (() => {
  if (!MOCK) return [];
  try {
    const v: unknown = JSON.parse(localStorage.getItem('chaharbarg.mockstore') ?? '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.sku === 'string' && typeof x.token === 'string') : [];
  } catch { return []; }
})();

/** Release build without a real billing plugin wired in: nothing can be bought. */
const noStore: StoreProvider = { name: 'none', isMock: false, purchase: async () => null, restore: async () => [] };

export const storeProvider: StoreProvider = !MOCK ? noStore : {
  name: 'mock',
  isMock: true,
  purchase: (sku) =>
    new Promise((res) =>
      payUI
        ? payUI(sku, (token) => {
            if (token) {
              bought.push({ sku, token });
              try { localStorage.setItem('chaharbarg.mockstore', JSON.stringify(bought)); } catch { /* ignore */ }
            }
            res(token ? { token } : null);
          })
        : res(null),
    ),
  restore: async () => [...bought],
};
