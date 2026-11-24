import type { ExtractedLlmMetadata } from './openai.ts';

export function extractGeminiMetadata(response: any): ExtractedLlmMetadata {
  const searchQueries: string[] = [];
  const citations: Array<{ url: string; title?: string }> = [];
  const retrievedUrls: string[] = [];

  if (!response?.candidates || !Array.isArray(response.candidates)) {
    return { searchQueries, citations, retrievedUrls };
  }

  for (const candidate of response.candidates) {
    const gm = candidate.groundingMetadata;
    if (gm) {
      if (Array.isArray(gm.webSearchQueries)) {
        searchQueries.push(...gm.webSearchQueries);
      }
      if (Array.isArray(gm.groundingChunks)) {
        for (const chunk of gm.groundingChunks) {
          if (chunk.web?.uri) {
            retrievedUrls.push(chunk.web.uri);
            citations.push({
              url: chunk.web.uri,
              title: chunk.web.title || undefined,
            });
          }
        }
      }
    }
  }

  return {
    searchQueries: [...new Set(searchQueries)],
    citations,
    retrievedUrls: [...new Set(retrievedUrls)],
  };
}
