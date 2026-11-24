import { randomUUID } from 'crypto';
import type { DatabaseService } from '../db/index.ts';
import type { SdkVisitPayload, WebsiteVisitRecord, ConfidenceLevel, ActivityType, PromptRecord, SearchQueryRecord } from '../types.ts';
import { classifyUserAgent, isReferrerFromAiPlatform } from './crawlerClassifier.ts';
import { normalizeUrl } from './normalizer.ts';
import { TokenService } from './tokenService.ts';
import { RetrievalProcessor } from './retrievalProcessor.ts';
import { TraceProcessor } from './traceProcessor.ts';
import { TemporalCorrelator } from './temporalCorrelator.ts';
import { reconstructPromptFromContext } from './promptReconstructor.ts';
import { computePromptHash } from './privacyRedactor.ts';

export interface CorrelationResult {
  visitId: string;
  activityType: ActivityType;
  confidence: ConfidenceLevel;
  promptId: string | null;
  reconstructedPrompt?: string;
  candidateQueries?: string[];
  platform: string;
  matchedCitationUrl?: string;
  isBotRetrieval: boolean;
  notes: string;
}

export class CorrelationEngine {
  private tokenService: TokenService;
  private retrievalProcessor: RetrievalProcessor;
  private traceProcessor: TraceProcessor;
  private temporalCorrelator: TemporalCorrelator;

  constructor(private db: DatabaseService) {
    this.tokenService = new TokenService(db);
    this.retrievalProcessor = new RetrievalProcessor(db);
    this.traceProcessor = new TraceProcessor(db);
    this.temporalCorrelator = new TemporalCorrelator(db);
  }

