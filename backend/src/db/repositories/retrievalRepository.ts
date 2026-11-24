import { desc, eq } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { retrievals } from '../schema.ts';
import type { RetrievalRecord } from '../../types.ts';

export class RetrievalRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(r: RetrievalRecord): Promise<void> {
    await this.db.insert(retrievals).values({
      retrievalId: r.retrieval_id,
      siteId: r.site_id,
      requestedUrl: r.requested_url,
      provider: r.provider,
      crawlerUserAgent: r.crawler_user_agent,
      sourceIp: r.source_ip,
      isVerifiedBot: r.is_verified_bot,
      traceId: r.trace_id,
      createdAt: r.created_at,
    }).onConflictDoNothing();
  }

  async getAll(limit = 100): Promise<RetrievalRecord[]> {
    const rows = await this.db.select().from(retrievals).orderBy(desc(retrievals.createdAt)).limit(limit);
    return rows.map((r) => ({
      retrieval_id: r.retrievalId,
      site_id: r.siteId || undefined,
      requested_url: r.requestedUrl,
      provider: r.provider,
      crawler_user_agent: r.crawlerUserAgent,
      source_ip: r.sourceIp || undefined,
      is_verified_bot: r.isVerifiedBot,
      trace_id: r.traceId || undefined,
      created_at: r.createdAt,
    }));
  }

  async getBySiteId(siteId: string): Promise<RetrievalRecord[]> {
    const rows = await this.db.select().from(retrievals).where(eq(retrievals.siteId, siteId)).orderBy(desc(retrievals.createdAt));
    return rows.map((r) => ({
      retrieval_id: r.retrievalId,
      site_id: r.siteId || undefined,
      requested_url: r.requestedUrl,
      provider: r.provider,
      crawler_user_agent: r.crawlerUserAgent,
      source_ip: r.sourceIp || undefined,
      is_verified_bot: r.isVerifiedBot,
      trace_id: r.traceId || undefined,
      created_at: r.createdAt,
    }));
  }
}
