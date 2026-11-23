import { describe, expect, test } from "vitest";
import { createSilenceWatch } from "../../src/app/overrun";

describe("createSilenceWatch (F12-S03 AC1)", () => {
	test("no readings is no silence", () => {
		expect(createSilenceWatch().silentMs()).toBe(0);
	});

	test("with no sound at all it counts from the first reading", () => {
		const watch = createSilenceWatch();
		watch.push(-500, false);
		expect(watch.silentMs()).toBe(0);
		watch.push(-480, false);
		watch.push(1000, false);
		expect(watch.silentMs()).toBe(1500);
	});

	test("after sound it counts from the first silent reading to the newest", () => {
		const watch = createSilenceWatch();
		for (let t = 0; t <= 2000; t += 20) watch.push(t, true);
		expect(watch.silentMs()).toBe(0);
		watch.push(2020, false);
		expect(watch.silentMs()).toBe(0);
		watch.push(2520, false);
		expect(watch.silentMs()).toBe(500);
		watch.push(3020, false);
		expect(watch.silentMs()).toBe(1000);
	});

	test("a gap under a second then sound starts over", () => {
		const watch = createSilenceWatch();
		watch.push(0, true);
		watch.push(20, false);
		watch.push(700, false);
		expect(watch.silentMs()).toBe(680);
		watch.push(720, true);
		expect(watch.silentMs()).toBe(0);
		watch.push(740, false);
		watch.push(1240, false);
		expect(watch.silentMs()).toBe(500);
	});
});
