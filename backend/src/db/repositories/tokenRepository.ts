import { eq } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { attributionTokens } from '../schema.ts';
import type { AttributionTokenRecord } from '../../types.ts';

export class TokenRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(token: AttributionTokenRecord): Promise<void> {
    await this.db.insert(attributionTokens).values({
      token: token.token,
      promptId: token.prompt_id,
      installId: token.install_id,
      citationUrl: token.citation_url,
      expiresAt: token.expires_at,
      createdAt: token.created_at,
      usedAt: token.used_at,
    }).onConflictDoNothing();
  }

  async getByToken(tokenStr: string): Promise<AttributionTokenRecord | null> {
    const rows = await this.db.select().from(attributionTokens).where(eq(attributionTokens.token, tokenStr)).limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      token: r.token,
      prompt_id: r.promptId,
      install_id: r.installId,
      citation_url: r.citationUrl,
      expires_at: r.expiresAt,
      created_at: r.createdAt,
      used_at: r.usedAt || undefined,
    };
  }

  async markUsed(tokenStr: string): Promise<void> {
    await this.db.update(attributionTokens).set({
      usedAt: new Date().toISOString(),
    }).where(eq(attributionTokens.token, tokenStr));
  }

  async deleteByInstallId(installId: string): Promise<void> {
    await this.db.delete(attributionTokens).where(eq(attributionTokens.installId, installId));
  }
}
