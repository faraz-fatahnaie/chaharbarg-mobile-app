import { useProfile } from './store';

export type Lang = 'fa' | 'en';

/** Persian first. Strings live next to the UI that uses them: tr(fa, en). */
export function useLang() {
  const lang = useProfile().settings.lang;
  const tr = (fa: string, en: string) => (lang === 'fa' ? fa : en);
  const n = (x: number | string) => (typeof x === 'number' ? x.toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US') : lang === 'fa' ? toFa(x) : x);
  const date = (d = new Date()) =>
    new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US-u-ca-persian', { dateStyle: 'long' }).format(d);
  return { lang, tr, n, date, dir: lang === 'fa' ? 'rtl' : 'ltr' } as const;
}

export const toFa = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
