import type { CrawlerClassification, TraceContext } from './types.ts';
export declare function classifyUserAgent(userAgent: string): CrawlerClassification;
export declare function detectAiReferrer(referrer: string): {
    isAi: boolean;
    platform: string;
};
export declare function parseTraceparentHeader(traceparent: string): TraceContext | null;
