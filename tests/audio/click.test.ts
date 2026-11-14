import { describe, expect, test } from "vitest";
import {
	CLICK_GAIN,
	CLICK_SECONDS,
	createClicker,
} from "../../src/audio/click";
import { createAudio } from "../../src/audio/context";
import { FakeBufferSource, FakeContext } from "./fake-audio";

function setup(state = "running") {
	const ctx = new FakeContext();
	ctx.state = state;
	const audio = createAudio(() => ctx);
	return { ctx, audio, clicker: createClicker(audio) };
}

describe("click (AC9)", () => {
	test("starts a buffer source, not an oscillator, at the given time", () => {
		const { ctx, clicker } = setup();
		clicker.click(2.5);
		expect(ctx.oscillators).toHaveLength(0);
		expect(ctx.bufferSources).toHaveLength(1);
		const source = ctx.bufferSources[0];
		expect(source?.starts).toEqual([2.5]);
		expect(source?.buffer).toBe(ctx.buffers[0]);
		expect(source?.connected).toEqual([ctx.gains[0]]);
		expect(ctx.gains[0]?.connected).toEqual([ctx.destination]);
		expect(ctx.gains[0]?.gain.value).toBe(CLICK_GAIN);
	});

	test("the burst is short, unpitched noise that dies away", () => {
		const { ctx, clicker } = setup();
		clicker.click(0);
		const buffer = ctx.buffers[0];
		expect(buffer?.length).toBe(Math.round(CLICK_SECONDS * ctx.sampleRate));
		const data = buffer?.data as Float32Array;
		expect(data.some((x) => x !== 0)).toBe(true);
		const head = data.slice(0, 50).reduce((a, x) => a + Math.abs(x), 0);
		const tail = data.slice(-50).reduce((a, x) => a + Math.abs(x), 0);
		expect(head).toBeGreaterThan(tail * 5);
		expect(Math.max(...data.map(Math.abs))).toBeLessThanOrEqual(1);
	});

	test("builds the burst once per context", () => {
		const { ctx, clicker } = setup();
		clicker.click(1);
		clicker.click(2);
		expect(ctx.buffers).toHaveLength(1);
		expect(ctx.bufferSources).toHaveLength(2);
	});

	test("the burst is the same every time", () => {
		const a = setup();
		const b = setup();
		a.clicker.click(0);
		b.clicker.click(0);
		expect(a.ctx.buffers[0]?.data).toEqual(b.ctx.buffers[0]?.data);
	});
});

describe("the lock rule", () => {
	test("a suspended context that was never unlocked gets nothing", () => {
		const { ctx, clicker } = setup("suspended");
		clicker.click(1);
		expect(ctx.bufferSources).toHaveLength(0);
	});

	test("a suspended context after unlock() gets the click", () => {
		const { ctx, audio, clicker } = setup("suspended");
		audio.unlock();
		clicker.click(1);
		expect(ctx.bufferSources).toHaveLength(1);
	});
});

describe("now", () => {
	test("reads the context's clock", () => {
		const { ctx, clicker } = setup();
		ctx.currentTime = 12.5;
		expect(clicker.now()).toBe(12.5);
	});

	test("is null with no context", () => {
		const clicker = createClicker(createAudio(null));
		expect(clicker.now()).toBeNull();
		expect(() => clicker.click(1)).not.toThrow();
		expect(() => clicker.stop()).not.toThrow();
	});
});

describe("stop", () => {
	test("stops every scheduled click", () => {
		const { ctx, clicker } = setup();
		clicker.click(1);
		clicker.click(2);
		clicker.stop();
		for (const source of ctx.bufferSources)
			expect(source.stops).toHaveLength(1);
	});

	test("does not stop clicks that already ended", () => {
		const { ctx, clicker } = setup();
		clicker.click(1);
		clicker.click(2);
		ctx.bufferSources[0]?.onended?.();
		clicker.stop();
		expect(ctx.bufferSources[0]?.stops).toHaveLength(0);
		expect(ctx.bufferSources[1]?.stops).toHaveLength(1);
	});

	test("a second stop does nothing", () => {
		const { ctx, clicker } = setup();
		clicker.click(1);
		clicker.stop();
		clicker.stop();
		expect(ctx.bufferSources[0]?.stops).toHaveLength(1);
	});
});

describe("failures never throw", () => {
	test("creating the buffer or source throws", () => {
		const { ctx, clicker } = setup();
		ctx.bufferFails = true;
		expect(() => clicker.click(1)).not.toThrow();
		expect(ctx.bufferSources).toHaveLength(0);
	});

	test("a source that cannot start or stop", () => {
		const { ctx, clicker } = setup();
		clicker.click(1);
		const source = ctx.bufferSources[0];
		if (!source) throw new Error("no source");
		source.stop = () => {
			throw new Error("stop threw");
		};
		expect(() => clicker.stop()).not.toThrow();
		ctx.createBufferSource = () => {
			const bad = new FakeBufferSource();
			bad.start = () => {
				throw new Error("start threw");
			};
			return bad;
		};
		expect(() => clicker.click(2)).not.toThrow();
		expect(() => clicker.stop()).not.toThrow();
	});

	test("a context whose clock throws gives null", () => {
		const { ctx, clicker } = setup();
		Object.defineProperty(ctx, "currentTime", {
			get() {
				throw new Error("no clock");
			},
		});
		expect(clicker.now()).toBeNull();
	});
});
