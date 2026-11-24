import { eq, desc } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { citations } from '../schema.ts';
import type { CitationRecord } from '../../types.ts';

export class CitationRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(citation: CitationRecord): Promise<void> {
    await this.db.insert(citations).values({
      citationId: citation.citation_id,
      promptId: citation.prompt_id,
      platform: citation.platform,
      citedUrl: citation.cited_url,
      citedDomain: citation.cited_domain,
      title: citation.title,
      snippet: citation.snippet,
      position: citation.position ?? 0,
      createdAt: citation.created_at,
    }).onConflictDoNothing();
  }

  async getByPrompt(promptId: string): Promise<CitationRecord[]> {
    const rows = await this.db.select().from(citations).where(eq(citations.promptId, promptId));
    return rows.map((r) => ({
      citation_id: r.citationId,
      prompt_id: r.promptId,
      platform: r.platform as any,
      cited_url: r.citedUrl,
      cited_domain: r.citedDomain,
      title: r.title || undefined,
      snippet: r.snippet || undefined,
      position: r.position ?? 0,
      created_at: r.createdAt,
    }));
  }

  async getByDomain(domain: string): Promise<CitationRecord[]> {
    const rows = await this.db.select().from(citations).where(eq(citations.citedDomain, domain)).orderBy(desc(citations.createdAt));
    return rows.map((r) => ({
      citation_id: r.citationId,
      prompt_id: r.promptId,
      platform: r.platform as any,
      cited_url: r.citedUrl,
      cited_domain: r.citedDomain,
      title: r.title || undefined,
      snippet: r.snippet || undefined,
      position: r.position ?? 0,
      created_at: r.createdAt,
    }));
  }

  async getAll(): Promise<CitationRecord[]> {
    const rows = await this.db.select().from(citations);
    return rows.map((r) => ({
      citation_id: r.citationId,
      prompt_id: r.promptId,
      platform: r.platform as any,
      cited_url: r.citedUrl,
      cited_domain: r.citedDomain,
      title: r.title || undefined,
      snippet: r.snippet || undefined,
      position: r.position ?? 0,
      created_at: r.createdAt,
    }));
  }
}
