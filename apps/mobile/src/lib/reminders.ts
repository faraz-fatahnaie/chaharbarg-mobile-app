import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const REMINDER_ID = 1001;
export const REMINDER_HOUR = 20;

export type ReminderApi = Pick<typeof LocalNotifications, 'checkPermissions' | 'requestPermissions' | 'schedule' | 'cancel'>;

/** The web plugin ignores `schedule.on` and would fire at once, so only native builds get reminders. */
export const remindersSupported = () => Capacitor.isNativePlatform();

const TEXT = {
  fa: { title: 'چهاربرگ', body: 'جایزهٔ روزانه‌ات آماده است' },
  en: { title: 'Chaharbarg', body: 'Your daily reward is waiting' },
};

/** Turns the daily local reminder on or off. Returns whether it is now active; never throws. */
export async function setReminder(on: boolean, lang: 'fa' | 'en', api: ReminderApi = LocalNotifications): Promise<boolean> {
  try {
    const ids = { notifications: [{ id: REMINDER_ID }] };
    if (!on) {
      await api.cancel(ids);
      return false;
    }
    let perm = await api.checkPermissions();
    if (perm.display !== 'granted') perm = await api.requestPermissions();
    if (perm.display !== 'granted') return false;
    await api.cancel(ids);
    await api.schedule({
      notifications: [{ id: REMINDER_ID, ...TEXT[lang], schedule: { on: { hour: REMINDER_HOUR, minute: 0 }, allowWhileIdle: true }, isExactNotification: false }],
    });
    return true;
  } catch {
    return false;
  }
}
