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

const bought: { sku: string; token: string }[] = (() => {
  try { return JSON.parse(localStorage.getItem('chaharbarg.mockstore') ?? '[]'); } catch { return []; }
})();

export const storeProvider: StoreProvider = {
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
