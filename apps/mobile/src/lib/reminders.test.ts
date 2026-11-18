import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

import { REMINDER_ID, setReminder, type ReminderApi } from './reminders';

function fake(check: string, request = check) {
  const calls: string[] = [];
  const api = {
    checkPermissions: vi.fn(async () => ({ display: check })),
    requestPermissions: vi.fn(async () => ({ display: request })),
    schedule: vi.fn(async () => { calls.push('schedule'); return { notifications: [] }; }),
    cancel: vi.fn(async () => { calls.push('cancel'); }),
  };
  return { api: api as unknown as ReminderApi, mocks: api, calls };
}

describe('setReminder', () => {
  it('schedules daily at 20:00 after cancelling any previous one', async () => {
    const { api, mocks, calls } = fake('granted');
    expect(await setReminder(true, 'en', api)).toBe(true);
    expect(mocks.schedule).toHaveBeenCalledTimes(1);
    const n = (mocks.schedule.mock.calls[0] as unknown as [{ notifications: Array<Record<string, unknown>> }])[0].notifications[0];
    expect(n.id).toBe(REMINDER_ID);
    expect(n.schedule).toMatchObject({ on: { hour: 20, minute: 0 } });
    expect(n.isExactNotification).toBe(false);
    expect(n.title).toBe('Chaharbarg');
    expect(n.body).toBe('Your daily reward is waiting');
    expect(calls).toEqual(['cancel', 'schedule']);
  });

  it('requests permission when it is only promptable', async () => {
    const { api, mocks } = fake('prompt', 'granted');
    expect(await setReminder(true, 'en', api)).toBe(true);
    expect(mocks.requestPermissions).toHaveBeenCalled();
    expect(mocks.schedule).toHaveBeenCalled();
  });

  it('returns false and does not schedule when permission is denied', async () => {
    const { api, mocks } = fake('denied');
    expect(await setReminder(true, 'en', api)).toBe(false);
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('returns false when the plugin throws', async () => {
    const { api, mocks } = fake('granted');
    mocks.schedule.mockRejectedValueOnce(new Error('boom'));
    await expect(setReminder(true, 'en', api)).resolves.toBe(false);
  });

  it('cancels when turned off', async () => {
    const { api, mocks } = fake('granted');
    expect(await setReminder(false, 'fa', api)).toBe(false);
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: REMINDER_ID }] });
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('uses Persian text for fa', async () => {
    const { api, mocks } = fake('granted');
    await setReminder(true, 'fa', api);
    const n = (mocks.schedule.mock.calls[0] as unknown as [{ notifications: Array<Record<string, unknown>> }])[0].notifications[0];
    expect(n.body).toBe('جایزهٔ روزانه‌ات آماده است');
  });
});
