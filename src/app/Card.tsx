import { glyphFor, type Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type TabFont, tabView } from "../render/tab";
import { Staff } from "./Staff";

interface CardProps {
	pitch: Pitch;
	revealed: boolean;
	instrument: Instrument;
	staffOptions: StaffOptions;
	font: TabFont;
}

export function Card({
	pitch,
	revealed,
	instrument,
	staffOptions,
	font,
}: CardProps) {
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
