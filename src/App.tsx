import { useEffect, useState } from 'react';
import { ThreadGrid } from './grid/ThreadGrid';
import { Signature } from './signature/Signature';
import { useMapStore } from './store';

export default function App() {
  const doc = useMapStore((s) => s.doc);
  const [health, setHealth] = useState('server: …');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((h: { ok: boolean; model: string }) =>
        setHealth(h.ok ? `server: ok · ${h.model}` : 'server: unhealthy'),
      )
      .catch(() => setHealth('server: offline'));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-text">
          <span className="title">{doc.title}</span>
          <span className="health">{health}</span>
        </div>
        <Signature doc={doc} />
      </header>
      <ThreadGrid />
    </div>
  );
}
