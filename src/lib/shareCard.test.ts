import { describe, expect, it } from 'vitest';
import { wrapLines } from './shareCard';

const byLength = (value: string) => value.length;

describe('wrapLines', () => {
  it('wraps on word boundaries within the max width', () => {
    expect(wrapLines('one two three four', 9, 5, byLength)).toEqual(['one two', 'three', 'four']);
  });

  it('truncates the last allowed line with an ellipsis that still fits', () => {
    const lines = wrapLines('one two three four five six', 9, 2, byLength);
    expect(lines).toEqual(['one two', 'three…']);
    expect(lines.every((line) => line.length <= 9)).toBe(true);
  });

  it('returns no lines for blank text', () => {
    expect(wrapLines('   ', 9, 2, byLength)).toEqual([]);
  });
});
