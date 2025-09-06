import { describe, expect, it } from 'vitest';

import { areAnswersEqual, normalizeText } from '../../src/utils/text';

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  it('removes punctuation and symbols', () => {
    expect(normalizeText('Hello, world!! (test)')).toBe('hello world test');
    expect(normalizeText('Café — déjà vu!')).toBe('cafe deja vu');
  });

  it('collapses multiple whitespace and newlines', () => {
    expect(normalizeText('a \n  b \t c')).toBe('a b c');
  });

  it('keeps unicode letters and numbers', () => {
    expect(normalizeText('№ 123 ABC')).toBe('no 123 abc'); // Note: № is a letter-like symbol preserved, but punctuation removed
  });

  it('returns empty string for falsy input', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('areAnswersEqual', () => {
  it('considers answers equal when normalization matches', () => {
    expect(areAnswersEqual('  Echo ', 'echo')).toBe(true);
    expect(areAnswersEqual('HELLO!', ' hello')).toBe(true);
    expect(areAnswersEqual('Café', 'Cafe')).toBe(true);
  });

  it('considers answers different when normalization differs', () => {
    expect(areAnswersEqual('cat', 'dog')).toBe(false);
  });
});
