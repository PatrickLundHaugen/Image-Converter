import { describe, it, expect } from 'vitest';
import { formatBytes, savingsPercent } from '../../src/lib/utils/filesize.js';

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats raw bytes under 1 KB', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats KB with one decimal place', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats exact KB', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats MB with one decimal place', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('formats fractional MB', () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});

describe('savingsPercent', () => {
  it('calculates positive savings', () => {
    expect(savingsPercent(1000, 700)).toBe(30);
  });

  it('calculates negative savings (file grew)', () => {
    expect(savingsPercent(1000, 1200)).toBe(-20);
  });

  it('returns 0 when sizes are equal', () => {
    expect(savingsPercent(1000, 1000)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(savingsPercent(1000, 666)).toBe(33);
  });
});