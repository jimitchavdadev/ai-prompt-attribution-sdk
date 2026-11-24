import { test, expect } from 'bun:test';
import { DatabaseService } from '../backend/src/db/index.ts';
import { CorrelationEngine } from '../backend/src/services/correlationEngine.ts';
import { reconstructPromptFromContext } from '../backend/src/services/promptReconstructor.ts';

test('reconstructPromptFromContext inverts page metadata into high-probability prompt', () => {
  const result = reconstructPromptFromContext('chatgpt', {
    url: 'https://example.com/enterprise-ga4-audit',
    title: 'Acme Analytics - Enterprise GA4 Audit Automation Platform',
    h1: 'Enterprise GA4 Audit Automation Platform',
    pathname: '/enterprise-ga4-audit',
  });

  expect(result.primaryPrompt).toContain('Enterprise GA4 Audit Automation Platform');
  expect(result.candidateQueries.length).toBeGreaterThan(0);
  expect(result.confidence).toBe('HIGH');
});

test('CorrelationEngine handles pure website SDK visit with ChatGPT referrer and reconstructed prompt', async () => {
  const db = new DatabaseService(':memory:');
  const engine = new CorrelationEngine(db);

  await db.websites.create({
    site_id: 'site_sdk_test',
    domain: 'sample-y.local',
    name: 'Sample Website Y',
    public_api_key: 'pk_live_test',
    created_at: new Date().toISOString(),
  });

  // 1. Simulate prior server-side AI retrieval by ChatGPT-User
  await engine.processSdkVisit({
    site_id: 'site_sdk_test',
    page_url: 'http://sample-y.local/features',
    user_agent: 'Mozilla/5.0 ChatGPT-User/1.0 (+https://openai.com/bot)',
  });

  // Verify retrieval was recorded as Type 1 (AI Website Retrieval)
  const retrievals = await db.retrievals.getAll();
  expect(retrievals.length).toBe(1);
  expect(retrievals[0].provider).toBe('openai');

  // 2. Pure Website SDK visit: Human lands from ChatGPT 30 seconds later
  const humanVisit = await engine.processSdkVisit({
    site_id: 'site_sdk_test',
    page_url: 'http://sample-y.local/features',
    referrer: 'https://chatgpt.com/',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    page_title: 'Enterprise GA4 Audit Automation Platform',
    page_h1: 'Enterprise GA4 Audit Automation Platform',
  });

  // Confirmed high-confidence attribution linked via temporal bot correlation!
  expect(humanVisit.confidence).toBe('HIGH');
  expect(humanVisit.activityType).toBe('human_click');
  expect(humanVisit.platform).toBe('chatgpt');
  expect(humanVisit.reconstructedPrompt).toContain('Enterprise GA4 Audit Automation Platform');
  expect(humanVisit.isBotRetrieval).toBe(false);

  // 3. User verifies/confirms the prompt via the SDK intent banner
  const confirmedVisit = await engine.processSdkVisit({
    site_id: 'site_sdk_test',
    page_url: 'http://sample-y.local/features',
    referrer: 'https://chatgpt.com/',
    confirmed_prompt: 'Find the best GA4 audit automation tools for enterprise websites.',
    intent_verified: true,
  });

  expect(confirmedVisit.confidence).toBe('VERIFIED');
  expect(confirmedVisit.reconstructedPrompt).toBe('Find the best GA4 audit automation tools for enterprise websites.');

  db.close();
});
