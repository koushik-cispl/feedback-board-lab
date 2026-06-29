import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './dateUtils';

describe('formatRelativeTime', () => {
  it('returns "just now" for timestamps under a minute ago', () => {
    const ts = new Date(Date.now() - 10_000).toISOString();
    expect(formatRelativeTime(ts)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(ts)).toBe('5 minutes ago');
  });

  it('returns singular minute', () => {
    const ts = new Date(Date.now() - 60_000).toISOString();
    expect(formatRelativeTime(ts)).toBe('1 minute ago');
  });

  it('returns hours ago', () => {
    const ts = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(formatRelativeTime(ts)).toBe('3 hours ago');
  });

  it('returns days ago', () => {
    const ts = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(formatRelativeTime(ts)).toBe('2 days ago');
  });

  it('returns the raw string for an invalid date', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
  });
});
