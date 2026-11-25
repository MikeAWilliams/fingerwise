import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import drillSource from "../../src/core/drill/index.ts?raw";
import { loadInstrument } from "../../src/core/instrument";
import {
	centsFrom,
	createToneTracker,
	createToneWatch,
	DEFAULT_THRESHOLDS,
	frequencyBand,
	gradeTone,
	judge,
	nearestPitch,
	passesChecks,
	type Reading,
	SINGLE_NOTE_PASS_SHARE,
	type StabilityOptions,
	TONE_END_SILENCE_MS,
	type ToneEvent,
} from "../../src/core/judge";
import judgeSource from "../../src/core/judge/index.ts?raw";
import {
	formatPitch,
	type Pitch,
	parsePitch,
	toFrequency,
} from "../../src/core/pitch";

const instrument = loadInstrument(alto);
const STEP = 16.7;

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

/** `hz` shifted by `cents`. */
function shift(hz: number, cents: number): number {
	return hz * 2 ** (cents / 1200);
}

function tone(time: number, frequency: number | null): Reading {
	return { time, frequency, clarity: 0.98, level: -30 };
}

/** One reading per frame from `from`, with frequencies from `freq(i)`. */
function frames(
	from: number,
	count: number,
	freq: (i: number) => number | null,
	extra: Partial<Reading> = {},
): Reading[] {
	return Array.from({ length: count }, (_, i) => ({
		...tone(from + i * STEP, freq(i)),
		...extra,
	}));
}

const WITH_BAND: StabilityOptions = {
	...DEFAULT_THRESHOLDS,
	band: frequencyBand(instrument),
};

/** Resets at 0 and pushes every reading; returns the non-null results with the reading's time. */
function run(
	readings: Reading[],
	options: StabilityOptions = WITH_BAND,
): { time: number; hz: number }[] {
	const tracker = createToneTracker(options);
	tracker.reset(0);
	const out: { time: number; hz: number }[] = [];
	for (const r of readings) {
		const hz = tracker.push(r);
		if (hz !== null) out.push({ time: r.time, hz });
	}
	return out;
}

const HOLD = DEFAULT_THRESHOLDS.holdOffMs;
const A4 = toFrequency(pitch("A4"));

describe("nearestPitch (AC1)", () => {
	test("A4 440 Hz is A4 and 0 cents", () => {
		const { pitch: p, cents } = nearestPitch(440);
		expect(formatPitch(p)).toBe("A4");
		expect(cents).toBeCloseTo(0, 9);
	});

	test("equal-tempered values are exact", () => {
		for (const name of ["A3", "C4", "C♯5", "F6", "F7"]) {
			const { pitch: p, cents } = nearestPitch(toFrequency(pitch(name)));
			expect(formatPitch(p)).toBe(name);
			expect(cents).toBeCloseTo(0, 9);
		}
	});

	test("offsets stay within ±50 and round to the nearer pitch", () => {
		const c5 = toFrequency(pitch("C5"));
		expect(nearestPitch(shift(c5, 23))).toMatchObject({ pitch: pitch("C5") });
		expect(nearestPitch(shift(c5, 23)).cents).toBeCloseTo(23, 9);
		expect(nearestPitch(shift(c5, 49.9)).pitch).toBe(pitch("C5"));
		expect(nearestPitch(shift(c5, 50.1)).pitch).toBe(pitch("C♯5"));
		expect(nearestPitch(shift(c5, 50.1)).cents).toBeCloseTo(-49.9, 9);
		expect(nearestPitch(shift(c5, -49.9)).pitch).toBe(pitch("C5"));
		expect(nearestPitch(shift(c5, -50.1)).pitch).toBe(pitch("B4"));
		for (let c = -50; c <= 50; c += 2.5) {
			const { cents } = nearestPitch(shift(c5, c));
			expect(Math.abs(cents)).toBeLessThanOrEqual(50 + 1e-9);
		}
	});
});

