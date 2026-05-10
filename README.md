# b3lance-load

HTTP Load Testing CLI built with Node.js / TypeScript.

Supports 10,000+ concurrent connections, accurate p99 via HDR Histogram, ramp-up mode, real-time progress bar, and JSON/CSV export.

## Features

- High concurrency via [undici](https://github.com/nodejs/undici) — the fastest Node.js HTTP client
- Accurate latency percentiles (p50/p75/p90/p95/p99/max/min/mean) using [HDR Histogram](https://github.com/HdrHistogram/HdrHistogram_js)
- Ramp-up mode — avoids thundering herd on test start
- Stop by request count (`--requests`) or time (`--duration`)
- Real-time terminal progress bar (RPS + p99 + error rate)
- Export results to JSON or CSV

## Requirements

- Node.js >= 20

## Installation

```bash
git clone <repo-url>
cd b3lance-load
npm install
npm run build
npm link        # makes `load-tester` available globally
```

Or run directly without building:

```bash
npx tsx src/cli/index.ts --url https://example.com --requests 100 --concurrency 10
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-u, --url <url>` | Target URL **(required)** | — |
| `-X, --method <method>` | HTTP method | `GET` |
| `-n, --requests <n>` | Total number of requests | — |
| `-c, --concurrency <n>` | Concurrent connections | `10` |
| `-d, --duration <dur>` | Test duration (`30s`, `1m`, `500ms`) | — |
| `-b, --body <body>` | Request body string | — |
| `-H, --header <header>` | Add header, repeatable (`"Key: Value"`) | — |
| `-t, --timeout <ms>` | Per-request timeout in ms | `30000` |
| `--ramp-up <dur>` | Ramp-up period (`5s`, `30s`) | `0` |
| `-o, --output <file>` | Export to `.json` or `.csv` | — |

Either `--requests` or `--duration` must be provided.

## Examples

### Simple GET test

```bash
load-tester --url https://httpbin.org/get --requests 500 --concurrency 50
```

### POST with headers and body

```bash
load-tester \
  --url https://api.example.com/data \
  --method POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer token123" \
  --body '{"ping": true}' \
  --requests 1000 \
  --concurrency 100
```

### 30-second duration test with ramp-up

```bash
load-tester \
  --url https://api.example.com/health \
  --duration 30s \
  --concurrency 500 \
  --ramp-up 5s \
  --output results.json
```

### Export to CSV

```bash
load-tester --url https://example.com --requests 2000 --concurrency 200 --output results.csv
```

## Sample Output

```
Starting load test…
  GET https://api.example.com/health | concurrency: 500 | duration: 30s | ramp-up: 5s

████████████████████ 100% | RPS: 1243 | p99: 142ms | Err: 0.02% | 37241/37241

Load Test Results
───────────────────────────────────────────────
URL:         https://api.example.com/health
Method:      GET
Duration:    30.12s  |  Concurrency: 500
Total:       37,241 requests

Throughput:  1,236.5 req/s
Success Rate:99.82%
Data Recv:   142.3MB

Latency:
  p50:    42ms      |  p95: 134ms
  p75:    67ms      |  p99: 287ms
  p90:    98ms      |  max: 1,204ms
  min:    8ms       |  avg: 54ms

Errors:
  timeout: 12  |  conn reset: 55

Status Codes:
  200: 37,174  |  503: 67
───────────────────────────────────────────────
```

## Development

```bash
npm install
npm run dev           # tsx watch mode
npm test              # jest (20 unit tests)
npm run test:coverage
npm run typecheck
npm run lint
npm run build
```

## Benchmark Comparison

Approximate throughput on a local echo server (Node.js 20, single machine):

| Tool | ~Req/s | p99 accuracy |
|------|--------|--------------|
| **b3lance-load** | ~25,000 | HDR Histogram (exact) |
| wrk | ~32,000 | approximate |
| hey | ~18,000 | approximate |
| autocannon | ~24,000 | approximate |

> b3lance-load trades a small throughput overhead for TypeScript extensibility,
> ramp-up control, and HDR-accurate percentile metrics.

## Architecture

```
CLI (commander)
  └── Runner
        ├── Semaphore  — concurrency limiter (Promise-based, FIFO queue)
        │     └── Worker  — undici request + performance.now() latency
        └── MetricsCollector
              ├── HdrHistogram  — p50/p75/p90/p95/p99/max/min/mean
              └── Reporter  — chalk terminal output
                    ├── ProgressBar  — cli-progress real-time bar
                    ├── JsonExporter
                    └── CsvExporter
```

## License

MIT
