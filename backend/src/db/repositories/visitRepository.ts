import { eq, desc } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { websiteVisits } from '../schema.ts';
import type { WebsiteVisitRecord } from '../../types.ts';

export class VisitRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(visit: WebsiteVisitRecord): Promise<void> {
    await this.db.insert(websiteVisits).values({
      visitId: visit.visit_id,
      siteId: visit.site_id,
      pageUrl: visit.page_url,
      referrer: visit.referrer,
      visitorSessionId: visit.visitor_session_id,
      userAgent: visit.user_agent,
      attributionToken: visit.attribution_token,
      promptId: visit.prompt_id,
      confidence: visit.confidence,
      activityType: visit.activity_type,
      createdAt: visit.created_at,
    }).onConflictDoNothing();
  }

  async getAll(limit = 100): Promise<WebsiteVisitRecord[]> {
    const rows = await this.db.select().from(websiteVisits).orderBy(desc(websiteVisits.createdAt)).limit(limit);
    return rows.map((r) => ({
      visit_id: r.visitId,
      site_id: r.siteId,
      page_url: r.pageUrl,
      referrer: r.referrer || undefined,
      visitor_session_id: r.visitorSessionId || undefined,
      user_agent: r.userAgent || undefined,
      attribution_token: r.attributionToken || undefined,
      prompt_id: r.promptId || undefined,
      confidence: r.confidence as any,
      activity_type: r.activityType as any,
      created_at: r.createdAt,
    }));
  }

  async getByPrompt(promptId: string): Promise<WebsiteVisitRecord[]> {
    const rows = await this.db.select().from(websiteVisits).where(eq(websiteVisits.promptId, promptId)).orderBy(desc(websiteVisits.createdAt));
    return rows.map((r) => ({
      visit_id: r.visitId,
      site_id: r.siteId,
      page_url: r.pageUrl,
      referrer: r.referrer || undefined,
      visitor_session_id: r.visitorSessionId || undefined,
      user_agent: r.userAgent || undefined,
      attribution_token: r.attributionToken || undefined,
      prompt_id: r.promptId || undefined,
      confidence: r.confidence as any,
      activity_type: r.activityType as any,
      created_at: r.createdAt,
    }));
  }

  async getBySiteId(siteId: string): Promise<WebsiteVisitRecord[]> {
    const rows = await this.db.select().from(websiteVisits).where(eq(websiteVisits.siteId, siteId)).orderBy(desc(websiteVisits.createdAt));
    return rows.map((r) => ({
      visit_id: r.visitId,
      site_id: r.siteId,
      page_url: r.pageUrl,
      referrer: r.referrer || undefined,
      visitor_session_id: r.visitorSessionId || undefined,
      user_agent: r.userAgent || undefined,
      attribution_token: r.attributionToken || undefined,
      prompt_id: r.promptId || undefined,
      confidence: r.confidence as any,
      activity_type: r.activityType as any,
      created_at: r.createdAt,
    }));
  }
}
