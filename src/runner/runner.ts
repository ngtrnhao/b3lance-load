import type { LoadTestConfig } from '../types/index.js';
import type { MetricsSummary } from '../types/index.js';
import { MetricsCollector } from '../metrics/collector.js';
import { Semaphore } from './semaphore.js';
import { executeRequest } from './worker.js';

export type ProgressCallback = (snapshot: {
  completed: number;
  total: number | null;
  rps: number;
  p99: number;
  errorRate: number;
  currentConcurrency: number;
}) => void;

export class Runner {
  private readonly config: LoadTestConfig;
  private stopped = false;
  private readonly collector: MetricsCollector;

  constructor(config: LoadTestConfig) {
    this.config = config;
    this.collector = new MetricsCollector();
  }

  stop(): void {
    this.stopped = true;
  }

  async run(onProgress?: ProgressCallback): Promise<MetricsSummary> {
    const { concurrency = 10, requests, duration, rampUp = 0 } = this.config;

    this.collector.start();
    this.stopped = false;

    const endWallTime = duration ? Date.now() + duration * 1000 : null;
    let requestsDispatched = 0;
    let completedRequests = 0;

    const shouldContinue = (): boolean => {
      if (this.stopped) return false;
      if (endWallTime && Date.now() >= endWallTime) return false;
      if (requests && requestsDispatched >= requests) return false;
      return true;
    };

    const startWallTime = Date.now();
    const getCurrentConcurrency = (): number => {
      if (rampUp <= 0) return concurrency;
      const elapsed = (Date.now() - startWallTime) / 1000;
      const rampFraction = Math.min(elapsed / rampUp, 1);
      return Math.max(1, Math.round(concurrency * rampFraction));
    };

    let semaphore = new Semaphore(getCurrentConcurrency());
    let lastConcurrency = getCurrentConcurrency();

    const progressInterval = setInterval(() => {
      if (!onProgress) return;
      onProgress({
        completed: completedRequests,
        total: requests ?? null,
        rps: this.collector.getRecentRps(2000),
        p99: this.collector.getLastP99(),
        errorRate:
          completedRequests > 0 ? (this.collector.errorCount / completedRequests) * 100 : 0,
        currentConcurrency: lastConcurrency,
      });
    }, 250);

    const inflight: Set<Promise<void>> = new Set();

    const dispatch = async (): Promise<void> => {
      const newConcurrency = getCurrentConcurrency();
      if (newConcurrency !== lastConcurrency) {
        const diff = newConcurrency - lastConcurrency;
        if (diff > 0) {
          for (let i = 0; i < diff; i++) semaphore.release();
        }
        lastConcurrency = newConcurrency;
      }

      await semaphore.acquire();

      if (!shouldContinue()) {
        semaphore.release();
        return;
      }

      requestsDispatched++;

      const task = executeRequest(this.config).then((result) => {
        completedRequests++;
        this.collector.record(result);
        semaphore.release();
        inflight.delete(task);
      });
      inflight.add(task);
    };

    while (shouldContinue()) {
      await dispatch();
    }

    await Promise.all([...inflight]);

    clearInterval(progressInterval);
    this.collector.stop();

    return this.collector.summarize();
  }

  getCollector(): MetricsCollector {
    return this.collector;
  }
}
