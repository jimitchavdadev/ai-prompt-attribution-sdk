import { ChatGPTAdapter } from './adapters/chatgptAdapter.ts';
import { GeminiAdapter } from './adapters/geminiAdapter.ts';
import { ClaudeAdapter } from './adapters/claudeAdapter.ts';
import type { ProviderAdapter } from './adapters/baseAdapter.ts';

class ContentTracker {
  private adapter: ProviderAdapter | null = null;
  private activePromptId: string | null = null;
  private lastTypedText = '';
  private seenCitations = new Set<string>();
  private observer: MutationObserver | null = null;

  constructor() {
    this.initAdapter();
    if (this.adapter) {
      this.attachInputListeners();
      this.startCitationObserver();
      this.attachCitationClickInterceptor();
      console.log(`[AITracker] Active on ${this.adapter.platformName}`);
    }
  }

  private initAdapter() {
    const url = window.location.href;
    const adapters = [new ChatGPTAdapter(), new GeminiAdapter(), new ClaudeAdapter()];
    for (const a of adapters) {
      if (a.matches(url)) {
        this.adapter = a;
        break;
      }
    }
  }

  private attachInputListeners() {
    // Buffer input text continuously
    document.addEventListener('input', (e: Event) => {
      const input = this.adapter?.findPromptInput();
      if (input) {
        if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
          this.lastTypedText = input.value;
        } else {
          this.lastTypedText = input.innerText || input.textContent || '';
        }
      }
    }, true);

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        this.captureSubmission();
      }
    }, true);

    document.addEventListener('click', (e: MouseEvent) => {
      const btn = this.adapter?.findSubmitButton();
      if (btn && (e.target === btn || btn.contains(e.target as Node))) {
        this.captureSubmission();
      }
    }, true);
  }

  private captureSubmission() {
    const input = this.adapter?.findPromptInput();
    let text = '';
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      text = input.value;
    } else if (input) {
      text = input.innerText || input.textContent || '';
    }

    if (!text || text.trim().length === 0) {
      text = this.lastTypedText;
    }

    text = text.trim();
    if (!text || text.length < 2) return;

    this.seenCitations.clear();
    const queries = this.adapter?.findGeneratedQueries() || [];

    chrome.runtime.sendMessage({
      type: 'SAVE_PROMPT',
      payload: {
        platform: this.adapter?.platformName,
        prompt_text: text,
        session_id: window.location.pathname,
        generated_queries: queries,
      },
    }, (res) => {
      if (res && res.prompt_id) {
        this.activePromptId = res.prompt_id;
        console.log('[AITracker] Prompt captured:', res.prompt_id);
      }
    });
  }

  private startCitationObserver() {
    this.observer = new MutationObserver(() => {
      if (!this.activePromptId || !this.adapter) return;

      const citations = this.adapter.findCitations();
      const newCitations = citations.filter((c) => !this.seenCitations.has(c.url));

      if (newCitations.length > 0) {
        for (const c of newCitations) {
          this.seenCitations.add(c.url);
        }

        chrome.runtime.sendMessage({
          type: 'SAVE_CITATIONS',
          payload: {
            prompt_id: this.activePromptId,
            platform: this.adapter.platformName,
            citations: newCitations,
          },
        });
      }
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private attachCitationClickInterceptor() {
    document.addEventListener('click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target || !target.href) return;

      const href = target.href;
      if (this.activePromptId && (this.seenCitations.has(href) || href.startsWith('http'))) {
        if (!href.includes('_ai_token')) {
          e.preventDefault();
          e.stopPropagation();

          chrome.runtime.sendMessage({
            type: 'CREATE_TOKEN',
            payload: {
              prompt_id: this.activePromptId,
              citation_url: href,
            },
          }, (res) => {
            const urlObj = new URL(href);
            if (res && res.token) {
              urlObj.searchParams.set('_ai_token', res.token);
            }
            if (target.target === '_blank') {
              window.open(urlObj.toString(), '_blank');
            } else {
              window.location.href = urlObj.toString();
            }
          });
        }
      }
    }, true);
  }
}

new ContentTracker();
