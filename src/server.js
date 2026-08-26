import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer, PUBLIC_URL } from './mcp.js';
import { getPlan, pruneOlderThanDays } from './db.js';
import { planToNoteText } from './render.js';
import { renderPlanPage, renderNotFound, renderLanding } from './page.js';

const PORT = Number(process.env.PORT || 2400);
const HOST = process.env.HOST || '0.0.0.0';
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 0);

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

/** Open CORS on the MCP endpoint so browser-side clients can connect. */
app.use('/mcp', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, MCP-Protocol-Version');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/mcp', express.json({ limit: '1mb' }));

/**
 * Stateless Streamable HTTP: a fresh server + transport per request. Nothing is
 * held between calls (all state lives in SQLite), so this survives restarts and
 * concurrent clients without session bookkeeping.
 */
app.all('/mcp', async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on('close', () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[mcp] request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

/** A plan, as a page (default), plain text (.txt) or raw data (.json). */
app.get('/n/:file', (req, res) => {
  const raw = req.params.file;
  const match = raw.match(/^([A-Za-z0-9_-]{22})(\.txt|\.json)?$/);
  if (!match) {
    return res.status(404).type('html').send(renderNotFound());
  }
  const [, id, ext] = match;
  const found = getPlan(id);
  if (!found) {
    return res.status(404).type('html').send(renderNotFound());
  }

  const { plan } = found;
  const noteText = planToNoteText(plan, PUBLIC_URL.replace(/^https?:\/\//, ''));

  res.setHeader('Cache-Control', 'private, max-age=60');
  if (ext === '.txt') {
    return res.type('text/plain; charset=utf-8').send(noteText);
  }
  if (ext === '.json') {
    return res.json({ id, created_at: found.createdAt, url: `${PUBLIC_URL}/n/${id}`, plan, note_text: noteText });
  }
  return res.type('html').send(renderPlanPage({ id, plan, noteText, baseUrl: PUBLIC_URL }));
});

app.get('/', (_req, res) => {
  res.type('html').send(renderLanding(PUBLIC_URL));
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use((_req, res) => res.status(404).type('html').send(renderNotFound()));

if (RETENTION_DAYS > 0) {
  const prune = () => {
    const n = pruneOlderThanDays(RETENTION_DAYS);
    if (n) console.log(`[prune] removed ${n} plans older than ${RETENTION_DAYS} days`);
  };
  prune();
  setInterval(prune, 6 * 60 * 60 * 1000).unref();
}

const httpServer = app.listen(PORT, HOST, () => {
  console.log(`foodgen listening on http://${HOST}:${PORT}  (public: ${PUBLIC_URL})`);
  console.log(`  MCP endpoint: ${PUBLIC_URL}/mcp`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`\n${signal} — shutting down`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
