# AI Provider Capability & Limitation Matrix

---

## Provider Comparison Overview

| Capability | OpenAI / ChatGPT | Google Gemini | Anthropic Claude | Custom AI Agents (APIs) |
|---|---|---|---|---|
| **Web UI Domain** | `chatgpt.com` | `gemini.google.com` | `claude.ai` | N/A (Custom Application) |
| **Input Selector Types** | `#prompt-textarea`, `textarea[data-id="root"]`, contenteditable | `rich-textarea`, `div[contenteditable="true"]` | `fieldset div[contenteditable="true"]` | Direct API prompt input |
| **Citation DOM Representation** | Footnote badges `a[data-testid*="citation"]`, link cards | Grounding chips, `source-pill`, `a[href*="google.com/url"]` | Source chips, anchor links in assistant markdown | API response metadata |
| **Outbound Click Handling** | Standard `<a>` navigation, target `_blank` | Direct or redirected Google URLs | Direct `<a>` navigation | N/A |
| **Generated Search Queries Exposed in UI** | Search query pill (during search expansion) | Search chip list (grounding panel) | Web search tool output block | Direct in API response |
| **API Grounding Metadata** | `web_search_call` & `annotations.url_citation` | `groundingMetadata.webSearchQueries` & `groundingChunks` | Web search tool results & citations | W3C Trace Context (`traceparent`) |
| **Identifiable Crawler User-Agents** | `GPTBot`, `OAI-SearchBot`, `ChatGPT-User` | `Google-Extended`, `GoogleOther` | `ClaudeBot`, `Claude-Web` | Custom Agent User-Agent |
| **Third-Party Prompt Passing in Referrer** | **No** (Stripped or bare domain) | **No** (Stripped or bare domain) | **No** (Stripped or bare domain) | **No** (Standard HTTP privacy) |
| **Attribution Confidence (Extension)** | **HIGH** (via consented token handshake) | **HIGH** (via consented token handshake) | **HIGH** (via consented token handshake) | **HIGH** |
| **Attribution Confidence (Server API)** | **VERIFIED** (via API metadata) | **VERIFIED** (via Grounding metadata) | **VERIFIED** (via Tool metadata) | **VERIFIED** (via W3C Trace Context) |
| **Attribution Confidence (Without Extension)** | **LOW / MEDIUM** (Referrer only, prompt unavailable) | **LOW / MEDIUM** (Referrer only, prompt unavailable) | **LOW / MEDIUM** (Referrer only, prompt unavailable) | **UNATTRIBUTED** |

---

## Notes on UI Volatility & Adapter Architecture
Front-end structures on `chatgpt.com`, `gemini.google.com`, and `claude.ai` change regularly as AI companies update design systems.
Our architecture isolates DOM selectors into **independent provider adapters** (`ChatGPTAdapter`, `GeminiAdapter`, `ClaudeAdapter`) implementing a common `BaseAdapter` interface with fallback heuristics (detecting `contenteditable` inputs, `Enter` key events, and anchor links inside assistant turn containers).
If a provider changes a CSS class, only the adapter's selector list is updated without impacting the core attribution engine.
