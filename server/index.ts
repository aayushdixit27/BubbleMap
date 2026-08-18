// Express app. Binds 127.0.0.1 — never 0.0.0.0 (CLAUDE.md rule 4).

import express from 'express';
import { currentModel } from './ai';

try {
  process.loadEnvFile('.env');
} catch {
  // Health works without a key; AI routes (Phase 2) report the missing key.
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, model: currentModel() });
});

const PORT = 8787;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`BubbleMap server listening on http://127.0.0.1:${PORT}`);
});
