import { describe, it, expect, beforeEach } from '@jest/globals';
import { HdrHistogram } from '../src/metrics/histogram.js';

describe('HdrHistogram', () => {
  let hist: HdrHistogram;

  beforeEach(() => {
    hist = new HdrHistogram();
  });

  it('returns 0 for all stats when no values recorded', () => {
    expect(hist.percentile(50)).toBe(0);
    expect(hist.percentile(99)).toBe(0);
    expect(hist.max()).toBe(0);
    expect(hist.min()).toBe(0);
    expect(hist.mean()).toBe(0);
    expect(hist.count).toBe(0);
  });

  it('records values and retrieves percentiles', () => {
    for (let i = 1; i <= 100; i++) hist.record(i);

    expect(hist.count).toBe(100);
    expect(hist.percentile(50)).toBeGreaterThanOrEqual(48);
    expect(hist.percentile(50)).toBeLessThanOrEqual(52);
    expect(hist.percentile(99)).toBeGreaterThanOrEqual(98);
    expect(hist.max()).toBe(100);
    expect(hist.min()).toBe(1);
  });

  it('clamps sub-millisecond values to 1ms', () => {
    hist.record(0.1);
    hist.record(0.5);
    expect(hist.percentile(50)).toBe(1);
    expect(hist.count).toBe(2);
  });

  it('computes p99 accurately with skewed distribution', () => {
    for (let i = 0; i < 99; i++) hist.record(10);
    hist.record(500);

    expect(hist.percentile(50)).toBeCloseTo(10, -1);
    expect(hist.max()).toBe(500);
    expect(hist.percentile(100)).toBeGreaterThanOrEqual(500);
  });

  it('resets correctly', () => {
    hist.record(100);
    hist.record(200);
    expect(hist.count).toBe(2);
    hist.reset();
    expect(hist.count).toBe(0);
    expect(hist.percentile(99)).toBe(0);
  });

  it('handles large latency values', () => {
    hist.record(3_600_000);
    expect(hist.max()).toBeGreaterThanOrEqual(3_600_000);
  });

  it('computes mean correctly', () => {
    hist.record(10);
    hist.record(20);
    hist.record(30);
    expect(hist.mean()).toBeCloseTo(20, 0);
  });
});