  async processSdkVisit(payload: SdkVisitPayload): Promise<CorrelationResult> {
    const normalizedPageUrl = normalizeUrl(payload.page_url);
    const visitId = `vis_${randomUUID()}`;
    const now = payload.timestamp || new Date().toISOString();

    // 1. Differentiate AI Retrieval from Human Visit (Type 1 vs Type 3)
    const crawlerClassification = classifyUserAgent(payload.user_agent);
    if (crawlerClassification.isAiBot) {
      const botRes = await this.retrievalProcessor.processBotRetrieval(payload, crawlerClassification);
      return {
        visitId: botRes.retrievalId,
        activityType: 'ai_retrieval',
        confidence: 'UNATTRIBUTED',
        promptId: null,
        platform: botRes.provider,
        isBotRetrieval: true,
        notes: botRes.notes,
      };
    }

    // 2. Token-Based Correlation (Extension or SDK Session Token)
    if (payload.attribution_token) {
      const tokenRecord = await this.tokenService.verifyAndConsumeToken(payload.attribution_token);
      if (tokenRecord) {
        const prompt = await this.db.prompts.getById(tokenRecord.prompt_id);
        if (prompt) {
          await this.saveVisit(visitId, payload.site_id, normalizedPageUrl, payload, tokenRecord.prompt_id, 'HIGH');
          return {
            visitId,
            activityType: 'human_click',
            confidence: 'HIGH',
            promptId: tokenRecord.prompt_id,
            platform: prompt.platform,
            matchedCitationUrl: tokenRecord.citation_url,
            isBotRetrieval: false,
            notes: 'High-confidence attribution verified via session attribution token.',
          };
        }
      }
    }

    // 3. Native Website SDK AI Referral Detection & Prompt Reconstruction
    const { isAiReferral, platform } = isReferrerFromAiPlatform(payload.referrer);
    if (isAiReferral) {
      // Reconstruct candidate prompt and queries from page context
      const reconstructed = reconstructPromptFromContext(platform, {
        url: payload.page_url,
        title: payload.page_title || '',
        h1: payload.page_h1,
        description: payload.meta_description,
      });

      // Check if user verified/confirmed the prompt via SDK intent widget
      if (payload.confirmed_prompt && payload.intent_verified) {
        const promptId = await this.saveInferredPrompt(platform, payload.confirmed_prompt, reconstructed.candidateQueries, now, false);
        await this.saveVisit(visitId, payload.site_id, normalizedPageUrl, payload, promptId, 'VERIFIED');
        return {
          visitId,
          activityType: 'human_click',
          confidence: 'VERIFIED',
          promptId,
          reconstructedPrompt: payload.confirmed_prompt,
          candidateQueries: reconstructed.candidateQueries,
          platform,
          isBotRetrieval: false,
          notes: 'Verified prompt captured directly via Website SDK zero-party intent confirmation.',
        };
      }

      // Check temporal co-occurrence with recent AI bot crawls (ChatGPT-User, Claude-Web)
      const botMatch = await this.temporalCorrelator.findRecentBotCrawl(platform, normalizedPageUrl);
      const promptId = await this.saveInferredPrompt(platform, reconstructed.primaryPrompt, reconstructed.candidateQueries, now, true);

      if (botMatch) {
        await this.saveVisit(visitId, payload.site_id, normalizedPageUrl, payload, promptId, 'HIGH');
        return {
          visitId,
          activityType: 'human_click',
          confidence: 'HIGH',
          promptId,
          reconstructedPrompt: reconstructed.primaryPrompt,
          candidateQueries: reconstructed.candidateQueries,
          platform,
          isBotRetrieval: false,
          notes: `High-confidence attribution matched with ${botMatch.matchedRetrieval.crawler_user_agent} crawl ${botMatch.timeDeltaSeconds}s prior.`,
        };
      }

      // Medium confidence AI referral with reconstructed prompt
      await this.saveVisit(visitId, payload.site_id, normalizedPageUrl, payload, promptId, 'MEDIUM');
      return {
        visitId,
        activityType: 'human_click',
        confidence: 'MEDIUM',
        promptId,
        reconstructedPrompt: reconstructed.primaryPrompt,
        candidateQueries: reconstructed.candidateQueries,
        platform,
        isBotRetrieval: false,
        notes: `AI referral from ${platform} detected. Prompt reconstructed via semantic intent inversion.`,
      };
    }

    // 4. Standard Unattributed Human Visit
    await this.saveVisit(visitId, payload.site_id, normalizedPageUrl, payload, null, 'UNATTRIBUTED');
    return {
      visitId,
      activityType: 'human_click',
      confidence: 'UNATTRIBUTED',
      promptId: null,
      platform: 'unknown',
      isBotRetrieval: false,
      notes: 'Standard web visit with no AI attribution signals.',
    };
  }

  private async saveVisit(visitId: string, siteId: string, url: string, payload: SdkVisitPayload, promptId: string | null, confidence: ConfidenceLevel) {
    const visitRecord: WebsiteVisitRecord = {
      visit_id: visitId,
      site_id: siteId,
      page_url: url,
      referrer: payload.referrer,
      visitor_session_id: payload.session_id,
      user_agent: payload.user_agent,
      attribution_token: payload.attribution_token,
      prompt_id: promptId || undefined,
      confidence,
      activity_type: 'human_click',
      created_at: payload.timestamp || new Date().toISOString(),
    };
    await this.db.visits.save(visitRecord);
  }

  private async saveInferredPrompt(platform: string, text: string, queries: string[], now: string, isInferred: boolean): Promise<string> {
    const promptId = `prm_${randomUUID()}`;
    const pRecord: PromptRecord = {
      prompt_id: promptId,
      install_id: 'inst_default_tester',
      platform: platform as any,
      prompt_text: text,
      prompt_hash: computePromptHash(text),
      is_redacted: false,
      created_at: now,
    };
    await this.db.prompts.save(pRecord);

    for (const q of queries) {
      const qRecord: SearchQueryRecord = {
        query_id: `qry_${randomUUID()}`,
        prompt_id: promptId,
        query_text: q,
        engine: platform,
        created_at: now,
      };
      await this.db.prompts.saveSearchQuery(qRecord);
    }

    return promptId;
  }
}
