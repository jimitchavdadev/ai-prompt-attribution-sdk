import { test, expect } from 'bun:test';
import { chromium, type Browser, type Page } from 'playwright';
import path from 'path';
import { createServer } from '../backend/src/server.ts';
import { getDatabaseService } from '../backend/src/db/index.ts';

test('End-to-End Pure Website SDK (No Browser Extension Required)', async () => {
  const db = getDatabaseService(':memory:');
  const server = await createServer(db);
  await server.listen({ port: 3000, host: '127.0.0.1' });
  console.log('Test server started on http://127.0.0.1:3000');

  // 1. Simulate prior server-side AI retrieval by ChatGPT-User
  await server.inject({
    method: 'POST',
    url: '/api/v1/crawler/record',
    payload: {
      site_id: 'site_sample_y',
      requested_url: 'http://localhost:3000/website-y/index.html',
      user_agent: 'Mozilla/5.0 ChatGPT-User/1.0 (+https://openai.com/bot)',
    },
  });

  // 2. Launch browser with NO EXTENSION (standard visitor browser)
  const browser: Browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox'],
  });

  const page: Page = await browser.newPage({
    extraHTTPHeaders: {
      Referer: 'https://chatgpt.com/',
    },
  });

  try {
    // 3. User navigates directly to Website Y from ChatGPT
    await page.goto('http://localhost:3000/website-y/index.html');

    // 4. Wait for AITRACK Website SDK intent banner to appear
    await page.waitForSelector('#__aitrack_intent_banner', { timeout: 8000 });
    const banner = await page.$('#__aitrack_intent_banner');
    expect(banner).not.toBeNull();

    const promptPreview = await page.$eval('#__aitrack_prompt_preview', (el) => el.textContent);
    console.log('Reverse-engineered candidate prompt on banner:', promptPreview);
    expect(promptPreview).toContain('Enterprise GA4 Audit Automation Platform');

    // 5. User clicks "Yes, that's it" to confirm their intent
    await page.click('#__aitrack_btn_yes');
    await new Promise((r) => setTimeout(r, 1000));

    // 6. Capture Screenshot of Website Y with SDK Attribution
    const websiteScreenshot = path.resolve(__dirname, '../website-y-pure-sdk-screenshot.png');
    await page.screenshot({ path: websiteScreenshot, fullPage: true });
    console.log('Saved Website Y SDK screenshot to:', websiteScreenshot);

    // 7. Verify Backend Overview
    const overviewRes = await server.inject({ method: 'GET', url: '/api/v1/analytics/overview' });
    const overview = overviewRes.json();
    console.log('Backend Overview after Pure SDK visit:', overview);

    expect(overview.total_visits).toBeGreaterThanOrEqual(1);
    expect(overview.total_attributed_visits).toBeGreaterThanOrEqual(1);

    // 8. Verify Prompts Table in Analytics
    const promptsRes = await server.inject({ method: 'GET', url: '/api/v1/analytics/prompts' });
    const promptRows = promptsRes.json();
    expect(promptRows.length).toBeGreaterThanOrEqual(1);

    const captured = promptRows[0];
    console.log('Captured prompt row in DB:', captured);
    expect(captured.platform).toBe('chatgpt');
    expect(captured.prompt_text).toContain('Enterprise GA4 Audit Automation Platform');
    expect(captured.confidence).toBe('VERIFIED');

  } finally {
    await browser.close();
    await server.close();
    db.close();
  }
}, 35000);
