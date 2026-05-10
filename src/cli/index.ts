#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { LoadTestConfigSchema } from '../types/index.js';
import { Runner } from '../runner/runner.js';
import { ProgressBar } from '../output/progress.js';
import { printSummary } from '../metrics/reporter.js';
import { exportJson } from '../output/json-exporter.js';
import { exportCsv } from '../output/csv-exporter.js';

function parseDuration(value: string): number {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m)?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${value}". Use formats like 30s, 1m, 500ms`);
  }
  const n = parseFloat(match[1] ?? '0');
  const unit = match[2] ?? 's';
  if (unit === 'ms') return n / 1000;
  if (unit === 'm') return n * 60;
  return n;
}

function parseHeaders(values: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const h of values) {
    const idx = h.indexOf(':');
    if (idx === -1) {
      throw new Error(`Invalid header: "${h}". Format must be "Key: Value"`);
    }
    headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
  }
  return headers;
}

const program = new Command();

program
  .name('load-tester')
  .description('HTTP Load Testing CLI — high-concurrency, HDR p99, ramp-up mode')
  .version('0.1.0')
  .requiredOption('-u, --url <url>', 'Target URL')
  .option('-X, --method <method>', 'HTTP method (GET, POST, PUT…)', 'GET')
  .option('-n, --requests <number>', 'Total number of requests', parseInt)
  .option('-c, --concurrency <number>', 'Concurrent connections', parseInt, 10)
  .option('-d, --duration <duration>', 'Test duration, e.g. 30s, 1m, 500ms')
  .option('-b, --body <body>', 'Request body string')
  .option(
    '-H, --header <header>',
    'Add header (repeatable). Format: "Key: Value"',
    (v: string, acc: string[]) => {
      acc.push(v);
      return acc;
    },
    [] as string[],
  )
  .option('-t, --timeout <ms>', 'Per-request timeout in ms', parseInt, 30000)
  .option('--ramp-up <duration>', 'Ramp-up period, e.g. 5s')
  .option('-o, --output <file>', 'Export results to .json or .csv file')
  .action(
    async (opts: {
      url: string;
      method: string;
      requests?: number;
      concurrency: number;
      duration?: string;
      body?: string;
      header: string[];
      timeout: number;
      rampUp?: string;
      output?: string;
    }) => {
      if (!opts.requests && !opts.duration) {
        console.error(chalk.red('Error: specify at least --requests or --duration'));
        process.exit(1);
      }

      const headers = opts.header.length > 0 ? parseHeaders(opts.header) : undefined;
      const duration = opts.duration ? parseDuration(opts.duration) : undefined;
      const rampUp = opts.rampUp ? parseDuration(opts.rampUp) : 0;

      const parsed = LoadTestConfigSchema.safeParse({
        url: opts.url,
        method: opts.method.toUpperCase(),
        headers,
        body: opts.body,
        timeout: opts.timeout,
        concurrency: opts.concurrency,
        requests: opts.requests,
        duration,
        rampUp,
        output: opts.output,
      });

      if (!parsed.success) {
        console.error(chalk.red('Configuration error:'));
        for (const issue of parsed.error.issues) {
          console.error(chalk.red(`  ${issue.path.join('.')}: ${issue.message}`));
        }
        process.exit(1);
      }

      const config = parsed.data;

      console.log(chalk.bold.cyan('\nStarting load test…'));
      const infoLine = [
        chalk.gray(`  ${config.method} ${config.url}`),
        chalk.gray(`concurrency: ${config.concurrency}`),
        config.requests != null ? chalk.gray(`requests: ${config.requests}`) : null,
        config.duration != null ? chalk.gray(`duration: ${config.duration}s`) : null,
        config.rampUp ? chalk.gray(`ramp-up: ${config.rampUp}s`) : null,
      ]
        .filter(Boolean)
        .join(chalk.gray(' | '));
      console.log(infoLine);
      console.log('');

      const progressBar = new ProgressBar(config.requests ?? null);
      progressBar.start();

      const runner = new Runner(config);

      const handleSignal = (): void => {
        runner.stop();
      };
      process.once('SIGINT', handleSignal);
      process.once('SIGTERM', handleSignal);

      const summary = await runner.run((snap) => progressBar.update(snap));

      progressBar.stop();
      process.off('SIGINT', handleSignal);
      process.off('SIGTERM', handleSignal);

      printSummary(summary, config);

      if (config.output) {
        try {
          if (config.output.endsWith('.csv')) {
            await exportCsv(config.output, summary, config);
          } else {
            const path = config.output.endsWith('.json') ? config.output : `${config.output}.json`;
            await exportJson(path, summary, config);
          }
          console.log(chalk.green(`\nResults saved to: ${config.output}`));
        } catch (err) {
          console.error(chalk.red(`\nFailed to export: ${(err as Error).message}`));
        }
      }
    },
  );

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(chalk.red(`Fatal: ${(err as Error).message}`));
  process.exit(1);
});
