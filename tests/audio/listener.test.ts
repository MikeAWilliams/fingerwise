import { describe, expect, test } from "vitest";
import { createAudio, type StreamLike } from "../../src/audio/context";
import {
	createListener,
	type ListenerEnv,
	MIC_CONSTRAINTS,
	type MicConstraints,
	type PitchReading,
	WINDOW_SIZE,
} from "../../src/audio/listener";
import { createTonePlayer } from "../../src/audio/tone";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import { FakeContext } from "./fake-audio";

class FakeTrack {
	stops = 0;
	stop() {
		this.stops++;
	}
}

class FakeStream implements StreamLike {
	tracks = [new FakeTrack()];
	getTracks() {
		return this.tracks;
	}
}

/** Frames run only when the test calls `tick`. */
class FakeEnv implements ListenerEnv {
	requests: MicConstraints[] = [];
	streams: FakeStream[] = [];
	frames = new Map<number, (time: number) => void>();
	cancelled: number[] = [];
	nextId = 1;
	/** What the next `getUserMedia` does. */
	behavior: "grant" | { reject: unknown } | "throw" | "defer" = "grant";
	deferred: {
		resolve: (s: FakeStream) => void;
		reject: (e: unknown) => void;
	}[] = [];
	getUserMedia: ListenerEnv["getUserMedia"] = (constraints) => {
		this.requests.push(constraints);
		const behavior = this.behavior;
		if (behavior === "throw") throw new Error("getUserMedia threw");
		if (behavior === "defer") {
			return new Promise<StreamLike>((resolve, reject) => {
				this.deferred.push({
					resolve: (s) => resolve(s),
					reject,
				});
			});
		}
		if (behavior !== "grant") return Promise.reject(behavior.reject);
		const stream = new FakeStream();
		this.streams.push(stream);
		return Promise.resolve(stream);
	};
	requestFrame(callback: (time: number) => void): number {
		const id = this.nextId++;
		this.frames.set(id, callback);
		return id;
	}
	cancelFrame(id: number): void {
		this.cancelled.push(id);
		this.frames.delete(id);
	}
	/** Runs every pending frame callback once at `time`. */
	tick(time: number) {
		const due = [...this.frames.values()];
		this.frames.clear();
		for (const cb of due) cb(time);
	}
}

function sine(hz: number, rate = 48000): Float32Array {
	const out = new Float32Array(WINDOW_SIZE);
	for (let i = 0; i < out.length; i++)
		out[i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / rate);
	return out;
}

function domError(name: string): Error {
	const e = new Error(name);
	e.name = name;
	return e;
}

function setup(state = "running") {
	const ctx = new FakeContext();
	ctx.state = state;
	const audio = createAudio(() => ctx);
	const env = new FakeEnv();
	const listener = createListener(audio, env);
	const readings: PitchReading[] = [];
	const onReading = (r: PitchReading) => readings.push(r);
	return { ctx, audio, env, listener, readings, onReading };
}

