import type { ProviderAdapter, ExtractedCitation } from './baseAdapter.ts';

export class ChatGPTAdapter implements ProviderAdapter {
  platformName = 'chatgpt' as const;

  matches(url: string): boolean {
    return url.includes('chatgpt.com') || url.includes('/mock-chatgpt');
  }

  findPromptInput(): HTMLElement | null {
    return (
      document.querySelector('#prompt-textarea') ||
      document.querySelector('textarea[data-id="root"]') ||
      document.querySelector('div[contenteditable="true"][data-placeholder]') ||
      document.querySelector('.chatgpt-input')
    ) as HTMLElement | null;
  }

  findSubmitButton(): HTMLElement | null {
    return (
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[aria-label="Send prompt"]') ||
      document.querySelector('.chatgpt-send-btn')
    ) as HTMLElement | null;
  }

  findCitations(root: HTMLElement | Document = document): ExtractedCitation[] {
    const list: ExtractedCitation[] = [];
    // Footnote citation badges, source popover links, or assistant markdown anchors
    const anchors = root.querySelectorAll('a[data-testid*="citation"], a.citation-link, [data-message-author-role="assistant"] a[href^="http"]');
    
    anchors.forEach((el, idx) => {
      const a = el as HTMLAnchorElement;
      if (a.href && !a.href.includes('chatgpt.com') && !a.href.includes('openai.com')) {
        list.push({
          url: a.href,
          title: a.innerText || a.getAttribute('title') || undefined,
          position: idx,
        });
      }
    });

    return list;
  }

  findGeneratedQueries(root: HTMLElement | Document = document): string[] {
    const queries: string[] = [];
    const elements = root.querySelectorAll('[data-testid*="search-query"], .search-query-chip');
    elements.forEach((el) => {
      const t = el.textContent?.trim();
      if (t) queries.push(t);
    });
    return queries;
  }
}
