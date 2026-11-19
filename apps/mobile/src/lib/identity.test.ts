import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_MAX_CHARS, checkName, isPhotoDataUrl, readPhoto } from './identity';

function setup(w: number, h: number, fail = false) {
  const drawImage = vi.fn();
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toDataURL: () => 'data:image/jpeg;base64,AAAA' };
  const createElement = vi.fn(() => canvas);
  class FakeImage {
    naturalWidth = w;
    naturalHeight = h;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_: string) {
      queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
    }
  }
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('document', { createElement });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
  return { drawImage, createElement };
}
const jpg = () => new File([new Uint8Array(10)], 'p.jpg', { type: 'image/jpeg' });

describe('readPhoto', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('crops and shrinks a normal picture', async () => {
    const { drawImage } = setup(4000, 3000);
    expect(await readPhoto(jpg())).toBe('data:image/jpeg;base64,AAAA');
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage.mock.calls[0].slice(1)).toEqual([500, 0, 3000, 3000, 0, 0, 256, 256]);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it('rejects a picture with too many pixels before drawing', async () => {
    const { drawImage, createElement } = setup(10000, 8000);
    await expect(readPhoto(jpg())).rejects.toThrow('too-many-pixels');
    expect(createElement).not.toHaveBeenCalled();
    expect(drawImage).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it('accepts exactly the limit', async () => {
    setup(6000, 4000);
    await expect(readPhoto(jpg())).resolves.toBe('data:image/jpeg;base64,AAAA');
  });
  it('rejects one pixel over the limit', async () => {
    setup(6000, 4000 + 1);
    await expect(readPhoto(jpg())).rejects.toThrow('too-many-pixels');
  });
  it('rejects a file that fails to load', async () => {
    setup(100, 100, true);
    await expect(readPhoto(jpg())).rejects.toThrow('not-image');
  });
});

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
