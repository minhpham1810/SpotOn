import { test, expect } from 'vitest';
import { safeUrl } from './safeUrl';

test('returns https URLs as-is', () => {
  expect(safeUrl('https://example.com/page')).toBe('https://example.com/page');
});

test('returns http URLs as-is', () => {
  expect(safeUrl('http://example.com/page')).toBe('http://example.com/page');
});

test('returns undefined for a javascript: URL', () => {
  expect(safeUrl('javascript:alert(1)')).toBeUndefined();
});
