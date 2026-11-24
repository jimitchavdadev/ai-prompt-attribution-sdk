import type { CrawlerClassification, TraceContext } from './types.ts';

const BOT_PATTERNS = [
  { regex: /ChatGPT-User/i, provider: 'chatgpt', name: 'ChatGPT-User', cat: 'live_browsing_agent', live: true },
  { regex: /OAI-SearchBot/i, provider: 'chatgpt', name: 'OAI-SearchBot', cat: 'search_indexer', live: false },
  { regex: /GPTBot/i, provider: 'chatgpt', name: 'GPTBot', cat: 'training_crawler', live: false },
  { regex: /Claude-Web/i, provider: 'claude', name: 'Claude-Web', cat: 'live_browsing_agent', live: true },
  { regex: /ClaudeBot/i, provider: 'claude', name: 'ClaudeBot', cat: 'training_crawler', live: false },
  { regex: /Google-Extended/i, provider: 'gemini', name: 'Google-Extended', cat: 'training_crawler', live: false },
  { regex: /GoogleOther/i, provider: 'gemini', name: 'GoogleOther', cat: 'search_indexer', live: false },
  { regex: /PerplexityBot/i, provider: 'perplexity', name: 'PerplexityBot', cat: 'live_browsing_agent', live: true },
  { regex: /cohere-ai/i, provider: 'cohere', name: 'cohere-ai', cat: 'training_crawler', live: false },
  { regex: /Bytespider/i, provider: 'bytedance', name: 'Bytespider', cat: 'training_crawler', live: false },
] as const;

export function classifyUserAgent(userAgent: string): CrawlerClassification {
  if (!userAgent) {
    return { isAiBot: false, provider: 'unknown', botName: 'unknown', category: 'human_browser', isLiveBrowsing: false };
  }
  for (const bot of BOT_PATTERNS) {
    if (bot.regex.test(userAgent)) {
      return { isAiBot: true, provider: bot.provider, botName: bot.name, category: bot.cat, isLiveBrowsing: bot.live };
    }
  }
  return { isAiBot: false, provider: 'unknown', botName: 'browser', category: 'human_browser', isLiveBrowsing: false };
}

export function detectAiReferrer(referrer: string): { isAi: boolean; platform: string } {
  if (!referrer) return { isAi: false, platform: 'direct' };
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes('chatgpt.com') || host.includes('openai.com')) return { isAi: true, platform: 'chatgpt' };
    if (host.includes('claude.ai') || host.includes('anthropic.com')) return { isAi: true, platform: 'claude' };
    if (host.includes('gemini.google.com')) return { isAi: true, platform: 'gemini' };
    if (host.includes('perplexity.ai')) return { isAi: true, platform: 'perplexity' };
    if (host.includes('copilot.microsoft.com')) return { isAi: true, platform: 'copilot' };
    return { isAi: false, platform: 'web' };
  } catch {
    return { isAi: false, platform: 'unknown' };
  }
}

export function parseTraceparentHeader(traceparent: string): TraceContext | null {
  if (!traceparent || typeof traceparent !== 'string') return null;
  const parts = traceparent.trim().split('-');
  if (parts.length < 4 || parts[0] !== '00') return null;
  const traceId = parts[1];
  const spanId = parts[2];
  if (traceId.length !== 32 || spanId.length !== 16) return null;
  return { traceId, spanId };
}
