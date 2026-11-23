import { describe, expect, test, vi } from "vitest";
import { scrollToElement } from "../../src/app/scroll-to";

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