describe("centsFrom (AC2)", () => {
	test("midway between C5 and C♯5 is +50 from C5 and -50 from C♯5", () => {
		const midway = Math.sqrt(
			toFrequency(pitch("C5")) * toFrequency(pitch("C♯5")),
		);
		expect(centsFrom(midway, pitch("C5"))).toBeCloseTo(50, 9);
		expect(centsFrom(midway, pitch("C♯5"))).toBeCloseTo(-50, 9);
	});

	test("an octave is 1200 cents", () => {
		expect(centsFrom(880, pitch("A4"))).toBeCloseTo(1200, 9);
		expect(centsFrom(220, pitch("A4"))).toBeCloseTo(-1200, 9);
	});
});

describe("judge (AC3)", () => {
	const a4 = pitch("A4");

	test("in tune is correct", () => {
		expect(judge(a4, 440, 40)).toBe("correct");
	});

	test("the tolerance is inclusive", () => {
		expect(judge(a4, shift(440, 40), 40)).toBe("correct");
		expect(judge(a4, shift(440, -40), 40)).toBe("correct");
		expect(judge(a4, shift(440, 40.01), 40)).toBe("incorrect");
		expect(judge(a4, shift(440, -40.01), 40)).toBe("incorrect");
		expect(judge(a4, shift(440, 10), 10)).toBe("correct");
		expect(judge(a4, shift(440, 10.01), 10)).toBe("incorrect");
	});

	test("a neighbouring semitone is incorrect", () => {
		expect(judge(a4, toFrequency(pitch("A♯4")), 45)).toBe("incorrect");
	});

	test("an octave up or down is incorrect whatever the name", () => {
		expect(judge(a4, 880, 45)).toBe("incorrect");
		expect(judge(a4, 220, 45)).toBe("incorrect");
		expect(judge(a4, shift(880, 5), 45)).toBe("incorrect");
	});
});

describe("frequencyBand (AC8)", () => {
	test("alto C runs from 220 Hz to about 2793.8 Hz", () => {
		const band = frequencyBand(instrument);
		expect(band.minHz).toBeCloseTo(220, 9);
		expect(band.maxHz).toBeCloseTo(2793.83, 2);
	});

	test("an octave error still falls inside the band", () => {
		const band = frequencyBand(instrument);
		const lowestSounding = toFrequency(pitch("A4"));
		const highestSounding = toFrequency(pitch("F6"));
		expect(lowestSounding / 2).toBeGreaterThanOrEqual(band.minHz - 1e-9);
		expect(highestSounding * 2).toBeLessThanOrEqual(band.maxHz + 1e-9);
	});
});

describe("DEFAULT_THRESHOLDS (AC7)", () => {
	test("match the detector spike", () => {
		expect(DEFAULT_THRESHOLDS).toEqual({
			band: null,
			clarity: 0.9,
			gateDb: -55,
			spreadCents: 25,
			settleMs: 200,
			holdOffMs: 500,
		});
	});
});

