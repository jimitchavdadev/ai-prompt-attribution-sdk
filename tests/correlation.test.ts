import { test, expect } from 'bun:test';
import { DatabaseService } from '../backend/src/db/index.ts';
import { CorrelationEngine } from '../backend/src/services/correlationEngine.ts';
import { TokenService } from '../backend/src/services/tokenService.ts';

test('CorrelationEngine assigns HIGH confidence to valid extension token visits', async () => {
  const db = new DatabaseService(':memory:');
  const engine = new CorrelationEngine(db);
  const tokenService = new TokenService(db);

  await db.websites.create({
    site_id: 'site_test_1',
    domain: 'acme-audit.local',
    name: 'Acme Audit',
    public_api_key: 'pk_test',
    created_at: new Date().toISOString(),
  });

  await db.prompts.save({
    prompt_id: 'prm_high_1',
    install_id: 'inst_default_tester',
    platform: 'chatgpt',
    prompt_text: 'Find GA4 audit automation tools',
    prompt_hash: 'hash123',
    is_redacted: false,
    created_at: new Date().toISOString(),
  });

  const tok = await tokenService.createToken('inst_default_tester', 'prm_high_1', 'https://acme-audit.local/product');

  const result = await engine.processSdkVisit({
    site_id: 'site_test_1',
    page_url: 'https://acme-audit.local/product',
    attribution_token: tok.token,
    referrer: 'https://chatgpt.com/',
    user_agent: 'Mozilla/5.0 Chrome/120.0.0.0',
  });

  expect(result.confidence).toBe('HIGH');
  expect(result.activityType).toBe('human_click');
  expect(result.promptId).toBe('prm_high_1');
  expect(result.platform).toBe('chatgpt');
  expect(result.isBotRetrieval).toBe(false);

  db.close();
});

test('CorrelationEngine classifies AI crawlers as Type 1: AI Website Retrieval (NOT human visit)', async () => {
  const db = new DatabaseService(':memory:');
  const engine = new CorrelationEngine(db);

  await db.websites.create({
    site_id: 'site_test_bot',
    domain: 'acme-audit.local',
    name: 'Acme Audit',
    public_api_key: 'pk_test',
    created_at: new Date().toISOString(),
  });

  const result = await engine.processSdkVisit({
    site_id: 'site_test_bot',
    page_url: 'https://acme-audit.local/pricing',
    user_agent: 'ChatGPT-User/1.0 (+https://openai.com/bot)',
  });

  expect(result.activityType).toBe('ai_retrieval');
  expect(result.isBotRetrieval).toBe(true);
  expect(result.confidence).toBe('UNATTRIBUTED');
  expect(result.promptId).toBeNull();

  const retrievals = await db.retrievals.getAll();
  expect(retrievals.length).toBe(1);
  expect(retrievals[0].provider).toBe('openai');

  db.close();
});

test('CorrelationEngine classifies unassisted AI referrals as MEDIUM with reconstructed prompt', async () => {
  const db = new DatabaseService(':memory:');
  const engine = new CorrelationEngine(db);

  await db.websites.create({
    site_id: 'site_test_med',
    domain: 'acme-audit.local',
    name: 'Acme Audit',
    public_api_key: 'pk_test',
    created_at: new Date().toISOString(),
  });

  const result = await engine.processSdkVisit({
    site_id: 'site_test_med',
    page_url: 'https://acme-audit.local/features',
    referrer: 'https://claude.ai/chat/conv-999',
    user_agent: 'Mozilla/5.0 Chrome/120.0.0.0',
    page_title: 'Enterprise GA4 Audit Automation Platform',
  });

  expect(result.confidence).toBe('MEDIUM');
  expect(result.activityType).toBe('human_click');
  expect(result.platform).toBe('claude');
  expect(result.promptId).not.toBeNull();
  expect(result.reconstructedPrompt).toBeDefined();

  db.close();
});
