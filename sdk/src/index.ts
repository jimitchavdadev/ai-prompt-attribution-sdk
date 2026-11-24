export { AITrackClient } from './client.ts';
export { reconstructPrompt } from './reconstructor.ts';
export { createAiAttributionMiddleware } from './server.ts';
export { classifyUserAgent, detectAiReferrer, parseTraceparentHeader } from './classifier.ts';

export type {
  AITrackConfig,
  AttributionEvent,
  PageMetadata,
  ReconstructedPrompt,
  CrawlerClassification,
  ServerSdkConfig,
  TraceContext,
} from './types.ts';
