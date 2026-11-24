# AI Prompt Attribution: State-of-the-Art Research

## 1. Problem Formulation & Market Landscape
As conversational AI platforms (ChatGPT, Gemini, Claude, Perplexity) become primary discovery gateways, conventional web analytics fail:
- **Zero-Click Consumption:** Users read synthesized answers without visiting cited domains.
- **Stripped Referrers:** LLM client apps strip or neutralize HTTP `Referer` headers, causing visits to appear as "Direct" traffic in GA4.
- **Crawler vs Human Visits:** AI server-side fetching crawlers (`GPTBot`, `Claude-Web`, `ChatGPT-User`) retrieve pages without user interaction, creating attribution ambiguity.
- **Privacy Isolation:** Commercial AI providers do not expose prompt text to destination websites.

## 2. Analysis of Existing Products
| Tool Category | Mechanism | Capabilities & Limitations |
|---|---|---|
| **GEO Monitoring** (Quattr, Peec AI, Otterly) | Synthetic API Audits | Tests synthetic prompt libraries to check brand citations; does not track actual user prompts or site visits. |
| **GA4 AI Grouping** | Domain Matching | Categorizes known AI referrers; cannot capture prompt text, search queries, or zero-click citations. |
| **LLM Observability** (Langfuse, Helicone) | App-Level Tracing | Traces internal API calls and token latency; does not solve cross-domain visitor attribution. |

## 3. Provider Grounding & Web Search Schemas
- **Google Gemini API:** Returns `groundingMetadata.webSearchQueries` and `groundingMetadata.groundingChunks` (with `web.uri` and `web.title`).
- **OpenAI Responses API:** Emits `web_search_call` actions containing executed queries and sources, alongside `annotations` of type `url_citation`.
- **Anthropic Claude API:** Emits structured tool use for web searches, yielding source URLs and queries.

## 4. Distributed Tracing Standards
- **W3C Trace Context (`traceparent`):** `00-<32-hex-trace-id>-<16-hex-parent-id>-01` allows end-to-end tracing across AI agent tool invocations and destination websites.
- **W3C Baggage (`baggage`):** Transmits metadata (`ai.prompt_id`, `ai.provider`) across HTTP hops without modifying network intermediaries.

## 5. Feasibility Verdict
Direct non-consensual capture of third-party AI sessions is technically infeasible due to browser Same-Origin Policy.
However, a **consented client-side browser extension** combined with an **asynchronous destination website SDK** and **backend correlation engine** reliably captures and links prompts to visits with high confidence.
