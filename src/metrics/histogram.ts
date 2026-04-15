import { build } from 'hdr-histogram-js';

type HdrHistogramInstance = ReturnType<typeof build>;

export class HdrHistogram {
  private readonly hist: HdrHistogramInstance;
  private recordCount = 0;

  constructor(
    lowestDiscernibleValue = 1,
    highestTrackableValue = 3_600_000,
    numberOfSignificantValueDigits: 1 | 2 | 3 | 4 | 5 = 3,
  ) {
    this.hist = build({
      lowestDiscernibleValue,
      highestTrackableValue,
      numberOfSignificantValueDigits,
    });
  }

  record(valueMs: number): void {
    const clamped = Math.max(1, Math.round(valueMs));
    this.hist.recordValue(clamped);
    this.recordCount++;
  }

  percentile(p: number): number {
    if (this.recordCount === 0) return 0;
    return this.hist.getValueAtPercentile(p);
  }

  max(): number {
    if (this.recordCount === 0) return 0;
    return this.hist.maxValue;
  }

  min(): number {
    if (this.recordCount === 0) return 0;
    return this.hist.minNonZeroValue;
  }

  mean(): number {
    if (this.recordCount === 0) return 0;
    return this.hist.mean;
  }

  get count(): number {
    return this.recordCount;
  }

  reset(): void {
    this.hist.reset();
    this.recordCount = 0;
  }
}
