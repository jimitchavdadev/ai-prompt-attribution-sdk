import type { PageContext, ExtractedEntities, ReconstructionIntent, ReconstructedPromptResult } from './types.ts';

export function synthesizePrompt(
  platform: string,
  context: PageContext,
  entities: ExtractedEntities,
  intent: ReconstructionIntent,
  confidenceScore: number,
  reason: string
): ReconstructedPromptResult {
  const { subject, brand, competitors, targetAudience, actionVerb, feature } = entities;

  let audienceQualifier = '';
  if (targetAudience && !subject.toLowerCase().includes(targetAudience.toLowerCase())) {
    audienceQualifier = ` for ${targetAudience}`;
  } else if (!targetAudience && !subject.toLowerCase().includes('enterprise')) {
    audienceQualifier = ' for enterprise websites';
  }

  let primaryPrompt = '';
  const alternativePrompts: string[] = [];
  const candidateQueries: string[] = [];

  switch (intent) {
    case 'pricing': {
      primaryPrompt = `How much does ${brand} cost and what are the pricing tiers?`;
      alternativePrompts.push(
        `What is the enterprise pricing for ${brand}?`,
        `Is there a free tier or demo for ${brand}?`
      );
      candidateQueries.push(`${brand} pricing tiers`, `${brand} enterprise cost`, `${brand} cost`);
      break;
    }
    case 'comparison': {
      if (competitors.length >= 2) {
        primaryPrompt = `Compare ${competitors[0]} vs ${competitors[1]}${audienceQualifier}`;
        alternativePrompts.push(`Which is better: ${competitors[0]} or ${competitors[1]}?`);
      } else if (competitors.length === 1) {
        primaryPrompt = `What are the best alternatives to ${competitors[0]}${audienceQualifier}?`;
        alternativePrompts.push(`Top competitors and alternatives to ${competitors[0]}`);
      } else {
        primaryPrompt = `Compare the best ${subject}${audienceQualifier}`;
        alternativePrompts.push(`Top alternatives to ${brand}`);
      }
      candidateQueries.push(`best ${subject} comparison`, `${brand} competitors`);
      break;
    }
    case 'problem_solving': {
      const clean = subject.replace(/^(troubleshoot and fix|how to fix|troubleshoot|fix)\s+/i, '').trim();
      primaryPrompt = `How to fix ${clean} issues and errors?`;
      alternativePrompts.push(`Troubleshoot ${clean} in 5 steps`, `Why is ${clean} failing and how do I fix it?`);
      candidateQueries.push(`how to fix ${clean}`, `troubleshoot ${clean}`);
      break;
    }
    case 'how_to': {
      const verb = actionVerb || 'implement';
      const clean = subject.replace(new RegExp(`^(how to|guide to|${verb}|implement|setup|build|automate|fix)\\s+`, 'i'), '').trim();
      primaryPrompt = `How to ${verb} ${clean} step by step?`;
      alternativePrompts.push(`Complete guide to ${clean}`, `Best practices for ${verb}ing ${clean}`);
      candidateQueries.push(`how to ${verb} ${clean}`, `${clean} tutorial guide`);
      break;
    }
    case 'feature': {
      const feat = feature || 'integrations';
      primaryPrompt = `Does ${brand} support ${feat}?`;
      alternativePrompts.push(`How does ${brand} integrate with ${feat}?`, `Connect ${brand} to ${feat}`);
      candidateQueries.push(`${brand} ${feat} integration`, `${brand} connect with ${feat}`);
      break;
    }
    case 'recommendation':
    default: {
      primaryPrompt = `Find the best ${subject}${audienceQualifier}`;
      alternativePrompts.push(`What are the top rated ${subject} tools in 2026?`);
      candidateQueries.push(`best ${subject} enterprise`, `top rated ${subject}`);
      break;
    }
  }

  // Platform style adjustments
  if (platform === 'chatgpt') {
    candidateQueries.unshift(`recommend ${subject} solutions`);
  } else if (platform === 'gemini') {
    candidateQueries.unshift(`Google search: top ${subject}`);
  } else if (platform === 'claude') {
    candidateQueries.unshift(`overview of ${subject} platforms`);
  } else if (platform === 'perplexity') {
    candidateQueries.unshift(`${subject} reviews`);
  }

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    confidenceScore >= 0.75 ? 'HIGH' : confidenceScore >= 0.5 ? 'MEDIUM' : 'LOW';

  return {
    primaryPrompt,
    alternativePrompts,
    candidateQueries: [...new Set(candidateQueries)],
    intentCategory: intent,
    confidence,
    confidenceScore,
    explanation: reason,
  };
}
