import type { PageContext, ReconstructionIntent } from './types.ts';

export function classifyIntent(context: PageContext): { intent: ReconstructionIntent; confidenceScore: number; reason: string } {
  if (!context.title && !context.url && !context.h1) {
    return { intent: 'recommendation', confidenceScore: 0.3, reason: 'Empty context fallback' };
  }

  const urlLower = (context.url || '').toLowerCase();
  let pathLower = (context.pathname || '').toLowerCase();
  if (!pathLower && context.url) {
    try { pathLower = new URL(context.url).pathname.toLowerCase(); } catch {}
  }
  const titleLower = (context.title || '').toLowerCase();
  const h1Lower = (context.h1 || '').toLowerCase();
  const descLower = (context.description || '').toLowerCase();
  const schemaType = (context.schemaType || '').toLowerCase();
  const allText = `${urlLower} ${pathLower} ${titleLower} ${h1Lower} ${descLower}`;

  const scores: Record<ReconstructionIntent, number> = {
    pricing: 0,
    comparison: 0,
    how_to: 0,
    problem_solving: 0,
    feature: 0,
    recommendation: 0,
  };

  // 1. Commercial / Pricing signals
  if (/(\/pricing|\/plans|\/cost)/i.test(pathLower)) scores.pricing += 55;
  if (/\b(pricing|cost|rates?|fees?)\b/i.test(titleLower) || /\b(pricing|cost)\b/i.test(h1Lower)) scores.pricing += 45;
  if (context.schemaData?.offers || schemaType.includes('offer')) scores.pricing += 35;
  if (/(\$|tier|per month|subscription|quote)/i.test(allText)) scores.pricing += 20;

  // 2. Comparison / Alternative signals
  if (/(\/vs\/|\/compare|\/alternatives)/i.test(pathLower)) scores.comparison += 55;
  if (/\b(vs|versus|compared to|alternatives?|competitors?)\b/i.test(titleLower) || /\b(vs|versus|alternatives?)\b/i.test(h1Lower)) scores.comparison += 50;
  if (/\b(better than|difference between|pros and cons|vs\.)\b/i.test(allText)) scores.comparison += 25;

  // 3. Problem solving / Troubleshooting signals
  if (/(\/troubleshoot|\/error|\/fix|\/issue|\/debug|\/post\/fix)/i.test(pathLower)) scores.problem_solving += 55;
  if (/\b(how to fix|error|troubleshoot|resolv|issue|why is .* failing|spik(?:e|ing))\b/i.test(titleLower) || /\b(fix|error|troubleshoot)\b/i.test(h1Lower)) scores.problem_solving += 50;
  if (schemaType.includes('qapage')) scores.problem_solving += 25;

  // 4. How-to / Implementation / Developer docs signals
  if (/(\/how-to|\/tutorial|\/guide|\/docs|\/setup|\/guides\/|\/api\/)/i.test(pathLower)) scores.how_to += 55;
  if (/^(how to|guide to|getting started|step by step|create|build|setup|implement)/i.test(titleLower) || /^(how to|guide to|implement|create)/i.test(h1Lower)) scores.how_to += 50;
  if (schemaType.includes('howto') || schemaType.includes('faqpage') || schemaType.includes('techarticle')) scores.how_to += 40;
  if (/\b(api reference|documentation|sdk reference|tutorial)\b/i.test(titleLower)) scores.how_to += 45;

  // 5. Feature / Integration signals
  if (/(\/features|\/integrations|\/integrates-with)/i.test(pathLower)) scores.feature += 55;
  if (/\b(integration|integrates?|supports|features|connect with)\b/i.test(titleLower) || /\b(integration|integrates?|connect with)\b/i.test(h1Lower)) scores.feature += 45;

  // 6. Recommendation / Best signals (default baseline)
  scores.recommendation += 25;
  if (/\b(best|top|recommended|platform|software|tool|solutions|automated|catalog|collection)\b/i.test(titleLower) || /\b(best|top)\b/i.test(h1Lower)) scores.recommendation += 35;
  if (schemaType.includes('softwareapplication') || schemaType.includes('product')) scores.recommendation += 20;

  let topIntent: ReconstructionIntent = 'recommendation';
  let maxScore = -1;
  for (const [intentKey, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      topIntent = intentKey as ReconstructionIntent;
    }
  }

  const confidenceScore = Math.min(1.0, Math.max(0.65, Number((maxScore / 80).toFixed(2))));
  return {
    intent: topIntent,
    confidenceScore,
    reason: `Dominant intent '${topIntent}' matched with signal score ${maxScore}`,
  };
}
