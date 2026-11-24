import type { AITrackConfig, AttributionEvent } from './types.ts';

export class AITrackClient {
  private config: AITrackConfig | null = null;
  private sessionId: string;
  public lastReconstructedPrompt: string | null = null;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server_session';
    try {
      let sid = sessionStorage.getItem('__aitrack_sid');
      if (!sid) {
        sid = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
        sessionStorage.setItem('__aitrack_sid', sid);
      }
      return sid;
    } catch {
      return 'sess_fallback_' + Date.now();
    }
  }

  public init(config: AITrackConfig): void {
    this.config = {
      backendUrl: 'http://localhost:3000',
      showIntentBanner: true,
      ...config,
    };
    if (typeof window !== 'undefined') {
      this.trackPageView();
    }
  }

  public async trackPageView(): Promise<AttributionEvent | null> {
    if (!this.config?.siteId || typeof window === 'undefined') return null;

    let schemaType: string | undefined;
    let schemaData: any = undefined;
    try {
      const script = document.querySelector('script[type="application/ld+json"]');
      if (script?.textContent) {
        const parsed = JSON.parse(script.textContent);
        schemaType = parsed['@type'] || (Array.isArray(parsed) ? parsed[0]?.['@type'] : undefined);
        schemaData = parsed;
      }
    } catch {}

    const payload = {
      site_id: this.config.siteId,
      api_key: this.config.apiKey,
      page_url: window.location.href,
      referrer: document.referrer || '',
      session_id: this.sessionId,
      user_agent: navigator.userAgent,
      page_title: document.title || '',
      page_h1: document.querySelector('h1')?.textContent?.trim() || '',
      meta_description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      schema_type: schemaType,
      schema_data: schemaData,
    };

    try {
      const res = await fetch(`${this.config.backendUrl}/api/v1/sdk/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.reconstructedPrompt) {
        this.lastReconstructedPrompt = data.reconstructedPrompt;
        if (this.config.showIntentBanner && data.platform !== 'unknown') {
          this.renderIntentBanner(data.platform, data.reconstructedPrompt);
        }
      }

      const event: AttributionEvent = {
        visitId: data.visit_id,
        platform: data.platform,
        confidence: data.confidence,
        reconstructedPrompt: data.reconstructedPrompt,
        alternativePrompts: data.alternativePrompts || [],
        candidateQueries: data.candidateQueries,
        isBot: Boolean(data.is_bot),
      };

      if (typeof this.config.onAttribution === 'function') {
        this.config.onAttribution(event);
      }
      return event;
    } catch (err) {
      console.warn('[AITRACK] Pageview error:', err);
      return null;
    }
  }

  public async confirmPrompt(confirmedPrompt: string): Promise<void> {
    if (!this.config?.siteId || typeof window === 'undefined') return;

    await fetch(`${this.config.backendUrl}/api/v1/sdk/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site_id: this.config.siteId,
        page_url: window.location.href,
        referrer: document.referrer || '',
        session_id: this.sessionId,
        confirmed_prompt: confirmedPrompt,
        intent_verified: true,
      }),
    });

    const banner = document.getElementById('__aitrack_intent_banner');
    if (banner) banner.remove();
  }

  private renderIntentBanner(platform: string, promptText: string): void {
    if (document.getElementById('__aitrack_intent_banner')) return;

    const banner = document.createElement('div');
    banner.id = '__aitrack_intent_banner';
    banner.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;background:#0f172a;color:#f8fafc;border:1px solid #3b82f6;border-radius:10px;padding:14px 18px;max-width:380px;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:sans-serif;font-size:13px;';

    banner.innerHTML = `
      <div style="font-weight:700;color:#38bdf8;margin-bottom:4px;text-transform:capitalize;">🔍 Arrived from ${platform}?</div>
      <div style="color:#cbd5e1;margin-bottom:8px;line-height:1.4;">Looking for: <em>"${promptText}"</em>?</div>
      <div style="display:flex;gap:8px;">
        <button id="__aitrack_btn_yes" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-weight:600;font-size:12px;">Yes, that's it</button>
        <button id="__aitrack_btn_close" style="background:#334155;color:#94a3b8;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:12px;">Dismiss</button>
      </div>
    `;

    document.body.appendChild(banner);
    document.getElementById('__aitrack_btn_yes')?.addEventListener('click', () => this.confirmPrompt(promptText));
    document.getElementById('__aitrack_btn_close')?.addEventListener('click', () => banner.remove());
  }
}