describe("createToneTracker (AC4)", () => {
	test("a steady tone is reported once, after the settle time", () => {
		const out = run(frames(HOLD, 40, () => A4));
		expect(out).toHaveLength(1);
		expect(out[0]?.hz).toBeCloseTo(A4, 9);
		expect(out[0]?.time).toBeGreaterThanOrEqual(HOLD + 200);
		expect(out[0]?.time).toBeLessThan(HOLD + 200 + STEP);
	});

	test("a wobble within 25 cents is reported at the median", () => {
		const wobble = [-10, 5, 12, -8, 0, 10, -12, 3];
		const out = run(
			frames(HOLD, 40, (i) => shift(A4, wobble[i % wobble.length] as number)),
		);
		expect(out).toHaveLength(1);
		expect(Math.abs(centsFrom(out[0]?.hz as number, pitch("A4")))).toBeLessThan(
			5,
		);
	});

	test("readings that jump around report nothing", () => {
		const out = run(frames(HOLD, 60, (i) => shift(A4, i % 2 === 0 ? 0 : 30)));
		expect(out).toEqual([]);
	});

	test("a jump to another note restarts the settle time", () => {
		const c5 = toFrequency(pitch("C5"));
		const out = run(frames(HOLD, 60, (i) => (i < 8 ? A4 : c5)));
		expect(out).toHaveLength(1);
		expect(out[0]?.hz).toBeCloseTo(c5, 9);
		expect(out[0]?.time).toBeGreaterThanOrEqual(HOLD + 8 * STEP + 200);
	});

	test("a slow breath glide gives no verdict until it settles", () => {
		// Rises 300 cents a second from -100 cents, then holds at the note.
		const glideFrames = 20;
		const glide = (i: number) =>
			i < glideFrames ? -100 + (300 * i * STEP) / 1000 : 0;
		const out = run(frames(HOLD, 60, (i) => shift(A4, glide(i))));
		expect(out).toHaveLength(1);
		expect(out[0]?.time).toBeGreaterThanOrEqual(HOLD + glideFrames * STEP);
		expect(Math.abs(centsFrom(out[0]?.hz as number, pitch("A4")))).toBeLessThan(
			5,
		);
	});

	test("a rough start then a steady tone is judged at the steady pitch", () => {
		const rough = [null, 300, 620, 410, 1200, null];
		const readings = [
			...frames(HOLD, rough.length, (i) => rough[i] as number | null, {
				clarity: 0.6,
			}),
			...frames(HOLD + rough.length * STEP, 30, () => A4),
		];
		const out = run(readings);
		expect(out).toHaveLength(1);
		expect(out[0]?.hz).toBeCloseTo(A4, 9);
	});

	test("silence reports nothing", () => {
		const out = run(
			frames(HOLD, 60, () => null, { clarity: 0, level: -Infinity }),
		);
		expect(out).toEqual([]);
	});

	test("low clarity reports nothing", () => {
		expect(run(frames(HOLD, 60, () => A4, { clarity: 0.89 }))).toEqual([]);
	});

	test("clarity exactly at the threshold counts", () => {
		expect(run(frames(HOLD, 60, () => A4, { clarity: 0.9 }))).toHaveLength(1);
	});

	test("low level reports nothing", () => {
		expect(run(frames(HOLD, 60, () => A4, { level: -55.1 }))).toEqual([]);
	});

	test("level exactly at the gate counts", () => {
		expect(run(frames(HOLD, 60, () => A4, { level: -55 }))).toHaveLength(1);
	});

	test("a 50 Hz hum at clarity 1 is outside the band", () => {
		expect(run(frames(HOLD, 60, () => 50, { clarity: 1 }))).toEqual([]);
	});

	test("readings above the band report nothing", () => {
		expect(run(frames(HOLD, 60, () => 3000))).toEqual([]);
	});

	test("an octave error inside the band is reported", () => {
		const out = run(frames(HOLD, 40, () => 220));
		expect(out).toHaveLength(1);
		expect(judge(pitch("A4"), out[0]?.hz as number, 45)).toBe("incorrect");
	});

	test("a failing reading clears the run", () => {
		const readings = frames(HOLD, 40, () => A4).map((r, i) =>
			i === 10 ? { ...r, clarity: 0.2 } : r,
		);
		const out = run(readings);
		expect(out).toHaveLength(1);
		expect(out[0]?.time).toBeGreaterThanOrEqual(HOLD + 11 * STEP + 200);
	});

	test("without a band every frequency counts", () => {
		const out = run(
			frames(HOLD, 40, () => 50),
			DEFAULT_THRESHOLDS,
		);
		expect(out).toHaveLength(1);
	});
});

describe("createToneTracker (AC5)", () => {
	test("a second tone after the first is not reported", () => {
		const b4 = toFrequency(pitch("B4"));
		const out = run(frames(HOLD, 80, (i) => (i < 30 ? A4 : b4)));
		expect(out).toHaveLength(1);
		expect(out[0]?.hz).toBeCloseTo(A4, 9);
	});

	test("reset allows a new report", () => {
		const tracker = createToneTracker(WITH_BAND);
		tracker.reset(0);
		const first = frames(HOLD, 30, () => A4)
			.map((r) => tracker.push(r))
			.filter((hz) => hz !== null);
		expect(first).toHaveLength(1);
		tracker.reset(2000);
		const second = frames(2000 + HOLD, 30, () => A4)
			.map((r) => tracker.push(r))
			.filter((hz) => hz !== null);
		expect(second).toHaveLength(1);
	});

	test("before the first reset nothing is reported", () => {
		const tracker = createToneTracker(WITH_BAND);
		const out = frames(HOLD, 60, () => A4)
			.map((r) => tracker.push(r))
			.filter((hz) => hz !== null);
		expect(out).toEqual([]);
	});
});

