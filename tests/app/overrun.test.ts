import { describe, expect, test } from "vitest";
import { overrunMoreText } from "../../src/app/judge-text";
import {
	createSilenceWatch,
	type OverrunTrace,
	overrunLane,
	overrunTrace,
} from "../../src/app/overrun";
import { type LaneRow, TRACE_THICKNESS, traceY } from "../../src/app/trace";
import { DEFAULT_THRESHOLDS } from "../../src/core/judge";
import { toFrequency } from "../../src/core/pitch";
import { rowMap } from "../../src/render/staff";

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

describe("overrunTrace (F12-S04 AC2, AC4)", () => {
	const checks = DEFAULT_THRESHOLDS;
	const hz = (pitch: number) => toFrequency(pitch as never);
	const reading = (time: number, frequency: number | null, level = -30) => ({
		time,
		frequency,
		clarity: 0.98,
		level,
	});

	test("silence only gives nothing", () => {
		expect(
			overrunTrace([reading(1600, null), reading(1620, null)], checks, 1500),
		).toBeNull();
		expect(overrunTrace([], checks, 1500)).toBeNull();
		// Too quiet to count.
		expect(overrunTrace([reading(1600, hz(60), -90)], checks, 1500)).toBeNull();
	});

	test("a held note then silence: points relative to the start, ending at the next reading", () => {
		const trace = overrunTrace(
			[
				reading(1520, hz(60)),
				reading(1540, hz(60) * 2 ** (20 / 1200)),
				reading(1560, null),
				reading(1580, null),
			],
			checks,
			1500,
		) as OverrunTrace;
		expect(trace.points.map((p) => [p.timeMs, p.endMs])).toEqual([
			[20, 40],
			[40, 60],
		]);
		expect(trace.points[0]?.cents).toBeCloseTo(0, 6);
		expect(trace.points[1]?.cents).toBeCloseTo(20, 6);
		expect(trace.endMs).toBe(60);
	});

	test("a few separate notes keep their gaps", () => {
		const trace = overrunTrace(
			[
				reading(1500, hz(60)),
				reading(1520, null),
				reading(1540, hz(64)),
				reading(1560, null),
			],
			checks,
			1500,
		) as OverrunTrace;
		expect(trace.points.map((p) => p.timeMs)).toEqual([0, 40]);
		expect(trace.endMs).toBe(60);
	});

	test("a sounding reading at the very end ends at its own time", () => {
		const trace = overrunTrace(
			[reading(1520, null), reading(1540, hz(60))],
			checks,
			1500,
		) as OverrunTrace;
		expect(trace.points).toHaveLength(1);
		expect(trace.endMs).toBe(40);
	});
});

describe("overrunLane (F12-S04 AC1 to AC3)", () => {
	// ♩ = 60: 1000 ms a beat. The last row holds beats 4 to 8 at x 100 to 500: 0.1 px per ms.
	const row: LaneRow = {
		from: 4,
		to: 8,
		map: rowMap([
			{ x: 100, beat: 4 },
			{ x: 500, beat: 8 },
		]),
		laneTop: 200,
		laneBottom: 224,
	};
	const trace = (
		points: { timeMs: number; endMs: number; cents: number }[],
		endMs: number,
	): OverrunTrace => ({ points, endMs });
	const lane = (t: OverrunTrace) => overrunLane(row, 260, t, 60, 25);

	test("starts at the row's first x on its scale, under the song, as tall as the row's lane", () => {
		const l = lane(trace([{ timeMs: 0, endMs: 1000, cents: 0 }], 1000));
		expect(l.x0).toBe(100);
		expect(l.x1).toBe(200);
		expect(l.top).toBeGreaterThan(260);
		expect(l.bottom - l.top).toBe(24);
		expect(l.labelY).toBeGreaterThan(260);
		expect(l.labelY).toBeLessThan(l.top);
		expect(l.extraHeight).toBeGreaterThan(l.bottom - 260);
		expect(l.more).toBeNull();
	});

	test("each point is a thick line at its offset's height and colour", () => {
		const l = lane(
			trace(
				[
					{ timeMs: 0, endMs: 500, cents: 0 },
					{ timeMs: 500, endMs: 1000, cents: 40 },
					{ timeMs: 1000, endMs: 1500, cents: -100 },
				],
				1500,
			),
		);
		const rect = (x0: number, x1: number, cents: number) => {
			const mid = traceY(cents, l.top, l.bottom);
			const y0 = Math.round((mid - TRACE_THICKNESS / 2) * 10) / 10;
			const y1 = Math.round((mid + TRACE_THICKNESS / 2) * 10) / 10;
			return `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
		};
		expect(l.paths.green).toBe(rect(100, 150, 0));
		expect(l.paths.amber).toBe(rect(150, 200, 40));
		expect(l.paths.red).toBe(rect(200, 250, -100));
		expect(l.guides.split("M").length - 1).toBe(4);
	});

	test("an overrun wider than the row is cut at its width and says how much more", () => {
		const l = lane(
			trace(
				[
					{ timeMs: 3000, endMs: 5000, cents: 0 },
					{ timeMs: 5000, endMs: 7200, cents: 0 },
				],
				7200,
			),
		);
		// The row is 4000 ms wide: the first point is cut at x 500, the second is past it.
		expect(l.x1).toBe(500);
		expect(l.paths.green).toContain("M400 ");
		expect(l.paths.green).toContain("H500V");
		expect(l.paths.green.match(/M/g)).toHaveLength(1);
		expect(l.more).toBe(3200);
		expect(overrunMoreText(l.more as number)).toBe("+3.2 s");
	});

	test("a trace inside the span has no more", () => {
		expect(
			lane(trace([{ timeMs: 0, endMs: 4000, cents: 0 }], 4000)).more,
		).toBeNull();
	});
});
