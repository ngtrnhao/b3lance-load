import cliProgress from 'cli-progress';
import chalk from 'chalk';

export interface ProgressSnapshot {
  completed: number;
  total: number | null;
  rps: number;
  p99: number;
  errorRate: number;
  currentConcurrency: number;
}

function fmtMs(ms: number): string {
  if (ms <= 0) return '0ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export class ProgressBar {
  private bar: cliProgress.SingleBar | null = null;
  private readonly total: number | null;

  constructor(total: number | null) {
    this.total = total;
  }

  start(): void {
    const format =
      chalk.cyan('{bar}') +
      ' {percentage}%' +
      chalk.gray(' | ') +
      chalk.yellow('RPS: {rps}') +
      chalk.gray(' | ') +
      chalk.magenta('p99: {p99}') +
      chalk.gray(' | ') +
      chalk.red('Err: {errorRate}%') +
      chalk.gray(' | ') +
      chalk.white('{completed}/{totalDisplay}');

    this.bar = new cliProgress.SingleBar(
      {
        format,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: false,
        barsize: 20,
      },
      cliProgress.Presets.shades_classic,
    );

    this.bar.start(this.total ?? 100, 0, {
      rps: '0',
      p99: '0ms',
      errorRate: '0.00',
      completed: 0,
      totalDisplay: this.total != null ? String(this.total) : '∞',
    });
  }

  update(snapshot: ProgressSnapshot): void {
    if (!this.bar) return;

    const value = this.total != null ? snapshot.completed : snapshot.completed % 100;

    this.bar.update(value, {
      rps: snapshot.rps.toFixed(0),
      p99: fmtMs(snapshot.p99),
      errorRate: snapshot.errorRate.toFixed(2),
      completed: snapshot.completed,
      totalDisplay: this.total != null ? String(this.total) : '∞',
    });
  }

  stop(): void {
    if (!this.bar) return;
    if (this.total != null) {
      this.bar.update(this.total);
    }
    this.bar.stop();
    this.bar = null;
  }
}
