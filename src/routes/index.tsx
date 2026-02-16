import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import FloorSelector from "../components/map/FloorSelector";
import { FLOORS } from "../data/floors";
import { DEMO_PATH } from "../data/navPath";

// Lazy import keeps Three.js / WebGL code out of the SSR bundle entirely.
const IndoorMap = lazy(() => import("../components/map/IndoorMap"));

/** Renders children only after the component has mounted on the client. */
function ClientOnly({ children }: Readonly<{ children: React.ReactNode }>) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	if (!mounted) return null;
	return <>{children}</>;
}

export const Route = createFileRoute("/")({ component: MapPage });

function MapPage() {
	const [activeFloor, setActiveFloor] = useState(0);
	const [showPath, setShowPath] = useState(true);
	const current = FLOORS[activeFloor];

	return (
		<div className="flex h-screen flex-col bg-gray-950">
			{/* Toolbar */}
			<div className="flex items-center gap-4 border-b border-gray-800 bg-gray-900 px-4 py-2 text-sm text-gray-400">
				<span className="font-semibold text-white">Indoor Map</span>
				<span className="text-gray-600">|</span>
				<span>
					Viewing:{" "}
					<span className="font-medium text-blue-400">{current.name}</span>
				</span>

				{/* Navigation path toggle */}
				<button
					type="button"
					onClick={() => setShowPath((v) => !v)}
					className={[
						"ml-2 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
						showPath
							? "border-blue-500 bg-blue-500/15 text-blue-300"
							: "border-gray-700 bg-transparent text-gray-500 hover:border-gray-500 hover:text-gray-300",
					].join(" ")}
				>
					<span
						className={[
							"h-2 w-2 rounded-full",
							showPath ? "bg-blue-400" : "bg-gray-600",
						].join(" ")}
					/>
					{DEMO_PATH.label}
				</button>

				<span className="ml-auto text-xs text-gray-600">
					Drag to orbit · Scroll to zoom · Right-drag to pan
				</span>
			</div>

			{/* Map area */}
			<div className="relative flex-1">
				<ClientOnly>
					<Suspense
						fallback={
							<div className="flex h-full items-center justify-center text-gray-500">
								Loading map…
							</div>
						}
					>
						<IndoorMap activeFloor={activeFloor} showPath={showPath} />
					</Suspense>
				</ClientOnly>
				<FloorSelector
					floors={FLOORS}
					activeFloor={activeFloor}
					onChange={setActiveFloor}
				/>

				{/* Legend */}
				<Legend />
			</div>
		</div>
	);
}

const LEGEND_ITEMS = [
	{ color: "#bbf7d0", label: "Office" },
	{ color: "#e9d5ff", label: "Lab" },
	{ color: "#bfdbfe", label: "Study" },
	{ color: "#fed7aa", label: "Kitchen / Canteen" },
	{ color: "#a5f3fc", label: "Bathroom" },
	{ color: "#fce7f3", label: "Auditorium" },
	{ color: "#fef9c3", label: "Entrance / Reception" },
	{ color: "#d1d5db", label: "Corridor" },
	{ color: "#f59e0b", label: "Staircase" },
];

function Legend() {
	return (
		<div className="absolute bottom-4 left-4 rounded-lg border border-gray-700 bg-gray-900/90 p-3 backdrop-blur-sm">
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
				Legend
			</p>
			<ul className="space-y-1">
				{LEGEND_ITEMS.map(({ color, label }) => (
					<li
						key={label}
						className="flex items-center gap-2 text-xs text-gray-300"
					>
						<span
							className="h-3 w-3 shrink-0 rounded-sm border border-gray-600"
							style={{ backgroundColor: color }}
						/>
						{label}
					</li>
				))}
			</ul>
		</div>
	);
}
