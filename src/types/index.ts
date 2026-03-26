/**
 * Load test config of user provided url, method, headers, body, timeout, concurrency
 *
 * Request result (latency, status code, response time, error)
 *
 * MetricsSummary (p50, p90, p99, error rate, throughput, latency, status code distribution)
 */
import { z } from 'zod';

export const LoadTestConfig = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT']),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().optional(),
  concurrency: z.number().optional(),
  requests: z.number().optional(),
  duration: z.number().optional(),
  rampUp: z.number().optional(),
  output: z.string().optional(),
});

export const RequestResult = z.object({
  latency: z.number(),
  statusCode: z.number(),
  error: z.string().optional(),
  bytesReceived: z.number(),
  timestamp: z.number(),
});

export const MetricsSummary = z.object({
  p50: z.number(),
  p75: z.number(),
  p90: z.number(),
  p99: z.number(),
  max: z.number(),
  totalRequests: z.number(),
  successCount: z.number(),
  rps: z.number(),
  errorRate: z.number(),
  duration: z.number(),
  statusCode: z.record(z.number(), z.number()),
  error: z.string().optional(),
});
