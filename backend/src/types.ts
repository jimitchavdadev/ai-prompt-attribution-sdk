export type ConfidenceLevel = 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNATTRIBUTED';
export type AIPlatform = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'custom_agent' | 'unknown';
export type ActivityType = 'ai_retrieval' | 'ai_citation' | 'human_click';

export interface WebsiteRecord {
  site_id: string;
  domain: string;
  name: string;
  public_api_key: string;
  created_at: string;
}

export interface ConsentRecord {
  install_id: string;
  consent_enabled: boolean;
  share_prompt_text: boolean;
  redacted_categories: string;
  created_at: string;
  updated_at: string;
}

export interface PromptRecord {
  prompt_id: string;
  install_id: string;
  platform: AIPlatform;
  prompt_text: string;
  prompt_hash: string;
  is_redacted: boolean;
  session_id?: string;
  conversation_id?: string;
  created_at: string;
}

export interface SearchQueryRecord {
  query_id: string;
  prompt_id: string;
  query_text: string;
  engine: string;
  created_at: string;
}

export interface CitationRecord {
  citation_id: string;
  prompt_id: string;
  platform: AIPlatform;
  cited_url: string;
  cited_domain: string;
  title?: string;
  snippet?: string;
  position?: number;
  created_at: string;
}

export interface RetrievalRecord {
  retrieval_id: string;
  site_id?: string;
  requested_url: string;
  provider: string;
  crawler_user_agent: string;
  source_ip?: string;
  is_verified_bot: boolean;
  trace_id?: string;
  created_at: string;
}

export interface AttributionTokenRecord {
  token: string;
  prompt_id: string;
  install_id: string;
  citation_url: string;
  expires_at: number;
  created_at: string;
  used_at?: string;
}

export interface WebsiteVisitRecord {
  visit_id: string;
  site_id: string;
  page_url: string;
  referrer?: string;
  visitor_session_id?: string;
  user_agent?: string;
  attribution_token?: string;
  prompt_id?: string;
  confidence: ConfidenceLevel;
  activity_type: ActivityType;
  created_at: string;
}

export interface AgentTraceRecord {
  trace_id: string;
  parent_id?: string;
  prompt_id?: string;
  provider: string;
  tool_name: string;
  tool_input?: string;
  tool_output?: string;
  target_url?: string;
  created_at: string;
}

export interface IngestPromptPayload {
  install_id: string;
  platform: AIPlatform;
  prompt_text: string;
  session_id?: string;
  conversation_id?: string;
  timestamp?: string;
  generated_queries?: string[];
}

export interface IngestCitationPayload {
  install_id: string;
  prompt_id: string;
  platform: AIPlatform;
  citations: Array<{ url: string; title?: string; snippet?: string; position?: number }>;
}

export interface CreateTokenPayload {
  install_id: string;
  prompt_id: string;
  citation_url: string;
}

export interface SdkVisitPayload {
  site_id: string;
  api_key?: string;
  page_url: string;
  referrer?: string;
  attribution_token?: string;
  session_id?: string;
  user_agent?: string;
  timestamp?: string;
  page_title?: string;
  page_h1?: string;
  meta_description?: string;
  confirmed_prompt?: string;
  intent_verified?: boolean;
  schema_type?: string;
  schema_data?: any;
}

export interface CrawlerLogPayload {
  site_id?: string;
  requested_url: string;
  user_agent: string;
  source_ip?: string;
  trace_id?: string;
  baggage?: string;
}

export interface LlmTracePayload {
  trace_id: string;
  parent_id?: string;
  prompt_id?: string;
  provider: string;
  prompt_text?: string;
  tool_name: string;
  tool_input?: any;
  tool_output?: any;
  target_url?: string;
  search_queries?: string[];
  citations?: Array<{ url: string; title?: string }>;
}
