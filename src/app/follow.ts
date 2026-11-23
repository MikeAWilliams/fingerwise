/** The row sits this far down the space between the header and the bar. */
export const FOLLOW_FRACTION = 1 / 3;
/** How long a smooth scroll takes. */
export const SCROLL_MS = 450;

/**
 * Where to scroll the page (its top, in page pixels) to put the row whose top
 * is at `rowTop` a third of the way down the space between the header and the
 * bar, never past the page's top or its end. `maxScroll` is how far the page
 * can scroll; a song that fits gives 0.
 */
export function followTop({
	rowTop,
	viewport,
	header,
	bar,
	maxScroll,
}: {
	rowTop: number;
	viewport: number;
	header: number;
	bar: number;
	maxScroll: number;
}): number {
	const target = rowTop - header - FOLLOW_FRACTION * (viewport - header - bar);
	return Math.min(Math.max(0, target), Math.max(0, maxScroll));
}

/** Slow at both ends: `t` from 0 to 1 gives 0 to 1. */
export function easeInOut(t: number): number {
	const x = Math.min(1, Math.max(0, t));
	return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
}

/** What a scroller needs from the page; the browser's own in the app. */
export interface ScrollerEnv {
	scrollY(): number;
	scrollTo(top: number): void;
	now(): number;
	frame(callback: () => void): number;
	cancelFrame(handle: number): void;
}

export interface Scroller {
	/** Scroll to `top`: tweened when `smooth`, else at once. */
	to(top: number, smooth: boolean): void;
	/** Stop any tween where it is. */
	dispose(): void;
}

/**
 * Moves the page to a top. A smooth move tweens from the current position over
 * `SCROLL_MS`, one animation frame at a time; a new `to` restarts from where
 * the page is; a jump cancels any tween; a target equal to the position does nothing.
 */
export function createScroller(env: ScrollerEnv): Scroller {
	let handle: number | null = null;
	const cancel = () => {
		if (handle !== null) env.cancelFrame(handle);
		handle = null;
	};
	return {
		to(top, smooth) {
			cancel();
			const from = env.scrollY();
			if (!smooth) {
				if (top !== from) env.scrollTo(top);
				return;
			}
			if (top === from) return;
			const started = env.now();
			const step = () => {
				const t = (env.now() - started) / SCROLL_MS;
				if (t >= 1) {
					handle = null;
					env.scrollTo(top);
					return;
				}
				env.scrollTo(from + (top - from) * easeInOut(t));
				handle = env.frame(step);
			};
			handle = env.frame(step);
		},
		dispose: cancel,
	};
}
