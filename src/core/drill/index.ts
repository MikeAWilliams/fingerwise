import type { Instrument } from "../instrument";
import { isNatural, type Pitch, pitchesInRange } from "../pitch";

/** Returns a value in [0, 1). Always injected by the caller. */
export type RandomSource = () => number;

export class DrillError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DrillError";
	}
}

export interface PoolOptions {
	lowest: Pitch;
	highest: Pitch;
	includeSharps: boolean;
}

/** The instrument's written range. */
export function fullRange(instrument: Instrument): {
	lowest: Pitch;
	highest: Pitch;
} {
	return { lowest: instrument.lowest, highest: instrument.highest };
}

/** Every pitch the drill may draw, ascending. Throws `DrillError` for a bad range or an empty pool. */
export function buildPool(
	instrument: Instrument,
	options: PoolOptions,
): Pitch[] {
	const { lowest, highest, includeSharps } = options;
	if (lowest > highest) {
		throw new DrillError("lowest must not be above highest");
	}
	if (
		lowest < instrument.lowest ||
		lowest > instrument.highest ||
		highest < instrument.lowest ||
		highest > instrument.highest
	) {
		throw new DrillError(
			"range must lie within the instrument's written range",
		);
	}
	const pool = pitchesInRange(lowest, highest).filter(
		(p) => includeSharps || isNatural(p),
	);
	if (pool.length === 0) throw new DrillError("the pool is empty");
	return pool;
}

/** Draw uniformly from `pool`, never repeating `previous` unless it is the only pitch. */
export function drawPitch(
	pool: readonly Pitch[],
	previous: Pitch | null,
	random: RandomSource,
): Pitch {
	if (pool.length === 0) throw new DrillError("the pool is empty");
	if (pool.length === 1) return pool[0] as Pitch;
	const candidates = pool.filter((p) => p !== previous);
	return candidates[Math.floor(random() * candidates.length)] as Pitch;
}
