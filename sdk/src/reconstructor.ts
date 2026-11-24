import type { PageMetadata, ReconstructedPrompt } from './types.ts';

export function reconstructPrompt(platform: string, meta: PageMetadata): ReconstructedPrompt {
  const rawTitle = meta.title || '';
  const brandSplit = rawTitle.split(/\s*[-|•–—]\s*/);
  const cleanTitle = brandSplit[0].trim();
  const brand = brandSplit.length > 1 ? brandSplit[brandSplit.length - 1].trim() : cleanTitle;
  const subject = meta.h1?.trim() || cleanTitle || 'software solutions';
  const urlLower = (meta.url || '').toLowerCase();
  const titleLower = rawTitle.toLowerCase();
  const h1Lower = (meta.h1 || '').toLowerCase();
  const schema = (meta.schemaType || '').toLowerCase();

  let intentCategory = 'recommendation';
  let primaryPrompt = '';
  const alternativePrompts: string[] = [];
  const candidateQueries: string[] = [];
  let score = 0.65;

  if (urlLower.includes('pricing') || titleLower.includes('pricing') || titleLower.includes('cost') || meta.schemaData?.offers) {
    intentCategory = 'pricing';
    score = 0.95;
    primaryPrompt = `How much does ${brand} cost and what are the pricing tiers?`;
    alternativePrompts.push(`What is the enterprise pricing for ${brand}?`);
    candidateQueries.push(`${brand} pricing tiers`, `${brand} enterprise cost`);
  } else if (urlLower.includes('/vs/') || urlLower.includes('compare') || /\b(vs|versus)\b/i.test(titleLower)) {
    intentCategory = 'comparison';
    score = 0.90;
    const vsMatch = titleLower.match(/\b([a-zA-Z0-9]+)\s+vs\s+([a-zA-Z0-9]+)\b/i);
    if (vsMatch) {
      primaryPrompt = `Compare ${vsMatch[1]} vs ${vsMatch[2]} for enterprise teams`;
      alternativePrompts.push(`Which is better: ${vsMatch[1]} or ${vsMatch[2]}?`);
    } else {
      primaryPrompt = `Compare the best ${subject} for enterprise teams`;
      alternativePrompts.push(`Top alternatives to ${brand}`);
    }
    candidateQueries.push(`best ${subject} comparison`, `top alternatives to ${brand}`);
  } else if (urlLower.includes('how-to') || titleLower.startsWith('how to') || schema.includes('howto')) {
    intentCategory = 'how_to';
    score = 0.88;
    primaryPrompt = `How to implement ${subject} step by step?`;
    alternativePrompts.push(`Complete guide to ${subject}`);
    candidateQueries.push(`how to ${subject}`, `${subject} tutorial guide`);
  } else if (titleLower.includes('troubleshoot') || titleLower.includes('fix') || titleLower.includes('error')) {
    intentCategory = 'problem_solving';
    score = 0.85;
    primaryPrompt = `How to fix ${subject} issues and errors?`;
    alternativePrompts.push(`Troubleshoot ${subject}`);
    candidateQueries.push(`how to fix ${subject}`, `troubleshoot ${subject}`);
  } else {
    intentCategory = 'recommendation';
    score = 0.80;
    primaryPrompt = `Find the best ${subject} for enterprise websites`;
    alternativePrompts.push(`What are the top rated ${subject} tools in 2026?`);
    candidateQueries.push(`best ${subject} enterprise`, `top rated ${subject}`);
  }

  if (platform === 'chatgpt') candidateQueries.unshift(`recommend ${subject} solutions`);
  else if (platform === 'gemini') candidateQueries.unshift(`Google search: top ${subject}`);
  else if (platform === 'claude') candidateQueries.unshift(`overview of ${subject} platforms`);
  else if (platform === 'perplexity') candidateQueries.unshift(`${subject} reviews`);

  return {
    primaryPrompt,
    alternativePrompts,
    candidateQueries: [...new Set(candidateQueries)],
    intentCategory,
    confidence: score >= 0.8 ? 'HIGH' : 'MEDIUM',
    confidenceScore: score,
  };
}
