import { test, expect } from 'bun:test';
import { redactPromptText, computePromptHash } from '../backend/src/services/privacyRedactor.ts';
import { DatabaseService } from '../backend/src/db/index.ts';

test('redactPromptText masks emails, phone numbers, and API keys', () => {
  const prompt = 'Find tools for user alice.smith@enterprise.com with phone 415-555-0199 and key sk-abcdef123456789012345678';
  const res = redactPromptText(prompt);

  expect(res.isRedacted).toBe(true);
  expect(res.redactedText).not.toContain('alice.smith@enterprise.com');
  expect(res.redactedText).toContain('[REDACTED_EMAIL]');
  expect(res.redactedText).not.toContain('415-555-0199');
  expect(res.redactedText).toContain('[REDACTED_PHONE]');
  expect(res.redactedText).not.toContain('sk-abcdef123456789012345678');
  expect(res.redactedText).toContain('[REDACTED_API_KEY]');
  expect(res.redactedCategories).toContain('email');
  expect(res.redactedCategories).toContain('phone');
  expect(res.redactedCategories).toContain('api_key');
});

test('computePromptHash generates consistent deterministic SHA-256', () => {
  const hash1 = computePromptHash('Best GA4 audit tools');
  const hash2 = computePromptHash('  best ga4 audit tools  ');
  expect(hash1).toBe(hash2);
  expect(hash1.length).toBe(64);
});

test('DatabaseService purges user data on GDPR deletion request', async () => {
  const db = new DatabaseService(':memory:');
  const installId = 'inst_privacy_test';

  await db.consents.save({
    install_id: installId,
    consent_enabled: true,
    share_prompt_text: true,
    redacted_categories: '["email"]',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await db.prompts.save({
    prompt_id: 'prm_del_1',
    install_id: installId,
    platform: 'chatgpt',
    prompt_text: 'Confidential prompt text',
    prompt_hash: computePromptHash('Confidential prompt text'),
    is_redacted: false,
    created_at: new Date().toISOString(),
  });

  const beforePrompt = await db.prompts.getById('prm_del_1');
  expect(beforePrompt).not.toBeNull();

  // Purge
  await db.purgeUserData(installId);

  const afterPrompt = await db.prompts.getById('prm_del_1');
  expect(afterPrompt).toBeNull();

  const afterConsent = await db.consents.getById(installId);
  expect(afterConsent).toBeNull();
  db.close();
});
