import { useEffect, useState } from 'react';
import { ThreadGrid } from './grid/ThreadGrid';
import { Signature } from './signature/Signature';
import { useMapStore } from './store';

function StartScreen() {
  const maps = useMapStore((s) => s.maps);
  const createAndSeed = useMapStore((s) => s.createAndSeed);
  const openMap = useMapStore((s) => s.openMap);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');

  return (
    <div className="start">
      <h1 className="start-title">BubbleMap</h1>

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

      {maps.length > 0 && (
        <div className="start-maps">
          <div className="field-label">Maps</div>
          {maps.map((m) => (
            <button key={m.id} className="text-action map-link" onClick={() => void openMap(m.id)}>
              {m.title}
            </button>
          ))}
        </div>
      )}
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
  const acceptAllUngrouped = useMapStore((s) => s.acceptAllUngrouped);
  const rejectAllProposed = useMapStore((s) => s.rejectAllProposed);
  const [health, setHealth] = useState('server: …');

  useEffect(() => {
    void loadMaps();
    fetch('/api/health')
      .then((r) => r.json())
      .then((h: { ok: boolean; model: string }) =>
        setHealth(h.ok ? `server: ok · ${h.model}` : 'server: unhealthy'),
      )
      .catch(() => setHealth('server: offline'));
  }, [loadMaps]);

  // §10: Shift+A accept all (ungrouped), Shift+X reject all.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.shiftKey && (e.key === 'A' || e.key === 'a')) acceptAllUngrouped();
      if (e.shiftKey && (e.key === 'X' || e.key === 'x')) rejectAllProposed();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [acceptAllUngrouped, rejectAllProposed]);

  const proposedCount = doc?.bubbles.filter((b) => b.status === 'proposed').length ?? 0;

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
          {proposedCount > 0 && (
            <>
              <button className="text-action" onClick={acceptAllUngrouped}>
                keep all ungrouped <kbd>⇧A</kbd>
              </button>
              <button className="text-action" onClick={rejectAllProposed}>
                discard all <kbd>⇧X</kbd>
              </button>
            </>
          )}
          {(status || running > 0) && <span className="status">{status}</span>}
          {error && <span className="status status-error">{error}</span>}
          {metrics && <span className="metrics">{metrics}</span>}
        </div>
      )}

      {doc ? <ThreadGrid /> : <StartScreen />}
    </div>
  );
}
