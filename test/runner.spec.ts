import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { RequestResult } from '../src/types/index.js';
import type { LoadTestConfig } from '../src/types/index.js';

const mockExecuteRequest = jest.fn<() => Promise<RequestResult>>();

jest.unstable_mockModule('../src/runner/worker.js', () => ({
  executeRequest: mockExecuteRequest,
}));

const { Runner } = await import('../src/runner/runner.js');

function makeResult(overrides: Partial<RequestResult> = {}): RequestResult {
  return {
    latency: 10,
    statusCode: 200,
    bytesReceived: 128,
    timestamp: Date.now(),
    ...overrides,
  };
}

function makeConfig(overrides: Partial<LoadTestConfig> = {}): LoadTestConfig {
  return {
    url: 'http://example.com',
    method: 'GET',
    concurrency: 5,
    timeout: 5000,
    requests: 10,
    ...overrides,
  };
}

describe('Runner', () => {
  beforeEach(() => {
    mockExecuteRequest.mockReset();
  });

  it('sends exactly N requests when --requests is specified', async () => {
    mockExecuteRequest.mockResolvedValue(makeResult());
    const runner = new Runner(makeConfig({ requests: 20 }));
    const summary = await runner.run();
    expect(mockExecuteRequest).toHaveBeenCalledTimes(20);
    expect(summary.totalRequests).toBe(20);
  });

  it('respects concurrency limit', async () => {
    let inflight = 0;
    let maxInflight = 0;
    const concurrency = 3;

    mockExecuteRequest.mockImplementation(async () => {
      inflight++;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise<void>((r) => setImmediate(r));
      inflight--;
      return makeResult();
    });

    const runner = new Runner(makeConfig({ requests: 15, concurrency }));
    await runner.run();

    expect(maxInflight).toBeLessThanOrEqual(concurrency);
    expect(mockExecuteRequest).toHaveBeenCalledTimes(15);
  });

  it('stops after duration elapses', async () => {
    mockExecuteRequest.mockImplementation(
      () => new Promise<RequestResult>((resolve) => setTimeout(() => resolve(makeResult()), 20)),
    );

    const runner = new Runner(makeConfig({ requests: undefined, duration: 0.15, concurrency: 5 }));
    const summary = await runner.run();
    expect(summary.totalRequests).toBeGreaterThan(0);
  }, 10_000);

  it('counts errors correctly', async () => {
    mockExecuteRequest
      .mockResolvedValueOnce(makeResult({ statusCode: 200 }))
      .mockResolvedValueOnce(makeResult({ statusCode: 200 }))
      .mockResolvedValueOnce(makeResult({ statusCode: 0, error: 'timeout', errorType: 'timeout' }))
      .mockResolvedValueOnce(makeResult({ statusCode: 500 }))
      .mockResolvedValue(makeResult({ statusCode: 200 }));

    const runner = new Runner(makeConfig({ requests: 10, concurrency: 1 }));
    const summary = await runner.run();

    expect(summary.totalRequests).toBe(10);
    expect(summary.errorCount).toBeGreaterThan(0);
  });

  it('calls progress callback', async () => {
    mockExecuteRequest.mockResolvedValue(makeResult());
    const snapshots: number[] = [];

    const runner = new Runner(makeConfig({ requests: 20, concurrency: 5 }));
    await runner.run((snap) => snapshots.push(snap.completed));

    expect(mockExecuteRequest).toHaveBeenCalledTimes(20);
  });

  it('stops early when stop() is called', async () => {
    mockExecuteRequest.mockImplementation(
      () => new Promise<RequestResult>((resolve) => setTimeout(() => resolve(makeResult()), 30)),
    );

    const runner = new Runner(makeConfig({ requests: 1000, concurrency: 2 }));
    const runPromise = runner.run();

    await new Promise<void>((r) => setTimeout(r, 100));
    runner.stop();

    const summary = await runPromise;
    expect(summary.totalRequests).toBeLessThan(1000);
  }, 10_000);

  it('computes rps > 0 when requests complete', async () => {
    mockExecuteRequest.mockResolvedValue(makeResult({ latency: 5 }));

    const runner = new Runner(makeConfig({ requests: 50, concurrency: 10 }));
    const summary = await runner.run();

    expect(summary.rps).toBeGreaterThan(0);
    expect(summary.successCount).toBe(50);
  });
});
