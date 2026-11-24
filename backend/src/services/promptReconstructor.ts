export interface PageContext {
  url: string;
  title: string;
  h1?: string;
  description?: string;
  keywords?: string[];
  pathname?: string;
}

export interface ReconstructedPromptResult {
  primaryPrompt: string;
  candidateQueries: string[];
  intentCategory: 'comparison' | 'recommendation' | 'informational' | 'commercial';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function reconstructPromptFromContext(
  platform: string,
  context: PageContext
): ReconstructedPromptResult {
  const cleanTitle = (context.title || '')
    .replace(/[-|•].*$/, '') // strip brand suffix e.g. " - Acme Analytics"
    .trim();

  const coreTopic = context.h1 || cleanTitle || 'software solutions';
  const path = (context.pathname || '').replace(/[-_/]/g, ' ').trim();

  let intentCategory: ReconstructedPromptResult['intentCategory'] = 'recommendation';
  let primaryPrompt = '';
  const candidateQueries: string[] = [];

  const lowerTopic = coreTopic.toLowerCase();
  const isToolOrPlatform = lowerTopic.includes('tool') || lowerTopic.includes('software') || lowerTopic.includes('platform');

  if (lowerTopic.includes('pricing') || path.includes('pricing')) {
    intentCategory = 'commercial';
    primaryPrompt = `How much does ${cleanTitle} cost, and what are the enterprise pricing tiers?`;
    candidateQueries.push(`${cleanTitle} pricing tiers`, `${cleanTitle} enterprise cost`);
  } else if (lowerTopic.includes('vs') || lowerTopic.includes('comparison') || path.includes('compare')) {
    intentCategory = 'comparison';
    primaryPrompt = `Compare the best ${coreTopic} for enterprise teams`;
    candidateQueries.push(`best ${coreTopic} comparison`, `top alternatives to ${cleanTitle}`);
  } else if (isToolOrPlatform) {
    intentCategory = 'recommendation';
    primaryPrompt = `Find the best ${coreTopic} for enterprise websites`;
    candidateQueries.push(`best ${coreTopic} enterprise`, `top rated ${coreTopic}`);
  } else {
    intentCategory = 'informational';
    primaryPrompt = `What is ${coreTopic} and which tools automate it?`;
    candidateQueries.push(`${coreTopic} automation tools`, `how to implement ${coreTopic}`);
  }

  // Provider-specific phrasing heuristics
  if (platform === 'chatgpt') {
    candidateQueries.unshift(`recommend ${coreTopic} solutions`);
  } else if (platform === 'gemini') {
    candidateQueries.unshift(`Google search: top ${coreTopic}`);
  } else if (platform === 'claude') {
    candidateQueries.unshift(`overview of ${coreTopic} platforms`);
  }

  return {
    primaryPrompt,
    candidateQueries: [...new Set(candidateQueries)],
    intentCategory,
    confidence: cleanTitle ? 'HIGH' : 'MEDIUM',
  };
}
