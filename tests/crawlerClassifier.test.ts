import { test, expect } from 'bun:test';
import { classifyUserAgent, isReferrerFromAiPlatform } from '../backend/src/services/crawlerClassifier.ts';

test('classifyUserAgent detects ChatGPT-User as live browsing agent', () => {
  const ua = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)';
  const res = classifyUserAgent(ua);
  expect(res.isAiBot).toBe(true);
  expect(res.provider).toBe('openai');
  expect(res.botName).toBe('ChatGPT-User');
  expect(res.category).toBe('live_browsing_agent');
  expect(res.isLiveBrowsing).toBe(true);
});

test('classifyUserAgent detects GPTBot and ClaudeBot as training crawlers', () => {
  const gpt = classifyUserAgent('Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0; +https://openai.com/gptbot)');
  expect(gpt.isAiBot).toBe(true);
  expect(gpt.provider).toBe('openai');
  expect(gpt.category).toBe('training_crawler');
  expect(gpt.isLiveBrowsing).toBe(false);

  const claude = classifyUserAgent('ClaudeBot/1.0; +claudebot@anthropic.com');
  expect(claude.isAiBot).toBe(true);
  expect(claude.provider).toBe('anthropic');
  expect(claude.category).toBe('training_crawler');
});

test('classifyUserAgent identifies standard Chrome as human browser', () => {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const res = classifyUserAgent(ua);
  expect(res.isAiBot).toBe(false);
  expect(res.category).toBe('human_browser');
});

test('isReferrerFromAiPlatform detects ChatGPT, Claude, and Gemini referrers', () => {
  expect(isReferrerFromAiPlatform('https://chatgpt.com/c/123-abc')).toEqual({ isAiReferral: true, platform: 'chatgpt' });
  expect(isReferrerFromAiPlatform('https://gemini.google.com/app')).toEqual({ isAiReferral: true, platform: 'gemini' });
  expect(isReferrerFromAiPlatform('https://claude.ai/chat/456')).toEqual({ isAiReferral: true, platform: 'claude' });
  expect(isReferrerFromAiPlatform('https://www.google.com/search?q=test')).toEqual({ isAiReferral: false, platform: 'unknown' });
});
