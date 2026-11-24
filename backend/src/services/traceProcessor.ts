import { randomUUID } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { WebsiteVisitRecord } from '../types.ts';
import { normalizeUrl } from './normalizer.ts';

export interface TraceCorrelationResult {
  visitId: string;
  confidence: 'VERIFIED' | 'UNATTRIBUTED';
  promptId: string | null;
  platform: string;
  notes: string;
}

export class TraceProcessor {
  constructor(private db: DatabaseService) {}

  async processAgentTrace(traceId: string, siteId: string, pageUrl: string): Promise<TraceCorrelationResult> {
    const trace = await this.db.traces.getById(traceId);
    const visitId = `vis_${randomUUID()}`;
    const now = new Date().toISOString();

    if (trace && trace.prompt_id) {
      const visitRecord: WebsiteVisitRecord = {
        visit_id: visitId,
        site_id: siteId,
        page_url: normalizeUrl(pageUrl),
        referrer: 'w3c-trace-context',
        visitor_session_id: `agent_${trace.trace_id.slice(0, 8)}`,
        user_agent: `Agent/${trace.provider}`,
        attribution_token: undefined,
        prompt_id: trace.prompt_id,
        confidence: 'VERIFIED',
        activity_type: 'human_click',
        created_at: now,
      };
      await this.db.visits.save(visitRecord);

      return {
        visitId,
        confidence: 'VERIFIED',
        promptId: trace.prompt_id,
        platform: trace.provider,
        notes: 'Verified attribution established via W3C Trace Context propagation.',
      };
    }

    return {
      visitId,
      confidence: 'UNATTRIBUTED',
      promptId: null,
      platform: 'custom_agent',
      notes: 'Trace ID not found or missing prompt association.',
    };
  }
}
