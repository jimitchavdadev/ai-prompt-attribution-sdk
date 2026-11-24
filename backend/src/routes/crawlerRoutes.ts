import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { CrawlerLogPayload, RetrievalRecord } from '../types.ts';
import { classifyUserAgent } from '../services/crawlerClassifier.ts';
import { normalizeUrl } from '../services/normalizer.ts';

export const crawlerRoutes = (db: DatabaseService): FastifyPluginAsync => async (fastify) => {
  fastify.post<{ Body: CrawlerLogPayload }>('/api/v1/crawler/record', async (request, reply) => {
    const { site_id, requested_url, user_agent, source_ip, trace_id } = request.body;
    if (!requested_url || !user_agent) {
      return reply.code(400).send({ error: 'Missing requested_url or user_agent' });
    }

    const classification = classifyUserAgent(user_agent);
    const retrievalId = `ret_${randomUUID()}`;
    const now = new Date().toISOString();

    const record: RetrievalRecord = {
      retrieval_id: retrievalId,
      site_id,
      requested_url: normalizeUrl(requested_url),
      provider: classification.provider,
      crawler_user_agent: user_agent,
      source_ip,
      is_verified_bot: classification.isAiBot,
      trace_id,
      created_at: now
    };

    await db.retrievals.save(record);

    return {
      success: true,
      retrieval_id: retrievalId,
      is_ai_bot: classification.isAiBot,
      provider: classification.provider,
      bot_name: classification.botName,
      category: classification.category
    };
  });
};
