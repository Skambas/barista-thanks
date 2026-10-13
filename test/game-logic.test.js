import { describe, it, expect } from 'vitest';
import {
  advance,
  canFinishOnRelease,
  outcomeFor,
  FILL_SECONDS,
  MIN_OK,
  PERFECT_FROM,
  OVERFLOW_FROM,
} from '../src/game-logic.js';

describe('advance', () => {
  it('рівень росте лінійно', () => {
    expect(advance(0, FILL_SECONDS / 2)).toBeCloseTo(0.5);
  });
  it('не виходить за 0..1', () => {
    expect(advance(0.9, 10)).toBe(1);
    expect(advance(0.1, -10)).toBe(0);
  });
});

describe('canFinishOnRelease', () => {
  it('межа MIN_OK', () => {
    expect(canFinishOnRelease(MIN_OK - 0.01)).toBe(false);
    expect(canFinishOnRelease(MIN_OK)).toBe(true);
  });
});

describe('outcomeFor', () => {
  it('межі результатів', () => {
    expect(outcomeFor(MIN_OK)).toBe('low');
    expect(outcomeFor(PERFECT_FROM - 0.001)).toBe('low');
    expect(outcomeFor(PERFECT_FROM)).toBe('perfect');
    expect(outcomeFor(OVERFLOW_FROM - 0.001)).toBe('perfect');
    expect(outcomeFor(OVERFLOW_FROM)).toBe('overflow');
    expect(outcomeFor(1)).toBe('overflow');
  });
});
