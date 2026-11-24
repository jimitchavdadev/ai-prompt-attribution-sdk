import type { PageContext, ExtractedEntities } from './types.ts';

const AUDIENCE_PATTERNS = [
  /\b(enterprise websites?|enterprise)\b/i,
  /\b(e-?commerce|online stores?)\b/i,
  /\b(startups?|scaleups?)\b/i,
  /\b(small business(es)?|smbs?)\b/i,
  /\b(developers?|engineers?)\b/i,
  /\b(marketing teams?|marketers?)\b/i,
  /\b(agencies|agency teams?)\b/i,
];

const ACTION_VERBS = [
  'automate', 'audit', 'monitor', 'integrate', 'migrate', 'create',
  'debug', 'track', 'analyze', 'optimize', 'export', 'sync', 'implement', 'fix'
];

function sanitize(str?: string, maxLen = 300): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

export function extractEntities(context: PageContext): ExtractedEntities {
  const rawTitle = sanitize(context.title);
  let domainBrand = '';
  if (context.url) {
    try {
      const host = new URL(context.url).hostname
        .replace(/^www\./, '')
        .replace(/^(docs|api|blog|app|help|shop|auth|status|support)\./, '');
      domainBrand = host.split('.')[0];
    } catch {}
  }

  let brand = '';
  if (domainBrand && domainBrand.length > 2) {
    const brandRegex = new RegExp(`\\b(${domainBrand})\\b`, 'i');
    const titleMatch = rawTitle.match(brandRegex);
    if (titleMatch) brand = titleMatch[0];
  }

  if (!brand && context.schemaData?.brand?.name) {
    brand = sanitize(context.schemaData.brand.name);
  }

  if (!brand) {
    const brandSplit = rawTitle.split(/\s*[-|•–—]\s*/);
    brand = brandSplit.length > 1 ? brandSplit[brandSplit.length - 1].trim() : (brandSplit[0] || 'Software');
  }

  const rawH1 = sanitize(context.h1);
  const subject = rawH1 || rawTitle.split(/\s*[-|•–—]\s*/)[0].trim() || 'software solutions';
  const fullText = `${rawTitle} ${rawH1} ${sanitize(context.description)} ${context.pathname || ''} ${context.url || ''}`;

  let targetAudience: string | undefined;
  for (const pattern of AUDIENCE_PATTERNS) {
    const match = fullText.match(pattern);
    if (match) {
      targetAudience = match[0].toLowerCase();
      break;
    }
  }

  const competitors: string[] = [];
  const vsMatch = fullText.match(/\b([A-Za-z0-9\.\-]+)\s+(?:vs|versus|compared to)\s+([A-Za-z0-9\.\-]+)\b/i);
  if (vsMatch) {
    competitors.push(vsMatch[1].trim(), vsMatch[2].trim());
  } else {
    const altToMatch = fullText.match(/(?:alternatives? to|competitors? to)\s+([A-Za-z0-9\.\-]+)/i);
    const altMatch = fullText.match(/\b([A-Za-z0-9\.\-]+)\s+(?:alternatives|competitors)\b/i);
    if (altToMatch) competitors.push(altToMatch[1].trim());
    else if (altMatch && !/^(top|best|7|10|free|open)/i.test(altMatch[1])) competitors.push(altMatch[1].trim());
  }

  let actionVerb: string | undefined;
  const lowerText = fullText.toLowerCase();
  for (const verb of ACTION_VERBS) {
    if (lowerText.includes(verb)) {
      actionVerb = verb;
      break;
    }
  }

  let feature: string | undefined;
  const preIntegrationMatch = rawTitle.match(/\b([A-Za-z0-9]+)\s+(?:integration|connector|sync)\b/i);
  const postIntegrationMatch = fullText.match(/(?:integrat(?:ion|es? with)|connect with)\s+([A-Za-z0-9]+)/i);

  if (preIntegrationMatch && preIntegrationMatch[1].toLowerCase() !== brand.toLowerCase()) {
    feature = preIntegrationMatch[1].trim();
  } else if (postIntegrationMatch && postIntegrationMatch[1].toLowerCase() !== brand.toLowerCase()) {
    feature = postIntegrationMatch[1].trim();
  }

  return {
    subject,
    brand,
    competitors: [...new Set(competitors)],
    targetAudience,
    actionVerb,
    feature,
  };
}
