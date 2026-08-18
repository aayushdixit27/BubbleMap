# Phase 0 probe — full chain, one song, lyrics-grounded

Mr. Brightside — The Killers. Model `claude-opus-5`, run 18 Aug 2026 (UTC).
Grounded in `probe-runs/lyrics/Mr. Brightside Lyrics.md` (1,551 chars).
Chain: `seed` → `descend` × 3 REAL → `interrogate` × 3 REAL → `relink`.
8 calls. Full record, including verbatim model output per call, in
`probe-runs/mr-brightside.json`.

Facts only; the RAW read is a human judgment and is not made here. The
superseded six-song seed-only summary is in git history (commit `6dda483`).

## Bubble counts per verb per tier

| verb | safe | real | raw | total |
|---|---|---|---|---|
| seed | 6 | 3 | 0 | 9 |
| descend (3 calls) | 0 | 0 | 9 | 9 |
| interrogate (3 calls) | 0 | 2 | 18 | 20 |
| **map total** | **6** | **5** | **27** | **38** |

Accepted links: 79 (refines 20, assumes 32, contradicts 21, evidence 6).
Cross-category: 17 of 38 bubbles differ in category from their parent; 9
accepted `refines` links cross categories.

Per-verb category counts: seed — love 3, fitness 3, identity 2, earnings 1.
descend — identity 5, love 3, fitness 1. interrogate — identity 7, love 6,
fitness 6, earnings 1.

## What tier interrogate assigned its assumption bubbles

Of the 20 bubbles interrogate produced, 19 were attached to the map by an
`assumes` link (1 by an `evidence` link). Tier the model chose:

| tier | assumption bubbles |
|---|---|
| raw | 18 |
| real | 2 |
| safe | 0 |

## Rejections (21 total), with raw model output

interrogate 1, relink 20. By reason: duplicate `(source, target, kind)` 16,
`refines` not strictly deeper 5.

