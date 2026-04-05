/**
 * Load test config of user provided url, method, headers, body, timeout, concurrency
 *
 * Request result (latency, status code, response time, error)
 *
 * MetricsSummary (p50, p90, p99, error rate, throughput, latency, status code distribution)
 */
import { z } from 'zod';

export const LoadTestConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().positive().default(30000),
  concurrency: z.number().positive().default(30000),
  requests: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  rampUp: z.number().nonnegative().optional(),
  output: z.string().optional(),
});

export type LoadTestConfig = z.infer<typeof LoadTestConfigSchema>;
export interface RequestResult {
  latency: number;
  statusCode: number;
  error?: string;
  errorType?: 'timeout' | 'connection_refused' | 'conn_reset' | 'unknown';
  bytesReceived: number;
  timestamp: number;
}

export interface MetricsSummary {
  p50: number;
  p75: number;
  p90: number;
  p99: number;
  max: number;
  min: number;
  mean: number;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  rps: number;
  errorRate: number;
  duration: number;
  statusCodeDistribution: Record<number, number>;
  errorBreakdown: Record<string, number>;
  totalBytesReceived: number;
}
