import { randomBytes } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { AttributionTokenRecord } from '../types.ts';

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class TokenService {
  constructor(private db: DatabaseService) {}

  async createToken(installId: string, promptId: string, citationUrl: string): Promise<AttributionTokenRecord> {
    const raw = randomBytes(16).toString('hex');
    const token = `ai_tok_${raw}`;
    const now = Date.now();
    const expiresAt = now + TOKEN_TTL_MS;

    const record: AttributionTokenRecord = {
      token,
      prompt_id: promptId,
      install_id: installId,
      citation_url: citationUrl,
      expires_at: expiresAt,
      created_at: new Date(now).toISOString(),
    };

    await this.db.tokens.save(record);
    return record;
  }

  async verifyAndConsumeToken(token: string): Promise<AttributionTokenRecord | null> {
    const record = await this.db.tokens.getByToken(token);
    if (!record) return null;

    const now = Date.now();
    if (now > record.expires_at) {
      return null; // Expired
    }

    if (!record.used_at) {
      await this.db.tokens.markUsed(token);
    }

    return record;
  }
}
