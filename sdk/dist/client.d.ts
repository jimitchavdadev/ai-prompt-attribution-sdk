import type { AITrackConfig, AttributionEvent } from './types.ts';
export declare class AITrackClient {
    private config;
    private sessionId;
    lastReconstructedPrompt: string | null;
    constructor();
    private getOrCreateSessionId;
    init(config: AITrackConfig): void;
    trackPageView(): Promise<AttributionEvent | null>;
    confirmPrompt(confirmedPrompt: string): Promise<void>;
    private renderIntentBanner;
}
