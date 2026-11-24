import { generateW3cTraceContext, type TraceContext } from './w3cContext.ts';
import { extractOpenAIMetadata } from './adapters/openai.ts';
import { extractGeminiMetadata } from './adapters/gemini.ts';
import { extractAnthropicMetadata } from './adapters/anthropic.ts';

export interface TracerOptions {
  backendUrl?: string;
  provider: 'openai' | 'gemini' | 'anthropic' | 'custom_agent';
}

export class LLMTracer {
  private backendUrl: string;
  private provider: string;

  constructor(options: TracerOptions) {
    this.backendUrl = options.backendUrl || 'http://localhost:3000';
    this.provider = options.provider;
  }

  public createTrace(promptId?: string): TraceContext {
    return generateW3cTraceContext(promptId, this.provider);
  }

  public async recordExecution(params: {
    traceId: string;
    promptId?: string;
    promptText?: string;
    toolName: string;
    toolInput?: any;
    rawResponse: any;
    targetUrl?: string;
  }) {
    let extracted = { searchQueries: [] as string[], citations: [] as any[], retrievedUrls: [] as string[] };

    if (this.provider === 'openai') {
      extracted = extractOpenAIMetadata(params.rawResponse);
    } else if (this.provider === 'gemini') {
      extracted = extractGeminiMetadata(params.rawResponse);
    } else if (this.provider === 'anthropic') {
      extracted = extractAnthropicMetadata(params.rawResponse);
    }

    const payload = {
      trace_id: params.traceId,
      prompt_id: params.promptId,
      provider: this.provider,
      prompt_text: params.promptText,
      tool_name: params.toolName,
      tool_input: params.toolInput,
      tool_output: params.rawResponse,
      target_url: params.targetUrl || (extracted.retrievedUrls[0] ?? undefined),
      search_queries: extracted.searchQueries,
      citations: extracted.citations,
    };

    try {
      await fetch(`${this.backendUrl}/api/v1/llm/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[LLMTracer] Failed to transmit trace:', err);
    }

    return {
      traceId: params.traceId,
      extracted,
    };
  }
}
