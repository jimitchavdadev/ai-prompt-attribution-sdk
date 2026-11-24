import { eq, desc } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { prompts, searchQueries } from '../schema.ts';
import type { PromptRecord, SearchQueryRecord } from '../../types.ts';

export class PromptRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(prompt: PromptRecord): Promise<void> {
    await this.db.insert(prompts).values({
      promptId: prompt.prompt_id,
      installId: prompt.install_id,
      platform: prompt.platform,
      promptText: prompt.prompt_text,
      promptHash: prompt.prompt_hash,
      isRedacted: prompt.is_redacted,
      sessionId: prompt.session_id,
      conversationId: prompt.conversation_id,
      createdAt: prompt.created_at,
    }).onConflictDoUpdate({
      target: prompts.promptId,
      set: {
        promptText: prompt.prompt_text,
        isRedacted: prompt.is_redacted,
      }
    });
  }

  async getById(promptId: string): Promise<PromptRecord | null> {
    const rows = await this.db.select().from(prompts).where(eq(prompts.promptId, promptId)).limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      prompt_id: r.promptId,
      install_id: r.installId,
      platform: r.platform as any,
      prompt_text: r.promptText,
      prompt_hash: r.promptHash,
      is_redacted: r.isRedacted,
      session_id: r.sessionId || undefined,
      conversation_id: r.conversationId || undefined,
      created_at: r.createdAt,
    };
  }

  async getAll(limit = 100, offset = 0): Promise<PromptRecord[]> {
    const rows = await this.db.select().from(prompts).orderBy(desc(prompts.createdAt)).limit(limit).offset(offset);
    return rows.map((r) => ({
      prompt_id: r.promptId,
      install_id: r.installId,
      platform: r.platform as any,
      prompt_text: r.promptText,
      prompt_hash: r.promptHash,
      is_redacted: r.isRedacted,
      session_id: r.sessionId || undefined,
      conversation_id: r.conversationId || undefined,
      created_at: r.createdAt,
    }));
  }

  async deleteByInstallId(installId: string): Promise<void> {
    await this.db.delete(prompts).where(eq(prompts.installId, installId));
  }

  async saveSearchQuery(query: SearchQueryRecord): Promise<void> {
    await this.db.insert(searchQueries).values({
      queryId: query.query_id,
      promptId: query.prompt_id,
      queryText: query.query_text,
      engine: query.engine,
      createdAt: query.created_at,
    });
  }

  async getSearchQueriesByPrompt(promptId: string): Promise<SearchQueryRecord[]> {
    const rows = await this.db.select().from(searchQueries).where(eq(searchQueries.promptId, promptId));
    return rows.map((r) => ({
      query_id: r.queryId,
      prompt_id: r.promptId,
      query_text: r.queryText,
      engine: r.engine,
      created_at: r.createdAt,
    }));
  }
}
