import { randomBytes } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceparent: string;
  baggage: string;
}

export function generateW3cTraceContext(promptId?: string, provider = 'llm'): TraceContext {
  // 16 bytes = 32 hex chars
  const traceId = randomBytes(16).toString('hex');
  // 8 bytes = 16 hex chars
  const spanId = randomBytes(8).toString('hex');
  // W3C traceparent version 00, sampled 01
  const traceparent = `00-${traceId}-${spanId}-01`;

  const baggageParts = [`ai.provider=${encodeURIComponent(provider)}`];
  if (promptId) {
    baggageParts.push(`ai.prompt_id=${encodeURIComponent(promptId)}`);
  }
  const baggage = baggageParts.join(',');

  return { traceId, spanId, traceparent, baggage };
}

export function parseW3cTraceparent(header?: string): { traceId: string; spanId: string } | null {
  if (!header) return null;
  const parts = header.trim().split('-');
  if (parts.length >= 4 && parts[0] === '00' && parts[1].length === 32 && parts[2].length === 16) {
    return { traceId: parts[1], spanId: parts[2] };
  }
  return null;
}