describe("start (AC1)", () => {
	test("requests the microphone with the browser's processing off", async () => {
		const { env, listener, onReading } = setup();
		expect(await listener.start(onReading)).toEqual({ status: "running" });
		expect(env.requests).toEqual([MIC_CONSTRAINTS]);
		expect(MIC_CONSTRAINTS.audio).toEqual({
			echoCancellation: false,
			noiseSuppression: false,
			autoGainControl: false,
		});
	});

	test("routes the stream into a 2048-sample analyser, never to the speakers", async () => {
		const { ctx, env, listener, onReading } = setup();
		await listener.start(onReading);
		expect(ctx.sources).toHaveLength(1);
		expect(ctx.sources[0]?.stream).toBe(env.streams[0]);
		expect(ctx.analysers).toHaveLength(1);
		expect(ctx.analysers[0]?.fftSize).toBe(2048);
		expect(ctx.sources[0]?.connected).toEqual([ctx.analysers[0]]);
		expect(ctx.sources[0]?.connected).not.toContain(ctx.destination);
	});

	test("calls onReading once per frame with time, frequency, clarity and level", async () => {
		const { ctx, env, listener, readings, onReading } = setup();
		ctx.samples = [sine(440)];
		await listener.start(onReading);
		env.tick(100);
		env.tick(116.7);
		expect(readings).toHaveLength(2);
		expect(readings.map((r) => r.time)).toEqual([100, 116.7]);
		const r = readings[0] as PitchReading;
		expect(
			Math.abs(1200 * Math.log2((r.frequency as number) / 440)),
		).toBeLessThan(10);
		expect(r.clarity).toBeGreaterThan(0.9);
		expect(r.level).toBeCloseTo(20 * Math.log10(0.5 / Math.SQRT2), 1);
		expect(ctx.analysers[0]?.reads).toBe(2);
	});

	test("silence gives readings with no frequency", async () => {
		const { env, listener, readings, onReading } = setup();
		await listener.start(onReading);
		env.tick(0);
		expect(readings[0]).toEqual({
			time: 0,
			frequency: null,
			clarity: 0,
			level: Number.NEGATIVE_INFINITY,
		});
	});

	test("a throwing onReading is swallowed and the loop continues", async () => {
		const { env, listener } = setup();
		let calls = 0;
		await listener.start(() => {
			calls++;
			throw new Error("consumer failed");
		});
		env.tick(0);
		env.tick(16);
		expect(calls).toBe(2);
	});

	test("an onReading that stops the listener ends the loop", async () => {
		const { env, listener } = setup();
		let calls = 0;
		await listener.start(() => {
			calls++;
			listener.stop();
		});
		env.tick(0);
		env.tick(16);
		expect(calls).toBe(1);
		expect(env.frames.size).toBe(0);
	});
});

describe("unavailable (AC2)", () => {
	test.each([
		["NotAllowedError", "denied"],
		["SecurityError", "denied"],
		["NotFoundError", "no-device"],
		["OverconstrainedError", "no-device"],
		["NotReadableError", "no-device"],
		["AbortError", "unsupported"],
	])("%s gives %s", async (name, reason) => {
		const { env, listener, onReading } = setup();
		env.behavior = { reject: domError(name) };
		expect(await listener.start(onReading)).toEqual({
			status: "unavailable",
			reason,
		});
		expect(env.frames.size).toBe(0);
	});

	test("a rejection that is not an error gives unsupported", async () => {
		const { env, listener, onReading } = setup();
		env.behavior = { reject: null };
		expect(await listener.start(onReading)).toEqual({
			status: "unavailable",
			reason: "unsupported",
		});
	});

	test("a throwing getUserMedia gives unsupported", async () => {
		const { env, listener, onReading } = setup();
		env.behavior = "throw";
		expect(await listener.start(onReading)).toEqual({
			status: "unavailable",
			reason: "unsupported",
		});
	});

	test("no getUserMedia gives unsupported without a request", async () => {
		const { audio, env, onReading } = setup();
		env.getUserMedia = null;
		const listener = createListener(audio, env);
		expect(await listener.start(onReading)).toEqual({
			status: "unavailable",
			reason: "unsupported",
		});
	});

	test("no audio context gives unsupported without a request", async () => {
		const env = new FakeEnv();
		const listener = createListener(createAudio(null), env);
		expect(await listener.start(() => {})).toEqual({
			status: "unavailable",
			reason: "unsupported",
		});
		expect(env.requests).toEqual([]);
	});

	test("failing node creation releases the stream and gives unsupported", async () => {
		const { ctx, env, listener, onReading } = setup();
		ctx.createAnalyser = () => {
			throw new Error("no analyser");
		};
		expect(await listener.start(onReading)).toEqual({
			status: "unavailable",
			reason: "unsupported",
		});
		expect(env.streams[0]?.tracks[0]?.stops).toBe(1);
	});

	test("a later start tries again", async () => {
		const { env, listener, onReading } = setup();
		env.behavior = { reject: domError("NotAllowedError") };
		await listener.start(onReading);
		env.behavior = "grant";
		expect(await listener.start(onReading)).toEqual({ status: "running" });
		expect(env.requests).toHaveLength(2);
	});
});

