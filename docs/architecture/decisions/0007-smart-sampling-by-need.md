# 0007: Smart sampling by need score, from judge grades only

- **Status:** accepted
- **Date:** 2026-11-14

## Context
Feature 6 replaces the uniform draw of random cards with one that favours the notes the player knows least ([F06 design](../../features/06-smart-sampling/design.md)). The vision named Leitner boxes and SM-2 as candidates and left open the card unit, grades with judging off, the `none` verdict, new cards and misses ([vision](../../vision/vision.md#feature-order)). The user decided these in a planning session on 2026-11-14.

The drill is rapid-fire: a card every few seconds, often over a hundred in a sitting, from a pool of 15 to 30 pitches. Day-scale due dates, the core of Leitner and SM-2 as usually run, would leave nothing due within minutes. The judge is also noisy as a grader: it hears pitch, not fingering, and breath wobble or a quiet start can give a false miss.

## Decision
- **No due dates.** Each pitch has a **need** score in [0, 1]. Random cards are drawn with probability proportional to `max(need, FLOOR)`, still never the previous pitch (unless the pool is one pitch).
- **Update rule:** an exponential moving average of misses. After a grade, `need = need + ALPHA * (target - need)`, with `target` 1 for a miss and 0 for a correct answer. A pitch never graded has need 1, so new pitches are drawn most often.
- **Constants:** `ALPHA` 0.3 and `FLOOR` 0.05 to start. They are code constants, not settings, and may be retuned after a live check without a new ADR.
- **Grades come from the judge only.** With judging off there are no grades and no weighting. `correct` is correct; `incorrect` and `none` are misses, whether `none` came from the reveal delay running out or from a tap. A card whose microphone stream was not running at its reveal (`opening`, `locked`, `unavailable`) is not graded. Response time is not used.
- **Only random cards.** Song cards are neither drawn by need nor graded.
- **Only while on.** Grades are recorded only while the smart sampling setting is on and applies; with it off nothing is stored.
- **Card unit:** one written pitch on one instrument. Scores are kept per pitch whatever the range: the range only filters which pitches are drawn, so narrowing and widening it lose nothing. Scores are keyed by instrument, so another instrument has its own.
- **Storage:** `localStorage`, under its own key, separate from the settings. Saved after every grade. A reset button clears the current instrument's scores.
- **Layering:** the need rule and the weighted draw are pure code in `src/core` with injected randomness; they know pitches and grades, never the judge, clef, staff, audio or UI.

## Alternatives considered
- **Leitner boxes (by date, or as draw weights):** simple, but a miss drops a card to box 1, so one false miss from the judge wipes out a well-known card. As dates it also has the nothing-due problem.
- **SM-2:** per-card ease and intervals tuned for day-scale review; more parameters and the same nothing-due problem.
- **Self-grade buttons with judging off:** works without a microphone, but adds a step that fights hands-free auto-advance. Rejected by the user for now.
- **Implicit grades from tapping early:** no new UI, but it rewards impatient taps and cannot tell "knew it" from "moving on".
- **Clearing scores on range change:** simpler, but punishes trying out the range pickers; a reset button covers the wish for a clean slate.
- **Recording grades while the setting is off:** a warm start when it is turned on, but stores data the player did not ask for and cannot see.

## Consequences
- A cold start: every pitch begins at need 1, so the first minutes look uniform until grades accumulate.
- A noisy judge feeds the scores. The moving average limits the damage of one false miss (a pitch at 0.08 rises to about 0.36), but a judge that misreads a pitch consistently will keep it frequent.
- Without a microphone, or with judging off, the feature does nothing.
- Stored data now includes per-pitch scores, which [data-formats](../data-formats.md#storage) must describe once built. They are derived from verdicts; no audio is ever stored.
