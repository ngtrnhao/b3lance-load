import chalk from 'chalk';
import type { MetricsSummary } from '../types/index.js';
import type { LoadTestConfig } from '../types/index.js';

function fmtMs(ms: number): string {
  if (ms <= 0) return '0ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function fmtNum(n: number, dec = 0): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function printSummary(summary: MetricsSummary, config: LoadTestConfig): void {
  const divider = chalk.gray('─'.repeat(47));

  console.log('');
  console.log(chalk.bold.cyan('Load Test Results'));
  console.log(divider);

  console.log(chalk.white('URL:         ') + chalk.yellow(config.url));
  console.log(chalk.white('Method:      ') + chalk.yellow(config.method));
  console.log(
    chalk.white('Duration:    ') +
      chalk.yellow(fmtMs(summary.duration)) +
      chalk.gray('  |  ') +
      chalk.white('Concurrency: ') +
      chalk.yellow(String(config.concurrency ?? 10)),
  );
  console.log(
    chalk.white('Total:       ') + chalk.yellow(`${fmtNum(summary.totalRequests)} requests`),
  );

  console.log('');

  console.log(chalk.white('Throughput:  ') + chalk.green(`${fmtNum(summary.rps, 1)} req/s`));

  const successPct = 100 - summary.errorRate;
  const successColor = successPct >= 99 ? chalk.green : successPct >= 95 ? chalk.yellow : chalk.red;
  console.log(chalk.white('Success Rate:') + ' ' + successColor(`${successPct.toFixed(2)}%`));
  console.log(chalk.white('Data Recv:   ') + chalk.cyan(fmtBytes(summary.totalBytesReceived)));

  console.log('');
  console.log(chalk.bold('Latency:'));

  const rows: [string, string, string, string][] = [
    ['  p50', fmtMs(summary.p50), 'p95', fmtMs(summary.p95)],
    ['  p75', fmtMs(summary.p75), 'p99', fmtMs(summary.p99)],
    ['  p90', fmtMs(summary.p90), 'max', fmtMs(summary.max)],
    ['  min', fmtMs(summary.min), 'avg', fmtMs(summary.mean)],
  ];

  for (const [lLabel, lVal, rLabel, rVal] of rows) {
    console.log(
      chalk.white(`${lLabel}:`.padEnd(8)) +
        chalk.green(lVal.padEnd(10)) +
        chalk.gray('|  ') +
        chalk.white(`${rLabel}:`.padEnd(6)) +
        chalk.green(rVal),
    );
  }

  const errorEntries = Object.entries(summary.errorBreakdown);
  if (errorEntries.length > 0) {
    console.log('');
    console.log(chalk.bold.red('Errors:'));
    const parts = errorEntries.map(
      ([type, count]) => `${chalk.white(type.replace(/_/g, ' '))}: ${chalk.red(fmtNum(count))}`,
    );
    console.log('  ' + parts.join(chalk.gray('  |  ')));
  }

  const statusEntries = Object.entries(summary.statusCodeDistribution)
    .filter(([code]) => Number(code) > 0)
    .sort(([a], [b]) => Number(a) - Number(b));

  if (statusEntries.length > 0) {
    console.log('');
    console.log(chalk.bold('Status Codes:'));
    const parts = statusEntries.map(([code, count]) => {
      const c = Number(code);
      const col = c < 300 ? chalk.green : c < 400 ? chalk.yellow : chalk.red;
      return `${col(code)}: ${chalk.white(fmtNum(count))}`;
    });
    console.log('  ' + parts.join(chalk.gray('  |  ')));
  }

  console.log(divider);
}