describe("createToneTracker (AC6)", () => {
	test("readings inside the hold-off are ignored", () => {
		const out = run(frames(0, Math.floor(HOLD / STEP), () => A4));
		expect(out).toEqual([]);
	});

	test("a tone already sounding is judged once the hold-off ends", () => {
		const out = run(frames(0, 60, () => A4));
		expect(out).toHaveLength(1);
		expect(out[0]?.time).toBeGreaterThanOrEqual(HOLD + 200);
	});

	test("the hold-off counts from the reset time", () => {
		const tracker = createToneTracker(WITH_BAND);
		tracker.reset(1000);
		const out = frames(1000, 60, () => A4)
			.map((r) => ({ time: r.time, hz: tracker.push(r) }))
			.filter((r) => r.hz !== null);
		expect(out).toHaveLength(1);
		expect(out[0]?.time).toBeGreaterThanOrEqual(1000 + HOLD + 200);
	});
});

describe("custom thresholds (AC7)", () => {
	test("settle time and hold-off are taken from the options", () => {
		const options = { ...WITH_BAND, settleMs: 100, holdOffMs: 0 };
		const out = run(
			frames(0, 30, () => A4),
			options,
		);
		expect(out).toHaveLength(1);
		expect(out[0]?.time).toBeGreaterThanOrEqual(100);
		expect(out[0]?.time).toBeLessThan(100 + STEP);
	});

	test("spread, clarity and gate are taken from the options", () => {
		const jumpy = frames(HOLD, 60, (i) => shift(A4, i % 2 === 0 ? 0 : 30), {
			clarity: 0.8,
			level: -58,
		});
		expect(run(jumpy)).toEqual([]);
		expect(
			run(jumpy, { ...WITH_BAND, spreadCents: 35, clarity: 0.75, gateDb: -60 }),
		).toHaveLength(1);
	});
});

describe("passesChecks (F09-S02)", () => {
	test("needs a frequency, clarity, level and the band, each at its threshold", () => {
		const ok = tone(0, A4);
		expect(passesChecks(ok, WITH_BAND)).toBe(true);
		expect(passesChecks({ ...ok, frequency: null }, WITH_BAND)).toBe(false);
		expect(passesChecks({ ...ok, clarity: 0.9 }, WITH_BAND)).toBe(true);
		expect(passesChecks({ ...ok, clarity: 0.89 }, WITH_BAND)).toBe(false);
		expect(passesChecks({ ...ok, level: -55 }, WITH_BAND)).toBe(true);
		expect(passesChecks({ ...ok, level: -56 }, WITH_BAND)).toBe(false);
		expect(passesChecks({ ...ok, frequency: 50 }, WITH_BAND)).toBe(false);
		expect(passesChecks({ ...ok, frequency: 50 }, DEFAULT_THRESHOLDS)).toBe(
			true,
		);
	});
});

