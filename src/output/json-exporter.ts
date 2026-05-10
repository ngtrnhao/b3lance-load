import { writeFile } from 'fs/promises';
import type { MetricsSummary, LoadTestConfig } from '../types/index.js';

export interface JsonReport {
  meta: {
    generatedAt: string;
    config: LoadTestConfig;
  };
  summary: MetricsSummary;
}

export async function exportJson(
  filePath: string,
  summary: MetricsSummary,
  config: LoadTestConfig,
): Promise<void> {
  const report: JsonReport = {
    meta: {
      generatedAt: new Date().toISOString(),
      config,
    },
    summary,
  };

  await writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
}
