import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { getDatabaseService, DatabaseService } from './db/index.ts';
import { extensionRoutes } from './routes/extensionRoutes.ts';
import { sdkRoutes } from './routes/sdkRoutes.ts';
import { crawlerRoutes } from './routes/crawlerRoutes.ts';
import { llmRoutes } from './routes/llmRoutes.ts';
import { analyticsRoutes } from './routes/analyticsRoutes.ts';
import { privacyRoutes } from './routes/privacyRoutes.ts';

export async function createServer(dbService?: DatabaseService) {
  const db = dbService || getDatabaseService();
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-AI-Attribution-Token', 'traceparent', 'baggage'],
  });

  const dashboardDir = path.resolve(__dirname, '../../dashboard');
  const sdkDir = path.resolve(__dirname, '../../sdk/dist');
  const websiteYDir = path.resolve(__dirname, '../../test-environment/sample-website-y');
  const testEnvDir = path.resolve(__dirname, '../../test-environment');

  await fastify.register(fastifyStatic, { root: dashboardDir, prefix: '/dashboard/' });
  await fastify.register(fastifyStatic, { root: sdkDir, prefix: '/sdk/', decorateReply: false });
  await fastify.register(fastifyStatic, { root: websiteYDir, prefix: '/website-y/', decorateReply: false });

  // Direct HTML page handlers for testbed
  fastify.get('/mock-chatgpt', async (_req, rep) => rep.redirect('/mock-chatgpt/'));
  fastify.get('/mock-chatgpt/', async (_req, rep) => {
    const html = fs.readFileSync(path.join(testEnvDir, 'mock-chatgpt/index.html'), 'utf-8');
    return rep.type('text/html').send(html);
  });

  fastify.get('/mock-gemini', async (_req, rep) => rep.redirect('/mock-gemini/'));
  fastify.get('/mock-gemini/', async (_req, rep) => {
    const html = fs.readFileSync(path.join(testEnvDir, 'mock-gemini/index.html'), 'utf-8');
    return rep.type('text/html').send(html);
  });

  fastify.get('/mock-claude', async (_req, rep) => rep.redirect('/mock-claude/'));
  fastify.get('/mock-claude/', async (_req, rep) => {
    const html = fs.readFileSync(path.join(testEnvDir, 'mock-claude/index.html'), 'utf-8');
    return rep.type('text/html').send(html);
  });

  // Register API routes
  await fastify.register(extensionRoutes(db));
  await fastify.register(sdkRoutes(db));
  await fastify.register(crawlerRoutes(db));
  await fastify.register(llmRoutes(db));
  await fastify.register(analyticsRoutes(db));
  await fastify.register(privacyRoutes(db));

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));
  fastify.get('/', async (_req, rep) => rep.redirect('/dashboard/'));

  return fastify;
}

export async function startServer(port = 3000, host = '0.0.0.0') {
  const server = await createServer();
  await server.listen({ port, host });
  console.log(`AI Attribution Platform Backend listening on http://${host}:${port}`);
  return server;
}

if (import.meta.main) {
  const port = Number(process.env.PORT) || 3000;
  startServer(port);
}
