import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { 
  IngestPromptPayload, 
  IngestCitationPayload, 
  CreateTokenPayload, 
  ConsentRecord,
  PromptRecord,
  CitationRecord,
  SearchQueryRecord
} from '../types.ts';
import { redactPromptText, computePromptHash } from '../services/privacyRedactor.ts';
import { TokenService } from '../services/tokenService.ts';
import { normalizeUrl, extractDomain } from '../services/normalizer.ts';

export const extensionRoutes = (db: DatabaseService): FastifyPluginAsync => async (fastify) => {
  const tokenService = new TokenService(db);

  fastify.post<{ Body: Partial<ConsentRecord> & { install_id: string } }>('/api/v1/extension/register', async (request, reply) => {
    const { install_id, consent_enabled = true, share_prompt_text = false, redacted_categories } = request.body;
    if (!install_id) return reply.code(400).send({ error: 'install_id is required' });

    const consent: ConsentRecord = {
      install_id,
      consent_enabled: Boolean(consent_enabled),
      share_prompt_text: Boolean(share_prompt_text),
      redacted_categories: typeof redacted_categories === 'string' ? redacted_categories : JSON.stringify(redacted_categories || ['email', 'phone', 'credit_card', 'api_key', 'password']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.consents.save(consent);
    return { success: true, consent };
  });

  fastify.get<{ Params: { install_id: string } }>('/api/v1/extension/consent/:install_id', async (request, reply) => {
    const consent = await db.consents.getById(request.params.install_id);
    if (!consent) return reply.code(404).send({ error: 'Consent record not found' });
    return consent;
  });

  fastify.post<{ Body: IngestPromptPayload }>('/api/v1/extension/prompts', async (request, reply) => {
    const { install_id, platform, prompt_text, session_id, conversation_id, generated_queries } = request.body;
    if (!install_id || !platform || !prompt_text) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const consent = await db.consents.getById(install_id);
    if (consent && !consent.consent_enabled) {
      return reply.code(403).send({ error: 'Prompt collection disabled by user consent' });
    }

    const promptId = `prm_${randomUUID()}`;
    const now = request.body.timestamp || new Date().toISOString();
    let finalPromptText = prompt_text;
    let isRedacted = false;

    if (consent && !consent.share_prompt_text) {
      finalPromptText = '[Masked by User Consent]';
      isRedacted = true;
    } else {
      const cats = consent ? JSON.parse(consent.redacted_categories) : ['email', 'phone', 'credit_card', 'api_key', 'password'];
      const redacted = redactPromptText(prompt_text, cats);
      finalPromptText = redacted.redactedText;
      isRedacted = redacted.isRedacted;
    }

    const promptRecord: PromptRecord = {
      prompt_id: promptId,
      install_id,
      platform,
      prompt_text: finalPromptText,
      prompt_hash: computePromptHash(prompt_text),
      is_redacted: isRedacted,
      session_id,
      conversation_id,
      created_at: now
    };

    await db.prompts.save(promptRecord);

    if (Array.isArray(generated_queries)) {
      for (const q of generated_queries) {
        if (q && q.trim()) {
          const sq: SearchQueryRecord = {
            query_id: `qry_${randomUUID()}`,
            prompt_id: promptId,
            query_text: q.trim(),
            engine: platform,
            created_at: now
          };
          await db.prompts.saveSearchQuery(sq);
        }
      }
    }

    return { success: true, prompt_id: promptId, is_redacted: isRedacted, stored_preview: finalPromptText };
  });

  fastify.post<{ Body: IngestCitationPayload }>('/api/v1/extension/citations', async (request, reply) => {
    const { install_id, prompt_id, platform, citations } = request.body;
    if (!install_id || !prompt_id || !Array.isArray(citations)) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const prompt = await db.prompts.getById(prompt_id);
    if (!prompt) return reply.code(404).send({ error: 'Associated prompt not found' });

    const now = new Date().toISOString();
    let savedCount = 0;

    for (let i = 0; i < citations.length; i++) {
      const c = citations[i];
      if (!c.url) continue;
      const normUrl = normalizeUrl(c.url);
      const domain = extractDomain(normUrl);

      const citationRecord: CitationRecord = {
        citation_id: `cit_${randomUUID()}`,
        prompt_id,
        platform,
        cited_url: normUrl,
        cited_domain: domain,
        title: c.title,
        snippet: c.snippet,
        position: c.position ?? i,
        created_at: now
      };

      await db.citations.save(citationRecord);
      savedCount++;
    }

    return { success: true, count: savedCount };
  });

  fastify.post<{ Body: CreateTokenPayload }>('/api/v1/extension/token', async (request, reply) => {
    const { install_id, prompt_id, citation_url } = request.body;
    if (!install_id || !prompt_id || !citation_url) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const tokenRecord = await tokenService.createToken(install_id, prompt_id, normalizeUrl(citation_url));
    return {
      success: true,
      token: tokenRecord.token,
      expires_at: tokenRecord.expires_at
    };
  });
};
