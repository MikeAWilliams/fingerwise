import { describe, expect, test } from "vitest";
import {
	type FileInput,
	PICKER_OPTIONS,
	pickTextFile,
} from "../../src/app/file-picker";

const file = { name: "tunes.abc" } as File;

function fakeInput() {
	const listeners = new Map<string, () => void>();
	const input: FileInput & { clicked: number } = {
		type: "",
		accept: "",
		files: null,
		clicked: 0,
		click() {
			this.clicked++;
		},
		addEventListener(type, listener) {
			listeners.set(type, listener);
		},
	};
	return { input, fire: (type: string) => listeners.get(type)?.() };
}

describe("pickTextFile (F17-S02)", () => {
	test("with showOpenFilePicker: a fixed id and the .abc and .txt types, one file (AC11)", async () => {
		const seen: unknown[] = [];
		const result = await pickTextFile({
			showOpenFilePicker: async (options) => {
				seen.push(options);
				return [{ getFile: async () => file }];
			},
		});
		expect(result).toBe(file);
		expect(seen).toEqual([
			{
				id: "fingerwise-song",
				multiple: false,
				types: [
					{
						description: "ABC files",
						accept: { "text/plain": [".abc", ".txt"] },
					},
				],
			},
		]);
		expect(seen[0]).toBe(PICKER_OPTIONS);
	});

	test("cancelling the picker (an AbortError) gives null (AC10)", async () => {
		const abort = new DOMException("cancelled", "AbortError");
		expect(
			await pickTextFile({
				showOpenFilePicker: async () => {
					throw abort;
				},
			}),
		).toBeNull();
	});

	test("another picker failure is passed on", async () => {
		await expect(
			pickTextFile({
				showOpenFilePicker: async () => {
					throw new Error("blocked");
				},
			}),
		).rejects.toThrow("blocked");
	});

	test("without showOpenFilePicker a file input for .abc and .txt is used (AC12)", async () => {
		const { input, fire } = fakeInput();
		const picked = pickTextFile({}, () => input);
		expect(input.type).toBe("file");
		expect(input.accept).toBe(".abc,.txt");
		expect(input.clicked).toBe(1);
		input.files = [file];
		fire("change");
		expect(await picked).toBe(file);
	});

	test("cancelling the file input gives null (AC10, AC12)", async () => {
		const { input, fire } = fakeInput();
		const picked = pickTextFile({}, () => input);
		fire("cancel");
		expect(await picked).toBeNull();
	});
});
