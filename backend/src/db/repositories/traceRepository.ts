import { eq } from 'drizzle-orm';
import type { AppDrizzleDb } from '../connection.ts';
import { agentTraces } from '../schema.ts';
import type { AgentTraceRecord } from '../../types.ts';

export class TraceRepository {
  constructor(private db: AppDrizzleDb) {}

  async save(trace: AgentTraceRecord): Promise<void> {
    await this.db.insert(agentTraces).values({
      traceId: trace.trace_id,
      parentId: trace.parent_id,
      promptId: trace.prompt_id,
      provider: trace.provider,
      toolName: trace.tool_name,
      toolInput: trace.tool_input,
      toolOutput: trace.tool_output,
      targetUrl: trace.target_url,
      createdAt: trace.created_at,
    }).onConflictDoNothing();
  }

  async getById(traceId: string): Promise<AgentTraceRecord | null> {
    const rows = await this.db.select().from(agentTraces).where(eq(agentTraces.traceId, traceId)).limit(1);
    if (!rows.length) return null;
    const r = rows[0];
    return {
      trace_id: r.traceId,
      parent_id: r.parentId || undefined,
      prompt_id: r.promptId || undefined,
      provider: r.provider,
      tool_name: r.toolName,
      tool_input: r.toolInput || undefined,
      tool_output: r.toolOutput || undefined,
      target_url: r.targetUrl || undefined,
      created_at: r.createdAt,
    };
  }
}
