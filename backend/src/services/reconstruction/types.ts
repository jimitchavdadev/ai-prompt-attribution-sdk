export type ReconstructionIntent =
  | 'recommendation'
  | 'comparison'
  | 'pricing'
  | 'how_to'
  | 'problem_solving'
  | 'feature';

export interface PageContext {
  url: string;
  title: string;
  h1?: string;
  h2s?: string[];
  description?: string;
  keywords?: string[];
  breadcrumbs?: string[];
  pathname?: string;
  schemaType?: string;
  schemaData?: Record<string, any>;
  utmCampaign?: string;
  utmContent?: string;
}

export interface ExtractedEntities {
  subject: string;
  brand: string;
  competitors: string[];
  targetAudience?: string;
  actionVerb?: string;
  feature?: string;
  issueDescription?: string;
}

export interface ReconstructedPromptResult {
  primaryPrompt: string;
  alternativePrompts: string[];
  candidateQueries: string[];
  intentCategory: ReconstructionIntent;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  explanation: string;
}
