import type { ProviderAdapter, ExtractedCitation } from './baseAdapter.ts';

export class ClaudeAdapter implements ProviderAdapter {
  platformName = 'claude' as const;

  matches(url: string): boolean {
    return url.includes('claude.ai') || url.includes('/mock-claude');
  }

  findPromptInput(): HTMLElement | null {
    return (
      document.querySelector('div[contenteditable="true"].ProseMirror') ||
      document.querySelector('fieldset div[contenteditable="true"]') ||
      document.querySelector('.claude-input')
    ) as HTMLElement | null;
  }

  findSubmitButton(): HTMLElement | null {
    return (
      document.querySelector('button[aria-label="Send message"]') ||
      document.querySelector('button[aria-label="Send Message"]') ||
      document.querySelector('.claude-send-btn')
    ) as HTMLElement | null;
  }

  findCitations(root: HTMLElement | Document = document): ExtractedCitation[] {
    const list: ExtractedCitation[] = [];
    const anchors = root.querySelectorAll('a[data-citation], a.source-card, .font-claude-message a[href^="http"], .claude-citation a');

    anchors.forEach((el, idx) => {
      const a = el as HTMLAnchorElement;
      if (a.href && !a.href.includes('claude.ai') && !a.href.includes('anthropic.com')) {
        list.push({
          url: a.href,
          title: a.innerText || undefined,
          position: idx,
        });
      }
    });

    return list;
  }

  findGeneratedQueries(root: HTMLElement | Document = document): string[] {
    const queries: string[] = [];
    const elements = root.querySelectorAll('[data-search-query], .web-search-query');
    elements.forEach((el) => {
      const q = el.getAttribute('data-search-query') || el.textContent?.trim();
      if (q) queries.push(q);
    });
    return queries;
  }
}
