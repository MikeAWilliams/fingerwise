import { useEffect, useRef } from "preact/hooks";
import type { Pitch } from "../core/pitch";
import { drawStaff, type StaffOptions } from "../render/staff";

interface StaffProps {
	pitch: Pitch;
	options: StaffOptions;
}

export function Staff({ pitch, options }: StaffProps) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) drawStaff(ref.current, pitch, options);
	}, [pitch, options]);
	return <div ref={ref} />;
}
