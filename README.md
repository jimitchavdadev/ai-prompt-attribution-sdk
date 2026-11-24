# AI Prompt Attribution & Website Discovery Tracking Platform

An end-to-end platform connecting user-submitted prompts on conversational AI platforms (ChatGPT, Gemini, Claude, Perplexity) with AI search queries, source retrievals, response citations, and attributed website visits.

> 📖 **Looking for SDK integration instructions?** See the [SDK Integration Guide](docs/SDK_INTEGRATION_GUIDE.md).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          USER PROMPT INPUT             │
                      │  "Find best GA4 audit automation tools"│
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          AI PLATFORM DISCOVERY         │
                      │   ChatGPT / Gemini / Claude / Perplexity
                      └─────┬────────────────────────────┬─────┘
                            │                            │
             (Server-Side Crawler Retrieval)    (Synthesized Response)
                            │                            │
                            ▼                            ▼
              ┌───────────────────────────┐┌───────────────────────────┐
              │ TYPE 1: AI RETRIEVAL      ││ TYPE 2: AI CITATION       │
              │ Bot visits Website Y      ││ Model links Website Y     │
              │ UA: ChatGPT-User / GPTBot ││ URL: website-y.com/audit  │
              │ [Recorded as AI Retrieval]││ [Captured Grounding link] │
              └───────────────────────────┘└─────────────┬─────────────┘
                                                         │
                                                  (User Clicks Link)
                                                         │
                                                         ▼
                                           ┌───────────────────────────┐
                                           │ TYPE 3: HUMAN CLICK       │
                                           │ Website SDK (@aitrack)    │
                                           │ 1. AI Referrer Detection  │
                                           │ 2. Temporal Correlation   │
                                           │ 3. Semantic Prompt Engine │
                                           │ 4. Zero-Party Intent UI   │
                                           └───────────────────────────┘
```

The system establishes transparent attribution across 3 distinct activity types:
1. **Type 1: AI Website Retrieval:** Server-side bots (`ChatGPT-User`, `Claude-Web`, `GPTBot`, `PerplexityBot`) crawling pages.
2. **Type 2: AI Citation / Recommendation:** AI model referencing and linking pages in synthesized responses.
3. **Type 3: Human Click-Through:** Human visitor arriving at the site from an AI platform.

---

## 5-Tier Attribution Confidence Matrix

| Level | Criteria | Example |
|---|---|---|
| **`VERIFIED`** | Zero-party user intent confirmation via micro-banner or W3C Trace Context. | User confirms prompt on arrival. |
| **`HIGH`** | Human arrival correlated with AI crawler retrieval within 10-minute sliding window. | `ChatGPT-User` crawled page 45s prior. |
| **`MEDIUM`** | Direct AI platform referrer domain with semantic landing page reconstruction. | Direct referral from `chatgpt.com`. |
| **`LOW`** | Indirect referral signals / organic search query correlation. | Search referral with matching topical intent. |
| **`UNATTRIBUTED`** | Bot crawler retrieval or direct traffic without AI signals. | `GPTBot` indexing hit. Never fabricate prompts. |

---

## Project Structure (Strictly ≤ 200 Lines Per File)

```
├── backend/                  # Fastify + Drizzle ORM + Bun SQLite Backend
│   ├── src/db/               # Relational schemas & typed Drizzle repositories
│   ├── src/routes/           # SDK, Crawler, Privacy, Analytics routes
│   └── src/services/         # Correlation engine, crawler classifier, PII redactor
├── sdk/                      # Standalone Website SDK (@jimitchavdadev/aitrack)
│   ├── src/client.ts         # Client tracking & zero-party intent widget
│   ├── src/reconstructor.ts  # Reverse semantic prompt reconstruction engine
│   ├── src/server.ts         # Express / Fastify / Node middleware
│   ├── src/classifier.ts     # AI crawler & referrer pattern classifier
│   └── dist/                 # Minified browser bundle (3.4KB), ESM & CJS builds
├── dashboard/                # Interactive Analytics Dashboard & Visual Inspector
├── test-environment/         # Mock ChatGPT, Gemini, Claude & Sample Website Y
├── tests/                    # Unit, Integration & Playwright Browser Tests
└── docs/                     # Technical research, architecture & SDK integration guide
```

---

## Getting Started

### 1. Install & Build
```bash
bun install
bun run build:sdk
```

### 2. Start Local Backend & Test Environment
```bash
bun run start
```
- **Dashboard:** `http://localhost:3000/dashboard/`
- **Sample Website Y:** `http://localhost:3000/website-y/index.html`
- **Mock ChatGPT:** `http://localhost:3000/mock-chatgpt/`
- **Mock Gemini:** `http://localhost:3000/mock-gemini/`
- **Mock Claude:** `http://localhost:3000/mock-claude/`

### 3. Run Automated Tests
```bash
bun run test:all
```

---

## Privacy & GDPR Guarantees
- **No Third-Party Cookies:** Session-scoped in-memory storage only.
- **Zero Form/Password Scraping:** Only reads public page metadata (H1, title, meta tags).
- **PII Scrubbing:** Emails, phone numbers, and auth tokens are automatically redacted.
- **GDPR Deletion:** Data purge supported via `DELETE /api/v1/privacy/consent/:session_id`.

## License
MIT © [Jimit Chavda](https://github.com/jimitchavdadev)