All 16 duplicates were relink re-proposing links that already existed on the
map (relink's §7 input is bubbles only — it never saw the existing links).

- **interrogate** (focus: He supplies the cab, the smoke, the dress himself and calls it torture) — link refines must go strictly deeper:
  ```json
  {"source":"a1","target":"pTUGJxWNGKUEWKfuU6Eul","kind":"refines","rationale":"If he could stop and doesn't, the reason is the one he will not say aloud: the sickness is the strongest thing his body has produced in months."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"XrC1b4slWRJuP9Oum3kur","target":"yMQP5APGBvS3o5fxqQsWz","kind":"refines","rationale":"What looks like wanting her is closer to not being able to be the man she walked past, which moves the wound from love into identity."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"23d5uKTzt_KTqiiBVp6iG","target":"GP5ZCymDy4JfDvhJZE9eE","kind":"refines","rationale":"Shrinking the event is only necessary because the event is all he has; the refrain is measuring the entire relationship, not minimising a wound."}
  ```
- **relink** — link refines must go strictly deeper:
  ```json
  {"source":"dfKLDLpqiOcGzBSECUMiI","target":"WRXIsAfIVZWIYWl5UHZuy","kind":"refines","rationale":"The invented claim is not sentimental — it is load-bearing, because without it he was a Tuesday she has already forgotten."}
  ```
- **relink** — link refines must go strictly deeper:
  ```json
  {"source":"WRXIsAfIVZWIYWl5UHZuy","target":"GOD-JvABdibc3EIlG0a2y","kind":"refines","rationale":"Needing that kiss to have made him something admits the ledger behind it is empty enough for one kiss to be the largest entry."}
  ```
- **relink** — link refines must go strictly deeper:
  ```json
  {"source":"GOD-JvABdibc3EIlG0a2y","target":"tZipt8Whs2wp9j8vIB05H","kind":"refines","rationale":"The empty ledger gets specific in the earnings column: no room where he is picked, so one woman's evening was allowed to issue his rating."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"HoR9wXOG_nayqQwNjt6bX","target":"7Xtqp8Ffz3evWk04gPpID","kind":"refines","rationale":"The scene does not arrive from outside — he supplies every prop in it, which turns an affliction into an authorship."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"7Xtqp8Ffz3evWk04gPpID","target":"xc5FjfSc3lxbLbfQIwyap","kind":"refines","rationale":"Naming himself the director raises the question of why the camera always chooses the dress, and the honest answer is that some of him is enjoying this."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"7Xtqp8Ffz3evWk04gPpID","target":"ixXqdIhR-q9JlTiBPaG1G","kind":"assumes","rationale":"Calling it torture only holds if no part of him goes back to that bedroom for its own sake."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"xc5FjfSc3lxbLbfQIwyap","target":"ixXqdIhR-q9JlTiBPaG1G","kind":"contradicts","rationale":"If he looks forward to the dress, then at 3am he is visiting rather than suffering, and the word torture was doing cover work."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"7Xtqp8Ffz3evWk04gPpID","target":"_8TyKdA6sc-tiHPvcyRXp","kind":"assumes","rationale":"He can only grieve his own footage if he treats the staging he invented as reliable news about her."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"_8TyKdA6sc-tiHPvcyRXp","target":"fctcqIQW3pQ3KzFJ-2s2p","kind":"evidence","rationale":"The conjunction in it's all in my head, but she's touching his chest is the exact half-second where the confession is overruled and filming resumes."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"uw2LtxbkJLtte7HcnK-O4","target":"JTujTDqzMJIxiJWVIpqYP","kind":"contradicts","rationale":"Blocking out the man's evening shot by shot shows the loss was the slot, not the person standing in it."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"yMQP5APGBvS3o5fxqQsWz","target":"uw2LtxbkJLtte7HcnK-O4","kind":"refines","rationale":"The ranking obsession resolves into wanting his position rather than her, which is why the man is filmed and she is furniture."}
  ```
- **relink** — link refines must go strictly deeper:
  ```json
  {"source":"2JBitpIjktzexoXSpwiZi","target":"rRlLelQLd-dN6sS2G3pvH","kind":"refines","rationale":"He keeps the rival's advantage unnamed because a vague deficit is a condition he suffers and a specific one is a task he skipped."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"yMQP5APGBvS3o5fxqQsWz","target":"tyFt-ZgbEbxDgo2JIUgZ4","kind":"assumes","rationale":"Being the kind of man who loses her requires her to have held both men in mind and chosen, which he has never verified."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"yMQP5APGBvS3o5fxqQsWz","target":"C4-J1AGPM-h50jD6PPBnn","kind":"assumes","rationale":"One night becomes a kind of man only if he converts a single Tuesday result into a permanent category and moves in."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"yMQP5APGBvS3o5fxqQsWz","target":"4xxWninoaTbGjpKbpOwTt","kind":"assumes","rationale":"The grievance assumes winning would have been restful, when the ranking machine is his own and she was only its occasion."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"GP5ZCymDy4JfDvhJZE9eE","target":"0eaem78vSy3hsX2tOcfHN","kind":"assumes","rationale":"Grieving requires the night to have been jointly held, otherwise there is no ending, only a man keeping a receipt."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"GP5ZCymDy4JfDvhJZE9eE","target":"xUFzUuNWyM4bIcDePgB8K","kind":"assumes","rationale":"The whole mourning frame depends on this being grief rather than an appetite he simply never voiced."}
  ```
- **relink** — link duplicate (source, target, kind):
  ```json
  {"source":"GP5ZCymDy4JfDvhJZE9eE","target":"AxX5eZGlWaoVdSBuXx2IO","kind":"refines","rationale":"The relationship she never entered is one he never asked her to enter, which makes betrayal the flattering account of his own silence."}
  ```

## Contract deviations (§7)

- **seed** — 6 SAFE (contract 4–6 ✓), 3 REAL (2–3 ✓). Proposed 1 `contradicts`
  link; the contract lists `refines` links only.
- **descend** — 3 bubbles per call, all one tier deeper (REAL→RAW) ✓; each call
  produced exactly 3 `refines` sourced at the focus ✓. Beyond contract: 4
  `assumes` and 2 `contradicts` links (contract lists `refines` from the focus
  only).
- **interrogate** — 6, 8, and 6 bubbles per call vs the contract's 3–5: **all
  three calls exceeded the range.** Beyond contract kinds: 4 `evidence` links
  and 1 `refines` (rejected as upward). 2 of the 21 accepted `assumes` links
  are not sourced at the focus bubble.
- **relink** — 0 new bubbles ✓. Proposed 42 links (19 refines, 14 assumes, 6
  contradicts, 3 evidence); 22 accepted, 20 rejected as above. 16 of the 42
  duplicated links already on the map.

## Tokens and time per call

| call | focus | in | out | wall-clock |
|---|---|---|---|---|
| seed | — | 2,234 | 2,836 | 38.7s |
| descend | One kiss, and he has been grieving… | 2,435 | 2,128 | 32.1s |
| descend | He supplies the cab, the smoke… | 2,463 | 2,228 | 36.0s |
| descend | Losing her mostly means being… | 2,430 | 2,498 | 38.2s |
| interrogate | One kiss, and he has been grieving… | 4,532 | 5,099 | 75.6s |
| interrogate | He supplies the cab, the smoke… | 5,272 | 7,240 | 106.8s |
| interrogate | Losing her mostly means being… | 6,347 | 5,091 | 80.6s |
| relink | — | 6,487 | 9,270 | 129.7s |
| **total** | | **32,200** | **36,390** | **537.6s (9.0 min)** |

Output tokens include adaptive-thinking tokens.
