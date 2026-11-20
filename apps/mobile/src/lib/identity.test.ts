import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_BYTES, MAX_PIXELS, PHOTO_MAX_CHARS, checkName, isPhotoDataUrl, readPhoto } from './identity';

const jpg = () => new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' });

function setup(w: number, h: number, fail = false) {
  const decode = vi.fn(() => Promise.resolve());
  const drawImage = vi.fn();
  class FakeImage {
    naturalWidth = w;
    naturalHeight = h;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decode = decode;
    set src(_: string) {
      queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
    }
  }
  const revoke = vi.fn();
  vi.stubGlobal('Image', FakeImage);
  vi.stubGlobal('document', {
    createElement: () => ({ getContext: () => ({ drawImage }), toDataURL: () => 'data:image/jpeg;base64,AAAA' }),
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoke);
  return { decode, drawImage, revoke };
}

describe('readPhoto', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it('returns a cropped jpeg for a normal picture', async () => {
    const s = setup(4000, 3000);
    await expect(readPhoto(jpg())).resolves.toBe('data:image/jpeg;base64,AAAA');
    expect(s.drawImage).toHaveBeenCalledWith(expect.anything(), 500, 0, 3000, 3000, 0, 0, 256, 256);
    expect(s.revoke).toHaveBeenCalledWith('blob:x');
  });
  it('rejects over MAX_PIXELS before decoding', async () => {
    const s = setup(10000, 6000);
    await expect(readPhoto(jpg())).rejects.toThrow('too-large');
    expect(s.decode).not.toHaveBeenCalled();
    expect(s.drawImage).not.toHaveBeenCalled();
    expect(s.revoke).toHaveBeenCalledWith('blob:x');
  });
  it('accepts exactly MAX_PIXELS', async () => {
    setup(10000, 5000);
    expect(10000 * 5000).toBe(MAX_PIXELS);
    await expect(readPhoto(jpg())).resolves.toBe('data:image/jpeg;base64,AAAA');
  });
  it('rejects on load error', async () => {
    setup(1, 1, true);
    await expect(readPhoto(jpg())).rejects.toThrow('not-image');
  });
  it('rejects non-images and big files', async () => {
    await expect(readPhoto(new File(['x'], 'a.txt', { type: 'text/plain' }))).rejects.toThrow('not-image');
    const big = jpg();
    Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });
    await expect(readPhoto(big)).rejects.toThrow('too-big');
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
