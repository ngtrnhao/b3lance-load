import type { RequestResult, MetricsSummary } from '../types/index.js';
import { HdrHistogram } from './histogram.js';

export class MetricsCollector {
  private readonly histogram: HdrHistogram;
  private readonly results: RequestResult[] = [];
  private startTime = 0;
  private endTime = 0;

  constructor() {
    this.histogram = new HdrHistogram();
  }

  start(): void {
    this.startTime = performance.now();
  }

  stop(): void {
    this.endTime = performance.now();
  }

  record(result: RequestResult): void {
    this.results.push(result);
    if (!result.error) {
      this.histogram.record(result.latency);
    }
  }

  get totalRequests(): number {
    return this.results.length;
  }

  get successCount(): number {
    return this.results.filter(
      (r: RequestResult) => !r.error && r.statusCode >= 200 && r.statusCode < 400,
    ).length;
  }

  get errorCount(): number {
    return this.results.filter((r: RequestResult) => !!r.error || r.statusCode >= 400).length;
  }

  getRecentRps(windowMs = 1000): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = this.results.filter((r: RequestResult) => r.timestamp >= windowStart);
    return (recent.length / windowMs) * 1000;
  }

  getLastP99(): number {
    return this.histogram.percentile(99);
  }

  summarize(): MetricsSummary {
    const durationMs =
      this.endTime > 0 ? this.endTime - this.startTime : performance.now() - this.startTime;

    const durationSec = durationMs / 1000;

    const statusCodeDistribution: Record<number, number> = {};
    const errorBreakdown: Record<string, number> = {};
    let totalBytesReceived = 0;

    for (const r of this.results) {
      statusCodeDistribution[r.statusCode] = (statusCodeDistribution[r.statusCode] ?? 0) + 1;
      totalBytesReceived += r.bytesReceived;
      if (r.errorType) {
        errorBreakdown[r.errorType] = (errorBreakdown[r.errorType] ?? 0) + 1;
      }
    }

    const successCount = this.successCount;
    const errorCount = this.errorCount;
    const total = this.results.length;

    return {
      p50: this.histogram.percentile(50),
      p75: this.histogram.percentile(75),
      p90: this.histogram.percentile(90),
      p95: this.histogram.percentile(95),
      p99: this.histogram.percentile(99),
      max: this.histogram.max(),
      min: this.histogram.min(),
      mean: this.histogram.mean(),
      totalRequests: total,
      successCount,
      errorCount,
      rps: durationSec > 0 ? total / durationSec : 0,
      errorRate: total > 0 ? (errorCount / total) * 100 : 0,
      duration: durationMs,
      statusCodeDistribution,
      errorBreakdown,
      totalBytesReceived,
    };
  }

  getRawResults(): RequestResult[] {
    return [...this.results];
  }
}
