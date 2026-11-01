import { describe, expect, it } from "vitest";
import { registerServiceWorker } from "../../src/app/register-sw";

type Call = [string, { scope: string } | undefined];

function fakeNavigator(register: () => Promise<unknown>) {
	const calls: Call[] = [];
	const navigator = {
		serviceWorker: {
			register: (url: string | URL, options?: RegistrationOptions) => {
				calls.push([String(url), options as { scope: string } | undefined]);
				return register();
			},
		},
	};
	return { navigator: navigator as never, calls };
}

describe("registerServiceWorker", () => {
	it("does nothing outside production", () => {
		const { navigator, calls } = fakeNavigator(() => Promise.resolve({}));
		registerServiceWorker({
			navigator,
			isProd: false,
			baseUrl: "/fingerwise/",
		});
		expect(calls).toEqual([]);
	});

	it("does nothing when service workers are unsupported", () => {
		expect(() =>
			registerServiceWorker({
				navigator: {},
				isProd: true,
				baseUrl: "/fingerwise/",
			}),
		).not.toThrow();
	});

	it("registers sw.js under the base with the base as scope", () => {
		const { navigator, calls } = fakeNavigator(() => Promise.resolve({}));
		registerServiceWorker({ navigator, isProd: true, baseUrl: "/fingerwise/" });
		expect(calls).toEqual([["/fingerwise/sw.js", { scope: "/fingerwise/" }]]);
	});

	it("swallows a rejected registration", async () => {
		const { navigator, calls } = fakeNavigator(() =>
			Promise.reject(new Error("blocked")),
		);
		registerServiceWorker({ navigator, isProd: true, baseUrl: "/fingerwise/" });
		await Promise.resolve();
		expect(calls).toHaveLength(1);
	});

	it("swallows a throwing register", () => {
		const navigator = {
			serviceWorker: {
				register: () => {
					throw new Error("insecure context");
				},
			},
		} as never;
		expect(() =>
			registerServiceWorker({
				navigator,
				isProd: true,
				baseUrl: "/fingerwise/",
			}),
		).not.toThrow();
	});
});
