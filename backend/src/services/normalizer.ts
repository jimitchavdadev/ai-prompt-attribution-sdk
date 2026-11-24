export function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    // Lowercase host
    parsed.hostname = parsed.hostname.toLowerCase();
    
    // Strip common tracking and noisy params
    const strippedParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    for (const p of strippedParams) {
      parsed.searchParams.delete(p);
    }

    // Standardize trailing slash on path
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function extractDomain(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return rawUrl.split('/')[0].toLowerCase().replace(/^www\./, '');
  }
}

export function isSameOrSubdomain(urlOrDomainA: string, urlOrDomainB: string): boolean {
  const domA = extractDomain(urlOrDomainA);
  const domB = extractDomain(urlOrDomainB);
  return domA === domB || domA.endsWith('.' + domB) || domB.endsWith('.' + domA);
}
