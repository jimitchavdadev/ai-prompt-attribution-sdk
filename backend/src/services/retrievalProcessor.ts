import { randomUUID } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { SdkVisitPayload, RetrievalRecord } from '../types.ts';
import type { CrawlerClassification } from './crawlerClassifier.ts';
import { normalizeUrl } from './normalizer.ts';

export interface BotRetrievalResult {
  retrievalId: string;
  provider: string;
  notes: string;
}

export class RetrievalProcessor {
  constructor(private db: DatabaseService) {}

  async processBotRetrieval(payload: SdkVisitPayload, bot: CrawlerClassification): Promise<BotRetrievalResult> {
    const retrievalId = `ret_${randomUUID()}`;
    const normalizedUrl = normalizeUrl(payload.page_url);
    const now = payload.timestamp || new Date().toISOString();

    const record: RetrievalRecord = {
      retrieval_id: retrievalId,
      site_id: payload.site_id,
      requested_url: normalizedUrl,
      provider: bot.provider,
      crawler_user_agent: payload.user_agent || 'Unknown-Bot',
      source_ip: undefined,
      is_verified_bot: true,
      trace_id: undefined,
      created_at: now,
    };

    await this.db.retrievals.save(record);

    return {
      retrievalId,
      provider: bot.provider,
      notes: `Server-side retrieval by ${bot.botName} (${bot.category}). Not counted as a human visit.`,
    };
  }
}
