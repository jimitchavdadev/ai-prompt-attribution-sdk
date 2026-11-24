import { createHash } from 'crypto';

export interface RedactionResult {
  redactedText: string;
  isRedacted: boolean;
  redactedCategories: string[];
}

const REDACTION_RULES: Array<{
  category: string;
  regex: RegExp;
  replacement: string;
}> = [
  {
    category: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g,
    replacement: '[REDACTED_EMAIL]',
  },
  {
    category: 'phone',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
  },
  {
    category: 'credit_card',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CREDIT_CARD]',
  },
  {
    category: 'api_key',
    regex: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ey[A-Za-z0-9_-]{20,}\.[A-Za-z0-9._-]{20,})\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  {
    category: 'password',
    regex: /\b(?:password|passwd|secret)\s*[:=]\s*[^\s,]+/gi,
    replacement: 'password: [REDACTED_SECRET]',
  }
];

export function redactPromptText(rawText: string, enabledCategories: string[] = ['email', 'phone', 'credit_card', 'api_key', 'password']): RedactionResult {
  let text = rawText;
  const appliedCategories: string[] = [];

  for (const rule of REDACTION_RULES) {
    if (enabledCategories.includes(rule.category)) {
      if (rule.regex.test(text)) {
        appliedCategories.push(rule.category);
        text = text.replace(rule.regex, rule.replacement);
      }
    }
  }

  return {
    redactedText: text,
    isRedacted: appliedCategories.length > 0,
    redactedCategories: appliedCategories,
  };
}

export function computePromptHash(promptText: string): string {
  return createHash('sha256').update(promptText.trim().toLowerCase()).digest('hex');
}
