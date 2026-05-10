import { writeFile } from 'fs/promises';
import type { MetricsSummary, LoadTestConfig } from '../types/index.js';

function esc(v: string | number): string {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function line(...vals: (string | number)[]): string {
  return vals.map(esc).join(',');
}

export async function exportCsv(
  filePath: string,
  summary: MetricsSummary,
  config: LoadTestConfig,
): Promise<void> {
  const lines: string[] = [];

  lines.push(line('field', 'value'));
  lines.push(line('url', config.url));
  lines.push(line('method', config.method));
  lines.push(line('concurrency', config.concurrency ?? 10));
  lines.push(line('duration_ms', summary.duration.toFixed(0)));
  lines.push(line('total_requests', summary.totalRequests));
  lines.push(line('success_count', summary.successCount));
  lines.push(line('error_count', summary.errorCount));
  lines.push(line('error_rate_pct', summary.errorRate.toFixed(4)));
  lines.push(line('rps', summary.rps.toFixed(2)));
  lines.push(line('p50_ms', summary.p50));
  lines.push(line('p75_ms', summary.p75));
  lines.push(line('p90_ms', summary.p90));
  lines.push(line('p95_ms', summary.p95));
  lines.push(line('p99_ms', summary.p99));
  lines.push(line('max_ms', summary.max));
  lines.push(line('min_ms', summary.min));
  lines.push(line('mean_ms', summary.mean.toFixed(2)));
  lines.push(line('total_bytes_received', summary.totalBytesReceived));

  lines.push('');
  lines.push(line('status_code', 'count'));
  for (const [code, count] of Object.entries(summary.statusCodeDistribution).sort(
    ([a], [b]) => Number(a) - Number(b),
  )) {
    lines.push(line(code, count));
  }

  const errorEntries = Object.entries(summary.errorBreakdown);
  if (errorEntries.length > 0) {
    lines.push('');
    lines.push(line('error_type', 'count'));
    for (const [type, count] of errorEntries) {
      lines.push(line(type, count));
    }
  }

  await writeFile(filePath, lines.join('\n'), 'utf-8');
}
