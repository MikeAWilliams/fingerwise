/** What the file picker needs of a handle: the file it names. */
interface PickedHandle {
	getFile(): Promise<File>;
}

interface OpenPickerOptions {
	id: string;
	multiple: boolean;
	types: { description: string; accept: Record<string, string[]> }[];
}

/** `showOpenFilePicker` is on Chrome and Edge desktop and is not in TypeScript's DOM types. */
export interface FilePickerWindow {
	showOpenFilePicker?: (options: OpenPickerOptions) => Promise<PickedHandle[]>;
}

/** The part of an `<input type="file">` the fallback uses. */
export interface FileInput {
	type: string;
	accept: string;
	files: ArrayLike<File> | null;
	click(): void;
	addEventListener(
		type: "change" | "cancel",
		listener: () => void,
		options?: { once: boolean },
	): void;
}

/**
 * The browser remembers where this `id` last picked a file from, so a second
 * press starts in the same folder; a page is never told the path.
 */
export const PICKER_ID = "fingerwise-song";

export const PICKER_OPTIONS: OpenPickerOptions = {
	id: PICKER_ID,
	multiple: false,
	types: [
		{
			description: "ABC files",
			accept: { "text/plain": [".abc", ".txt"] },
		},
	],
};

function isAbort(error: unknown): boolean {
	return error instanceof Error && error.name === "AbortError";
}

/**
 * Ask the player for a song file: the picker with a remembered folder where
 * the browser has one, else a plain file input. Resolves null when the player
 * cancels; other failures reject.
 */
export async function pickTextFile(
	win: FilePickerWindow = window as FilePickerWindow,
	makeInput: () => FileInput = () => document.createElement("input"),
): Promise<File | null> {
	if (win.showOpenFilePicker !== undefined) {
		try {
			const [handle] = await win.showOpenFilePicker(PICKER_OPTIONS);
			return handle === undefined ? null : await handle.getFile();
		} catch (error) {
			if (isAbort(error)) return null;
			throw error;
		}
	}
	const input = makeInput();
	input.type = "file";
	input.accept = ".abc,.txt";
	return new Promise((resolve) => {
		input.addEventListener("change", () => resolve(input.files?.[0] ?? null), {
			once: true,
		});
		input.addEventListener("cancel", () => resolve(null), { once: true });
		input.click();
	});
}
