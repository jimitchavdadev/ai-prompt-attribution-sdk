import { eq } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { websites } from '../schema.ts';
import type { WebsiteRecord } from '../../types.ts';

export class WebsiteRepository {
  constructor(private db: AppDrizzleDb) {}

  async create(site: WebsiteRecord): Promise<void> {
    await this.db.insert(websites).values({
      siteId: site.site_id,
      domain: site.domain,
      name: site.name,
      publicApiKey: site.public_api_key,
      createdAt: site.created_at,
    }).onConflictDoUpdate({
      target: websites.siteId,
      set: {
        domain: site.domain,
        name: site.name,
        publicApiKey: site.public_api_key,
      }
    });
  }

  async getById(siteId: string): Promise<WebsiteRecord | null> {
    const rows = await this.db.select().from(websites).where(eq(websites.siteId, siteId)).limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      site_id: r.siteId,
      domain: r.domain,
      name: r.name,
      public_api_key: r.publicApiKey,
      created_at: r.createdAt,
    };
  }

  async getByDomain(domain: string): Promise<WebsiteRecord | null> {
    const rows = await this.db.select().from(websites).where(eq(websites.domain, domain)).limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      site_id: r.siteId,
      domain: r.domain,
      name: r.name,
      public_api_key: r.publicApiKey,
      created_at: r.createdAt,
    };
  }

  async getAll(): Promise<WebsiteRecord[]> {
    const rows = await this.db.select().from(websites);
    return rows.map((r) => ({
      site_id: r.siteId,
      domain: r.domain,
      name: r.name,
      public_api_key: r.publicApiKey,
      created_at: r.createdAt,
    }));
  }
}
