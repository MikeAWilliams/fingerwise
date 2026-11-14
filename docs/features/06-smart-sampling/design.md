# F06: Smart sampling

- **Status:** designed

## Goal

With judging on, the player can turn on "Use smart sampling", and random cards then come up more often for the notes they keep missing and less often for the notes they know. The app learns this from the judge's verdicts as the player drills, and keeps it between visits. The rules are in [ADR 0007](../../architecture/decisions/0007-smart-sampling-by-need.md).

## Behavior

**The setting** (in the Cards section, saved with the other settings)
- A "Use smart sampling" checkbox, default off. Its label says nothing about how it works.
- Disabled, with its value kept, while judging is off, with a line under it: "Needs Judge my playing". Disabled likewise while use song is on, with the same line the range controls show for a song in use.
- A "Reset progress" button under it. It asks for confirmation ("Reset progress? This can't be undone."); on confirm, every pitch of the current instrument becomes unseen again. It works whether or not the checkbox is on or enabled.

**When it applies:** smart sampling is on, judging is on and use song is off. Otherwise cards are drawn exactly as before this feature, and nothing is recorded.

**Drawing:** each pitch has a **need** from 0 to 1. A pitch never graded has need 1. The next random card is drawn from the pool with weight `max(need, 0.05)`, never the same pitch twice in a row (unless the pool is one pitch), as in F01. Draws stay weighted while the microphone stream is opening, locked or unavailable; only grading stops.

**Grading:** each card that reveals while the microphone stream is running updates its pitch's need:
- `correct`: need moves 30% of the way towards 0.
- `incorrect` or `none` (nothing heard by the reveal delay, or a tap before a tone): need moves 30% of the way towards 1.
- A card revealed while the stream was opening, locked or unavailable is not graded.

So a pitch answered right four times in a row falls from 1 to about 0.24, then to the floor with more; one miss on a well-known pitch lifts it to about 0.36, and repeated misses bring it back near 1.

**Range:** scores are kept for every pitch of the instrument, whatever the range. Changing the bounds or the sharps setting only changes which pitches can be drawn. Pitches newly in the pool start at need 1 (or whatever they had before), and pitches left out keep their scores for later.

**Persistence:** the scores are saved after every grade, separately from the settings, and per instrument. With storage blocked or failing, they live only for that page load. Stored scores that are unreadable or invalid are dropped (whole store or the bad entries) and the pitch counts as unseen; loading never fails.

**Nothing else is shown.** There is no progress display, count of learned notes or per-note view.

## Out of scope

- Due dates, intervals or "done for today".
- Grades with judging off (self-grade buttons or implicit grades).
- Song cards: they keep tune order and do not feed the scores ([F07](../07-song-practice/design.md) waiting is untouched).
- Any display of progress.
- Response time as a signal, an adaptive reveal delay.
- Export, import or sync of progress.
- Settings for the update rate or floor.

## Modules touched

- `src/core/progress` (new, pure): need scores per pitch, the update rule and its constants, reset, and conversion to and from a stored JSON shape with validation. Takes a plain grade (correct or miss), not the judge's types. Imports only `pitch` (and `instrument` if needed).
- `src/core/drill`: a weighted draw over the pool with an injected random source and a weight per pitch, alongside `drawPitch`, keeping the no-repeat rule. Does not import `progress`; the caller passes the weights.
- `src/core/settings`: a `smartSampling` boolean, default `false`, validated like the other booleans; data saved before it gets the default.
- `src/app` (`card-flow.ts`, `App.tsx`): a random pitch source that draws by need; the flow reports each graded reveal so the app can update and save the scores. Grades only while the setting applies and the stream is running.
- `src/app` (`Settings.tsx`, `settings-form.ts`): the checkbox with its disabled reasons, the reset button with confirmation; the Cards summary line may mention smart sampling.
- `src/app` (storage): load and save the scores under their own key, injected storage, never throwing, like `settings-store.ts`.

The judge, audio, staff, tab, song and abc modules are untouched.

## Data

- **Setting:** `smartSampling` (boolean) in `data/settings/defaults.json` (`false`) and in the stored settings.
- **Stored progress:** a new `localStorage` key holding need scores by instrument, then by written pitch name, for example `{ "<instrument name>": { "C5": 0.24, "D5": 1 } }`. The exact key and shape are settled in the breakdown and recorded in [data-formats](../../architecture/data-formats.md#storage) when built. Values are finite numbers in [0, 1]; anything else is dropped.

## Risks and open questions

- **Tuning:** 0.3 and 0.05 are starting values; adjust them in the live check (ADR 0007 allows it).
- **False misses:** the judge hears pitch, not fingering. A pitch the judge misreads every time stays frequent. The live check should watch for one.
- **Two hard notes:** with only two high-need pitches, the no-repeat rule makes them alternate. Expected, and a sign the weighting works; check it does not feel stuck.
- **Cold start:** the first few minutes look uniform.

## Stories

- F06-S01: Need scores and weighted draw
- F06-S02: Smart sampling setting
- F06-S03: Progress storage
- F06-S04: Cards drawn by need
- F06-S05: Reset progress
