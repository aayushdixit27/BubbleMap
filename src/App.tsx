import { useEffect, useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { useMapStore } from './store';

export default function App() {
  const title = useMapStore((s) => s.doc.title);
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
        <span className="title">{title}</span>
        <span className="health">{health}</span>
      </header>
      <Canvas />
    </div>
  );
}
