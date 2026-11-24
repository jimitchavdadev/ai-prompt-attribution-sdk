import type { ProviderAdapter, ExtractedCitation } from './baseAdapter.ts';

export class GeminiAdapter implements ProviderAdapter {
  platformName = 'gemini' as const;

  matches(url: string): boolean {
    return url.includes('gemini.google.com') || url.includes('/mock-gemini');
  }

  findPromptInput(): HTMLElement | null {
    return (
      document.querySelector('rich-textarea div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][role="textbox"]') ||
      document.querySelector('.gemini-input')
    ) as HTMLElement | null;
  }

  findSubmitButton(): HTMLElement | null {
    return (
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('button.send-button') ||
      document.querySelector('.gemini-send-btn')
    ) as HTMLElement | null;
  }

  findCitations(root: HTMLElement | Document = document): ExtractedCitation[] {
    const list: ExtractedCitation[] = [];
    const anchors = root.querySelectorAll('source-pill a, a.source-chip, a[href*="google.com/url?"], .gemini-citation a');

    anchors.forEach((el, idx) => {
      const a = el as HTMLAnchorElement;
      let targetUrl = a.href;
      // Handle Google redirect wrappers
      if (targetUrl.includes('google.com/url?q=')) {
        try {
          const u = new URL(targetUrl);
          targetUrl = u.searchParams.get('q') || targetUrl;
        } catch {}
      }

      if (targetUrl && !targetUrl.includes('google.com') && !targetUrl.includes('gemini.google')) {
        list.push({
          url: targetUrl,
          title: a.innerText || undefined,
          position: idx,
        });
      }
    });

    return list;
  }

  findGeneratedQueries(root: HTMLElement | Document = document): string[] {
    const queries: string[] = [];
    const chips = root.querySelectorAll('.search-term-chip, [data-query]');
    chips.forEach((el) => {
      const q = el.getAttribute('data-query') || el.textContent?.trim();
      if (q) queries.push(q);
    });
    return queries;
  }
}
