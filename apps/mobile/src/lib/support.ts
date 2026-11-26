import { Capacitor } from '@capacitor/core';
import { version as APP_VERSION } from '../../package.json';

// F-101: no real support address yet. Empty hides the support/feedback links in Settings; set it to enable them.
export const SUPPORT_EMAIL = '';

export const mailto = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const info = () => `Chaharbarg ${APP_VERSION} (${Capacitor.getPlatform()})`;

export const supportHref = (lang: 'fa' | 'en') =>
  mailto(SUPPORT_EMAIL, lang === 'fa' ? 'پشتیبانی چهاربرگ' : 'Chaharbarg support', `\n\n${info()}`);

export const feedbackHref = (lang: 'fa' | 'en') =>
  mailto(
    SUPPORT_EMAIL,
    lang === 'fa' ? 'نظر و پیشنهاد' : 'Feedback / suggestion',
    `${lang === 'fa' ? 'نظر یا پیشنهاد شما:' : 'Your feedback or suggestion:'}\n\n\n${info()}`,
  );
