import type { DatabaseService } from '../db/index.ts';
import type { RetrievalRecord } from '../types.ts';
import { normalizeUrl } from './normalizer.ts';

const TEMPORAL_WINDOW_MS = 10 * 60 * 1000; // 10 minutes sliding window

export interface TemporalCorrelationMatch {
  matchedRetrieval: RetrievalRecord;
  timeDeltaSeconds: number;
  confidenceBoost: boolean;
}

function isMatchingAiProvider(p1: string, p2: string): boolean {
  const a = p1.toLowerCase();
  const b = p2.toLowerCase();
  if (a === b) return true;
  if ((a === 'openai' && b === 'chatgpt') || (a === 'chatgpt' && b === 'openai')) return true;
  if ((a === 'google' && b === 'gemini') || (a === 'gemini' && b === 'google')) return true;
  if ((a === 'anthropic' && b === 'claude') || (a === 'claude' && b === 'anthropic')) return true;
  return false;
}

export class TemporalCorrelator {
  constructor(private db: DatabaseService) {}

  async findRecentBotCrawl(
    platform: string,
    targetUrl: string,
    visitTimestampMs: number = Date.now()
  ): Promise<TemporalCorrelationMatch | null> {
    const normalizedTarget = normalizeUrl(targetUrl);
    const retrievals = await this.db.retrievals.getAll(200);

    for (const r of retrievals) {
      if (isMatchingAiProvider(r.provider, platform)) {
        const botNormUrl = normalizeUrl(r.requested_url);
        if (botNormUrl === normalizedTarget || normalizedTarget.includes(botNormUrl) || botNormUrl.includes(normalizedTarget)) {
          const crawlTimeMs = new Date(r.created_at).getTime();
          const deltaMs = visitTimestampMs - crawlTimeMs;

          if (deltaMs >= 0 && deltaMs <= TEMPORAL_WINDOW_MS) {
            return {
              matchedRetrieval: r,
              timeDeltaSeconds: Math.round(deltaMs / 1000),
              confidenceBoost: true,
            };
          }
        }
      }
    }

    return null;
  }
}
