import { useProfile } from './store';

export type Lang = 'fa' | 'en';

/** Persian first. Strings live next to the UI that uses them: tr(fa, en). */
export function useLang() {
  const lang = useProfile().settings.lang;
  const tr = (fa: string, en: string) => {
    if (import.meta.env.DEV && (!fa || !en)) console.warn('tr(): empty translation', { fa, en });
    return lang === 'fa' ? fa : en;
  };
  const n = (x: number | string) => (typeof x === 'number' ? x.toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US') : lang === 'fa' ? toFa(x) : x);
  // Persian calendar in Persian, Gregorian in English
  const date = (d = new Date()) =>
    new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US', { dateStyle: 'long' }).format(d);
  return { lang, tr, n, date, dir: lang === 'fa' ? 'rtl' : 'ltr' } as const;
}

export const toFa = (s: string) => s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
