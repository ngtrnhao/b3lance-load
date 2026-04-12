import { build } from 'hdr-histogram-js';

type HdrHistogramInstance = ReturnType<typeof build>;

export class HdrHistogram {
  private readonly hist: HdrHistogramInstance;
  private recordCount = 0;
}
