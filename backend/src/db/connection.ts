import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema.ts';

export type AppDrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let sqliteInstance: Database | null = null;
let drizzleInstance: AppDrizzleDb | null = null;

export function getDrizzleDb(dbPath = './aitrack.db'): { db: AppDrizzleDb; sqlite: Database } {
  if (dbPath === ':memory:') {
    const memSqlite = new Database(':memory:');
    memSqlite.run('PRAGMA foreign_keys = ON;');
    createTablesIfNotExist(memSqlite);
    seedDefaultRows(memSqlite);
    const memDb = drizzle(memSqlite, { schema });
    return { db: memDb, sqlite: memSqlite };
  }

  if (!drizzleInstance || !sqliteInstance) {
    sqliteInstance = new Database(dbPath);
    sqliteInstance.run('PRAGMA foreign_keys = ON;');
    sqliteInstance.run('PRAGMA journal_mode = WAL;');

    createTablesIfNotExist(sqliteInstance);
    seedDefaultRows(sqliteInstance);

    drizzleInstance = drizzle(sqliteInstance, { schema });
  }

  return { db: drizzleInstance, sqlite: sqliteInstance };
}

function createTablesIfNotExist(sqlite: Database) {
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS websites (
      site_id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      public_api_key TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS extension_installs (
      install_id TEXT PRIMARY KEY,
      consent_enabled INTEGER NOT NULL DEFAULT 1,
      share_prompt_text INTEGER NOT NULL DEFAULT 0,
      redacted_categories TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prompts (
      prompt_id TEXT PRIMARY KEY,
      install_id TEXT NOT NULL REFERENCES extension_installs(install_id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      is_redacted INTEGER NOT NULL DEFAULT 0,
      session_id TEXT,
      conversation_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS search_queries (
      query_id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(prompt_id) ON DELETE CASCADE,
      query_text TEXT NOT NULL,
      engine TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS citations (
      citation_id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(prompt_id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      cited_url TEXT NOT NULL,
      cited_domain TEXT NOT NULL,
      title TEXT,
      snippet TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attribution_tokens (
      token TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL REFERENCES prompts(prompt_id) ON DELETE CASCADE,
      install_id TEXT NOT NULL,
      citation_url TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS retrievals (
      retrieval_id TEXT PRIMARY KEY,
      site_id TEXT,
      requested_url TEXT NOT NULL,
      provider TEXT NOT NULL,
      crawler_user_agent TEXT NOT NULL,
      source_ip TEXT,
      is_verified_bot INTEGER NOT NULL DEFAULT 1,
      trace_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS website_visits (
      visit_id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL REFERENCES websites(site_id) ON DELETE CASCADE,
      page_url TEXT NOT NULL,
      referrer TEXT,
      visitor_session_id TEXT,
      user_agent TEXT,
      attribution_token TEXT,
      prompt_id TEXT REFERENCES prompts(prompt_id) ON DELETE SET NULL,
      confidence TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_traces (
      trace_id TEXT PRIMARY KEY,
      parent_id TEXT,
      prompt_id TEXT,
      provider TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      tool_input TEXT,
      tool_output TEXT,
      target_url TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function seedDefaultRows(sqlite: Database) {
  try {
    sqlite.run(`
      INSERT OR IGNORE INTO websites (site_id, domain, name, public_api_key, created_at)
      VALUES ('site_sample_y', 'localhost', 'Acme GA4 Audit Automation', 'pk_live_acme_analytics_2026', '${new Date().toISOString()}');

      INSERT OR IGNORE INTO extension_installs (install_id, consent_enabled, share_prompt_text, redacted_categories, created_at, updated_at)
      VALUES ('inst_default_tester', 1, 1, '["email","phone","credit_card","api_key","password"]', '${new Date().toISOString()}', '${new Date().toISOString()}');
    `);
  } catch {}
}

export function closeDrizzleDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    drizzleInstance = null;
  }
}
