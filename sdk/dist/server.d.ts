import type { ServerSdkConfig } from './types.ts';
export declare function createAiAttributionMiddleware(config: ServerSdkConfig): (req: any, _res: any, next?: () => void) => Promise<void>;
