import type { ExtractedLlmMetadata } from './openai.ts';

export function extractAnthropicMetadata(response: any): ExtractedLlmMetadata {
  const searchQueries: string[] = [];
  const citations: Array<{ url: string; title?: string }> = [];
  const retrievedUrls: string[] = [];

  if (!response?.content || !Array.isArray(response.content)) {
    return { searchQueries, citations, retrievedUrls };
  }

  for (const block of response.content) {
    // Tool use block (e.g. web_search, search_web, google_search)
    if (block.type === 'tool_use' && (block.name?.includes('search') || block.name?.includes('browse'))) {
      if (block.input?.query) {
        searchQueries.push(block.input.query);
      }
      if (block.input?.url) {
        retrievedUrls.push(block.input.url);
      }
    }

    // Text block or citation block
    if (block.citations && Array.isArray(block.citations)) {
      for (const cit of block.citations) {
        if (cit.url) {
          citations.push({ url: cit.url, title: cit.title });
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
