import { getDrizzleDb, closeDrizzleDb, type AppDrizzleDb } from './connection.ts';
import { WebsiteRepository } from './repositories/websiteRepository.ts';
import { ConsentRepository } from './repositories/consentRepository.ts';
import { PromptRepository } from './repositories/promptRepository.ts';
import { CitationRepository } from './repositories/citationRepository.ts';
import { TokenRepository } from './repositories/tokenRepository.ts';
import { RetrievalRepository } from './repositories/retrievalRepository.ts';
import { VisitRepository } from './repositories/visitRepository.ts';
import { TraceRepository } from './repositories/traceRepository.ts';

export class DatabaseService {
  public db: AppDrizzleDb;
  public websites: WebsiteRepository;
  public consents: ConsentRepository;
  public prompts: PromptRepository;
  public citations: CitationRepository;
  public tokens: TokenRepository;
  public retrievals: RetrievalRepository;
  public visits: VisitRepository;
  public traces: TraceRepository;

  constructor(dbPath = './aitrack.db') {
    const { db } = getDrizzleDb(dbPath);
    this.db = db;
    this.websites = new WebsiteRepository(db);
    this.consents = new ConsentRepository(db);
    this.prompts = new PromptRepository(db);
    this.citations = new CitationRepository(db);
    this.tokens = new TokenRepository(db);
    this.retrievals = new RetrievalRepository(db);
    this.visits = new VisitRepository(db);
    this.traces = new TraceRepository(db);
  }

  async purgeUserData(installId: string): Promise<void> {
    await this.prompts.deleteByInstallId(installId);
    await this.tokens.deleteByInstallId(installId);
    await this.consents.delete(installId);
  }

  close() {
    closeDrizzleDb();
  }
}

let dbInstance: DatabaseService | null = null;

export function getDatabaseService(dbPath?: string): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(dbPath);
  }
  return dbInstance;
}
