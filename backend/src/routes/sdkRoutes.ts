import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseService } from '../db/index.ts';
import type { SdkVisitPayload } from '../types.ts';
import { CorrelationEngine } from '../services/correlationEngine.ts';

export const sdkRoutes = (db: DatabaseService): FastifyPluginAsync => async (fastify) => {
  const correlationEngine = new CorrelationEngine(db);

  fastify.post<{ Body: SdkVisitPayload }>('/api/v1/sdk/visit', async (request, reply) => {
    const { site_id, page_url } = request.body;
    if (!site_id || !page_url) {
      return reply.code(400).send({ error: 'Missing site_id or page_url' });
    }

    const website = await db.websites.getById(site_id);
    if (!website) {
      return reply.code(404).send({ error: `Website with site_id '${site_id}' not found` });
    }

    const userAgent = request.body.user_agent || (request.headers['user-agent'] as string) || '';
    const referrer = request.body.referrer || (request.headers['referer'] as string) || '';

    const payload: SdkVisitPayload = {
      ...request.body,
      user_agent: userAgent,
      referrer: referrer,
    };

    const correlation = await correlationEngine.processSdkVisit(payload);

    return {
      success: true,
      visit_id: correlation.visitId,
      activity_type: correlation.activityType,
      confidence: correlation.confidence,
      prompt_id: correlation.promptId,
      reconstructedPrompt: correlation.reconstructedPrompt,
      candidateQueries: correlation.candidateQueries,
      platform: correlation.platform,
      is_bot: correlation.isBotRetrieval,
      notes: correlation.notes,
    };
  });

  fastify.get<{ Params: { site_id: string } }>('/api/v1/sdk/config/:site_id', async (request, reply) => {
    const site = await db.websites.getById(request.params.site_id);
    if (!site) return reply.code(404).send({ error: 'Site not found' });
    return {
      site_id: site.site_id,
      domain: site.domain,
      name: site.name,
    };
  });
};
