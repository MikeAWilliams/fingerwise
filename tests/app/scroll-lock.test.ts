import { describe, expect, test } from "vitest";
import {
	cardPhase,
	SCROLL_LOCK_CLASS,
	scrollLockApplies,
	setScrollLock,
} from "../../src/app/scroll-lock";
import type { TimedState } from "../../src/app/timed-flow";
import type { Pitch } from "../../src/core/pitch";

const state = (over: Partial<TimedState>): TimedState => ({
	index: 0,
	pitch: 60 as Pitch,
	beats: 1,
	phase: "ready",
	countBeat: null,
	listening: "off",
	origin: null,
	summary: null,
	analysis: null,
	...over,
});

describe("cardPhase (F10-S05 AC1, AC2, AC4, AC5)", () => {
	test("ready is ready", () => {
		expect(cardPhase(state({ phase: "ready", listening: "locked" }))).toBe(
			"ready",
		);
	});

	test("opening the microphone from ready is playing", () => {
		expect(cardPhase(state({ phase: "ready", listening: "opening" }))).toBe(
			"playing",
		);
	});

	test("opening the microphone from the summary is playing", () => {
		expect(cardPhase(state({ phase: "summary", listening: "opening" }))).toBe(
			"playing",
		);
	});

	test("the count-in is playing", () => {
		expect(cardPhase(state({ phase: "count-in", countBeat: 0 }))).toBe(
			"playing",
		);
	});

	test("playing is playing and the summary is the summary", () => {
		expect(cardPhase(state({ phase: "playing" }))).toBe("playing");
		expect(cardPhase(state({ phase: "summary" }))).toBe("summary");
	});
});

describe("scrollLockApplies", () => {
	test("only while playing", () => {
		expect(scrollLockApplies("playing")).toBe(true);
		expect(scrollLockApplies("ready")).toBe(false);
		expect(scrollLockApplies("summary")).toBe(false);
		expect(scrollLockApplies(undefined)).toBe(false);
	});
});

describe("setScrollLock (F10-S05 AC8)", () => {
	function fakeRoot() {
		const classes = new Set<string>();
		return {
			classes,
			classList: {
				toggle(name: string, force: boolean) {
					if (force) classes.add(name);
					else classes.delete(name);
					return force;
				},
			},
		};
	}

	test("puts the class on and lifts it", () => {
		const root = fakeRoot();
		setScrollLock(root, true);
		expect([...root.classes]).toEqual([SCROLL_LOCK_CLASS]);
		setScrollLock(root, false);
		expect(root.classes.size).toBe(0);
	});

	test("putting it on twice, or lifting it twice, is harmless", () => {
		const root = fakeRoot();
		setScrollLock(root, true);
		setScrollLock(root, true);
		expect(root.classes.size).toBe(1);
		setScrollLock(root, false);
		setScrollLock(root, false);
		expect(root.classes.size).toBe(0);
	});
});
