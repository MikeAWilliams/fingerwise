import { glyphFor, type Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type TabFont, tabView } from "../render/tab";
import type { Listening } from "./card-flow";
import { JUDGE_UNAVAILABLE, LISTEN_PROMPT } from "./judge-text";
import { Staff } from "./Staff";

interface CardProps {
	pitch: Pitch;
	revealed: boolean;
	listening?: Listening;
	instrument: Instrument;
	staffOptions: StaffOptions;
	font: TabFont;
}

export function Card({
	pitch,
	revealed,
	listening = "off",
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
				{!revealed && listening === "locked" && (
					<p class="card-status">{LISTEN_PROMPT}</p>
				)}
				{!revealed && listening === "unavailable" && (
					<p class="card-status">{JUDGE_UNAVAILABLE}</p>
				)}
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
