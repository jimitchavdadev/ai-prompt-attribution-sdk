export interface AITrackConfig {
  siteId: string;
  apiKey?: string;
  backendUrl?: string;
  showIntentBanner?: boolean;
  onAttribution?: (data: AttributionEvent) => void;
}

export interface AttributionEvent {
  visitId: string;
  platform: string;
  confidence: 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNATTRIBUTED';
  reconstructedPrompt?: string;
  candidateQueries?: string[];
  isBot: boolean;
}

export interface PageMetadata {
  url: string;
  title: string;
  h1?: string;
  description?: string;
}

export interface ReconstructedPrompt {
  primaryPrompt: string;
  candidateQueries: string[];
  intentCategory: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CrawlerClassification {
  isAiBot: boolean;
  provider: string;
  botName: string;
  category: 'training_crawler' | 'search_indexer' | 'live_browsing_agent' | 'human_browser';
  isLiveBrowsing: boolean;
}

export interface ServerSdkConfig {
  siteId: string;
  apiKey?: string;
  backendUrl?: string;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
}

export declare class AITrackClient {
  public lastReconstructedPrompt: string | null;
  public init(config: AITrackConfig): void;
  public trackPageView(): Promise<AttributionEvent | null>;
  public confirmPrompt(confirmedPrompt: string): Promise<void>;
}

export declare function reconstructPrompt(platform: string, meta: PageMetadata): ReconstructedPrompt;

export declare function createAiAttributionMiddleware(config: ServerSdkConfig): (req: any, res: any, next?: () => void) => Promise<void>;

export declare function classifyUserAgent(userAgent: string): CrawlerClassification;

export declare function detectAiReferrer(referrer: string): { isAi: boolean; platform: string };

export declare function parseTraceparentHeader(traceparent: string): TraceContext | null;
