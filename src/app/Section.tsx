import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { sectionOpen } from "./section";

interface SectionProps {
	title: string;
	summary: string;
	hasMessage?: boolean;
	initiallyOpen?: boolean;
	children: ComponentChildren;
}

export function Section({
	title,
	summary,
	hasMessage = false,
	initiallyOpen = false,
	children,
}: SectionProps) {
	const [requested, setRequested] = useState(initiallyOpen);
	useEffect(() => {
		if (hasMessage) setRequested(true);
	}, [hasMessage]);
	const open = sectionOpen(requested, hasMessage);
	return (
		<details
			class="settings-section"
			open={open}
			onToggle={(e) => {
				const details = e.currentTarget;
				const next = sectionOpen(details.open, hasMessage);
				if (details.open !== next) details.open = next;
				setRequested(next);
			}}
		>
			<summary>
				<span class="settings-section-title">{title}</span>
				{!open && <span class="settings-section-summary">{summary}</span>}
			</summary>
			{children}
		</details>
	);
}
