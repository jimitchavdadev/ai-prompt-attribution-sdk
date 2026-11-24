import { test, expect } from 'bun:test';
import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import { createServer } from '../backend/src/server.ts';
import { getDatabaseService } from '../backend/src/db/index.ts';

const EXTENSION_PATH = path.resolve(__dirname, '../extension');
const USER_DATA_DIR = path.resolve('/tmp/pw-multi-profile-' + Date.now());

test('End-to-End Test: Gemini & Claude Mock Testing with Extension', async () => {
  const db = getDatabaseService(':memory:');
  const server = await createServer(db);
  await server.listen({ port: 3000, host: '127.0.0.1' });

  const context: BrowserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const page: Page = await context.newPage();

  try {
    // 1. Test Mock Gemini
    await page.goto('http://localhost:3000/mock-gemini/');
    await page.waitForSelector('#gemini-input');

    const geminiPrompt = 'Compare enterprise GA4 compliance and audit automation suites.';
    await page.click('#gemini-input');
    await page.evaluate((text) => {
      const el = document.getElementById('gemini-input');
      if (el) {
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, geminiPrompt);
    await page.click('#gemini-send');

    await page.waitForSelector('.source-chip', { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 600));

    const [geminiTab] = await Promise.all([
      context.waitForEvent('page'),
      page.click('.source-chip'),
    ]);

    await geminiTab.waitForSelector('#detected-token', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    const geminiToken = await geminiTab.$eval('#detected-token', (el) => el.textContent);
    console.log('Gemini attribution token on Website Y:', geminiToken);
    expect(geminiToken?.startsWith('ai_tok_')).toBe(true);
    await geminiTab.close();

    // 2. Test Mock Claude
    await page.goto('http://localhost:3000/mock-claude/');
    await page.waitForSelector('#claude-input');

    const claudePrompt = 'What is the top recommended GA4 audit software for enterprises?';
    await page.click('#claude-input');
    await page.evaluate((text) => {
      const el = document.getElementById('claude-input');
      if (el) {
        el.innerText = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, claudePrompt);
    await page.click('#claude-send');

    await page.waitForSelector('.claude-card', { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 600));

    const [claudeTab] = await Promise.all([
      context.waitForEvent('page'),
      page.click('.claude-card'),
    ]);

    await claudeTab.waitForSelector('#detected-token', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1000));

    const claudeToken = await claudeTab.$eval('#detected-token', (el) => el.textContent);
    console.log('Claude attribution token on Website Y:', claudeToken);
    expect(claudeToken?.startsWith('ai_tok_')).toBe(true);
    await claudeTab.close();

    // 3. Verify Platform Breakdown in Backend
    const platRes = await server.inject({ method: 'GET', url: '/api/v1/analytics/platforms' });
    const platforms = platRes.json();
    console.log('Platforms Breakdown:', platforms);

    expect(platforms.gemini.prompt_count).toBeGreaterThanOrEqual(1);
    expect(platforms.gemini.attributed_sessions).toBeGreaterThanOrEqual(1);
    expect(platforms.claude.prompt_count).toBeGreaterThanOrEqual(1);
    expect(platforms.claude.attributed_sessions).toBeGreaterThanOrEqual(1);

  } finally {
    await context.close();
    await server.close();
    db.close();
  }
}, 45000);
