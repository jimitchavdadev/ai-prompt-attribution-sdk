import { describe, it, expect } from 'bun:test';
import { reconstructPromptFromContext } from '../backend/src/services/promptReconstructor.ts';

describe('Prompt Reconstruction Stress & Bizarre Inputs Test Suite', () => {
  it('handles completely empty or nullish page context without throwing', () => {
    const res = reconstructPromptFromContext('chatgpt', {
      url: '',
      title: '',
      h1: undefined,
      description: undefined,
    });

    expect(res).toBeDefined();
    expect(res.primaryPrompt.length).toBeGreaterThan(0);
    expect(res.confidence).toBe('LOW');
    expect(res.candidateQueries.length).toBeGreaterThan(0);
  });

  it('neutralizes XSS and HTML script injection in title and headings', () => {
    const res = reconstructPromptFromContext('chatgpt', {
      url: 'https://security.com/test',
      title: '<script>alert(document.cookie)</script> Enterprise Security Tool',
      h1: '<img src=x onerror="fetch(\'http://attacker.com\')"> Vulnerability Scanner',
    });

    expect(res.primaryPrompt).not.toContain('<script>');
    expect(res.primaryPrompt).not.toContain('<img');
    expect(res.primaryPrompt.toLowerCase()).toContain('vulnerability scanner');
  });

  it('resists massive string bloat (50,000 characters) without DOS or timeout', () => {
    const hugeTitle = 'A'.repeat(50000);
    const hugeH1 = 'Automate '.repeat(5000);

    const start = performance.now();
    const res = reconstructPromptFromContext('claude', {
      url: 'https://example.com/massive',
      title: hugeTitle,
      h1: hugeH1,
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Must process in under 100ms
    expect(res.primaryPrompt.length).toBeLessThan(500); // Truncated cleanly
  });

  it('handles Japanese, emojis, RTL, and non-ASCII Unicode characters', () => {
    const res = reconstructPromptFromContext('perplexity', {
      url: 'https://example.jp/tools/ga4-%E7%9B%A3%E6%9F%BB',
      title: '🔥 🚀 Best Free GA4 最適化ツール - 監査自動化 😱 ★★★★★',
      h1: 'GA4 最適化とデータ監査の自動化プラットフォーム',
    });

    expect(res.primaryPrompt).toContain('GA4');
    expect(res.primaryPrompt).toContain('最適化');
    expect(res.confidenceScore).toBeGreaterThan(0.6);
  });

  it('handles single-word or low-information pages gracefully', () => {
    const res404 = reconstructPromptFromContext('chatgpt', {
      url: 'https://example.com/404',
      title: '404 Not Found',
      h1: 'Page Not Found',
    });
    expect(res404.primaryPrompt).toBeDefined();

    const resHome = reconstructPromptFromContext('gemini', {
      url: 'https://acme.org/',
      title: 'Home',
      h1: 'Welcome to Acme',
    });
    expect(resHome.primaryPrompt).toContain('Acme');
  });

  it('handles conflicting multi-intent signals deterministically', () => {
    const res = reconstructPromptFromContext('chatgpt', {
      url: 'https://example.com/pricing-vs-alternatives-how-to-fix-guide',
      title: 'Pricing vs Alternatives: How to Fix Broken Data in 2026',
      h1: 'Complete Pricing and Comparison Guide to Fixing GA4',
    });

    // Conflicting: pricing, comparison, problem_solving, how_to
    expect(['pricing', 'comparison', 'problem_solving', 'how_to']).toContain(res.intentCategory);
    expect(res.confidenceScore).toBeGreaterThan(0.7);
  });

  it('handles malformed, invalid, or traversal URLs without crashing', () => {
    const badUrls = [
      'not-a-valid-url',
      'javascript:void(0)',
      'http://localhost:3000/../../etc/passwd',
      'https://example.com/deep/path/?query=a&b=c#anchor-fragment',
    ];

    for (const badUrl of badUrls) {
      expect(() => {
        reconstructPromptFromContext('chatgpt', {
          url: badUrl,
          title: 'Testing URL Robustness',
          h1: 'Safe Execution',
        });
      }).not.toThrow();
    }
  });

  it('handles unknown or custom AI platforms gracefully', () => {
    const platforms = ['deepseek', 'grok', 'llama3', 'mistral', '', 'unknown'];
    for (const p of platforms) {
      const res = reconstructPromptFromContext(p, {
        url: 'https://metricops.com/audit',
        title: 'MetricOps Analytics',
        h1: 'Automated Audits',
      });
      expect(res.primaryPrompt).toBeDefined();
      expect(res.candidateQueries.length).toBeGreaterThan(0);
    }
  });

  it('realistic scenario: E-Commerce Catalog & Product Page', () => {
    const res = reconstructPromptFromContext('chatgpt', {
      url: 'https://allbirds.com/collections/mens-running-shoes',
      title: "Men's Sustainable Running Shoes | Allbirds",
      h1: 'Lightweight Running Shoes Made from Tree Fiber',
      description: "Shop men's eco-friendly running shoes with wool and eucalyptus comfort",
      schemaType: 'Product',
      schemaData: { offers: { price: '140', priceCurrency: 'USD' } },
    });

    expect(['recommendation', 'pricing']).toContain(res.intentCategory);
    expect(res.primaryPrompt.toLowerCase()).toContain('running shoes');
  });

  it('realistic scenario: Deep Developer API Reference', () => {
    const res = reconstructPromptFromContext('gemini', {
      url: 'https://docs.stripe.com/api/payment_intents/create',
      title: 'Create a PaymentIntent API Reference | Stripe Docs',
      h1: 'Create a PaymentIntent',
      description: 'Creates a PaymentIntent object to accept payments with Stripe',
      schemaType: 'TechArticle',
    });

    expect(['how_to', 'recommendation', 'feature']).toContain(res.intentCategory);
    expect(res.primaryPrompt).toContain('PaymentIntent');
  });

  it('realistic scenario: B2B Enterprise Security Compliance Page', () => {
    const res = reconstructPromptFromContext('claude', {
      url: 'https://vanta.com/soc-2-compliance-automation',
      title: 'Automated SOC 2 Compliance Software for Enterprise Startups | Vanta',
      h1: 'Get SOC 2 Certified with Automated Continuous Monitoring',
      description: 'Automate compliance and security evidence collection for enterprise audits',
      schemaType: 'SoftwareApplication',
    });

    expect(res.intentCategory).toBe('recommendation');
    expect(res.primaryPrompt).toContain('SOC 2');
    expect(res.primaryPrompt.toLowerCase()).toContain('enterprise');
  });
});
