import { expect, test } from "vitest";
import { hello } from "../src/core/hello";

test("hello greets by name", () => {
	expect(hello("ocarina")).toBe("hello, ocarina");
});
