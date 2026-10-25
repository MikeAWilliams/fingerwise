import type { Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import {
	canTurnSharpsOff,
	MAX_DELAY_SECONDS,
	MIN_DELAY_SECONDS,
	type Settings as SettingsValue,
	setIncludeSharps,
} from "../core/settings";
import {
	applyDelayInput,
	highestOptions,
	lowestOptions,
} from "./settings-form";

interface SettingsProps {
	instrument: Instrument;
	settings: SettingsValue;
	onChange: (settings: SettingsValue) => void;
	onClose: () => void;
}

export function Settings({
	instrument,
	settings,
	onChange,
	onClose,
}: SettingsProps) {
	const sharpsLocked = settings.includeSharps && !canTurnSharpsOff(settings);
	const blocked = sharpsLocked
		? setIncludeSharps(settings, false)
		: { ok: true as const };
	return (
		<section class="settings">
			<h2>Settings</h2>
			<label>
				Lowest note
				<select
					value={settings.lowest}
					onChange={(e) =>
						onChange({
							...settings,
							lowest: Number(e.currentTarget.value) as Pitch,
						})
					}
				>
					{lowestOptions(instrument, settings).map((p) => (
						<option key={p} value={p}>
							{formatPitch(p)}
						</option>
					))}
				</select>
			</label>
			<label>
				Highest note
				<select
					value={settings.highest}
					onChange={(e) =>
						onChange({
							...settings,
							highest: Number(e.currentTarget.value) as Pitch,
						})
					}
				>
					{highestOptions(instrument, settings).map((p) => (
						<option key={p} value={p}>
							{formatPitch(p)}
						</option>
					))}
				</select>
			</label>
			<label>
				<input
					type="checkbox"
					checked={settings.includeSharps}
					disabled={sharpsLocked}
					onChange={(e) => {
						const result = setIncludeSharps(settings, e.currentTarget.checked);
						if (result.ok) onChange(result.settings);
					}}
				/>
				Include sharps
			</label>
			{!blocked.ok && <p class="settings-note">{blocked.reason}</p>}
			<label>
				Delay (seconds)
				<input
					type="number"
					min={MIN_DELAY_SECONDS}
					max={MAX_DELAY_SECONDS}
					step="0.5"
					value={settings.delaySeconds}
					onInput={(e) =>
						onChange(applyDelayInput(settings, e.currentTarget.valueAsNumber))
					}
				/>
			</label>
			<button type="button" onClick={onClose}>
				Close
			</button>
		</section>
	);
}
