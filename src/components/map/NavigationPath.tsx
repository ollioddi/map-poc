import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { FLOOR_HEIGHT } from "../../data/floors";
import type { NavPath, Waypoint } from "../../types/map";

// Path hovers just above room geometry
const PATH_Y_OFFSET = 0.25;

// ─── Segment types ─────────────────────────────────────────────────────────

type FloorSegment = {
	kind: "floor";
	floorIndex: number;
	points: THREE.Vector3[];
};

type StairSegment = {
	kind: "stair";
	fromFloor: number;
	toFloor: number;
	points: [THREE.Vector3, THREE.Vector3];
};

type Segment = FloorSegment | StairSegment;

// ─── Helpers ───────────────────────────────────────────────────────────────

function wpToVec({ x, z, floorIndex }: Waypoint): THREE.Vector3 {
	return new THREE.Vector3(
		x,
		floorIndex * FLOOR_HEIGHT + PATH_Y_OFFSET,
		z,
	);
}

/**
 * Splits waypoints into floor segments (flat runs on one floor) and stair
 * segments (two-point diagonals between floor levels).
 */
function buildSegments(waypoints: Waypoint[]): Segment[] {
	const segs: Segment[] = [];
	let i = 0;

	while (i < waypoints.length) {
		const floor = waypoints[i].floorIndex;
		const pts: THREE.Vector3[] = [wpToVec(waypoints[i])];

		// Collect consecutive waypoints on the same floor
		while (i + 1 < waypoints.length && waypoints[i + 1].floorIndex === floor) {
			i++;
			pts.push(wpToVec(waypoints[i]));
		}

		segs.push({ kind: "floor", floorIndex: floor, points: pts });

		// If the next waypoint is on a different floor, emit a stair segment
		if (i + 1 < waypoints.length) {
			const nextFloor = waypoints[i + 1].floorIndex;
			segs.push({
				kind: "stair",
				fromFloor: floor,
				toFloor: nextFloor,
				points: [wpToVec(waypoints[i]), wpToVec(waypoints[i + 1])],
			});
		}

		i++;
	}

	return segs;
}

// ─── Single segment line ───────────────────────────────────────────────────

/**
 * Renders one path segment. Opacity is driven every frame from `opacityRef`
 * when this segment is on a non-active floor — same technique as NeighbourFloor.
 */
function SegmentLine({
	points,
	color,
	isActive,
	opacityRef,
	lineWidth = 3,
}: {
	points: THREE.Vector3[];
	color: string;
	isActive: boolean;
	opacityRef: React.RefObject<number>;
	lineWidth?: number;
}) {
	// drei's <Line> forwards its ref to the underlying Line2 Three.js object
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const lineRef = useRef<any>(null);

	useFrame(() => {
		const line = lineRef.current;
		if (!line?.material) return;
		line.material.opacity = isActive ? 1 : opacityRef.current;
	});

	return (
		<Line
			ref={lineRef}
			points={points}
			color={color}
			lineWidth={lineWidth}
			transparent
			opacity={isActive ? 1 : 0}
		/>
	);
}

// ─── Endpoint marker ───────────────────────────────────────────────────────

function Marker({
	position,
	color,
	isActive,
	opacityRef,
}: {
	position: THREE.Vector3;
	color: string;
	isActive: boolean;
	opacityRef: React.RefObject<number>;
}) {
	const matRef = useRef<THREE.MeshStandardMaterial>(null);

	useFrame(() => {
		if (!matRef.current) return;
		const opacity = isActive ? 1 : opacityRef.current;
		matRef.current.opacity = opacity;
		matRef.current.depthWrite = opacity > 0.05;
	});

	return (
		<mesh position={position}>
			<sphereGeometry args={[0.4, 16, 16]} />
			<meshStandardMaterial
				ref={matRef}
				color={color}
				emissive={color}
				emissiveIntensity={0.6}
				transparent
				opacity={isActive ? 1 : 0}
				depthWrite={false}
			/>
		</mesh>
	);
}

// ─── Animated traveller dot ────────────────────────────────────────────────
// Moves along the full path curve continuously. Always fully visible — it
// represents the "current position" and should be readable at any view angle.

function Traveller({ curve }: { curve: THREE.CatmullRomCurve3 }) {
	const meshRef = useRef<THREE.Mesh>(null);
	const tRef = useRef(0);

	useFrame((_, delta) => {
		tRef.current = (tRef.current + delta * 0.1) % 1;
		if (meshRef.current) {
			curve.getPointAt(tRef.current, meshRef.current.position);
		}
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[0.45, 16, 16]} />
			<meshStandardMaterial
				color="#38bdf8"
				emissive="#38bdf8"
				emissiveIntensity={0.9}
				roughness={0.1}
			/>
		</mesh>
	);
}

// ─── Public component ──────────────────────────────────────────────────────

export default function NavigationPath({
	path,
	activeFloor,
	opacityRef,
}: {
	path: NavPath;
	activeFloor: number;
	opacityRef: React.RefObject<number>;
}) {
	const segments = buildSegments(path.waypoints);

	// Full ordered point list for the animated traveller
	const allPoints = path.waypoints.map(wpToVec);
	const curve = new THREE.CatmullRomCurve3(allPoints, false, "centripetal", 0);

	const startVec = allPoints[0];
	const endVec = allPoints[allPoints.length - 1];
	const startFloor = path.waypoints[0].floorIndex;
	const endFloor = path.waypoints[path.waypoints.length - 1].floorIndex;

	return (
		<group>
			{segments.map((seg, idx) => {
				if (seg.kind === "floor") {
					// Need ≥2 points for a line
					if (seg.points.length < 2) return null;
					return (
						<SegmentLine
							key={idx}
							points={seg.points}
							color="#3b82f6"
							isActive={seg.floorIndex === activeFloor}
							opacityRef={opacityRef}
							lineWidth={3}
						/>
					);
				}

				// Stair segment: show at full opacity if either connected floor is
				// active, otherwise follow neighbour opacity
				const stairActive =
					seg.fromFloor === activeFloor || seg.toFloor === activeFloor;

				return (
					<SegmentLine
						key={idx}
						points={seg.points}
						color="#8b5cf6"
						isActive={stairActive}
						opacityRef={opacityRef}
						lineWidth={4}
					/>
				);
			})}

			{/* Origin and destination markers */}
			<Marker
				position={startVec}
				color="#22c55e"
				isActive={startFloor === activeFloor}
				opacityRef={opacityRef}
			/>
			<Marker
				position={endVec}
				color="#ef4444"
				isActive={endFloor === activeFloor}
				opacityRef={opacityRef}
			/>

			{/* Animated position marker — always visible */}
			<Traveller curve={curve} />
		</group>
	);
}
