import { request, request as undiciRequest } from 'undici';
import { RequestResult } from '../types/index.js';
import { LoadTestConfig } from '../types/index.js';

function classifyError(error: unknown): RequestResult['errorType'] {
  if (!(error instanceof Error)) return 'unknown';

  const msg = error.message.toLowerCase();
  const code = (error as NodeJS.ErrnoException).code ?? '';

  if (
    msg.includes('timeout') ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_REFUSED'
  ) {
    return 'timeout';
  }
  if (code === 'ECONNREFUSED') {
    return 'connection_refused';
  }
  if (code === 'ECONNRESET' || msg.includes('conn_reset') || msg.includes('connection reset')) {
    return 'conn_reset';
  }
  return 'unknown';
}

export async function executeRequest(config: LoadTestConfig): Promise<RequestResult> {
  const startTime = Date.now();
  const timestamp = Date.now();

  try {
    const opts: Parameters<typeof request>[1] = {
      method: config.method,
      bodyTimeout: config.timeout,
      headersTimeout: config.timeout,
    };
    if (config.headers) opts.headers = config.headers;
    if (config.body) opts.body = config.body;

    const res = await request(config.url, opts);
    const body = await res.body.arrayBuffer();

    const latency = performance.now() - startTime;

    return {
      latency,
      statusCode: res.statusCode,
      bytesReceived: body.byteLength,
      timestamp,
    };
  } catch (error) {
    const latency = performance.now() - startTime;
    const errorType = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    const result: RequestResult = {
      latency,
      statusCode: 0,
      error: errorMessage,
      bytesReceived: 0,
      timestamp,
    };
    if (errorType) result.errorType = errorType;

    return result;
  }
}
