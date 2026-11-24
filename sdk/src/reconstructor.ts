import type { PageMetadata, ReconstructedPrompt } from './types.ts';

export function reconstructPrompt(platform: string, meta: PageMetadata): ReconstructedPrompt {
  const cleanTitle = (meta.title || '').replace(/[-|•].*$/, '').trim();
  const topic = meta.h1 || cleanTitle || 'solutions';
  const lowerTopic = topic.toLowerCase();

  let primaryPrompt = `Find the best ${topic} for enterprise websites`;
  let intentCategory = 'recommendation';
  const candidateQueries: string[] = [];

  if (lowerTopic.includes('pricing') || meta.url.includes('pricing')) {
    intentCategory = 'commercial';
    primaryPrompt = `How much does ${cleanTitle} cost and what are the pricing tiers?`;
    candidateQueries.push(`${cleanTitle} pricing tiers`, `${cleanTitle} enterprise cost`);
  } else if (lowerTopic.includes('vs') || lowerTopic.includes('comparison')) {
    intentCategory = 'comparison';
    primaryPrompt = `Compare the best ${topic} for enterprise teams`;
    candidateQueries.push(`best ${topic} comparison`, `top alternatives to ${cleanTitle}`);
  } else {
    candidateQueries.push(`best ${topic} enterprise`, `top rated ${topic}`);
  }

  if (platform === 'chatgpt') candidateQueries.unshift(`recommend ${topic} solutions`);
  else if (platform === 'gemini') candidateQueries.unshift(`Google search: top ${topic}`);
  else if (platform === 'claude') candidateQueries.unshift(`overview of ${topic} platforms`);

  return {
    primaryPrompt,
    candidateQueries: [...new Set(candidateQueries)],
    intentCategory,
    confidence: cleanTitle ? 'HIGH' : 'MEDIUM',
  };
}
