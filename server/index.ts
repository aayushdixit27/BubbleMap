// Express app (§11). Binds 127.0.0.1 — never 0.0.0.0 (CLAUDE.md rule 4).
// AI routes stream NDJSON: {type:'snapshot'} lines as the model's tool input
// accumulates (D17 #1 — first content in seconds), then one {type:'result'}.
// Errors surface as a real status code before streaming starts, or as a
// {type:'error'} line after — never a silent no-op.

import express from 'express';
import { nanoid } from 'nanoid';
import type { BubbleMapDoc } from '../src/types';
import { currentModel, nominateKeeper, propose } from './ai';
import type { Verb } from './prompts';
import { deleteMap, listMaps, readMap, writeMap } from './storage';

try {
  process.loadEnvFile('.env');
} catch {
  // Health works without a key; AI routes report the missing key.
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: currentModel() });
});

// ── Maps ────────────────────────────────────────────────────────────────

app.get('/api/maps', (_req, res) => {
  res.json(listMaps());
});

app.post('/api/maps', (req, res) => {
  const { title, subject, source } = req.body as {
    title?: string;
    subject?: 'song' | 'self';
    source?: string;
  };
  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  const now = new Date().toISOString();
  const doc: BubbleMapDoc = {
    version: 2,
    id: nanoid(),
    title: title.trim(),
    subject: subject ?? 'song',
    ...(source?.trim() ? { source: source.trim() } : {}),
    bubbles: [],
    links: [],
    rejected: [],
    createdAt: now,
    updatedAt: now,
  };
  res.json(writeMap(doc));
});

app.get('/api/maps/:id', (req, res) => {
  const doc = readMap(req.params.id);
  if (!doc) {
    res.status(404).json({ error: `no map with id ${req.params.id}` });
    return;
  }
  res.json(doc);
});

app.put('/api/maps/:id', (req, res) => {
  const doc = req.body as BubbleMapDoc;
  if (doc.id !== req.params.id) {
    res.status(400).json({ error: 'doc id does not match route id' });
    return;
  }
  const written = writeMap(doc);
  res.json({ ok: true, updatedAt: written.updatedAt });
});

app.delete('/api/maps/:id', (req, res) => {
  if (!deleteMap(req.params.id)) {
    res.status(404).json({ error: `no map with id ${req.params.id}` });
    return;
  }
  res.json({ ok: true });
});

// ── AI verbs (§7, D18): proposals only, streamed ────────────────────────

const AI_TIMEOUT_MS = 60_000; // §11

async function streamVerb(verb: Verb, req: express.Request, res: express.Response) {
  const { doc, focusId } = req.body as { doc?: BubbleMapDoc; focusId?: string };
  if (!doc) {
    res.status(400).json({ error: 'doc is required' });
    return;
  }
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  const writeLine = (obj: unknown) => res.write(JSON.stringify(obj) + '\n');

  const started = Date.now();
  try {
    const proposal = await Promise.race([
      propose(verb, doc, focusId, (snapshot) => writeLine({ type: 'snapshot', snapshot })),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${verb} exceeded ${AI_TIMEOUT_MS / 1000}s`)), AI_TIMEOUT_MS),
      ),
    ]);
    writeLine({ type: 'result', proposal });
    console.log(
      `[ai] ${verb}${focusId ? ` focus=${focusId}` : ''} ` +
        `${proposal.bubbles.length}b/${proposal.links.length}l ` +
        `${proposal.usage.input_tokens}in/${proposal.usage.output_tokens}out ` +
        `${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ai] ${verb} failed after ${((Date.now() - started) / 1000).toFixed(1)}s: ${message}`);
    if (res.headersSent) {
      writeLine({ type: 'error', error: message });
    } else {
      res.status(502).json({ error: message });
      return;
    }
  }
  res.end();
}

// D41: nominate keeper candidates — three ids out, no streaming needed.
app.post('/api/ai/nominate', async (req, res) => {
  try {
    const { doc } = req.body as { doc?: BubbleMapDoc };
    if (!doc) {
      res.status(400).json({ error: 'doc is required' });
      return;
    }
    res.json(await nominateKeeper(doc));
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/ai/seed', (req, res) => streamVerb('seed', req, res));
app.post('/api/ai/descend', (req, res) => streamVerb('descend', req, res));
app.post('/api/ai/interrogate', (req, res) => streamVerb('interrogate', req, res));

// Overridable so integration harnesses run on a scratch port and never
// contend with the human-owned dev server. Always 127.0.0.1 (hard rule 4).
const PORT = Number(process.env.BUBBLEMAP_PORT ?? 8787);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`BubbleMap server listening on http://127.0.0.1:${PORT}`);
});
