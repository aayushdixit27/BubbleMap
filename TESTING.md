# End-to-end dogfood script

**Run this in one sitting, in order, on two songs you haven't mapped.** Roughly
forty minutes.

Its purpose is not to find bugs in features — those have been verified in isolation.
It is to exercise the **seams**: the places where one feature hands off to another
and nobody has ever watched the handoff.

**Before you start: hard-reload the tab.** `Cmd+Shift+R`. A module-level constant
change does not reliably survive HMR — that trap hid the descent ceiling for nine
songs (D54) and manufactured a phantom clipping bug (D57 item 2). Any test run on a
warm tab is worthless.

**Report impressions, not measurements.** *This reads cramped, I couldn't tell what
was clickable, I lost my place* — those are the findings only you can produce.
Numbers come from the DOM, via the implementer. See `CLAUDE.md`.

---

## Pass 1 — Cold start

Land on the library. Start a song from the question.

- Does the compose surface feel like a place to paste, or a form to fill?
- **During generation:** does the page ever go silent? Is the lyric sheet readable
  while you wait? Does the counter move?
- Does it reach **12**? (Not 10 — that means a stale bundle.)
- **Rejections:** is the count zero? If not, open it. A `citation unverified` flag
  or two is normal; five is a signal.

## Pass 2 — Read and judge

Read the readings top to bottom. Do not skim — this is the product.

- Do the RAW notes make you flinch anywhere? That's the gate, and it never expires.
- Kill one descent. Then undo it.
- **Watch the seam:** does the Target lose a dot and get it back? Does the Grid
  update? Does anything jump under you?

## Pass 3 — Go deeper

Highlight a phrase inside a RAW note. Use *explain this*.

- Does the answer leave you somewhere to push, or does it close the question?
- Highlight inside the answer and dig again. Does the second dig go deeper, or
  restate?
- Dismiss it. Does anything persist that shouldn't?

## Pass 4 — Four views, one song

The test is whether each answers a question the others cannot.

- **Target** — sweep the dots without clicking. Can you read the raw layer by hover
  alone? Where did this song land?
- **Grid** — find a lyric cited more than once. Can you trace what it spawned?
- **Readings** — one descent, start to finish.
- **Arc** — build one on the descent that hit hardest. Does the safe beat read as
  genuine relief? Do the two raw beats differ, or is the second just louder?

## Pass 5 — One song ahead (never used in anger)

While still reading song one, start song two from `next song`.

- Does song one stay exactly where it was?
- Does the chip count as song two generates?
- Open song two early. Does it fill in front of you, or arrive pre-loaded?
- Can you start a third? (You should not be able to.)

## Pass 6 — Persistence and recovery

- Reload **mid-run**. What survives? Does anything claim a state that isn't true?
- Judge something, then reload immediately. Is your judgment there?
- Start typing a song, navigate away, come back. Is the draft intact?

## Pass 7 — The corpus

- After the arc: did the library line change to the arc's RAW?
- Is it in full ink now rather than dim?
- Open the corpus wall. Is the new line there? Did the *N of M dug* counter move?
- Read the wall top to bottom. **Does the shape still hold?** (`PRODUCT §7`)

---

## What to bring back

Impressions, in this order of value:

1. **Anywhere you hesitated.** Not what was broken — where you had to think about
   what to do next. Every question mark is the finding (Krug).
2. **Anything that surprised you** about your own behaviour. Which view you actually
   reached for. Whether you killed anything. Whether you built an arc unprompted.
3. **Anything that lied.** A message claiming a state that wasn't true.
4. Only then: things that looked wrong.

**A pass that finds nothing is a real result**, not a wasted forty minutes — but
check first that you ran it cold and read rather than skimmed.
