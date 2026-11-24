export interface ExtractedLlmMetadata {
  searchQueries: string[];
  citations: Array<{ url: string; title?: string }>;
  retrievedUrls: string[];
}

export function extractOpenAIMetadata(response: any): ExtractedLlmMetadata {
  const searchQueries: string[] = [];
  const citations: Array<{ url: string; title?: string }> = [];
  const retrievedUrls: string[] = [];

  if (!response) return { searchQueries, citations, retrievedUrls };

  // OpenAI Responses API structure
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (item.type === 'web_search_call' && item.action) {
        if (Array.isArray(item.action.queries)) {
          searchQueries.push(...item.action.queries);
        }
        if (Array.isArray(item.action.sources)) {
          for (const s of item.action.sources) {
            if (s.url) retrievedUrls.push(s.url);
          }
        }
      }
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (Array.isArray(c.annotations)) {
            for (const a of c.annotations) {
              if (a.type === 'url_citation' && a.url) {
                citations.push({ url: a.url, title: a.title });
              }
            }
          }
        }
      }
    }
  }

  // Fallback: Chat Completions annotations / tool_calls
  if (Array.isArray(response.choices)) {
    for (const choice of response.choices) {
      const msg = choice.message;
      if (msg?.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (tc.function?.name === 'web_search') {
            try {
              const parsed = JSON.parse(tc.function.arguments);
              if (parsed.query) searchQueries.push(parsed.query);
            } catch {
              // Ignore JSON parse error
            }
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
