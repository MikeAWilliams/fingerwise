import type {
	AnalyserLike,
	AudioContextLike,
	AudioParamLike,
	GainLike,
	OscillatorLike,
	SourceLike,
	StreamLike,
} from "../../src/audio/context";

export type ParamCall =
	| { kind: "set"; value: number; time: number }
	| { kind: "ramp"; value: number; time: number }
	| { kind: "cancel"; time: number };

export class FakeParam implements AudioParamLike {
	calls: ParamCall[] = [];
	constructor(public value = 0) {}
	setValueAtTime(value: number, time: number) {
		this.calls.push({ kind: "set", value, time });
	}
	linearRampToValueAtTime(value: number, time: number) {
		this.calls.push({ kind: "ramp", value, time });
	}
	cancelScheduledValues(time: number) {
		this.calls.push({ kind: "cancel", time });
	}
}

export class FakeOscillator implements OscillatorLike {
	type = "sine";
	frequency = new FakeParam(440);
	onended: ((...args: never[]) => void) | null = null;
	connected: unknown[] = [];
	starts: (number | undefined)[] = [];
	stops: (number | undefined)[] = [];
	connect(destination: unknown) {
		this.connected.push(destination);
	}
	start(when?: number) {
		this.starts.push(when);
	}
	stop(when?: number) {
		this.stops.push(when);
	}
}

export class FakeGain implements GainLike {
	gain = new FakeParam(1);
	connected: unknown[] = [];
	connect(destination: unknown) {
		this.connected.push(destination);
	}
}

/** Hands out queued sample buffers, one per read; the last one repeats. */
export class FakeAnalyser implements AnalyserLike {
	fftSize = 2048;
	queue: Float32Array[] = [];
	reads = 0;
	disconnected = 0;
	getFloatTimeDomainData(array: Float32Array<ArrayBuffer>) {
		this.reads++;
		const next = this.queue.length > 1 ? this.queue.shift() : this.queue[0];
		array.fill(0);
		if (next) array.set(next.subarray(0, array.length));
	}
	disconnect() {
		this.disconnected++;
	}
}

export class FakeSource implements SourceLike {
	connected: unknown[] = [];
	disconnected = 0;
	constructor(public stream: StreamLike) {}
	connect(destination: unknown) {
		this.connected.push(destination);
	}
	disconnect() {
		this.disconnected++;
	}
}

/** A context that records what is created and scheduled. */
export class FakeContext implements AudioContextLike {
	state = "running";
	currentTime = 0;
	sampleRate = 48000;
	destination = { name: "destination" };
	analysers: FakeAnalyser[] = [];
	sources: FakeSource[] = [];
	/** Samples every new analyser starts with. */
	samples: Float32Array[] = [];
	oscillators: FakeOscillator[] = [];
	gains: FakeGain[] = [];
	resumeCalls = 0;
	/** "throw" throws from `resume()`, "reject" returns a rejected promise. */
	resumeFails: "throw" | "reject" | null = null;
	/** Makes `createOscillator()` throw. */
	createFails = false;

	resume(): Promise<void> {
		this.resumeCalls++;
		if (this.resumeFails === "throw") throw new Error("resume threw");
		if (this.resumeFails === "reject")
			return Promise.reject(new Error("resume rejected"));
		return Promise.resolve();
	}
	createOscillator(): FakeOscillator {
		if (this.createFails) throw new Error("createOscillator threw");
		const osc = new FakeOscillator();
		this.oscillators.push(osc);
		return osc;
	}
	createGain(): FakeGain {
		const gain = new FakeGain();
		this.gains.push(gain);
		return gain;
	}
	createAnalyser(): FakeAnalyser {
		const analyser = new FakeAnalyser();
		analyser.queue = [...this.samples];
		this.analysers.push(analyser);
		return analyser;
	}
	createMediaStreamSource(stream: StreamLike): FakeSource {
		const source = new FakeSource(stream);
		this.sources.push(source);
		return source;
	}
}