describe("gradeTone (F16-S03 AC4, AC5, AC6, AC10)", () => {
	const A4_PITCH = pitch("A4");
	const TOL = 40;
	const LENGTH = 4000;
	const grade = (readings: Reading[], lengthMs = LENGTH) =>
		gradeTone(readings, {
			expected: A4_PITCH,
			toleranceCents: TOL,
			lengthMs,
			checks: WITH_BAND,
		});
	/** `ms` of readings every 10 ms at `hz`, from `from`. */
	const hold = (from: number, ms: number, hz: number | null) =>
		Array.from({ length: Math.round(ms / 10) }, (_, i) =>
			tone(from + i * 10, hz),
		);
	/** The silence after a tone, as the watch would end it. */
	const quiet = (from: number) => hold(from, 200, null);

	test("a full correct tone passes", () => {
		expect(grade([...hold(0, 4000, A4), ...quiet(4000)])).toBe("passed");
	});

	test("exactly 75% of the length within passes, just under does not", () => {
		const exact = [...hold(0, 3000, A4), ...quiet(3000)];
		expect(SINGLE_NOTE_PASS_SHARE).toBe(0.75);
		expect(grade(exact)).toBe("passed");
		expect(grade([...hold(0, 2990, A4), ...quiet(2990)])).toBe("too-short");
	});

	test("a short right tone is too short", () => {
		expect(grade([...hold(0, 1000, A4), ...quiet(1000)])).toBe("too-short");
	});

	test("a mostly wrong tone is wrong", () => {
		const wrong = shift(A4, 200);
		expect(grade([...hold(0, 3000, wrong), ...quiet(3000)])).toBe("wrong");
		expect(
			grade([...hold(0, 2000, wrong), ...hold(2000, 1000, A4), ...quiet(3000)]),
		).toBe("wrong");
	});

	test("a scoop into the right note passes once enough is within", () => {
		const scoop = [
			...hold(0, 500, shift(A4, -200)),
			...hold(500, 3500, A4),
			...quiet(4000),
		];
		expect(grade(scoop)).toBe("passed");
	});

	test("right notes out of tune beyond the tolerance are wrong", () => {
		expect(grade([...hold(0, 4000, shift(A4, 45)), ...quiet(4000)])).toBe(
			"wrong",
		);
		expect(grade([...hold(0, 4000, shift(A4, 39)), ...quiet(4000)])).toBe(
			"passed",
		);
	});

	test("a tone longer than the note passes with no extra rule", () => {
		expect(grade([...hold(0, 9000, A4), ...quiet(9000)])).toBe("passed");
	});

	test("readings that fail the checks are not sounding time", () => {
		const noisy = [
			...hold(0, 2000, A4),
			...hold(2000, 1000, null),
			...hold(3000, 1000, A4),
			...quiet(4000),
		];
		expect(grade(noisy)).toBe("passed");
		expect(grade(noisy, 8000)).toBe("too-short");
	});

	test("no sounding time is wrong", () => {
		expect(grade(hold(0, 1000, null))).toBe("wrong");
		expect(grade([])).toBe("wrong");
	});
});

