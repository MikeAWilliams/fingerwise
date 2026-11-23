/**
 * Scrolls the page so `el` is at the top, below the header (`html`'s
 * `scroll-padding-top` keeps it clear), smoothly unless the reader prefers
 * reduced motion. CSS `scroll-behavior` is not used, since it would also smooth
 * the follower's per-frame scrolling. The caller reads
 * `matchMedia("(prefers-reduced-motion: reduce)")` at the time of the click.
 */
export function scrollToElement(
	el: Element | null,
	reducedMotion: boolean,
): void {
	el?.scrollIntoView({
		block: "start",
		behavior: reducedMotion ? "instant" : "smooth",
	});
}

/** Whether the reader asked for less motion; read when it is needed, not cached. */
export function prefersReducedMotion(): boolean {
	try {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	} catch {
		return false;
	}
}

/**
 * The click handler of a link to an element on the page: scrolls there with
 * `scrollToElement` instead of jumping. With `focusId`, keyboard focus moves
 * to that element (which needs `tabindex="-1"`) without a scroll of its own.
 */
export function jumpTo(event: Event, id: string, focusId?: string): void {
	event.preventDefault();
	scrollToElement(document.getElementById(id), prefersReducedMotion());
	if (focusId !== undefined) {
		document.getElementById(focusId)?.focus({ preventScroll: true });
	}
}

/**
 * Whether an element is still below what can be seen: its bottom edge is past
 * `visibleBottom`, the top of the pinned bar (or the window's bottom). Above
 * that, it is in view or scrolled past.
 */
export function isBelowView(
	elementBottom: number,
	visibleBottom: number,
): boolean {
	return elementBottom > visibleBottom;
}
