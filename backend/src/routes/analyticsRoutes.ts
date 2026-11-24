import type { FastifyPluginAsync } from 'fastify';
import type { DatabaseService } from '../db/index.ts';

export const analyticsRoutes = (db: DatabaseService): FastifyPluginAsync => async (fastify) => {
  // 1. Overview metrics
  fastify.get('/api/v1/analytics/overview', async () => {
    const prompts = await db.prompts.getAll(1000);
    const retrievals = await db.retrievals.getAll(1000);
    const visits = await db.visits.getAll(1000);
    const citations = await db.citations.getAll();

    const platforms = new Set(prompts.map((p) => p.platform));
    const attributedVisits = visits.filter((v) => v.confidence === 'VERIFIED' || v.confidence === 'HIGH');
    const highConfidencePct = visits.length ? Math.round((attributedVisits.length / visits.length) * 100) : 0;
    const uniqueVisitors = new Set(visits.map((v) => v.visitor_session_id).filter(Boolean)).size;

    let totalQueries = 0;
    for (const p of prompts) {
      const q = await db.prompts.getSearchQueriesByPrompt(p.prompt_id);
      totalQueries += q.length;
    }

    return {
      total_prompts: prompts.length,
      total_search_queries: totalQueries,
      total_retrievals: retrievals.length,
      total_citations: citations.length,
      total_visits: visits.length,
      total_attributed_visits: attributedVisits.length,
      unique_visitors: uniqueVisitors,
      participating_platforms_count: platforms.size,
      high_confidence_pct: highConfidencePct,
    };
  });

  // 2. AI Platform breakdown
  fastify.get('/api/v1/analytics/platforms', async () => {
    const prompts = await db.prompts.getAll(1000);
    const visits = await db.visits.getAll(1000);
    const citations = await db.citations.getAll();

    const targetPlatforms = ['chatgpt', 'gemini', 'claude'];
    const breakdown: Record<string, any> = {};

    for (const plat of targetPlatforms) {
      const platPrompts = prompts.filter((p) => p.platform === plat);
      const platCitations = citations.filter((c) => c.platform === plat);
      const platVisits = visits.filter((v) => {
        const matchingPrompt = prompts.find((p) => p.prompt_id === v.prompt_id);
        return (matchingPrompt && matchingPrompt.platform === plat) || v.referrer?.toLowerCase().includes(plat);
      });

      let queriesCount = 0;
      for (const p of platPrompts) {
        const q = await db.prompts.getSearchQueriesByPrompt(p.prompt_id);
        queriesCount += q.length;
      }

      breakdown[plat] = {
        platform: plat,
        prompt_count: platPrompts.length,
        search_query_count: queriesCount,
        citation_count: platCitations.length,
        website_visit_count: platVisits.length,
        attributed_sessions: platVisits.filter((v) => v.confidence === 'HIGH' || v.confidence === 'VERIFIED').length,
      };
    }

    return breakdown;
  });

  // 3. Prompt-level analysis table
  fastify.get('/api/v1/analytics/prompts', async () => {
    const prompts = await db.prompts.getAll(100);
    const rows = [];

    for (const p of prompts) {
      const queries = await db.prompts.getSearchQueriesByPrompt(p.prompt_id);
      const citations = await db.citations.getByPrompt(p.prompt_id);
      const visits = await db.visits.getByPrompt(p.prompt_id);

      const clickedVisit = visits.find((v) => v.activity_type === 'human_click');
      const confidence = clickedVisit ? clickedVisit.confidence : 'UNATTRIBUTED';

      rows.push({
        prompt_id: p.prompt_id,
        prompt_text: p.prompt_text,
        is_redacted: p.is_redacted,
        platform: p.platform,
        created_at: p.created_at,
        generated_queries: queries.map((q) => q.query_text),
        cited_urls: citations.map((c) => c.cited_url),
        cited_domains: [...new Set(citations.map((c) => c.cited_domain))],
        user_clicked: Boolean(clickedVisit),
        destination_url: clickedVisit?.page_url || null,
        confidence,
      });
    }

    return rows;
  });

  // 4. Website-level analysis
  fastify.get('/api/v1/analytics/websites', async () => {
    const websites = await db.websites.getAll();
    const result = [];

    for (const site of websites) {
      const retrievals = await db.retrievals.getBySiteId(site.site_id);
      const visits = await db.visits.getBySiteId(site.site_id);
      const citations = await db.citations.getByDomain(site.domain);

      const promptIds = [...new Set(visits.map((v) => v.prompt_id).filter(Boolean))] as string[];
      const topPrompts = [];
      for (const pid of promptIds.slice(0, 5)) {
        const p = await db.prompts.getById(pid);
        if (p) topPrompts.push(p.prompt_text);
      }

      result.push({
        site_id: site.site_id,
        domain: site.domain,
        name: site.name,
        ai_retrievals: retrievals.length,
        ai_citations: citations.length,
        ai_referred_visits: visits.length,
        top_prompts: topPrompts,
      });
    }

    return result;
  });

  // 5. Prompt-to-Website Journey Visualizer
  fastify.get<{ Params: { prompt_id: string } }>('/api/v1/analytics/journey/:prompt_id', async (request, reply) => {
    const prompt = await db.prompts.getById(request.params.prompt_id);
    if (!prompt) return reply.code(404).send({ error: 'Prompt not found' });

    const queries = await db.prompts.getSearchQueriesByPrompt(prompt.prompt_id);
    const citations = await db.citations.getByPrompt(prompt.prompt_id);
    const visits = await db.visits.getByPrompt(prompt.prompt_id);
    const retrievals = await db.retrievals.getAll(50);

    const relatedRetrievals = retrievals.filter((r) =>
      citations.some((c) => r.requested_url.includes(c.cited_domain))
    );

    const visit = visits[0] || null;

    return {
      prompt_id: prompt.prompt_id,
      stages: [
        { name: 'User Prompt', status: 'observed', data: { text: prompt.prompt_text, platform: prompt.platform } },
        { name: 'AI Search Queries', status: queries.length ? 'observed' : 'unavailable', data: queries.map((q) => q.query_text) },
        { name: 'AI Server-Side Retrieval', status: relatedRetrievals.length ? 'observed' : 'unavailable', data: relatedRetrievals.map((r) => ({ bot: r.crawler_user_agent, url: r.requested_url })) },
        { name: 'AI Citations', status: citations.length ? 'observed' : 'unavailable', data: citations.map((c) => ({ url: c.cited_url, title: c.title })) },
        { name: 'User Click-Through', status: visit ? 'observed' : 'unavailable', data: visit ? { destination: visit.page_url, confidence: visit.confidence } : null },
      ],
    };
  });
};
