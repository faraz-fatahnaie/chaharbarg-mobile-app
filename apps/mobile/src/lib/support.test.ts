import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));

import { SUPPORT_EMAIL, feedbackHref, mailto, supportHref } from './support';

describe('support links', () => {
  it('mailto encodes subject and body', () => {
    const u = mailto('a@b.c', 'نظر و پیشنهاد', 'x y');
    expect(u.startsWith('mailto:a@b.c?subject=')).toBe(true);
    expect(u).toContain(encodeURIComponent('نظر و پیشنهاد'));
    expect(u).toContain('body=x%20y');
    expect(u).not.toContain(' ');
  });

  it('support and feedback target the support address', () => {
    expect(supportHref('en').startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
    expect(feedbackHref('fa').startsWith(`mailto:${SUPPORT_EMAIL}?`)).toBe(true);
  });
});
