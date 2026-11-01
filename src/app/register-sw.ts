export interface ServiceWorkerEnv {
	navigator: { serviceWorker?: Pick<ServiceWorkerContainer, "register"> };
	isProd: boolean;
	baseUrl: string;
}

/**
 * Registers the service worker in production only. A new worker waits and takes over on a later
 * launch, so this never skips waiting, shows UI or reloads. Never throws: without a worker the
 * app runs online as before.
 */
export function registerServiceWorker(env: ServiceWorkerEnv): void {
	if (!env.isProd) return;
	try {
		const container = env.navigator.serviceWorker;
		if (!container) return;
		container
			.register(`${env.baseUrl}sw.js`, { scope: env.baseUrl })
			.catch(() => {});
	} catch {}
}
