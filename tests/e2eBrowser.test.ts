import { test, expect } from 'bun:test';
import { chromium, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import { createServer } from '../backend/src/server.ts';
import { getDatabaseService } from '../backend/src/db/index.ts';

const EXTENSION_PATH = path.resolve(__dirname, '../extension');
const USER_DATA_DIR = path.resolve('/tmp/pw-ai-attr-profile-' + Date.now());

test('End-to-End Test: Browser Extension + Mock ChatGPT + Website Y + Backend', async () => {
  const db = getDatabaseService(':memory:');
  const server = await createServer(db);
  await server.listen({ port: 3000, host: '127.0.0.1' });
  console.log('Test server listening on http://127.0.0.1:3000');

  // Launch Playwright Chromium with unpacked Manifest V3 extension
  const context: BrowserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // Wait for service worker
  const sw = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 5000 }).catch(() => null);
  console.log('Extension service worker active:', sw ? sw.url() : 'pending');

  const page: Page = await context.newPage();

  try {
    // 1. Visit Mock ChatGPT
    await page.goto('http://localhost:3000/mock-chatgpt/');
    await page.waitForSelector('#prompt-textarea');

    // 2. Submit Prompt
    const promptText = 'Find the best GA4 audit automation tools for enterprise websites.';
    await page.fill('#prompt-textarea', promptText);
    await page.click('#send-btn');

    // 3. Wait for Citation to render
    await page.waitForSelector('.citation-link', { timeout: 6000 });
    await new Promise((r) => setTimeout(r, 600));

    // 4. Click citation link & capture destination tab
    const [websitePage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('.citation-link'),
    ]);

    // 5. Verify Website Y loaded with attribution token
    await websitePage.waitForSelector('#detected-token', { timeout: 8000 });
    await new Promise((r) => setTimeout(r, 1200));

    const tokenText = await websitePage.$eval('#detected-token', (el) => el.textContent);
    console.log('Website Y received attribution token:', tokenText);
    expect(tokenText?.startsWith('ai_tok_')).toBe(true);

    // 6. Inspect Backend Overview KPIs
    const overviewRes = await server.inject({ method: 'GET', url: '/api/v1/analytics/overview' });
    const overview = overviewRes.json();
    console.log('Backend Overview KPIs:', overview);

    expect(overview.total_prompts).toBeGreaterThanOrEqual(1);
    expect(overview.total_citations).toBeGreaterThanOrEqual(1);
    expect(overview.total_attributed_visits).toBeGreaterThanOrEqual(1);
    expect(overview.high_confidence_pct).toBeGreaterThan(0);

    // 7. Verify Prompt-Level Analytics
    const promptsRes = await server.inject({ method: 'GET', url: '/api/v1/analytics/prompts' });
    const promptRows = promptsRes.json();
    expect(promptRows.length).toBeGreaterThanOrEqual(1);

    const captured = promptRows[0];
    expect(captured.prompt_text).toBe(promptText);
    expect(captured.platform).toBe('chatgpt');
    expect(captured.user_clicked).toBe(true);
    expect(captured.confidence).toBe('HIGH');
    expect(captured.destination_url).toContain('/website-y/');

    // 8. Verify Prompt-to-Website Visual Journey API
    const journeyRes = await server.inject({ method: 'GET', url: `/api/v1/analytics/journey/${captured.prompt_id}` });
    const journey = journeyRes.json();
    expect(journey.stages[0].status).toBe('observed');
    expect(journey.stages[3].status).toBe('observed');
    expect(journey.stages[4].status).toBe('observed');

    // 9. Capture Screenshot of Dashboard
    await page.goto('http://localhost:3000/dashboard/');
    await page.waitForSelector('.kpi-card');
    await new Promise((r) => setTimeout(r, 1000));

    const screenshotPath = path.resolve(__dirname, '../dashboard-e2e-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Visual proof screenshot saved to:', screenshotPath);

    await websitePage.close();
  } finally {
    await context.close();
    await server.close();
    db.close();
  }
}, 40000);
