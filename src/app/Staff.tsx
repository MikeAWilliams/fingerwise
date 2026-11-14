import { useEffect, useRef } from "preact/hooks";
import type { Pitch } from "../core/pitch";
import { drawStaff, type StaffOptions } from "../render/staff";

interface StaffProps {
	pitch: Pitch;
	options: StaffOptions;
	/** The note's length in quarter-note beats; a whole note when absent. */
	beats?: number;
}

export function Staff({ pitch, options, beats }: StaffProps) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) drawStaff(ref.current, pitch, options, beats);
	}, [pitch, options, beats]);
	return <div class="staff" ref={ref} />;
}
