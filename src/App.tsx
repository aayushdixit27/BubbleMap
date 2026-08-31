import { useEffect, useState } from 'react';
import { ArcView } from './arc/ArcView';
import { Corpus } from './corpus/Corpus';
import { Readings } from './grid/Readings';
import { ThreadGrid } from './grid/ThreadGrid';
import { Signature } from './signature/Signature';
import { Target } from './target/Target';
import { useMapStore, type View } from './store';

// D26 #4: the toolbar renders the views you are NOT in, so every label
// names a destination by construction. The arc view (D46) joins only
// once the song has an arc (or one is being written) — a destination
// that leads nowhere is noise.
const VIEWS: View[] = ['readings', 'grid', 'target'];

// A draft that survives navigation. Losing a pasted page of lyrics is the
// worst small failure available, so every keystroke lands in localStorage
// and only a successful submit clears it. Drafts are input protection,
// not judgment — D10 (judgment lives in files) is about a different thing.
function useDraft(key: string): [string, (v: string) => void, () => void] {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? '');
  const update = (v: string) => {
    setValue(v);
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  };
  const clear = () => {
    setValue('');
    localStorage.removeItem(key);
  };
  return [value, update, clear];
}

// The landing (crucible A, 21 Aug): input-first, framed as a QUESTION —
// the excavation register (PRODUCT §1: the raw layer is recovered; the
// going-down is the product). "What song?" in the serif, the field
// directly under it, the library at the fold beneath — ordering, not
// burying (D26 #1's home base is one scroll-free glance away). The
// compose surface is PROMOTED here, not rebuilt: typing unfolds the
// lyrics field in place. A labelled form ("Song — Artist" as header) is
// explicitly banned by the ruling. Drafts survive via localStorage; a
// kept draft lands expanded, visible immediately.
function Home({ onCorpus }: { onCorpus: () => void }) {
  const createAndSeed = useMapStore((s) => s.createAndSeed);
  const [title, setTitle, clearTitle] = useDraft('bubblemap.compose.title');
  const [source, setSource, clearSource] = useDraft('bubblemap.compose.source');
  // Typing is the opt-in: the rest of the compose surface unfolds only
  // once there is something in either field. No autofocus on the
  // textarea — it mounts mid-keystroke and would steal the cursor.
  const engaged = Boolean(title.trim() || source.trim());
  const maps = useMapStore((s) => s.maps);
  const openMap = useMapStore((s) => s.openMap);
  const removeMap = useMapStore((s) => s.removeMap);
  const openProbeRun = useMapStore((s) => s.openProbeRun);
  const error = useMapStore((s) => s.error);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Date AND time — two takes on the same song made minutes apart must
  // read as different rows.
  const madeOn = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  // Q3's number, read at a glance: kills are the judgment record, so a row
  // reads "7 kept · 3 killed". All-keeps across songs is D25's tripwire.
  const descents = (kept: number, killed: number) => {
    if (kept === 0 && killed === 0) return 'no descents yet';
    const k = kept === 1 ? '1 kept' : `${kept} kept`;
    return killed > 0 ? `${k} · ${killed} killed` : k;
  };

  return (
    <div className="start home">
      {/* The question, not a form. Typing unfolds the rest in place. */}
      <form
        className="start-form home-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !source.trim()) return;
          void createAndSeed(title, source);
          clearTitle();
          clearSource();
        }}
      >
        <label className="home-question" htmlFor="home-title">What song?</label>
        <input
          id="home-title"
          className="home-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mr. Brightside — The Killers"
          autoFocus={!title}
        />
        {engaged && (
          <>
            <div className="compose-explain">
              The ground the dig happens in. Paste everything you have — lyrics, your
              notes, what you already suspect. The model works only from what lands here.
            </div>
            <textarea
              id="home-source"
              className="compose-lyrics home-lyrics"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste them here."
            />
            <button
              className="text-action start-submit"
              type="submit"
              disabled={!title.trim() || !source.trim()}
            >
              Map this song
            </button>
          </>
        )}
      </form>
      <div className="library">
        {maps.map((m) => (
          <div key={m.id} className="library-row">
            <button className="library-open" onClick={() => void openMap(m.id)}>
              <span className="library-title">{m.title}</span>
              {/* D48: a dug line (from an arc) reads in full ink; the
                  fallback (most recent RAW, identification only) reads
                  dim — never silently equate the two. */}
              {m.rawLine && (
                <span className={`library-raw${m.dug ? '' : ' undug'}`}>{m.rawLine}</span>
              )}
              <span className="library-meta">
                {madeOn(m.createdAt)} · {descents(m.descents, m.killed)}
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
        {/* D57 #7: the ink difference carries meaning (D48), so it gets a
            key — one quiet line, shown only while both kinds are present. */}
        {maps.some((m) => m.rawLine && m.dug) && maps.some((m) => m.rawLine && !m.dug) && (
          <div className="library-key">
            full ink — a line chosen by digging · dim — the latest RAW, standing in
          </div>
        )}
        {error && <div className="status status-error">{error}</div>}
      </div>

      {/* D47: the view ACROSS maps, reached from here — not from inside
          a song. Two songs is the minimum for "next to each other". */}
      {maps.length > 1 && (
        <button className="text-action add-song corpus-link" onClick={onCorpus}>
          The corpus — every line on one wall
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
  const ahead = useMapStore((s) => s.ahead);
  const openMap = useMapStore((s) => s.openMap);
  const readOnly = useMapStore((s) => s.readOnly);
  const createAndSeed = useMapStore((s) => s.createAndSeed);
  // D34: rejected proposals surface as a quiet toolbar count expanding to
  // reasons — not a toast, nothing modal.
  const [showRejections, setShowRejections] = useState(false);
  // D37: start the next song while reading this one. One slot — the form
  // only offers itself when no run exists anywhere. Drafts survive
  // navigation, same as the compose surface.
  const [nextOpen, setNextOpen] = useState(false);
  const [nextTitle, setNextTitle, clearNextTitle] = useDraft('bubblemap.next.title');
  const [nextSource, setNextSource, clearNextSource] = useDraft('bubblemap.next.source');
  // D47: the corpus is its own mode — doc-less, reached from the
  // landing. Opening a song from the wall renders the song (doc wins);
  // closing it falls back here until "← library".
  const [corpusOpen, setCorpusOpen] = useState(false);
  const [health, setHealth] = useState('server: …');
  // D26 #4: three views. Readings is the judgment surface (D25); grid
  // compares; target is where this song's RAW landed. The view lives in
  // the store: only the toolbar click and map-open set it, and no doc
  // mutation or streaming update can — see the store comment.
  const view = useMapStore((s) => s.view);
  const setView = useMapStore((s) => s.setView);
  const arcDraft = useMapStore((s) => s.arcDraft);
  const views: View[] =
    (doc?.arcs?.length ?? 0) > 0 || arcDraft ? [...VIEWS, 'arc'] : VIEWS;

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
          {views.filter((v) => v !== view).map((v) => (
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
          {ahead ? (
            <button className="text-action ahead-chip" onClick={() => void openMap(ahead.docId)}>
              next song ·{' '}
              {ahead.progress.state === 'going'
                ? `${ahead.progress.done} of ${ahead.progress.target}`
                : ahead.progress.state}
            </button>
          ) : (
            running === 0 &&
            !readOnly && (
              // D57 #6: this is a live control, so it wears live ink. It
              // was styled with the ahead-chip's dim — a working button
              // signifying disabled. The dim chip variant above carries
              // its own explanation ("· 4 of 12"); this one doesn't.
              <button className="text-action" onClick={() => setNextOpen((s) => !s)}>
                next song
              </button>
            )
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

      {doc && nextOpen && !ahead && running === 0 && (
        <form
          className="start-form next-song-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nextTitle.trim() || !nextSource.trim()) return;
            void createAndSeed(nextTitle, nextSource, { openNow: false });
            clearNextTitle();
            clearNextSource();
            setNextOpen(false);
          }}
        >
          <label className="field-label" htmlFor="next-title">Next song — Artist</label>
          <input
            id="next-title"
            value={nextTitle}
            onChange={(e) => setNextTitle(e.target.value)}
            autoFocus
          />
          <label className="field-label" htmlFor="next-source">The lyrics</label>
          <div className="compose-explain">
            The ground the dig happens in — lyrics, notes, what you already suspect.
          </div>
          <textarea
            id="next-source"
            rows={8}
            value={nextSource}
            onChange={(e) => setNextSource(e.target.value)}
            placeholder="Paste them here."
          />
          <button
            className="text-action start-submit"
            type="submit"
            disabled={!nextTitle.trim() || !nextSource.trim()}
          >
            Map it next
          </button>
        </form>
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
        running === 0 && !readOnly && !doc.bubbles.some((b) => b.kind === 'idea') ? (
          // D57 #5: a map with nothing in it is a run that failed or was
          // interrupted before anything landed — the doc is created before
          // the seed by design (D10), so the state can't be made
          // unrepresentable; it can be made honest and recoverable. D40:
          // we cannot know retroactively WHICH failure, so don't claim one.
          <div className="map-empty">
            {doc.source ? (
              <>
                <div className="map-empty-note">
                  Nothing landed here — the run failed or was interrupted before its
                  first descent. The lyrics are kept.
                </div>
                <button
                  className="text-action"
                  onClick={() => void createAndSeed(doc.title, doc.source!, { existing: doc })}
                >
                  run it again
                </button>
              </>
            ) : (
              // D7: no stored lyrics means no re-run — paste it fresh.
              <div className="map-empty-note">
                Nothing landed here, and this map holds no lyrics to re-run against.
                Delete it and paste the song again.
              </div>
            )}
          </div>
        ) : view === 'readings' ? (
          <Readings />
        ) : view === 'grid' ? (
          <ThreadGrid />
        ) : view === 'arc' ? (
          <ArcView />
        ) : (
          <Target doc={doc} />
        )
      ) : corpusOpen ? (
        <Corpus onBack={() => setCorpusOpen(false)} />
      ) : (
        <Home onCorpus={() => setCorpusOpen(true)} />
      )}
    </div>
  );
}
