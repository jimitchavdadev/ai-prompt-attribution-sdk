export interface CrawlerClassification {
  isAiBot: boolean;
  provider: string;
  botName: string;
  category: 'training_crawler' | 'search_indexer' | 'live_browsing_agent' | 'human_browser';
  isLiveBrowsing: boolean;
}

const AI_BOT_SIGNATURES: Array<{
  regex: RegExp;
  provider: string;
  botName: string;
  category: 'training_crawler' | 'search_indexer' | 'live_browsing_agent';
  isLiveBrowsing: boolean;
}> = [
  // OpenAI
  {
    regex: /ChatGPT-User/i,
    provider: 'openai',
    botName: 'ChatGPT-User',
    category: 'live_browsing_agent',
    isLiveBrowsing: true,
  },
  {
    regex: /OAI-SearchBot/i,
    provider: 'openai',
    botName: 'OAI-SearchBot',
    category: 'search_indexer',
    isLiveBrowsing: false,
  },
  {
    regex: /GPTBot/i,
    provider: 'openai',
    botName: 'GPTBot',
    category: 'training_crawler',
    isLiveBrowsing: false,
  },
  // Anthropic
  {
    regex: /Claude-Web/i,
    provider: 'anthropic',
    botName: 'Claude-Web',
    category: 'live_browsing_agent',
    isLiveBrowsing: true,
  },
  {
    regex: /ClaudeBot/i,
    provider: 'anthropic',
    botName: 'ClaudeBot',
    category: 'training_crawler',
    isLiveBrowsing: false,
  },
  // Google
  {
    regex: /Google-Extended/i,
    provider: 'google',
    botName: 'Google-Extended',
    category: 'training_crawler',
    isLiveBrowsing: false,
  },
  {
    regex: /GoogleOther/i,
    provider: 'google',
    botName: 'GoogleOther',
    category: 'search_indexer',
    isLiveBrowsing: false,
  },
  // Perplexity
  {
    regex: /PerplexityBot/i,
    provider: 'perplexity',
    botName: 'PerplexityBot',
    category: 'search_indexer',
    isLiveBrowsing: true,
  },
  // Meta
  {
    regex: /Meta-ExternalAgent/i,
    provider: 'meta',
    botName: 'Meta-ExternalAgent',
    category: 'training_crawler',
    isLiveBrowsing: false,
  },
  // Mistral
  {
    regex: /MistralBot/i,
    provider: 'mistral',
    botName: 'MistralBot',
    category: 'training_crawler',
    isLiveBrowsing: false,
  },
  // Generic AI Agents
  {
    regex: /(AI-Agent|LangChain|LlamaIndex|AutoGPT)/i,
    provider: 'custom_agent',
    botName: 'Custom-AI-Agent',
    category: 'live_browsing_agent',
    isLiveBrowsing: true,
  }
];

export function classifyUserAgent(userAgent?: string): CrawlerClassification {
  if (!userAgent) {
    return {
      isAiBot: false,
      provider: 'unknown',
      botName: 'none',
      category: 'human_browser',
      isLiveBrowsing: false
    };
  }

  for (const bot of AI_BOT_SIGNATURES) {
    if (bot.regex.test(userAgent)) {
      return {
        isAiBot: true,
        provider: bot.provider,
        botName: bot.botName,
        category: bot.category,
        isLiveBrowsing: bot.isLiveBrowsing
      };
    }
  }

  return {
    isAiBot: false,
    provider: 'unknown',
    botName: 'none',
    category: 'human_browser',
    isLiveBrowsing: false
  };
}

export function isReferrerFromAiPlatform(referrer?: string): { isAiReferral: boolean; platform: string } {
  if (!referrer) return { isAiReferral: false, platform: 'unknown' };

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();

    if (host.includes('chatgpt.com') || host.includes('openai.com')) {
      return { isAiReferral: true, platform: 'chatgpt' };
    }
    if (host.includes('gemini.google.com') || host.includes('bard.google.com')) {
      return { isAiReferral: true, platform: 'gemini' };
    }
    if (host.includes('claude.ai') || host.includes('anthropic.com')) {
      return { isAiReferral: true, platform: 'claude' };
    }
    if (host.includes('perplexity.ai')) {
      return { isAiReferral: true, platform: 'perplexity' };
    }
  } catch {
    // Ignore invalid url
  }

  return { isAiReferral: false, platform: 'unknown' };
}
