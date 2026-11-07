/** Whether a section is open: as requested, but always open while it shows a message. */
export function sectionOpen(requested: boolean, hasMessage: boolean): boolean {
	return requested || hasMessage;
}

/** A number of seconds for a summary line, such as "3 s" or "0.5 s". */
export function formatSeconds(n: number): string {
	return `${n} s`;
}
