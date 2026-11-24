import { describe, expect, test } from "vitest";
import { createAudio } from "../../src/audio/context";
import {
	createTonePlayer,
	createToneScheduler,
	FADE_SECONDS,
	PEAK_GAIN,
} from "../../src/audio/tone";
import { type Pitch, parsePitch, toFrequency } from "../../src/core/pitch";
import { FakeContext } from "./fake-audio";

const A4 = parsePitch("A4") as Pitch;
const C5 = parsePitch("C5") as Pitch;

function setup(state = "running") {
	const ctx = new FakeContext();
	ctx.state = state;
	const audio = createAudio(() => ctx);
	return { ctx, audio, player: createTonePlayer(audio) };
}

describe("play", () => {
	test("starts one sine oscillator at the pitch's frequency through a gain", () => {
		const { ctx, player } = setup();
		player.play(C5, 1.5);
		expect(ctx.oscillators).toHaveLength(1);
		const osc = ctx.oscillators[0];
		expect(osc?.type).toBe("sine");
		expect(osc?.frequency.value).toBeCloseTo(toFrequency(C5), 10);
		expect(osc?.connected).toEqual([ctx.gains[0]]);
		expect(ctx.gains[0]?.connected).toEqual([ctx.destination]);
	});

	test("fades in, holds and fades out to the requested duration", () => {
		const { ctx, player } = setup();
		ctx.currentTime = 10;
		player.play(A4, 1.5);
		expect(ctx.gains[0]?.gain.calls).toEqual([
			{ kind: "set", value: 0, time: 10 },
			{ kind: "ramp", value: PEAK_GAIN, time: 10 + FADE_SECONDS },
			{ kind: "set", value: PEAK_GAIN, time: 10 + 1.5 - FADE_SECONDS },
			{ kind: "ramp", value: 0, time: 11.5 },
		]);
		expect(ctx.oscillators[0]?.starts).toEqual([10]);
		expect(ctx.oscillators[0]?.stops).toEqual([11.5]);
	});

	test("a very short duration still gives non-decreasing times", () => {
		const { ctx, player } = setup();
		player.play(A4, 0.01);
		const times = (ctx.gains[0]?.gain.calls ?? []).map((c) => c.time);
		expect(times).toHaveLength(4);
		for (let i = 1; i < times.length; i++) {
			expect(times[i] as number).toBeGreaterThanOrEqual(times[i - 1] as number);
		}
		expect(ctx.oscillators[0]?.stops).toEqual([0.01]);
	});

	test("a second play stops the first before creating new nodes", () => {
		const { ctx, player } = setup();
		player.play(A4, 1.5);
		ctx.currentTime = 0.5;
		player.play(C5, 1.5);
		expect(ctx.oscillators).toHaveLength(2);
		const first = ctx.oscillators[0];
		expect(first?.stops).toEqual([1.5, 0.5 + FADE_SECONDS]);
		expect(ctx.gains[0]?.gain.calls.at(-1)).toEqual({
			kind: "ramp",
			value: 0,
			time: 0.5 + FADE_SECONDS,
		});
	});
});

describe("stop", () => {
	test("fades out quickly and stops the oscillator", () => {
		const { ctx, player } = setup();
		player.play(A4, 1.5);
		ctx.currentTime = 0.5;
		const gain = ctx.gains[0];
		const before = gain?.gain.calls.length ?? 0;
		player.stop();
		expect(gain?.gain.calls.slice(before)).toEqual([
			{ kind: "cancel", time: 0.5 },
			{ kind: "set", value: gain?.gain.value, time: 0.5 },
			{ kind: "ramp", value: 0, time: 0.5 + FADE_SECONDS },
		]);
		expect(ctx.oscillators[0]?.stops.at(-1)).toBe(0.5 + FADE_SECONDS);
	});

	test("a second stop and a stop before any play do nothing", () => {
		const { ctx, player } = setup();
		player.stop();
		player.play(A4, 1);
		player.stop();
		const calls = ctx.gains[0]?.gain.calls.length;
		const stops = ctx.oscillators[0]?.stops.length;
		player.stop();
		expect(ctx.gains[0]?.gain.calls).toHaveLength(calls as number);
		expect(ctx.oscillators[0]?.stops).toHaveLength(stops as number);
	});

	test("a tone that ended by itself is not stopped again", () => {
		const { ctx, player } = setup();
		player.play(A4, 1);
		ctx.oscillators[0]?.onended?.();
		const stops = ctx.oscillators[0]?.stops.length;
		player.stop();
		expect(ctx.oscillators[0]?.stops).toHaveLength(stops as number);
	});
});

describe("locked context", () => {
	test("nothing is played or queued before unlock()", () => {
		const { ctx, player } = setup("suspended");
		player.play(A4, 1);
		expect(ctx.oscillators).toHaveLength(0);
		expect(ctx.gains).toHaveLength(0);
	});

	test("after unlock() a still-suspended context gets the tone scheduled", () => {
		const { ctx, player } = setup("suspended");
		player.unlock();
		expect(ctx.resumeCalls).toBe(1);
		player.play(A4, 1);
		expect(ctx.oscillators).toHaveLength(1);
		expect(ctx.oscillators[0]?.starts).toEqual([0]);
	});
});

describe("failures", () => {
	test("no Web Audio support never throws", () => {
		const player = createTonePlayer(createAudio(null));
		expect(() => {
			player.unlock();
			player.play(A4, 1);
			player.stop();
		}).not.toThrow();
	});

	test("a context whose createOscillator throws never throws", () => {
		const { ctx, player } = setup();
		ctx.createFails = true;
		expect(() => {
			player.play(A4, 1);
			player.stop();
		}).not.toThrow();
		expect(ctx.gains).toHaveLength(0);
	});

	test("a throwing resume never escapes from unlock()", () => {
		const { ctx, player } = setup("suspended");
		ctx.resumeFails = "throw";
		expect(() => player.unlock()).not.toThrow();
	});
});

