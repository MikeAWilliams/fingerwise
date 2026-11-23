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

/** The click handler of a link to an element on the page: scrolls there with `scrollToElement` instead of jumping. */
export function jumpTo(event: Event, id: string): void {
	event.preventDefault();
	scrollToElement(document.getElementById(id), prefersReducedMotion());
}
