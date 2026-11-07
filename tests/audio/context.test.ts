import { describe, expect, test } from "vitest";
import { createAudio } from "../../src/audio/context";
import { FakeContext } from "./fake-audio";

function counted(ctx: FakeContext) {
	const factory = { calls: 0, create: () => (factory.calls++, ctx) };
	return factory;
}

describe("createAudio", () => {
	test("creates nothing until asked, and only once", () => {
		const ctx = new FakeContext();
		const f = counted(ctx);
		const audio = createAudio(f.create);
		expect(f.calls).toBe(0);
		expect(audio.context()).toBe(ctx);
		expect(audio.context()).toBe(ctx);
		audio.unlock();
		expect(f.calls).toBe(1);
	});

	test("unlock() creates the context", () => {
		const f = counted(new FakeContext());
		createAudio(f.create).unlock();
		expect(f.calls).toBe(1);
	});

	test("a null factory gives no context and unlock does nothing", () => {
		const audio = createAudio(null);
		expect(audio.context()).toBeNull();
		expect(() => audio.unlock()).not.toThrow();
		expect(audio.unlockRequested).toBe(true);
	});

	test("a throwing factory gives null and is not retried", () => {
		let calls = 0;
		const audio = createAudio(() => {
			calls++;
			throw new Error("no audio");
		});
		expect(audio.context()).toBeNull();
		expect(audio.context()).toBeNull();
		expect(() => audio.unlock()).not.toThrow();
		expect(calls).toBe(1);
	});
});

describe("unlock", () => {
	test("is not requested until unlock() is called", () => {
		const audio = createAudio(() => new FakeContext());
		audio.context();
		expect(audio.unlockRequested).toBe(false);
		audio.unlock();
		expect(audio.unlockRequested).toBe(true);
	});

	test("resumes a suspended context", () => {
		const ctx = new FakeContext();
		ctx.state = "suspended";
		createAudio(() => ctx).unlock();
		expect(ctx.resumeCalls).toBe(1);
	});

	test("does nothing to a running context", () => {
		const ctx = new FakeContext();
		createAudio(() => ctx).unlock();
		expect(ctx.resumeCalls).toBe(0);
	});

	test("a throwing resume never escapes", () => {
		const ctx = new FakeContext();
		ctx.state = "suspended";
		ctx.resumeFails = "throw";
		expect(() => createAudio(() => ctx).unlock()).not.toThrow();
	});

	test("a rejecting resume never escapes", async () => {
		const ctx = new FakeContext();
		ctx.state = "suspended";
		ctx.resumeFails = "reject";
		createAudio(() => ctx).unlock();
		// An unhandled rejection would fail the run once the tick passes.
		await new Promise((r) => setTimeout(r, 0));
		expect(ctx.resumeCalls).toBe(1);
	});
});
