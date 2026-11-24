import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { LlmTracePayload, AgentTraceRecord, CitationRecord, SearchQueryRecord } from '../types.ts';
import { normalizeUrl, extractDomain } from '../services/normalizer.ts';

export const llmRoutes = (db: DatabaseService): FastifyPluginAsync => async (fastify) => {
  fastify.post<{ Body: LlmTracePayload }>('/api/v1/llm/trace', async (request, reply) => {
    const { trace_id, parent_id, prompt_id, provider, tool_name, tool_input, tool_output, target_url, search_queries, citations } = request.body;
    if (!trace_id || !provider || !tool_name) {
      return reply.code(400).send({ error: 'Missing trace_id, provider, or tool_name' });
    }

    const now = new Date().toISOString();
    const traceRecord: AgentTraceRecord = {
      trace_id,
      parent_id,
      prompt_id,
      provider,
      tool_name,
      tool_input: typeof tool_input === 'object' ? JSON.stringify(tool_input) : tool_input,
      tool_output: typeof tool_output === 'object' ? JSON.stringify(tool_output) : tool_output,
      target_url: target_url ? normalizeUrl(target_url) : undefined,
      created_at: now
    };

    await db.traces.save(traceRecord);

    // Save queries and citations if associated with a prompt
    if (prompt_id) {
      if (Array.isArray(search_queries)) {
        for (const q of search_queries) {
          const sq: SearchQueryRecord = {
            query_id: `qry_${randomUUID()}`,
            prompt_id,
            query_text: q,
            engine: provider,
            created_at: now
          };
          await db.prompts.saveSearchQuery(sq);
        }
      }

      if (Array.isArray(citations)) {
        for (let i = 0; i < citations.length; i++) {
          const c = citations[i];
          const norm = normalizeUrl(c.url);
          const cr: CitationRecord = {
            citation_id: `cit_${randomUUID()}`,
            prompt_id,
            platform: provider as any,
            cited_url: norm,
            cited_domain: extractDomain(norm),
            title: c.title,
            position: i,
            created_at: now
          };
          await db.citations.save(cr);
        }
      }
    }

    return { success: true, trace_id };
  });
};
