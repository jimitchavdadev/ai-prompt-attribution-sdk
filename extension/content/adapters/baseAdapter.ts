export interface ExtractedCitation {
  url: string;
  title?: string;
  snippet?: string;
  position?: number;
}

export interface ProviderAdapter {
  platformName: 'chatgpt' | 'gemini' | 'claude' | 'mock';
  matches(url: string): boolean;
  findPromptInput(): HTMLElement | null;
  findSubmitButton(): HTMLElement | null;
  findCitations(root?: HTMLElement | Document): ExtractedCitation[];
  findGeneratedQueries(root?: HTMLElement | Document): string[];
}
