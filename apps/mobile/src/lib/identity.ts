export const NAME_MAX = 14;
export const PHOTO_SIZE = 256;
export const PHOTO_MAX_CHARS = 200_000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const PHOTO_PREFIX = 'data:image/jpeg;base64,';

export function checkName(raw: string): { name: string } | { error: 'empty' | 'long' } {
  const name = raw.trim();
  if (!name) return { error: 'empty' };
  if ([...name].length > NAME_MAX) return { error: 'long' };
  return { name };
}

export function isPhotoDataUrl(s: unknown): s is string {
  return typeof s === 'string' && s.startsWith(PHOTO_PREFIX) && s.length <= PHOTO_MAX_CHARS;
}

/** Browser only. Crops the centre square, shrinks to PHOTO_SIZE and returns a JPEG data URL. */
export async function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not-image');
  if (file.size > MAX_FILE_BYTES) throw new Error('too-big');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error('not-image');
    }
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error('not-image');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('not-image');
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    const out = canvas.toDataURL('image/jpeg', 0.85);
    if (!isPhotoDataUrl(out)) throw new Error('not-image');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
