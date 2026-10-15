import { describe, it, expect } from 'vitest';
import { fmt } from './format.js';

describe('fmt', () => {
  it.each([
    [0, '0'], [1.5, '1.5'], [3, '3'], [42.9, '42'], [999, '999'],
    [1000, '1.00K'], [1234567, '1.23M'], [2e9, '2.00B'], [1e36, '1.00e36'],
  ])('suffix: %d → %s', (n, out) => expect(fmt(n, 'suffix')).toBe(out));

  it.each([
    [999, '999'], [1000, '1.00e3'], [1234567, '1.23e6'],
  ])('scientific: %d → %s', (n, out) => expect(fmt(n, 'scientific')).toBe(out));

  it('survives Infinity', () => expect(fmt(Infinity)).toBe('∞'));
});
