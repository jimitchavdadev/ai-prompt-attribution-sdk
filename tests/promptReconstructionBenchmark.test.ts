import { describe, it, expect } from 'bun:test';
import { reconstructPromptFromContext } from '../backend/src/services/promptReconstructor.ts';
import { classifyIntent } from '../backend/src/services/reconstruction/intentClassifier.ts';
import { extractEntities } from '../backend/src/services/reconstruction/entityExtractor.ts';

describe('Prompt Reconstruction Accuracy Benchmark', () => {
  const benchmarkCases = [
    {
      name: 'Commercial Pricing Page',
      platform: 'chatgpt',
      context: {
        url: 'https://metricops.com/pricing',
        title: 'MetricOps Enterprise Pricing & Plans | Automated GA4 Audits',
        h1: 'Transparent Pricing for Modern Analytics Teams',
        description: 'See pricing tiers for enterprise GA4 audit automation',
        schemaType: 'Product',
        schemaData: { offers: { price: '499', priceCurrency: 'USD' } },
      },
      expectedIntent: 'pricing',
      expectedKeywordsInPrompt: ['MetricOps', 'cost', 'pricing tiers'],
    },
    {
      name: 'Competitor Comparison Page (Tool A vs Tool B)',
      platform: 'claude',
      context: {
        url: 'https://supermetrics.com/compare/supermetrics-vs-funnel',
        title: 'Supermetrics vs Funnel.io Comparison: Which is Best for Enterprise?',
        h1: 'Supermetrics vs Funnel.io: 2026 Feature and Cost Comparison',
        description: 'In-depth comparison between Supermetrics and Funnel.io',
      },
      expectedIntent: 'comparison',
      expectedKeywordsInPrompt: ['Supermetrics', 'Funnel.io'],
    },
    {
      name: 'Competitor Alternatives Page',
      platform: 'chatgpt',
      context: {
        url: 'https://airbyte.com/alternatives/fivetran-alternatives',
        title: 'Top 7 Fivetran Alternatives & Competitors in 2026',
        h1: 'Best Open-Source and Cloud Alternatives to Fivetran',
        description: 'Looking for Fivetran alternatives? Compare the top tools',
      },
      expectedIntent: 'comparison',
      expectedKeywordsInPrompt: ['alternatives to Fivetran'],
    },
    {
      name: 'Troubleshooting / Error Resolution Page',
      platform: 'perplexity',
      context: {
        url: 'https://analyticsmania.com/post/fix-ga4-unassigned-traffic/',
        title: 'How to Fix GA4 Unassigned Traffic Spikes (Step-by-Step Guide)',
        h1: 'Troubleshoot and Fix GA4 Unassigned Traffic in 5 Steps',
        description: 'Learn why unassigned traffic spikes occur in GA4 and how to resolve them',
      },
      expectedIntent: 'problem_solving',
      expectedKeywordsInPrompt: ['fix', 'GA4 Unassigned Traffic'],
    },
    {
      name: 'How-To Implementation Guide',
      platform: 'gemini',
      context: {
        url: 'https://developers.google.com/tag-platform/security/guides/consent',
        title: 'How to Implement Google Consent Mode v2 Step by Step',
        h1: 'Implement Google Consent Mode v2 on Web',
        schemaType: 'HowTo',
        description: 'Developer guide to implementing consent mode v2',
      },
      expectedIntent: 'how_to',
      expectedKeywordsInPrompt: ['implement', 'Consent Mode v2', 'step by step'],
    },
    {
      name: 'Integration & Feature Capability Page',
      platform: 'chatgpt',
      context: {
        url: 'https://segment.com/integrations/bigquery/',
        title: 'Segment BigQuery Integration: Stream Events to Warehouse',
        h1: 'Connect Segment to Google BigQuery',
        description: 'Integrates with Google BigQuery to sync customer event data',
      },
      expectedIntent: 'feature',
      expectedKeywordsInPrompt: ['Segment', 'BigQuery'],
    },
    {
      name: 'Core Tool Recommendation Page (E-Commerce)',
      platform: 'chatgpt',
      context: {
        url: 'https://auditflow.ai/tools/ga4-audit-automation',
        title: 'Enterprise GA4 Audit Automation Platform | AuditFlow',
        h1: 'Automate GA4 Audits for Enterprise E-Commerce Websites',
        description: 'AI-driven automated GA4 audit software for enterprise brands',
        schemaType: 'SoftwareApplication',
      },
      expectedIntent: 'recommendation',
      expectedKeywordsInPrompt: ['best', 'Automate GA4 Audits', 'e-commerce'],
    },
  ];

  it('accurately classifies intent across all benchmark cases with >= 95% accuracy', () => {
    let correctIntents = 0;
    for (const testCase of benchmarkCases) {
      const { intent, confidenceScore } = classifyIntent(testCase.context);
      if (intent === testCase.expectedIntent) {
        correctIntents++;
      }
      expect(confidenceScore).toBeGreaterThanOrEqual(0.65);
    }
    const accuracy = (correctIntents / benchmarkCases.length) * 100;
    expect(accuracy).toBeGreaterThanOrEqual(95);
  });

  it('reconstructs primary prompts matching target semantic keywords with high precision', () => {
    for (const testCase of benchmarkCases) {
      const result = reconstructPromptFromContext(testCase.platform, testCase.context);

      expect(result.intentCategory).toBe(testCase.expectedIntent);
      expect(result.primaryPrompt.length).toBeGreaterThan(15);
      expect(result.candidateQueries.length).toBeGreaterThanOrEqual(2);

      for (const expectedKw of testCase.expectedKeywordsInPrompt) {
        const promptHasKw = result.primaryPrompt.toLowerCase().includes(expectedKw.toLowerCase());
        const alternativesHaveKw = result.alternativePrompts.some(p => p.toLowerCase().includes(expectedKw.toLowerCase()));
        expect(promptHasKw || alternativesHaveKw).toBe(true);
      }
    }
  });

  it('adapts candidate search queries specifically to the AI platform search style', () => {
    const context = {
      url: 'https://auditflow.ai/tools/ga4',
      title: 'GA4 Audit Automation | AuditFlow',
      h1: 'Automated GA4 Audits',
    };

    const gpt = reconstructPromptFromContext('chatgpt', context);
    const gemini = reconstructPromptFromContext('gemini', context);
    const claude = reconstructPromptFromContext('claude', context);
    const perplexity = reconstructPromptFromContext('perplexity', context);

    expect(gpt.candidateQueries[0]).toContain('recommend');
    expect(gemini.candidateQueries[0]).toContain('Google search:');
    expect(claude.candidateQueries[0]).toContain('overview of');
    expect(perplexity.candidateQueries[0]).toContain('reviews');
  });

  it('correctly extracts brand and audience without polluting core subject', () => {
    const entities = extractEntities({
      url: 'https://example.com/audit',
      title: 'Enterprise GA4 Audit Platform - MetricOps Inc',
      h1: 'Automated GA4 Anomaly Detection for Enterprise E-Commerce',
    });

    expect(entities.brand).toBe('MetricOps Inc');
    expect(entities.subject).toBe('Automated GA4 Anomaly Detection for Enterprise E-Commerce');
    expect(entities.targetAudience).toBe('enterprise');
    expect(entities.actionVerb).toBe('automate');
  });
});
