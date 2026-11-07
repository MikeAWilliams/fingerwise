import { useState } from "preact/hooks";
import type { Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import {
	canTurnAutoAdvanceOn,
	canTurnSharpsOff,
	canTurnSoundOn,
	MAX_DELAY_SECONDS,
	MIN_DELAY_SECONDS,
	MIN_SOUND_DELAY_SECONDS,
	MIN_SOUND_DURATION_SECONDS,
	type Settings as SettingsValue,
	setAutoAdvance,
	setIncludeSharps,
	setSoundEnabled,
	soundTooLongReason,
} from "../core/settings";
import { Section } from "./Section";
import {
	applyDelayInput,
	cardsSummary,
	editTiming,
	highestOptions,
	lowestOptions,
	soundSummary,
	type TimingField,
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
	const [rejection, setRejection] = useState<{
		field: TimingField;
		message: string;
	} | null>(null);
	const sharpsLocked = settings.includeSharps && !canTurnSharpsOff(settings);
	const blocked = sharpsLocked
		? setIncludeSharps(settings, false)
		: { ok: true as const };
	const autoAdvanceLocked =
		!settings.autoAdvance && !canTurnAutoAdvanceOn(settings);
	const soundLocked = !settings.soundEnabled && !canTurnSoundOn(settings);
	const rejectionFor = (field: TimingField) =>
		rejection?.field === field ? rejection.message : null;
	const advanceRejection = rejectionFor("advanceDelaySeconds");
	const soundRejection =
		rejectionFor("soundDelaySeconds") ?? rejectionFor("soundDurationSeconds");
	const edit = (field: TimingField, value: number) => {
		const result = editTiming(settings, field, value);
		if (result.rejected !== null) {
			setRejection({ field, message: result.rejected });
		} else if (result.settings !== settings) {
			setRejection(null);
			onChange(result.settings);
		}
	};
	return (
		<section class="settings">
			<h2>Settings</h2>
			<Section
				title="Cards"
				summary={cardsSummary(settings)}
				hasMessage={
					!blocked.ok || autoAdvanceLocked || advanceRejection !== null
				}
				initiallyOpen
			>
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
							const result = setIncludeSharps(
								settings,
								e.currentTarget.checked,
							);
							if (result.ok) onChange(result.settings);
						}}
					/>
					Include sharps
				</label>
				{!blocked.ok && <p class="settings-note">{blocked.reason}</p>}
				<label>
					Reveal delay (seconds)
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
				<label>
					<input
						type="checkbox"
						checked={settings.autoAdvance}
						disabled={autoAdvanceLocked}
						onChange={(e) => {
							const result = setAutoAdvance(settings, e.currentTarget.checked);
							if (result.ok) onChange(result.settings);
						}}
					/>
					Auto-advance
				</label>
				{autoAdvanceLocked && (
					<p class="settings-note">
						{soundTooLongReason({ ...settings, autoAdvance: true })}
					</p>
				)}
				<label>
					Advance delay (seconds)
					<input
						type="number"
						min={MIN_DELAY_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.advanceDelaySeconds}
						onInput={(e) =>
							edit("advanceDelaySeconds", e.currentTarget.valueAsNumber)
						}
					/>
				</label>
				{advanceRejection && <p class="settings-note">{advanceRejection}</p>}
			</Section>
			<Section
				title="Sound"
				summary={soundSummary(settings)}
				hasMessage={soundLocked || soundRejection !== null}
			>
				<label>
					<input
						type="checkbox"
						checked={settings.soundEnabled}
						disabled={soundLocked}
						onChange={(e) => {
							const result = setSoundEnabled(settings, e.currentTarget.checked);
							if (result.ok) onChange(result.settings);
						}}
					/>
					Play note
				</label>
				{soundLocked && (
					<p class="settings-note">
						{soundTooLongReason({ ...settings, soundEnabled: true })}
					</p>
				)}
				<label>
					Sound delay (seconds)
					<input
						type="number"
						min={MIN_SOUND_DELAY_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.soundDelaySeconds}
						disabled={!settings.soundEnabled}
						onInput={(e) =>
							edit("soundDelaySeconds", e.currentTarget.valueAsNumber)
						}
					/>
				</label>
				{rejectionFor("soundDelaySeconds") && (
					<p class="settings-note">{rejectionFor("soundDelaySeconds")}</p>
				)}
				<label>
					Sound duration (seconds)
					<input
						type="number"
						min={MIN_SOUND_DURATION_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.soundDurationSeconds}
						disabled={!settings.soundEnabled}
						onInput={(e) =>
							edit("soundDurationSeconds", e.currentTarget.valueAsNumber)
						}
					/>
				</label>
				{rejectionFor("soundDurationSeconds") && (
					<p class="settings-note">{rejectionFor("soundDurationSeconds")}</p>
				)}
			</Section>
			<div class="settings-footer">
				<button type="button" onClick={onClose}>
					Close
				</button>
			</div>
		</section>
	);
}
