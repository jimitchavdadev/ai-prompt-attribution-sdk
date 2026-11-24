# Privacy, Consent & Data Governance Specification

---

## 1. Principles of Consent & Compliance

The AI Prompt Attribution Platform is designed strictly around **explicit user consent**, **data minimization**, and **purpose limitation**, complying with:
- **GDPR** (General Data Protection Regulation - Regulation EU 2016/679)
- **CCPA / CPRA** (California Consumer Privacy Act & Rights Act)
- **Chrome Web Store Limited Use Policy** (User Data FAQ & Extension policies)
- **Platform Terms of Service** (OpenAI, Google, Anthropic)

### Core Mandates:
1. **Explicit Extension Opt-In:** Prompt capture is disabled by default until the user explicitly toggles attribution ON during extension onboarding.
2. **Local-First Processing:** Captured prompts are initially cached in local browser memory (`chrome.storage.local`).
3. **Selective Sharing Modes:**
   - **Mode A (Default: Metadata-Only):** The destination website receives only statistical metadata (e.g., that an AI recommendation from Claude occurred with confidence `HIGH`), but the raw prompt text is masked as `[Masked by User Consent]`.
   - **Mode B (Opt-In: Full Sharing):** The user explicitly authorizes transmitting prompt text to verified websites to help publishers improve content relevance.
4. **Automated PII Redaction:** High-entropy identifiers (emails, telephone numbers, credit cards, SSNs, API tokens, passwords) are automatically redacted before transmission to the backend.
5. **No Interference with Unrelated Websites:** The extension only activates content scripts on declared AI domains and authorized destination sites. It never reads form inputs, cookies, or session storage on other web pages.
6. **Right to Be Forgotten:** Full data export and permanent deletion endpoints are provided directly through the extension popup and backend API.

---

## 2. PII Redaction Rules

Before prompt synchronization occurs, the extension and backend execute the following redaction pipeline:

```typescript
const PII_PATTERNS = [
  // Email Addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, replacement: "[REDACTED_EMAIL]" },
  // US & International Phone Numbers
  { pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[REDACTED_PHONE]" },
  // Credit Card Numbers
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: "[REDACTED_CREDIT_CARD]" },
  // API Keys & Bearer Tokens (OpenAI, Anthropic, AWS, generic hex/base64 tokens)
  { pattern: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})\b/g, replacement: "[REDACTED_API_KEY]" },
  // Passwords / Secrets in prompt text
  { pattern: /\b(?:password|passwd|secret)\s*[:=]\s*[^\s,]+/gi, replacement: "password: [REDACTED_SECRET]" }
];
```

---

## 3. Data Storage & Retention Policy

- **Ephemeral Attribution Tokens:** Expire automatically after 5 minutes (300 seconds). Single-use only.
- **Prompt Retention:** Configurable by the user (7 days, 30 days, 90 days, or immediate purge).
- **Tenant Isolation:** Website owners can only query aggregated analytics and visits attributed to domains they own and have verified via their public API key.
