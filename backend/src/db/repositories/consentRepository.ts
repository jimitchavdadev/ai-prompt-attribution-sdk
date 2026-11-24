import { eq } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { extensionInstalls } from '../schema.ts';
import type { ConsentRecord } from '../../types.ts';

export class ConsentRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(consent: ConsentRecord): Promise<void> {
    await this.db.insert(extensionInstalls).values({
      installId: consent.install_id,
      consentEnabled: consent.consent_enabled,
      sharePromptText: consent.share_prompt_text,
      redactedCategories: consent.redacted_categories,
      createdAt: consent.created_at,
      updatedAt: consent.updated_at,
    }).onConflictDoUpdate({
      target: extensionInstalls.installId,
      set: {
        consentEnabled: consent.consent_enabled,
        sharePromptText: consent.share_prompt_text,
        redactedCategories: consent.redacted_categories,
        updatedAt: consent.updated_at,
      }
    });
  }

  async getById(installId: string): Promise<ConsentRecord | null> {
    const rows = await this.db.select().from(extensionInstalls).where(eq(extensionInstalls.installId, installId)).limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      install_id: r.installId,
      consent_enabled: r.consentEnabled,
      share_prompt_text: r.sharePromptText,
      redacted_categories: r.redactedCategories,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }

  async delete(installId: string): Promise<void> {
    await this.db.delete(extensionInstalls).where(eq(extensionInstalls.installId, installId));
  }
}