describe("createToneWatch (F16-S03 AC3)", () => {
	const watch = () => {
		const w = createToneWatch(WITH_BAND);
		w.reset(0);
		return w;
	};
	/** A watch that has heard the silence before the player starts. */
	const armedWatch = () => {
		const w = watch();
		for (let t = 0; t < HOLD; t += 10) w.push(tone(t, null));
		return w;
	};
	/** Pushes readings and collects the events. */
	function feed(w: ReturnType<typeof createToneWatch>, readings: Reading[]) {
		const events: { time: number; event: ToneEvent }[] = [];
		for (const r of readings) {
			const event = w.push(r);
			if (event) events.push({ time: r.time, event });
		}
		return events;
	}
	const hold = (from: number, ms: number, hz: number | null) =>
		Array.from({ length: Math.round(ms / 10) }, (_, i) =>
			tone(from + i * 10, hz),
		);

	test("the end constant is exported", () => {
		expect(TONE_END_SILENCE_MS).toBeGreaterThan(0);
	});

	test("the hold-off ignores readings, so a tone starts after it plus the settle time", () => {
		const w = watch();
		const events = feed(w, [...hold(0, 100, null), ...hold(100, 1500, A4)]);
		expect(events).toHaveLength(1);
		const first = events[0];
		expect(first?.event.kind).toBe("start");
		if (first?.event.kind === "start") {
			expect(first.event.startMs).toBeGreaterThanOrEqual(HOLD);
		}
		expect(first?.time).toBeGreaterThanOrEqual(HOLD + 200);
	});

	test("a sound held from before the reset is not a tone until it stops and starts again", () => {
		const w = watch();
		expect(feed(w, hold(0, 2000, A4))).toEqual([]);
		expect(w.tone()).toBeNull();
		const events = feed(w, [...hold(2000, 50, null), ...hold(2050, 600, A4)]);
		expect(events.map((e) => e.event.kind)).toEqual(["start"]);
	});

	test("silence during the hold-off arms it", () => {
		const w = watch();
		const events = feed(w, [...hold(0, 300, null), ...hold(300, 1500, A4)]);
		expect(events.map((e) => e.event.kind)).toEqual(["start"]);
		// The tone's start is after the hold-off, not at the first sounding reading.
		expect(
			(events[0]?.event as { startMs: number } | undefined)?.startMs ?? 0,
		).toBeGreaterThanOrEqual(HOLD);
	});

	test("a blip shorter than the settle time is not a tone and reports nothing", () => {
		const w = watch();
		const events = feed(w, [
			...hold(HOLD, 150, A4),
			...hold(HOLD + 150, 400, null),
		]);
		expect(events).toEqual([]);
		expect(w.tone()).toBeNull();
	});

	test("a pitch change inside one tone does not end it", () => {
		const w = armedWatch();
		const events = feed(w, [
			...hold(HOLD, 1000, A4),
			...hold(HOLD + 1000, 1000, shift(A4, 300)),
		]);
		expect(events.map((e) => e.event.kind)).toEqual(["start"]);
		expect(w.tone()?.readings.length).toBe(200);
	});

	test("a dropout shorter than the end constant does not end it", () => {
		const w = armedWatch();
		const events = feed(w, [
			...hold(HOLD, 1000, A4),
			...hold(HOLD + 1000, 100, null),
			...hold(HOLD + 1100, 1000, A4),
		]);
		expect(events.map((e) => e.event.kind)).toEqual(["start"]);
		expect(w.tone()).not.toBeNull();
	});

	test("silence for the end constant ends it with all its readings", () => {
		const w = armedWatch();
		const readings = [...hold(HOLD, 1000, A4), ...hold(HOLD + 1000, 300, null)];
		const events = feed(w, readings);
		expect(events.map((e) => e.event.kind)).toEqual(["start", "end"]);
		const end = events[1];
		expect(end?.time).toBeGreaterThanOrEqual(HOLD + 1000 + TONE_END_SILENCE_MS);
		if (end?.event.kind === "end") {
			expect(end.event.readings[0]?.time).toBe(HOLD);
			expect(end.event.readings.length).toBeGreaterThan(100);
		}
		expect(w.tone()).toBeNull();
	});

	test("after an end a new tone can start, with no new hold-off", () => {
		const w = armedWatch();
		const events = feed(w, [
			...hold(HOLD, 1000, A4),
			...hold(HOLD + 1000, 300, null),
			...hold(HOLD + 1300, 1000, A4),
			...hold(HOLD + 2300, 300, null),
		]);
		expect(events.map((e) => e.event.kind)).toEqual([
			"start",
			"end",
			"start",
			"end",
		]);
	});

	test("reset applies the hold-off again and drops a tone in progress", () => {
		const w = armedWatch();
		feed(w, hold(HOLD, 1000, A4));
		expect(w.tone()).not.toBeNull();
		w.reset(5000);
		expect(w.tone()).toBeNull();
		expect(feed(w, hold(5000, 400, A4))).toEqual([]);
	});

	test("readings before a reset report nothing", () => {
		const w = createToneWatch(WITH_BAND);
		expect(feed(w, hold(HOLD, 1000, A4))).toEqual([]);
	});

	test("tone() gives the start and the readings so far", () => {
		const w = armedWatch();
		feed(w, hold(HOLD, 600, A4));
		const t = w.tone();
		expect(t?.startMs).toBe(HOLD);
		expect(t?.readings[0]?.time).toBe(HOLD);
	});
});

describe("layering (AC9)", () => {
	test("judge imports exactly ../pitch and ../instrument", () => {
		const specifiers = [...judgeSource.matchAll(/from\s+["']([^"']+)["']/g)]
			.map((m) => m[1])
			.sort();
		expect(specifiers).toEqual(["../instrument", "../pitch"]);
	});

	test("the drill does not import the judge", () => {
		expect(drillSource).not.toMatch(/from\s+["'][^"']*judge/);
	});

	test("the judge reads no clock and starts no timer", () => {
		for (const name of ["Date", "performance", "setTimeout", "setInterval"]) {
			expect(new RegExp(`\\b${name}\\b`).test(judgeSource), name).toBe(false);
		}
	});
});