describe("createToneScheduler (F13-S01)", () => {
	function scheduler(state = "running") {
		const ctx = new FakeContext();
		ctx.state = state;
		const audio = createAudio(() => ctx);
		return {
			ctx,
			audio,
			sched: createToneScheduler(audio),
			player: createTonePlayer(audio),
		};
	}

	test("each tone is a sine at its frequency, started and stopped at its times with its own envelope (AC8)", () => {
		const { ctx, sched } = scheduler();
		sched.schedule(A4, 1, 0.45);
		sched.schedule(C5, 1.5, 0.45);
		sched.schedule(A4, 2, 0.5);
		expect(ctx.oscillators).toHaveLength(3);
		expect(ctx.oscillators.map((o) => o.type)).toEqual([
			"sine",
			"sine",
			"sine",
		]);
		expect(ctx.oscillators.map((o) => o.frequency.value)).toEqual([
			toFrequency(A4),
			toFrequency(C5),
			toFrequency(A4),
		]);
		expect(ctx.oscillators.map((o) => o.starts)).toEqual([[1], [1.5], [2]]);
		expect(ctx.oscillators.map((o) => o.stops)).toEqual([
			[1.45],
			[1.95],
			[2.5],
		]);
		expect(ctx.gains[1]?.gain.calls).toEqual([
			{ kind: "set", value: 0, time: 1.5 },
			{ kind: "ramp", value: PEAK_GAIN, time: 1.5 + FADE_SECONDS },
			{ kind: "set", value: PEAK_GAIN, time: 1.5 + 0.45 - FADE_SECONDS },
			{ kind: "ramp", value: 0, time: 1.5 + 0.45 },
		]);
	});

	test("two tones that touch at a slur are both scheduled and neither stops the other (AC8)", () => {
		const { ctx, sched } = scheduler();
		sched.schedule(A4, 1, 0.5);
		sched.schedule(C5, 1.5, 0.5);
		expect(ctx.oscillators).toHaveLength(2);
		expect(ctx.oscillators[0]?.stops).toEqual([1.5]);
		expect(ctx.oscillators[1]?.stops).toEqual([2]);
		expect(ctx.gains[0]?.gain.calls).toHaveLength(4);
	});

	test("stop() fades a sounding tone, stops a pending one at now, and a second stop does nothing (AC9)", () => {
		const { ctx, sched } = scheduler();
		sched.schedule(A4, 1, 1);
		sched.schedule(C5, 3, 1);
		ctx.currentTime = 1.5;
		const before = ctx.gains[0]?.gain.calls.length ?? 0;
		sched.stop();
		expect(ctx.gains[0]?.gain.calls.slice(before)).toEqual([
			{ kind: "cancel", time: 1.5 },
			{ kind: "set", value: ctx.gains[0]?.gain.value, time: 1.5 },
			{ kind: "ramp", value: 0, time: 1.5 + FADE_SECONDS },
		]);
		expect(ctx.oscillators[0]?.stops.at(-1)).toBe(1.5 + FADE_SECONDS);
		expect(ctx.oscillators[1]?.stops.at(-1)).toBe(1.5);
		expect(ctx.gains[1]?.gain.calls).toHaveLength(4);
		sched.stop();
		expect(ctx.oscillators[0]?.stops).toHaveLength(2);
		expect(ctx.oscillators[1]?.stops).toHaveLength(2);
	});

	test("a tone that ended by itself is not stopped (AC9)", () => {
		const { ctx, sched } = scheduler();
		sched.schedule(A4, 0, 1);
		ctx.oscillators[0]?.onended?.();
		sched.stop();
		expect(ctx.oscillators[0]?.stops).toHaveLength(1);
	});

	test("locked and never unlocked gives no nodes; unlock on a suspended context schedules (AC10)", () => {
		const locked = scheduler("suspended");
		locked.sched.schedule(A4, 1, 1);
		expect(locked.ctx.oscillators).toHaveLength(0);
		expect(locked.ctx.gains).toHaveLength(0);
		locked.audio.unlock();
		locked.sched.schedule(A4, 1, 1);
		expect(locked.ctx.oscillators).toHaveLength(1);
	});

	test("failures never escape (AC10)", () => {
		const none = createToneScheduler(createAudio(null));
		expect(() => {
			none.schedule(A4, 1, 1);
			none.stop();
		}).not.toThrow();
		const { ctx, sched } = scheduler();
		ctx.createFails = true;
		expect(() => sched.schedule(A4, 1, 1)).not.toThrow();
		ctx.createFails = false;
		sched.schedule(A4, 1, 1);
		const osc = ctx.oscillators[0];
		if (!osc) throw new Error("no oscillator");
		osc.stop = () => {
			throw new Error("stop threw");
		};
		expect(() => sched.stop()).not.toThrow();
	});

	test("a player tone survives a scheduler stop, and the reverse", () => {
		const { ctx, sched, player } = scheduler();
		player.play(A4, 1);
		sched.schedule(C5, 0, 1);
		sched.stop();
		expect(ctx.oscillators[0]?.stops).toEqual([1]);
		expect(ctx.oscillators[1]?.stops).toHaveLength(2);
		player.stop();
		const stops = ctx.oscillators[1]?.stops.length;
		sched.schedule(A4, 0, 1);
		player.stop();
		expect(ctx.oscillators[1]?.stops).toHaveLength(stops as number);
		expect(ctx.oscillators[2]?.stops).toEqual([1]);
	});
});
