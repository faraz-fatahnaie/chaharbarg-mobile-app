import { describe, expect, it } from 'vitest';
import { PHOTO_MAX_CHARS, checkName, isPhotoDataUrl } from './identity';

describe('checkName', () => {
  it('trims', () => expect(checkName('  Faraz ')).toEqual({ name: 'Faraz' }));
  it('accepts Persian with a combining mark', () => expect(checkName('فرازِ')).toEqual({ name: 'فرازِ' }));
  it('accepts 14 code points', () => expect(checkName('a'.repeat(14))).toEqual({ name: 'a'.repeat(14) }));
  it('rejects empty', () => {
    expect(checkName('')).toEqual({ error: 'empty' });
    expect(checkName('   ')).toEqual({ error: 'empty' });
  });
  it('rejects 15 characters', () => expect(checkName('a'.repeat(15))).toEqual({ error: 'long' }));
});

describe('isPhotoDataUrl', () => {
  it('accepts a jpeg data url', () => expect(isPhotoDataUrl('data:image/jpeg;base64,AAAA')).toBe(true));
  it('rejects others', () => {
    expect(isPhotoDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isPhotoDataUrl('javascript:alert(1)')).toBe(false);
    expect(isPhotoDataUrl(5)).toBe(false);
    expect(isPhotoDataUrl(null)).toBe(false);
    expect(isPhotoDataUrl('data:image/jpeg;base64,' + 'A'.repeat(PHOTO_MAX_CHARS))).toBe(false);
  });
});
