import { useEffect, useState } from 'react';
import { Readings } from './grid/Readings';
import { ThreadGrid } from './grid/ThreadGrid';
import { Signature } from './signature/Signature';
import { useMapStore } from './store';

// D26 #1: home base. The landing screen is the library — your songs, most
// recent first. "Add a song" is one option on it, not the whole screen.
// Opening a song only reads what's there; nothing re-runs.
function Library() {
  const maps = useMapStore((s) => s.maps);
  const createAndSeed = useMapStore((s) => s.createAndSeed);
  const openMap = useMapStore((s) => s.openMap);
  const openProbeRun = useMapStore((s) => s.openProbeRun);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');

  const madeOn = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const descents = (n: number) =>
    n === 0 ? 'no descents yet' : n === 1 ? '1 descent' : `${n} descents`;

  return (
    <div className="start">
      <h1 className="start-title">BubbleMap</h1>

      <div className="library">
        {maps.map((m) => (
          <button key={m.id} className="library-row" onClick={() => void openMap(m.id)}>
            <span className="library-title">{m.title}</span>
            <span className="library-meta">
              {madeOn(m.createdAt)} · {descents(m.descents)}
            </span>
          </button>
        ))}
        {maps.length === 0 && <div className="library-empty">No songs yet.</div>}
      </div>

      {adding ? (
        <form
          className="start-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && source.trim()) void createAndSeed(title, source);
          }}
        >
          <label className="field-label" htmlFor="map-title">Song — Artist</label>
          <input
            id="map-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mr. Brightside — The Killers"
            autoFocus
          />
          <label className="field-label" htmlFor="map-source">
            Lyrics / notes / your analysis — the ground truth the model works from
          </label>
          <textarea
            id="map-source"
            rows={10}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <button className="text-action start-submit" type="submit" disabled={!title.trim() || !source.trim()}>
            Create &amp; seed
          </button>
        </form>
      ) : (
        <button className="text-action add-song" onClick={() => setAdding(true)}>
          Add a song
        </button>
      )}

      <div className="start-maps">
        <div className="field-label">Design-test data</div>
        <button className="text-action map-link" onClick={openProbeRun}>
          Mr. Brightside — Phase 0 probe run (read-only)
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const doc = useMapStore((s) => s.doc);
  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const metrics = useMapStore((s) => s.metrics);
  const running = useMapStore((s) => s.running);
  const loadMaps = useMapStore((s) => s.loadMaps);
  const closeMap = useMapStore((s) => s.closeMap);
  const [health, setHealth] = useState('server: …');
  // Readings is the judgment surface (D25); the grid stays as a toggle.
  const [view, setView] = useState<'grid' | 'readings'>('readings');

  useEffect(() => {
    void loadMaps();
    fetch('/api/health')
      .then((r) => r.json())
      .then((h: { ok: boolean; model: string }) =>
        setHealth(h.ok ? `server: ok · ${h.model}` : 'server: unhealthy'),
      )
      .catch(() => setHealth('server: offline'));
  }, [loadMaps]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <span className="title">{doc ? doc.title : 'BubbleMap'}</span>
          <span className="health">{health}</span>
        </div>
        {doc && <Signature doc={doc} />}
      </header>

      {doc && (
        <div className="toolbar">
          <button className="text-action" onClick={closeMap}>← maps</button>
          <button
            className="text-action"
            onClick={() => setView(view === 'grid' ? 'readings' : 'grid')}
          >
            {view === 'grid' ? 'readings' : 'grid'}
          </button>
          {(status || running > 0) && <span className="status">{status}</span>}
          {error && <span className="status status-error">{error}</span>}
          {metrics && <span className="metrics">{metrics}</span>}
        </div>
      )}

      {doc ? view === 'readings' ? <Readings /> : <ThreadGrid /> : <Library />}
    </div>
  );
}
