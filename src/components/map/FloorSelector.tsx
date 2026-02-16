import type { Floor } from "../../types/map";

interface Props {
	floors: Floor[];
	activeFloor: number;
	onChange: (index: number) => void;
}

export default function FloorSelector({
	floors,
	activeFloor,
	onChange,
}: Readonly<Props>) {
	// Render floors highest-first (top floor at top of the list) so the visual
	// order matches the stacked 3D scene.
	const sorted = [...floors].reverse();

	return (
		<div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-10">
			{sorted.map((floor) => {
				const isActive = floor.index === activeFloor;
				return (
					<button
						key={floor.index}
						type="button"
						onClick={() => onChange(floor.index)}
						title={floor.name}
						className={[
							"group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150",
							isActive
								? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/30"
								: "border-gray-600 bg-gray-800/80 text-gray-300 hover:border-gray-400 hover:text-white backdrop-blur-sm",
						].join(" ")}
					>
						{/* Floor index badge */}
						<span
							className={[
								"flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold",
								isActive
									? "bg-blue-400 text-blue-900"
									: "bg-gray-700 text-gray-300 group-hover:bg-gray-600",
							].join(" ")}
						>
							{floor.index}
						</span>

						<span className="whitespace-nowrap">{floor.name}</span>

						{/* Active indicator bar */}
						{isActive && (
							<span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 h-6 w-1 rounded-full bg-blue-400" />
						)}
					</button>
				);
			})}
		</div>
	);
}
