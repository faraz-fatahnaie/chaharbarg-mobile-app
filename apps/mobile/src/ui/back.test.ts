import { describe, expect, it } from 'vitest';
import { backAction } from './back';

describe('backAction', () => {
  const close = () => {};
  it('a dismissable top dialog closes, on any screen', () => {
    expect(backAction({ close }, true)).toBe('close');
    expect(backAction({ close }, false)).toBe('close');
  });
  it('a non-dismissable top dialog ignores Back, on any screen', () => {
    expect(backAction({}, true)).toBe('ignore');
    expect(backAction({}, false)).toBe('ignore');
  });
  it('no dialog: other screens go Home, Home minimizes', () => {
    expect(backAction(undefined, false)).toBe('home');
    expect(backAction(undefined, true)).toBe('minimize');
  });
});
