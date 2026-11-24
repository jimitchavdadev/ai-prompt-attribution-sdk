# ai-prompt-attribution-sdk

Lightweight AI Prompt Attribution, Reverse-Engineering & Website Discovery Tracking SDK for websites and web applications.

Integrate directly into your website to detect AI referrals (ChatGPT, Claude, Gemini, Perplexity, Copilot), correlate AI server crawler retrievals with human visits, reverse-engineer high-confidence candidate prompts, and capture zero-party intent confirmation.

## Installation

### Via NPM
```bash
npm install ai-prompt-attribution-sdk
```

### Via Browser Script Tag
```html
<script src="https://cdn.jsdelivr.net/npm/ai-prompt-attribution-sdk/dist/aitrack.min.js"></script>
<script>
  AITRACK.init({
    siteId: "site_prod_your_site_id",
    backendUrl: "https://your-attribution-backend.com",
    showIntentBanner: true
  });
</script>
```

## Quick Start (Modern Web Apps / React / Vue / Vanilla JS)

```typescript
import { AITrackClient } from 'ai-prompt-attribution-sdk';

const aitrack = new AITrackClient();

aitrack.init({
  siteId: 'site_prod_analytics',
  backendUrl: 'https://attribution.yourdomain.com',
  showIntentBanner: true,
  onAttribution: (event) => {
    console.log('Attribution event received:', event);
    if (typeof gtag === 'function' && event.platform !== 'unknown') {
      gtag('event', 'ai_referral', {
        ai_platform: event.platform,
        ai_confidence: event.confidence,
        reconstructed_prompt: event.reconstructedPrompt
      });
    }
  }
});
```

## Server-Side Crawler Logging Middleware (Express / Fastify / Node.js)

Log server-side AI retrieval bots (`ChatGPT-User`, `Claude-Web`, `GPTBot`, `PerplexityBot`) in real-time to correlate crawler activity with downstream human visits:

```typescript
import express from 'express';
import { createAiAttributionMiddleware } from 'ai-prompt-attribution-sdk';

const app = express();

app.use(createAiAttributionMiddleware({
  siteId: 'site_prod_analytics',
  backendUrl: 'https://attribution.yourdomain.com'
}));
```

## How It Works

1. **AI Traffic Detection:** Detects whether an arriving user or bot originated from an AI platform.
2. **Temporal Correlation:** Cross-references the human visit timestamp and requested URL with AI crawler retrievals (`ChatGPT-User`, `Claude-Web`) that fetched the page moments prior.
3. **Semantic Prompt Reconstruction:** Analyzes page metadata (`H1`, `title`, OpenGraph tags, schema.org) and platform query conventions to deduce the candidate user prompt.
4. **Zero-Party Intent Confirmation:** Renders an optional non-intrusive micro-banner ("Arrived from ChatGPT? Looking for: '...'? [Yes, that's it]") to capture verified user intent with 100% confidence.

## License

MIT © [Jimit Chavda](https://github.com/jimitchavdadev)
