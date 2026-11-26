import { describe, expect, it } from 'vitest';
import { mockStoreAllowed } from './services';

describe('mock store gate', () => {
  it('only dev builds or an explicit VITE_MOCK_STORE=1 get the free mock store', () => {
    expect(mockStoreAllowed({ DEV: true })).toBe(true);
    expect(mockStoreAllowed({ DEV: false, VITE_MOCK_STORE: '1' })).toBe(true);
    expect(mockStoreAllowed({ DEV: false })).toBe(false);
    expect(mockStoreAllowed({ DEV: false, VITE_MOCK_STORE: 'true' })).toBe(false);
  });
});
