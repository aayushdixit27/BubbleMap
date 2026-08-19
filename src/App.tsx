import { useEffect, useState } from 'react';
import { Readings } from './grid/Readings';
import { ThreadGrid } from './grid/ThreadGrid';
import { Signature } from './signature/Signature';
import { Target } from './target/Target';
import { useMapStore, type View } from './store';

// D26 #4: the toolbar renders the views you are NOT in, so every label
// names a destination by construction.
const VIEWS: View[] = ['readings', 'grid', 'target'];

// D26 #1: home base. The landing screen is the library — your songs, most
// recent first. "Add a song" is one option on it, not the whole screen.
// Opening a song only reads what's there; nothing re-runs.
function Library() {
  const maps = useMapStore((s) => s.maps);
  const createAndSeed = useMapStore((s) => s.createAndSeed);
  const openMap = useMapStore((s) => s.openMap);
  const removeMap = useMapStore((s) => s.removeMap);
  const openProbeRun = useMapStore((s) => s.openProbeRun);
  const error = useMapStore((s) => s.error);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');

  // Date AND time — two takes on the same song made minutes apart must
  // read as different rows.
  const madeOn = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  const descents = (n: number) =>
    n === 0 ? 'no descents yet' : n === 1 ? '1 descent' : `${n} descents`;

  return (
    <div className="start">
      <div className="library">
        {maps.map((m) => (
          <div key={m.id} className="library-row">
            <button className="library-open" onClick={() => void openMap(m.id)}>
              <span className="library-title">{m.title}</span>
              {m.rawLine && <span className="library-raw">{m.rawLine}</span>}
              <span className="library-meta">
                {madeOn(m.createdAt)} · {descents(m.descents)}
              </span>
            </button>
            <div className={`library-actions${deleting === m.id ? ' confirming' : ''}`}>
              {deleting === m.id ? (
                <>
                  <span className="library-confirm">delete this song?</span>
                  <button
                    className="text-action"
                    onClick={() => {
                      setDeleting(null);
                      void removeMap(m.id);
                    }}
                  >
                    delete
                  </button>
                  <button className="text-action" onClick={() => setDeleting(null)}>
                    keep
                  </button>
                </>
              ) : (
                <button className="text-action" onClick={() => setDeleting(m.id)}>
                  delete
                </button>
              )}
            </div>
          </div>
        ))}
        {maps.length === 0 && <div className="library-empty">No songs yet.</div>}
        {error && <div className="status status-error">{error}</div>}
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
            Map this song
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
  const killed = useMapStore((s) => s.killed);
  const undoKill = useMapStore((s) => s.undoKill);
  const progress = useMapStore((s) => s.progress);
  const rejections = useMapStore((s) => s.rejections);
  // D34: rejected proposals surface as a quiet toolbar count expanding to
  // reasons — not a toast, nothing modal.
  const [showRejections, setShowRejections] = useState(false);
  const [health, setHealth] = useState('server: …');
  // D26 #4: three views. Readings is the judgment surface (D25); grid
  // compares; target is where this song's RAW landed. The view lives in
  // the store: only the toolbar click and map-open set it, and no doc
  // mutation or streaming update can — see the store comment.
  const view = useMapStore((s) => s.view);
  const setView = useMapStore((s) => s.setView);

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
          {VIEWS.filter((v) => v !== view).map((v) => (
            <button key={v} className="text-action" onClick={() => setView(v)}>
              {v}
            </button>
          ))}
          {killed.length > 0 && (
            <button className="text-action" onClick={undoKill}>
              undo kill
            </button>
          )}
          {rejections.length > 0 && (
            <button
              className="text-action rejections-toggle"
              onClick={() => setShowRejections((s) => !s)}
            >
              {rejections.length} proposal{rejections.length === 1 ? '' : 's'} rejected
            </button>
          )}
          {progress && (
            <span className="status">
              {progress.state === 'going'
                ? `${progress.done} of ${progress.target} · still going`
                : progress.state === 'done'
                  ? 'done'
                  : (progress.note ?? 'stopped')}
            </span>
          )}
          {(status || running > 0) && status && <span className="status">{status}</span>}
          {error && <span className="status status-error">{error}</span>}
          {metrics && <span className="metrics">{metrics}</span>}
        </div>
      )}

      {doc && showRejections && rejections.length > 0 && (
        <div className="rejections">
          {rejections.map((r, i) => {
            const item = r.item as { label?: string; kind?: string } | null;
            const hint = item?.label ?? item?.kind;
            return (
              <div key={i} className="rejection">
                {r.reason}
                {hint ? ` — “${hint}”` : ''}
              </div>
            );
          })}
        </div>
      )}

      {doc ? (
        view === 'readings' ? <Readings /> : view === 'grid' ? <ThreadGrid /> : <Target doc={doc} />
      ) : (
        <Library />
      )}
    </div>
  );
}