describe("locked (AC3)", () => {
	test("a locked context gives locked and does not request the microphone", async () => {
		const { env, listener, onReading } = setup("suspended");
		expect(await listener.start(onReading)).toEqual({ status: "locked" });
		expect(env.requests).toEqual([]);
	});

	test("after unlock, a context still resuming proceeds", async () => {
		const { audio, env, listener, onReading } = setup("suspended");
		audio.unlock();
		expect(await listener.start(onReading)).toEqual({ status: "running" });
		expect(env.requests).toHaveLength(1);
	});

	test("locked then unlocked starts on the next call", async () => {
		const { audio, env, listener, onReading } = setup("suspended");
		await listener.start(onReading);
		audio.unlock();
		expect(await listener.start(onReading)).toEqual({ status: "running" });
		expect(env.requests).toHaveLength(1);
	});
});

describe("stop (AC4, AC6)", () => {
	test("stops readings and releases every track", async () => {
		const { ctx, env, listener, readings, onReading } = setup();
		await listener.start(onReading);
		const stream = env.streams[0] as FakeStream;
		stream.tracks.push(new FakeTrack());
		env.tick(0);
		listener.stop();
		env.tick(16);
		expect(readings).toHaveLength(1);
		expect(stream.tracks.map((t) => t.stops)).toEqual([1, 1]);
		expect(ctx.sources[0]?.disconnected).toBe(1);
		expect(ctx.analysers[0]?.disconnected).toBe(1);
		expect(env.cancelled).toHaveLength(1);
		expect(env.frames.size).toBe(0);
	});

	test("stop when not running does nothing, and stopping twice is safe", async () => {
		const { env, listener, onReading } = setup();
		listener.stop();
		await listener.start(onReading);
		listener.stop();
		listener.stop();
		expect(env.streams[0]?.tracks[0]?.stops).toBe(1);
	});

	test("a start after stop requests the microphone again", async () => {
		const { env, listener, readings, onReading } = setup();
		await listener.start(onReading);
		listener.stop();
		expect(await listener.start(onReading)).toEqual({ status: "running" });
		expect(env.requests).toHaveLength(2);
		env.tick(5);
		expect(readings).toHaveLength(1);
	});

	test("a stop during an in-flight start releases the stream when it arrives", async () => {
		const { ctx, env, listener, readings, onReading } = setup();
		env.behavior = "defer";
		const result = listener.start(onReading);
		listener.stop();
		const stream = new FakeStream();
		env.deferred[0]?.resolve(stream);
		expect((await result).status).not.toBe("running");
		expect(stream.tracks[0]?.stops).toBe(1);
		expect(ctx.sources).toHaveLength(0);
		env.tick(0);
		expect(readings).toEqual([]);
	});
});

describe("one stream (AC5)", () => {
	test("a start while running returns the same result, one stream and one loop", async () => {
		const { env, listener, readings, onReading } = setup();
		const first = listener.start(onReading);
		await first;
		const second = listener.start(onReading);
		expect(second).toBe(first);
		expect(env.requests).toHaveLength(1);
		env.tick(0);
		expect(readings).toHaveLength(1);
	});

	test("a start while one is in flight shares it", async () => {
		const { env, listener, readings, onReading } = setup();
		env.behavior = "defer";
		const first = listener.start(onReading);
		const second = listener.start(onReading);
		expect(second).toBe(first);
		env.deferred[0]?.resolve(new FakeStream());
		expect(await second).toEqual({ status: "running" });
		expect(env.requests).toHaveLength(1);
		env.tick(0);
		expect(readings).toHaveLength(1);
	});

	test("the latest onReading receives the readings", async () => {
		const { env, listener } = setup();
		const a: PitchReading[] = [];
		const b: PitchReading[] = [];
		await listener.start((r) => a.push(r));
		await listener.start((r) => b.push(r));
		env.tick(0);
		expect(a).toEqual([]);
		expect(b).toHaveLength(1);
	});
});

describe("shared audio (AC9)", () => {
	test("the listener and the tone player use one context", async () => {
		let created = 0;
		const ctx = new FakeContext();
		ctx.state = "suspended";
		const audio = createAudio(() => {
			created++;
			return ctx;
		});
		const player = createTonePlayer(audio);
		const env = new FakeEnv();
		const listener = createListener(audio, env);
		expect(await listener.start(() => {})).toEqual({ status: "locked" });
		player.unlock();
		expect(await listener.start(() => {})).toEqual({ status: "running" });
		player.play(parsePitch("A4") as Pitch, 1);
		expect(created).toBe(1);
		expect(ctx.oscillators).toHaveLength(1);
		expect(ctx.analysers).toHaveLength(1);
	});
});
