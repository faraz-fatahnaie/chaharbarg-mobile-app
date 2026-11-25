import { Capacitor } from '@capacitor/core';
import { version as APP_VERSION } from '../../package.json';

// ponytail: guessed from the appId app.chaharbarg.game; a person must confirm this address before release.
export const SUPPORT_EMAIL = 'support@chaharbarg.app';

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
