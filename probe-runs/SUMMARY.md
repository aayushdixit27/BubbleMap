# Phase 0 probe runs — mechanical summary

Six songs, `seed` verb, model `claude-opus-5`, run 17 Aug 2026. Title-only
seeding — no `doc.source` lyrics were provided on any run. Full per-run output,
including the verbatim model tool input, is in `probe-runs/<slug>.json`.

Facts only. The quality judgment (does RAW implicate the narrator; is the
reading true of the song) is a human read and is not made here.

## Category distribution — all six songs

| LIFE quadrant | bubbles | songs touching it |
|---|---|---|
| love | 11 | 5 of 6 (all but Jesus Walks) |
| identity | 11 | 6 of 6 |
| fitness | 10 | 6 of 6 |
| earnings | 9 | 6 of 6 |

| tier | bubbles |
|---|---|
| safe | 25 |
| real | 16 |
| raw | 0 |

Total: 41 accepted-for-proposal bubbles. RAW = 0 on every run: the `seed`
contract (ARCHITECTURE §7) requests SAFE and REAL bubbles only; `seed` does not
ask for RAW.

## Bubble count per song per tier

| song | safe | real | raw | total | links (refines / assumes) |
|---|---|---|---|---|---|
| Mr. Brightside — The Killers | 5 | 3 | 0 | 8 | 5 (3 / 2) |
| Runaway — Kanye West | 5 | 3 | 0 | 8 | 3 (3 / 0) |
| Super Rich Kids — Frank Ocean | 5 | 3 | 0 | 8 | 3 (3 / 0) |
| Landslide — Fleetwood Mac | 5 | 1 | 0 | 6 | 0 |
| Hurt — Johnny Cash | 5 | 3 | 0 | 8 | 4 (3 / 1) |
| Jesus Walks — Kanye West | 0 | 3 | 0 | 3 | 0 |

## Validator rejections

Zero links were rejected across all six runs.

One bubble was rejected (Landslide — Fleetwood Mac), reason
`bubble missing required field`. Raw model output:

```json
{"ref":"r2","tier":"earnings","label":"placeholder","note":""}
```

The `category` field is absent, and the `tier` field holds a category value
(`"earnings"`).

## Tokens and wall-clock per run

| song | input tokens | output tokens | total | wall-clock |
|---|---|---|---|---|
| Mr. Brightside — The Killers | 1,622 | 2,060 | 3,682 | 28.9s |
| Runaway — Kanye West | 1,619 | 2,335 | 3,954 | 36.3s |
| Super Rich Kids — Frank Ocean | 1,625 | 2,272 | 3,897 | 36.0s |
| Landslide — Fleetwood Mac | 1,623 | 2,877 | 4,500 | 38.2s |
| Hurt — Johnny Cash | 1,621 | 2,150 | 3,771 | 31.8s |
| Jesus Walks — Kanye West | 1,622 | 2,223 | 3,845 | 33.0s |
| **total** | **9,732** | **13,917** | **23,649** | **204.2s** |

Output tokens include adaptive-thinking tokens, which is why they exceed the
visible JSON size.

Run note: the first Super Rich Kids attempt failed with an API error —
`invalid_request_error: "Output blocked by content filtering policy"`,
request id `req_011Ce9JFp8yP79d7SqoL5Hcy`. A single retry succeeded; the saved
run and the numbers above are from the retry.
