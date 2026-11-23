import { describe, expect, test } from "vitest";
import {
	createScroller,
	easeInOut,
	FOLLOW_FRACTION,
	followTop,
	SCROLL_MS,
} from "../../src/app/follow";

describe("followTop (F10-S04 AC1, AC3, AC10)", () => {
	// A 768 px screen, a 60 px header and a 100 px bar leave 608 px: a third is about 203.
	const screen = { viewport: 768, header: 60, bar: 100, maxScroll: 2000 };

	test("a middle line sits a third of the way down the space", () => {
		const top = followTop({ ...screen, rowTop: 1000 });
		expect(top).toBeCloseTo(1000 - 60 - FOLLOW_FRACTION * 608, 6);
	});

	test("the first line is clamped to the page's top", () => {
		expect(followTop({ ...screen, rowTop: 80 })).toBe(0);
	});

	test("the last line is clamped to the page's end", () => {
		expect(followTop({ ...screen, rowTop: 5000 })).toBe(2000);
	});

	test("a song that fits does not scroll", () => {
		expect(followTop({ ...screen, rowTop: 300, maxScroll: 0 })).toBe(0);
		expect(followTop({ ...screen, rowTop: 300, maxScroll: -5 })).toBe(0);
	});
});

describe("easeInOut", () => {
	test("runs from 0 to 1, slow at both ends", () => {
		expect(easeInOut(0)).toBe(0);
		expect(easeInOut(1)).toBe(1);
		expect(easeInOut(0.5)).toBe(0.5);
		expect(easeInOut(0.1)).toBeLessThan(0.1);
		expect(easeInOut(0.9)).toBeGreaterThan(0.9);
	});
});

describe("createScroller (F10-S04)", () => {
	function fake(start = 0) {
		let y = start;
		let time = 0;
		let next = 1;
		const frames = new Map<number, () => void>();
		const moves: number[] = [];
		const scroller = createScroller({
			scrollY: () => y,
			scrollTo: (top) => {
				y = top;
				moves.push(top);
			},
			now: () => time,
			frame: (callback) => {
				frames.set(next, callback);
				return next++;
			},
			cancelFrame: (handle) => {
				frames.delete(handle);
			},
		});
		/** Advance the clock by `ms` and run the pending frame. */
		const tick = (ms: number) => {
			time += ms;
			const pending = [...frames.entries()];
			frames.clear();
			for (const [, callback] of pending) callback();
		};
		return { scroller, tick, moves, frames, y: () => y };
	}

	test("a smooth scroll reaches its target at SCROLL_MS", () => {
		const f = fake(0);
		f.scroller.to(1000, true);
		expect(f.moves).toEqual([]);
		f.tick(SCROLL_MS / 2);
		expect(f.y()).toBeCloseTo(500, 6);
		f.tick(SCROLL_MS / 2);
		expect(f.y()).toBe(1000);
		expect(f.frames.size).toBe(0);
	});

	test("a restart mid-tween starts from where the page is", () => {
		const f = fake(0);
		f.scroller.to(1000, true);
		f.tick(SCROLL_MS / 2);
		const mid = f.y();
		f.scroller.to(0, true);
		f.tick(SCROLL_MS / 2);
		expect(f.y()).toBeCloseTo(mid / 2, 6);
		f.tick(SCROLL_MS / 2);
		expect(f.y()).toBe(0);
	});

	test("a jump cancels a tween and moves at once", () => {
		const f = fake(0);
		f.scroller.to(1000, true);
		f.tick(100);
		f.scroller.to(300, false);
		expect(f.y()).toBe(300);
		expect(f.frames.size).toBe(0);
		f.tick(1000);
		expect(f.y()).toBe(300);
	});

	test("a target equal to the position does nothing", () => {
		const f = fake(200);
		f.scroller.to(200, true);
		f.scroller.to(200, false);
		expect(f.moves).toEqual([]);
		expect(f.frames.size).toBe(0);
	});

	test("dispose stops a tween where it is", () => {
		const f = fake(0);
		f.scroller.to(1000, true);
		f.tick(100);
		const at = f.y();
		f.scroller.dispose();
		f.tick(1000);
		expect(f.y()).toBe(at);
	});
});
