import { test, expect } from 'bun:test';
import { generateW3cTraceContext, parseW3cTraceparent } from '../llm-sdk/src/w3cContext.ts';
import { extractOpenAIMetadata } from '../llm-sdk/src/adapters/openai.ts';
import { extractGeminiMetadata } from '../llm-sdk/src/adapters/gemini.ts';
import { extractAnthropicMetadata } from '../llm-sdk/src/adapters/anthropic.ts';

test('generateW3cTraceContext produces valid W3C traceparent and baggage headers', () => {
  const ctx = generateW3cTraceContext('prm_test_123', 'openai');
  expect(ctx.traceId.length).toBe(32);
  expect(ctx.spanId.length).toBe(16);
  expect(ctx.traceparent.startsWith('00-')).toBe(true);
  expect(ctx.baggage).toContain('ai.provider=openai');
  expect(ctx.baggage).toContain('ai.prompt_id=prm_test_123');

  const parsed = parseW3cTraceparent(ctx.traceparent);
  expect(parsed?.traceId).toBe(ctx.traceId);
  expect(parsed?.spanId).toBe(ctx.spanId);
});

test('extractOpenAIMetadata parses web_search_call queries and url_citation annotations', () => {
  const rawResponse = {
    output: [
      {
        type: 'web_search_call',
        action: {
          queries: ['best GA4 audit automation enterprise'],
          sources: [{ url: 'https://acme-analytics.com/audit' }],
        },
      },
      {
        type: 'message',
        content: [
          {
            type: 'text',
            text: 'Here is the leading solution...',
            annotations: [
              {
                type: 'url_citation',
                url: 'https://acme-analytics.com/audit',
                title: 'Acme GA4 Audit Platform',
              },
            ],
          },
        ],
      },
    ],
  };

  const res = extractOpenAIMetadata(rawResponse);
  expect(res.searchQueries).toContain('best GA4 audit automation enterprise');
  expect(res.citations.length).toBe(1);
  expect(res.citations[0].url).toBe('https://acme-analytics.com/audit');
  expect(res.citations[0].title).toBe('Acme GA4 Audit Platform');
});

test('extractGeminiMetadata parses groundingMetadata webSearchQueries and groundingChunks', () => {
  const rawResponse = {
    candidates: [
      {
        groundingMetadata: {
          webSearchQueries: ['enterprise GA4 tagging verification software'],
          groundingChunks: [
            {
              web: {
                uri: 'https://acme-analytics.com/enterprise',
                title: 'Acme Enterprise Tagging Verification',
              },
            },
          ],
        },
      },
    ],
  };

  const res = extractGeminiMetadata(rawResponse);
  expect(res.searchQueries).toContain('enterprise GA4 tagging verification software');
  expect(res.citations.length).toBe(1);
  expect(res.citations[0].url).toBe('https://acme-analytics.com/enterprise');
});

test('extractAnthropicMetadata parses web search tool use', () => {
  const rawResponse = {
    content: [
      {
        type: 'tool_use',
        name: 'web_search',
        input: { query: 'GA4 audit automation tools' },
      },
      {
        type: 'text',
        text: 'Reviewing tools...',
        citations: [{ url: 'https://acme-analytics.com', title: 'Acme' }],
      },
    ],
  };

  const res = extractAnthropicMetadata(rawResponse);
  expect(res.searchQueries).toContain('GA4 audit automation tools');
  expect(res.citations[0].url).toBe('https://acme-analytics.com');
});
