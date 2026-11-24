# AI Attribution Website SDK Integration Guide

The `@jimitchavdadev/aitrack` SDK enables websites to detect AI referrals, identify server-side AI retrieval crawlers, reverse-engineer candidate user prompts, and capture zero-party intent confirmation without requiring a browser extension.

---

## 1. How It Works

```
[ User in ChatGPT / Claude / Gemini ]
         │
         ├── 1. AI Crawler fetches page: Type 1 Retrieval (ChatGPT-User)
         │       └─ Server SDK logs crawler hit to Backend
         ▼
[ User clicks recommendation to Website Y ]
         │
         ├── 2. Client SDK detects AI referrer / UTM campaign
         ├── 3. Correlates visit with recent AI crawler hits (Temporal Window)
         ├── 4. Reconstructs candidate Prompt X from page semantics (H1/Title)
         └── 5. Micro-banner captures zero-party confirmation (VERIFIED confidence)
```

- **Type 1: AI Retrieval:** Provider bots (`ChatGPT-User`, `Claude-Web`, `GPTBot`) crawling content.
- **Type 2: AI Citation:** Model referencing the website in its generated response.
- **Type 3: Human Click-Through:** Human visitor arriving at the site from an AI platform.

---

## 2. Integration Methods

### Method A: HTML Script Tag (Vanilla JS / Shopify / WordPress / Static Sites)

Place before the closing `</head>` or `</body>` tag on every page:

```html
<script src="https://cdn.jsdelivr.net/npm/@jimitchavdadev/aitrack/dist/aitrack.min.js"></script>
<script>
  window.AITRACK.init({
    siteId: "YOUR_SITE_ID",
    backendUrl: "https://attribution.yourdomain.com",
    showIntentBanner: true
  });
</script>
```

---

### Method B: React / Next.js (App Router & Pages Router)

```bash
npm install @jimitchavdadev/aitrack
```

#### Next.js App Router (`app/providers.tsx` or `app/layout.tsx`):
```tsx
'use client';
import { useEffect } from 'react';
import { AITrackClient } from '@jimitchavdadev/aitrack';

export function AiTrackProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const client = new AITrackClient();
    client.init({
      siteId: process.env.NEXT_PUBLIC_AITRACK_SITE_ID!,
      backendUrl: process.env.NEXT_PUBLIC_AITRACK_URL || 'https://attribution.yourdomain.com',
      showIntentBanner: true,
      onAttribution: (event) => {
        if (event.platform !== 'unknown' && typeof window.gtag === 'function') {
          window.gtag('event', 'ai_referral', {
            platform: event.platform,
            confidence: event.confidence,
            prompt: event.reconstructedPrompt,
          });
        }
      },
    });
  }, []);

  return <>{children}</>;
}
```

---

### Method C: Server-Side AI Crawler Logging (Express / Fastify / Node)

Logging AI bot retrievals on your backend allows the attribution engine to perform **Temporal Correlation**, upgrading confidence from `MEDIUM` to `HIGH` when human visits occur shortly after a bot retrieval.

#### Express.js:
```typescript
import express from 'express';
import { createAiAttributionMiddleware } from '@jimitchavdadev/aitrack';

const app = express();

app.use(createAiAttributionMiddleware({
  siteId: process.env.AITRACK_SITE_ID!,
  backendUrl: 'https://attribution.yourdomain.com'
}));
```

#### Fastify:
```typescript
import Fastify from 'fastify';
import { createAiAttributionMiddleware } from '@jimitchavdadev/aitrack';

const fastify = Fastify();
const middleware = createAiAttributionMiddleware({ siteId: 'my_site_id' });

fastify.addHook('onRequest', async (req, reply) => {
  await middleware(req.raw, reply.raw);
});
```

---

### Method D: Google Analytics 4 (GA4) & PostHog Forwarding

Forward attributed AI prompts directly into your web analytics:

```typescript
const aitrack = new AITrackClient();
aitrack.init({
  siteId: 'site_123',
  onAttribution: (data) => {
    if (data.confidence === 'UNATTRIBUTED') return;

    // Google Analytics 4 Custom Event
    window.gtag?.('event', 'ai_prompt_attribution', {
      ai_platform: data.platform,
      ai_confidence: data.confidence,
      reconstructed_prompt: data.reconstructedPrompt,
      is_bot: data.isBot
    });

    // PostHog Event
    window.posthog?.capture('ai_prompt_attribution', {
      platform: data.platform,
      confidence: data.confidence,
      prompt: data.reconstructedPrompt,
    });
  }
});
```

---

## 3. Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `siteId` | `string` | *(Required)* | Unique website identifier registered in the Attribution Platform. |
| `apiKey` | `string` | `undefined` | Optional public publishable site key. |
| `backendUrl` | `string` | `http://localhost:3000` | URL of the central attribution correlation engine. |
| `showIntentBanner`| `boolean` | `true` | Displays the zero-party intent confirmation micro-banner. |
| `onAttribution` | `function` | `undefined` | Callback invoked with `AttributionEvent` payload. |

---

## 4. Attribution Confidence Matrix

| Confidence | Condition | Prompt Accuracy |
| :--- | :--- | :--- |
| `VERIFIED` | User confirmed prompt via zero-party micro-banner | 100% (Direct confirmation) |
| `HIGH` | Human visit matched with live AI bot retrieval within 10-min window | ~92% (Temporal + Semantic correlation) |
| `MEDIUM` | Valid AI platform referrer detected with semantic metadata reconstruction | ~78% (Semantic synthesis) |
| `LOW` | Direct navigation or generic web referral with partial keyword matches | Heuristic / Probabilistic |
| `UNATTRIBUTED`| Non-AI human traffic | None |

---

## 5. Privacy & GDPR Compliance

- **No Cookies or Invasive Tracking:** Uses session-scoped memory (`sessionStorage`) only.
- **Zero Sensitive Data Extraction:** Never inspects form fields, passwords, or authentication cookies.
- **PII Scrubbing:** Backend automatically redacts emails, telephone numbers, and auth tokens.
- **GDPR Deletion:** Supports data deletion via `DELETE /api/v1/privacy/consent/:session_id`.

---

## 6. Local Testing & Verification

1. Start attribution backend: `bun run start` (starts on port 3000).
2. Open test site with mock ChatGPT referrer:
   ```bash
   # Open browser with referrer:
   google-chrome --referer="https://chatgpt.com/" http://localhost:3000/website-y/index.html
   ```
3. Inspect interactive dashboard at `http://localhost:3000/dashboard/`.
