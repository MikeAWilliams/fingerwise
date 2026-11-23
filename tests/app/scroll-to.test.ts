import { describe, expect, test, vi } from "vitest";
import { isBelowView, scrollToElement } from "../../src/app/scroll-to";

describe("scrollToElement", () => {
	const element = () => {
		const scrollIntoView = vi.fn();
		return { el: { scrollIntoView } as unknown as Element, scrollIntoView };
	};

	test("scrolls smoothly to the top of the element", () => {
		const { el, scrollIntoView } = element();
		scrollToElement(el, false);
		expect(scrollIntoView).toHaveBeenCalledWith({
			block: "start",
			behavior: "smooth",
		});
	});

	test("jumps with reduced motion", () => {
		const { el, scrollIntoView } = element();
		scrollToElement(el, true);
		expect(scrollIntoView).toHaveBeenCalledWith({
			block: "start",
			behavior: "instant",
		});
	});

	test("does nothing without an element", () => {
		expect(() => scrollToElement(null, false)).not.toThrow();
	});
});

describe("isBelowView (F11-S05 AC5)", () => {
	test("below while its bottom is past the visible bottom", () => {
		expect(isBelowView(701, 700)).toBe(true);
	});

	test("not below once fully above the visible bottom, or scrolled past", () => {
		expect(isBelowView(700, 700)).toBe(false);
		expect(isBelowView(300, 700)).toBe(false);
		expect(isBelowView(-50, 700)).toBe(false);
	});
});
