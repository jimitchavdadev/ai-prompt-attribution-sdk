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
