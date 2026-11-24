import type { ServerSdkConfig } from './types.ts';
import { classifyUserAgent, parseTraceparentHeader } from './classifier.ts';

export function createAiAttributionMiddleware(config: ServerSdkConfig) {
  const backendUrl = config.backendUrl || 'http://localhost:3000';

  return async function aiAttributionMiddleware(req: any, _res: any, next?: () => void) {
    const headers = req.headers || {};
    const userAgent = headers['user-agent'] || '';
    const traceparent = headers['traceparent'] || '';
    const requestedUrl = req.url || req.originalUrl || '/';

    const botClassification = classifyUserAgent(userAgent);
    const traceContext = parseTraceparentHeader(traceparent);

    if (botClassification.isAiBot || traceContext) {
      try {
        fetch(`${backendUrl}/api/v1/crawler/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_id: config.siteId,
            api_key: config.apiKey,
            requested_url: requestedUrl,
            user_agent: userAgent,
            trace_id: traceContext?.traceId,
            source_ip: req.ip || req.connection?.remoteAddress,
          }),
        }).catch(() => {});
      } catch {
        // Non-blocking telemetry
      }
    }

    if (typeof next === 'function') {
      next();
    }
  };
}
