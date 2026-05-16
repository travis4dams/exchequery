// Triangular sampling + band normalisation primitives.

import { describe, it, expect } from 'vitest';
import {
  normalizeBand,
  scaleBand,
  triangularInverseCDF,
  sampleWithBand,
  projectBand,
} from '../../src/model/uncertainty.js';

describe('normalizeBand', () => {
  it('returns null for missing band', () => {
    expect(normalizeBand(undefined)).toBeNull();
    expect(normalizeBand(null)).toBeNull();
  });
  it('expands width shorthand', () => {
    expect(normalizeBand({ width: 0.2 })).toMatchObject({ low: -0.2, high: 0.2 });
  });
  it('passes asymmetric low/high through', () => {
    expect(normalizeBand({ low: -0.4, high: 0.1 })).toMatchObject({ low: -0.4, high: 0.1 });
  });
});

describe('triangularInverseCDF', () => {
  it('maps endpoints', () => {
    expect(triangularInverseCDF(0, 10, 15, 20)).toBeCloseTo(10, 9);
    expect(triangularInverseCDF(1, 10, 15, 20)).toBeCloseTo(20, 9);
  });
  it('maps F(mode) back to mode', () => {
    // For [10,15,20], F(15) = (15-10)/(20-10) = 0.5.
    expect(triangularInverseCDF(0.5, 10, 15, 20)).toBeCloseTo(15, 9);
  });
  it('handles degenerate a==b', () => {
    expect(triangularInverseCDF(0.7, 5, 5, 5)).toBe(5);
  });
});

describe('sampleWithBand', () => {
  it('returns value unchanged when band is missing', () => {
    expect(sampleWithBand(100, null, () => 0.5)).toBe(100);
  });
  it('stays inside the bounds for symmetric bands', () => {
    const band = { low: -0.1, high: 0.1 };
    for (let i = 0; i < 200; i++) {
      const u = i / 200;
      const out = sampleWithBand(100, band, () => u);
      expect(out).toBeGreaterThanOrEqual(90 - 1e-9);
      expect(out).toBeLessThanOrEqual(110 + 1e-9);
    }
  });
  it('stays inside the bounds for asymmetric bands', () => {
    const band = { low: -0.4, high: 0.1 };
    for (let i = 0; i < 200; i++) {
      const u = i / 200;
      const out = sampleWithBand(100, band, () => u);
      expect(out).toBeGreaterThanOrEqual(60 - 1e-9);
      expect(out).toBeLessThanOrEqual(110 + 1e-9);
    }
  });
  it('mean of an asymmetric draw is skewed toward the wider side', () => {
    const band = { low: -0.4, high: 0.1 };
    let rng = 0;
    const next = () => {
      rng = (rng + 0.0173) % 1;
      return rng;
    };
    let sum = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) sum += sampleWithBand(100, band, next);
    // Triangular mean = (a + mode + b) / 3 = (60 + 100 + 110) / 3 ≈ 90.
    expect(sum / N).toBeGreaterThan(85);
    expect(sum / N).toBeLessThan(95);
  });
});

describe('projectBand', () => {
  it('returns absolute bounds', () => {
    expect(projectBand(100, { low: -0.2, high: 0.3 })).toEqual({ value: 100, low: 80, high: 130 });
  });
  it('returns a point when band is null', () => {
    expect(projectBand(100, null)).toEqual({ value: 100, low: 100, high: 100 });
  });
});

describe('scaleBand', () => {
  it('shrinks both sides by the multiplier', () => {
    const out = scaleBand({ low: -0.4, high: 0.1 }, 0.4);
    expect(out.low).toBeCloseTo(-0.16, 9);
    expect(out.high).toBeCloseTo(0.04, 9);
  });
});
