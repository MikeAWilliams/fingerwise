import { render } from "preact";
import { App } from "./App";
import "./app.css";
import { registerServiceWorker } from "./register-sw";

const root = document.getElementById("app");
if (!root) throw new Error("#app element not found");
render(<App />, root);
registerServiceWorker({
	navigator,
	isProd: import.meta.env.PROD,
	baseUrl: import.meta.env.BASE_URL,
});
