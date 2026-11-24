var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/index.ts
var exports_src = {};
__export(exports_src, {
  AITrackClient: () => AITrackClient,
  classifyUserAgent: () => classifyUserAgent,
  createAiAttributionMiddleware: () => createAiAttributionMiddleware,
  detectAiReferrer: () => detectAiReferrer,
  parseTraceparentHeader: () => parseTraceparentHeader,
  reconstructPrompt: () => reconstructPrompt
});
module.exports = __toCommonJS(exports_src);

// src/client.ts
class AITrackClient {
  config = null;
  sessionId;
  lastReconstructedPrompt = null;
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }
  getOrCreateSessionId() {
    if (typeof window === "undefined")
      return "server_session";
    try {
      let sid = sessionStorage.getItem("__aitrack_sid");
      if (!sid) {
        sid = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
        sessionStorage.setItem("__aitrack_sid", sid);
      }
      return sid;
    } catch {
      return "sess_fallback_" + Date.now();
    }
  }
  init(config) {
    this.config = {
      backendUrl: "http://localhost:3000",
      showIntentBanner: true,
      ...config
    };
    if (typeof window !== "undefined") {
      this.trackPageView();
    }
  }
  async trackPageView() {
    if (!this.config?.siteId || typeof window === "undefined")
      return null;
    let schemaType;
    let schemaData = undefined;
    try {
      const script = document.querySelector('script[type="application/ld+json"]');
      if (script?.textContent) {
        const parsed = JSON.parse(script.textContent);
        schemaType = parsed["@type"] || (Array.isArray(parsed) ? parsed[0]?.["@type"] : undefined);
        schemaData = parsed;
      }
    } catch {}
    const payload = {
      site_id: this.config.siteId,
      api_key: this.config.apiKey,
      page_url: window.location.href,
      referrer: document.referrer || "",
      session_id: this.sessionId,
      user_agent: navigator.userAgent,
      page_title: document.title || "",
      page_h1: document.querySelector("h1")?.textContent?.trim() || "",
      meta_description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
      schema_type: schemaType,
      schema_data: schemaData
    };
    try {
      const res = await fetch(`${this.config.backendUrl}/api/v1/sdk/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.reconstructedPrompt) {
        this.lastReconstructedPrompt = data.reconstructedPrompt;
        if (this.config.showIntentBanner && data.platform !== "unknown") {
          this.renderIntentBanner(data.platform, data.reconstructedPrompt);
        }
      }
      const event = {
        visitId: data.visit_id,
        platform: data.platform,
        confidence: data.confidence,
        reconstructedPrompt: data.reconstructedPrompt,
        alternativePrompts: data.alternativePrompts || [],
        candidateQueries: data.candidateQueries,
        isBot: Boolean(data.is_bot)
      };
      if (typeof this.config.onAttribution === "function") {
        this.config.onAttribution(event);
      }
      return event;
    } catch (err) {
      console.warn("[AITRACK] Pageview error:", err);
      return null;
    }
  }
  async confirmPrompt(confirmedPrompt) {
    if (!this.config?.siteId || typeof window === "undefined")
      return;
    await fetch(`${this.config.backendUrl}/api/v1/sdk/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_id: this.config.siteId,
        page_url: window.location.href,
        referrer: document.referrer || "",
        session_id: this.sessionId,
        confirmed_prompt: confirmedPrompt,
        intent_verified: true
      })
    });
    const banner = document.getElementById("__aitrack_intent_banner");
    if (banner)
      banner.remove();
  }
  renderIntentBanner(platform, promptText) {
    if (document.getElementById("__aitrack_intent_banner"))
      return;
    const banner = document.createElement("div");
    banner.id = "__aitrack_intent_banner";
    banner.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:99999;background:#0f172a;color:#f8fafc;border:1px solid #3b82f6;border-radius:10px;padding:14px 18px;max-width:380px;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:sans-serif;font-size:13px;";
    banner.innerHTML = `
      <div style="font-weight:700;color:#38bdf8;margin-bottom:4px;text-transform:capitalize;">\uD83D\uDD0D Arrived from ${platform}?</div>
      <div style="color:#cbd5e1;margin-bottom:8px;line-height:1.4;">Looking for: <em>"${promptText}"</em>?</div>
      <div style="display:flex;gap:8px;">
        <button id="__aitrack_btn_yes" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:12px;">Yes, that's it</button>
        <button id="__aitrack_btn_close" style="background:#334155;color:#94a3b8;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:12px;">Dismiss</button>
      </div>
    `;
    document.body.appendChild(banner);
    document.getElementById("__aitrack_btn_yes")?.addEventListener("click", () => this.confirmPrompt(promptText));
    document.getElementById("__aitrack_btn_close")?.addEventListener("click", () => banner.remove());
  }
}
// src/reconstructor.ts
function reconstructPrompt(platform, meta) {
  const rawTitle = meta.title || "";
  const brandSplit = rawTitle.split(/\s*[-|•–—]\s*/);
  const cleanTitle = brandSplit[0].trim();
  const brand = brandSplit.length > 1 ? brandSplit[brandSplit.length - 1].trim() : cleanTitle;
  const subject = meta.h1?.trim() || cleanTitle || "software solutions";
  const urlLower = (meta.url || "").toLowerCase();
  const titleLower = rawTitle.toLowerCase();
  const h1Lower = (meta.h1 || "").toLowerCase();
  const schema = (meta.schemaType || "").toLowerCase();
  let intentCategory = "recommendation";
  let primaryPrompt = "";
  const alternativePrompts = [];
  const candidateQueries = [];
  let score = 0.65;
  if (urlLower.includes("pricing") || titleLower.includes("pricing") || titleLower.includes("cost") || meta.schemaData?.offers) {
    intentCategory = "pricing";
    score = 0.95;
    primaryPrompt = `How much does ${brand} cost and what are the pricing tiers?`;
    alternativePrompts.push(`What is the enterprise pricing for ${brand}?`);
    candidateQueries.push(`${brand} pricing tiers`, `${brand} enterprise cost`);
  } else if (urlLower.includes("/vs/") || urlLower.includes("compare") || /\b(vs|versus)\b/i.test(titleLower)) {
    intentCategory = "comparison";
    score = 0.9;
    const vsMatch = titleLower.match(/\b([a-zA-Z0-9]+)\s+vs\s+([a-zA-Z0-9]+)\b/i);
    if (vsMatch) {
      primaryPrompt = `Compare ${vsMatch[1]} vs ${vsMatch[2]} for enterprise teams`;
      alternativePrompts.push(`Which is better: ${vsMatch[1]} or ${vsMatch[2]}?`);
    } else {
      primaryPrompt = `Compare the best ${subject} for enterprise teams`;
      alternativePrompts.push(`Top alternatives to ${brand}`);
    }
    candidateQueries.push(`best ${subject} comparison`, `top alternatives to ${brand}`);
  } else if (urlLower.includes("how-to") || titleLower.startsWith("how to") || schema.includes("howto")) {
    intentCategory = "how_to";
    score = 0.88;
    primaryPrompt = `How to implement ${subject} step by step?`;
    alternativePrompts.push(`Complete guide to ${subject}`);
    candidateQueries.push(`how to ${subject}`, `${subject} tutorial guide`);
  } else if (titleLower.includes("troubleshoot") || titleLower.includes("fix") || titleLower.includes("error")) {
    intentCategory = "problem_solving";
    score = 0.85;
    primaryPrompt = `How to fix ${subject} issues and errors?`;
    alternativePrompts.push(`Troubleshoot ${subject}`);
    candidateQueries.push(`how to fix ${subject}`, `troubleshoot ${subject}`);
  } else {
    intentCategory = "recommendation";
    score = 0.8;
    primaryPrompt = `Find the best ${subject} for enterprise websites`;
    alternativePrompts.push(`What are the top rated ${subject} tools in 2026?`);
    candidateQueries.push(`best ${subject} enterprise`, `top rated ${subject}`);
  }
  if (platform === "chatgpt")
    candidateQueries.unshift(`recommend ${subject} solutions`);
  else if (platform === "gemini")
    candidateQueries.unshift(`Google search: top ${subject}`);
  else if (platform === "claude")
    candidateQueries.unshift(`overview of ${subject} platforms`);
  else if (platform === "perplexity")
    candidateQueries.unshift(`${subject} reviews`);
  return {
    primaryPrompt,
    alternativePrompts,
    candidateQueries: [...new Set(candidateQueries)],
    intentCategory,
    confidence: score >= 0.8 ? "HIGH" : "MEDIUM",
    confidenceScore: score
  };
}
// src/classifier.ts
var BOT_PATTERNS = [
  { regex: /ChatGPT-User/i, provider: "chatgpt", name: "ChatGPT-User", cat: "live_browsing_agent", live: true },
  { regex: /OAI-SearchBot/i, provider: "chatgpt", name: "OAI-SearchBot", cat: "search_indexer", live: false },
  { regex: /GPTBot/i, provider: "chatgpt", name: "GPTBot", cat: "training_crawler", live: false },
  { regex: /Claude-Web/i, provider: "claude", name: "Claude-Web", cat: "live_browsing_agent", live: true },
  { regex: /ClaudeBot/i, provider: "claude", name: "ClaudeBot", cat: "training_crawler", live: false },
  { regex: /Google-Extended/i, provider: "gemini", name: "Google-Extended", cat: "training_crawler", live: false },
  { regex: /GoogleOther/i, provider: "gemini", name: "GoogleOther", cat: "search_indexer", live: false },
  { regex: /PerplexityBot/i, provider: "perplexity", name: "PerplexityBot", cat: "live_browsing_agent", live: true },
  { regex: /cohere-ai/i, provider: "cohere", name: "cohere-ai", cat: "training_crawler", live: false },
  { regex: /Bytespider/i, provider: "bytedance", name: "Bytespider", cat: "training_crawler", live: false }
];
function classifyUserAgent(userAgent) {
  if (!userAgent) {
    return { isAiBot: false, provider: "unknown", botName: "unknown", category: "human_browser", isLiveBrowsing: false };
  }
  for (const bot of BOT_PATTERNS) {
    if (bot.regex.test(userAgent)) {
      return { isAiBot: true, provider: bot.provider, botName: bot.name, category: bot.cat, isLiveBrowsing: bot.live };
    }
  }
  return { isAiBot: false, provider: "unknown", botName: "browser", category: "human_browser", isLiveBrowsing: false };
}
function detectAiReferrer(referrer) {
  if (!referrer)
    return { isAi: false, platform: "direct" };
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("chatgpt.com") || host.includes("openai.com"))
      return { isAi: true, platform: "chatgpt" };
    if (host.includes("claude.ai") || host.includes("anthropic.com"))
      return { isAi: true, platform: "claude" };
    if (host.includes("gemini.google.com"))
      return { isAi: true, platform: "gemini" };
    if (host.includes("perplexity.ai"))
      return { isAi: true, platform: "perplexity" };
    if (host.includes("copilot.microsoft.com"))
      return { isAi: true, platform: "copilot" };
    return { isAi: false, platform: "web" };
  } catch {
    return { isAi: false, platform: "unknown" };
  }
}
function parseTraceparentHeader(traceparent) {
  if (!traceparent || typeof traceparent !== "string")
    return null;
  const parts = traceparent.trim().split("-");
  if (parts.length < 4 || parts[0] !== "00")
    return null;
  const traceId = parts[1];
  const spanId = parts[2];
  if (traceId.length !== 32 || spanId.length !== 16)
    return null;
  return { traceId, spanId };
}

// src/server.ts
function createAiAttributionMiddleware(config) {
  const backendUrl = config.backendUrl || "http://localhost:3000";
  return async function aiAttributionMiddleware(req, _res, next) {
    const headers = req.headers || {};
    const userAgent = headers["user-agent"] || "";
    const traceparent = headers["traceparent"] || "";
    const requestedUrl = req.url || req.originalUrl || "/";
    const botClassification = classifyUserAgent(userAgent);
    const traceContext = parseTraceparentHeader(traceparent);
    if (botClassification.isAiBot || traceContext) {
      try {
        fetch(`${backendUrl}/api/v1/crawler/record`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            site_id: config.siteId,
            api_key: config.apiKey,
            requested_url: requestedUrl,
            user_agent: userAgent,
            trace_id: traceContext?.traceId,
            source_ip: req.ip || req.connection?.remoteAddress
          })
        }).catch(() => {});
      } catch {}
    }
    if (typeof next === "function") {
      next();
    }
  };
}
