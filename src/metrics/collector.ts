import type { RequestResult } from '../types/index.js';
import { HdrHistogram } from './histogram.js';

export class MetricsCollector {
  private readonly histogram: RequestResult[] = [];
  private readonly errorHistogram: RequestResult['errorType'][] = [];
  private startime: number = 0;
  private endtime: number = 0;

  constructor() {
    this.histogram = new HdrHistogram();
  }
}
