import type { PageContext, ReconstructedPromptResult } from './reconstruction/types.ts';
import { classifyIntent } from './reconstruction/intentClassifier.ts';
import { extractEntities } from './reconstruction/entityExtractor.ts';
import { synthesizePrompt } from './reconstruction/promptSynthesizer.ts';

export type { PageContext, ReconstructedPromptResult, ReconstructionIntent } from './reconstruction/types.ts';

export function reconstructPromptFromContext(
  platform: string,
  context: PageContext
): ReconstructedPromptResult {
  const { intent, confidenceScore, reason } = classifyIntent(context);
  const entities = extractEntities(context);
  return synthesizePrompt(platform, context, entities, intent, confidenceScore, reason);
}
