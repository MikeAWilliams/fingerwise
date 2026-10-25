import { useEffect, useState } from "preact/hooks";
import { glyphFor, type Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type TabFont, tabView } from "../render/tab";
import { REVEAL_DELAY_MS, startRevealTimer } from "./reveal";
import { Staff } from "./Staff";

interface CardProps {
	pitch: Pitch;
	instrument: Instrument;
	staffOptions: StaffOptions;
	font: TabFont;
}

export function Card({ pitch, instrument, staffOptions, font }: CardProps) {
	const [revealed, setRevealed] = useState(false);
	useEffect(() => {
		setRevealed(false);
		return startRevealTimer(REVEAL_DELAY_MS, () => setRevealed(true));
	}, [pitch]);

	const glyph = glyphFor(instrument, pitch);
	const view = glyph === undefined ? null : tabView(glyph, font);
	return (
		<div class="card">
			<div class="card-staff">
				<Staff pitch={pitch} options={staffOptions} />
			</div>
			<div class="card-reveal">
				{revealed && (
					<>
						<div class="card-name">{formatPitch(pitch)}</div>
						{view?.kind === "glyph" && (
							<div
								class="card-glyph"
								style={{ fontFamily: `"${view.fontFamily}"` }}
							>
								{view.text}
							</div>
						)}
						{view?.kind === "placeholder" && (
							<div class="card-glyph card-placeholder">{view.message}</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
