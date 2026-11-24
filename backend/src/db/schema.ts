import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const websites = sqliteTable('websites', {
  siteId: text('site_id').primaryKey(),
  domain: text('domain').notNull().unique(),
  name: text('name').notNull(),
  publicApiKey: text('public_api_key').notNull(),
  createdAt: text('created_at').notNull(),
});

export const extensionInstalls = sqliteTable('extension_installs', {
  installId: text('install_id').primaryKey(),
  consentEnabled: integer('consent_enabled', { mode: 'boolean' }).notNull().default(true),
  sharePromptText: integer('share_prompt_text', { mode: 'boolean' }).notNull().default(false),
  redactedCategories: text('redacted_categories').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const prompts = sqliteTable('prompts', {
  promptId: text('prompt_id').primaryKey(),
  installId: text('install_id').notNull().references(() => extensionInstalls.installId, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  promptText: text('prompt_text').notNull(),
  promptHash: text('prompt_hash').notNull(),
  isRedacted: integer('is_redacted', { mode: 'boolean' }).notNull().default(false),
  sessionId: text('session_id'),
  conversationId: text('conversation_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_prompts_install').on(table.installId),
  index('idx_prompts_platform').on(table.platform),
  index('idx_prompts_created_at').on(table.createdAt),
]);

export const searchQueries = sqliteTable('search_queries', {
  queryId: text('query_id').primaryKey(),
  promptId: text('prompt_id').notNull().references(() => prompts.promptId, { onDelete: 'cascade' }),
  queryText: text('query_text').notNull(),
  engine: text('engine').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_search_queries_prompt').on(table.promptId),
]);

export const citations = sqliteTable('citations', {
  citationId: text('citation_id').primaryKey(),
  promptId: text('prompt_id').notNull().references(() => prompts.promptId, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  citedUrl: text('cited_url').notNull(),
  citedDomain: text('cited_domain').notNull(),
  title: text('title'),
  snippet: text('snippet'),
  position: integer('position').default(0),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_citations_prompt').on(table.promptId),
  index('idx_citations_domain').on(table.citedDomain),
]);

export const attributionTokens = sqliteTable('attribution_tokens', {
  token: text('token').primaryKey(),
  promptId: text('prompt_id').notNull().references(() => prompts.promptId, { onDelete: 'cascade' }),
  installId: text('install_id').notNull(),
  citationUrl: text('citation_url').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  usedAt: text('used_at'),
}, (table) => [
  index('idx_tokens_prompt').on(table.promptId),
  index('idx_tokens_expires').on(table.expiresAt),
]);

export const retrievals = sqliteTable('retrievals', {
  retrievalId: text('retrieval_id').primaryKey(),
  siteId: text('site_id'),
  requestedUrl: text('requested_url').notNull(),
  provider: text('provider').notNull(),
  crawlerUserAgent: text('crawler_user_agent').notNull(),
  sourceIp: text('source_ip'),
  isVerifiedBot: integer('is_verified_bot', { mode: 'boolean' }).notNull().default(true),
  traceId: text('trace_id'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_retrievals_site').on(table.siteId),
  index('idx_retrievals_url').on(table.requestedUrl),
]);

export const websiteVisits = sqliteTable('website_visits', {
  visitId: text('visit_id').primaryKey(),
  siteId: text('site_id').notNull().references(() => websites.siteId, { onDelete: 'cascade' }),
  pageUrl: text('page_url').notNull(),
  referrer: text('referrer'),
  visitorSessionId: text('visitor_session_id'),
  userAgent: text('user_agent'),
  attributionToken: text('attribution_token'),
  promptId: text('prompt_id').references(() => prompts.promptId, { onDelete: 'set null' }),
  confidence: text('confidence').notNull(),
  activityType: text('activity_type').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_visits_site').on(table.siteId),
  index('idx_visits_prompt').on(table.promptId),
  index('idx_visits_confidence').on(table.confidence),
]);

export const agentTraces = sqliteTable('agent_traces', {
  traceId: text('trace_id').primaryKey(),
  parentId: text('parent_id'),
  promptId: text('prompt_id'),
  provider: text('provider').notNull(),
  toolName: text('tool_name').notNull(),
  toolInput: text('tool_input'),
  toolOutput: text('tool_output'),
  targetUrl: text('target_url'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_traces_prompt').on(table.promptId),
  index('idx_traces_target').on(table.targetUrl),
]);
