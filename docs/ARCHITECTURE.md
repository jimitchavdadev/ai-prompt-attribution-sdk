# AI Prompt Attribution: System Architecture

## 1. Core Architecture Overview
The platform decouples discovery and consumption into three distinct activity types:
- **Type 1: AI Website Retrieval:** Server-side AI crawler visits a webpage (e.g. `ChatGPT-User`, `GPTBot`).
- **Type 2: AI Citation:** An LLM response cites a webpage URL in its answer.
- **Type 3: Human Click-Through:** A user clicks a citation and lands on the destination website.

## 2. Component Structure
```
[User on ChatGPT / Gemini / Claude]
         │ (Submits Prompt)
         ▼
[Browser Extension MV3] ──(Saves Prompt & Citations)──► [Attribution Backend]
         │ (User clicks citation)                               ▲
         ▼ (Issues ephemeral token)                             │
[Website Y with AITRACK SDK] ───(Transmits Token & Visit)───────┘
```

## 3. Five-Tier Confidence Matrix
1. **`VERIFIED` (100%):** Direct W3C Trace Context linking server-side agent execution to website server logs.
2. **`HIGH` (90%):** Valid ephemeral attribution token exchanged between consented extension and website SDK.
3. **`MEDIUM` (50%):** Direct HTTP referrer from an AI platform without an extension token. (Prompt remains unattributed).
4. **`LOW` (25%):** Search engine organic referral with matching topical query intent.
5. **`UNATTRIBUTED` (0%):** AI bot crawler hits or untracked direct traffic. Never fabricate prompt text.

## 4. Privacy & Consent Governance
- Opt-in required before prompt capture begins.
- Default metadata-only mode masks prompt text (`[Masked by User Consent]`).
- Automatic PII redaction (emails, phones, API keys, passwords).
- Ephemeral tokens expire in 5 minutes and are single-use.
- GDPR/CCPA data export and instant right-to-be-forgotten deletion endpoints.
