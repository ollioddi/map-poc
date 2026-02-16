import { OrbitControls, OrthographicCamera, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FLOOR_HEIGHT, FLOORS } from "../../data/floors";
import type { Floor, Room, Staircase } from "../../types/map";

// ─── Colour palette per room type ──────────────────────────────────────────

const ROOM_COLORS: Record<string, string> = {
	corridor: "#d1d5db",
	entrance: "#fef9c3",
	reception: "#fef9c3",
	office: "#bbf7d0",
	meeting: "#99f6e4",
	lab: "#e9d5ff",
	bathroom: "#a5f3fc",
	kitchen: "#fed7aa",
	storage: "#d6d3d1",
	server: "#fecaca",
	study: "#bfdbfe",
	auditorium: "#fce7f3",
};

const FLOOR_COLOR = "#f1f5f9";
const STAIR_BASE = "#f59e0b";
const STAIR_STEP = "#d97706";

const FLOOR_SLAB = 0.1;
const ROOM_LIFT = FLOOR_SLAB + 0.01;

// Neighbour floors start fading in at this polar angle and are fully visible
// by TILT_FULL. Below TILT_START the view is treated as top-down / 2D.
const TILT_START = Math.PI / 12; // 15°
const TILT_FULL = Math.PI / 4; // 45°
const MAX_NEIGHBOUR_OPACITY = 0.2;

// ─── Room mesh ─────────────────────────────────────────────────────────────

function RoomMesh({
	room,
	floorY,
}: Readonly<{ room: Room; floorY: number }>) {
	const color = ROOM_COLORS[room.type] ?? "#e5e7eb";

	return (
		<group position={[room.x, floorY + ROOM_LIFT, room.z]}>
			<mesh>
				<boxGeometry args={[room.width - 0.1, 0.06, room.depth - 0.1]} />
				<meshStandardMaterial color={color} roughness={0.8} />
			</mesh>
			<Text
				position={[0, 0.09, 0]}
				rotation={[-Math.PI / 2, 0, 0]}
				fontSize={0.55}
				color="#1f2937"
				anchorX="center"
				anchorY="middle"
				maxWidth={room.width - 0.4}
			>
				{room.name}
			</Text>
		</group>
	);
}

// ─── Staircase mesh ────────────────────────────────────────────────────────

function StaircaseMesh({
	stair,
	floorY,
	showLabel,
}: Readonly<{ stair: Staircase; floorY: number; showLabel: boolean }>) {
	const STEP_COUNT = 7;
	const stepDepth = (stair.depth - 0.2) / STEP_COUNT;

	return (
		<group position={[stair.x, floorY + ROOM_LIFT, stair.z]}>
			<mesh>
				<boxGeometry args={[stair.width, 0.08, stair.depth]} />
				<meshStandardMaterial color={STAIR_BASE} roughness={0.6} />
			</mesh>

			{Array.from({ length: STEP_COUNT }, (_, i) => {
				const stepH = 0.12 + (i / STEP_COUNT) * 0.3;
				const posZ = -stair.depth / 2 + stepDepth * i + stepDepth / 2;
				return (
					<mesh key={i} position={[0, 0.08 + stepH / 2, posZ]}>
						<boxGeometry
							args={[stair.width - 0.1, stepH, stepDepth - 0.06]}
						/>
						<meshStandardMaterial color={STAIR_STEP} roughness={0.5} />
					</mesh>
				);
			})}

			{showLabel && (
				<Text
					position={[0, 0.6, 0]}
					rotation={[-Math.PI / 2, 0, 0]}
					fontSize={0.5}
					color="#92400e"
					anchorX="center"
					anchorY="middle"
				>
					{stair.label}
				</Text>
			)}
		</group>
	);
}

// ─── Active floor ──────────────────────────────────────────────────────────

function ActiveFloor({ floor }: Readonly<{ floor: Floor }>) {
	const floorY = floor.index * FLOOR_HEIGHT;

	return (
		<group>
			<mesh position={[0, floorY + FLOOR_SLAB / 2, 0]}>
				<boxGeometry args={[44, FLOOR_SLAB, 22]} />
				<meshStandardMaterial color={FLOOR_COLOR} roughness={1} />
			</mesh>

			{floor.rooms.map((room) => (
				<RoomMesh key={room.id} room={room} floorY={floorY} />
			))}

			{floor.staircases.map((stair) => (
				<StaircaseMesh
					key={stair.id}
					stair={stair}
					floorY={floorY}
					showLabel
				/>
			))}
		</group>
	);
}

// ─── Neighbour floor ───────────────────────────────────────────────────────
// Renders slab + stairs only. Opacity is updated every frame from a shared
// ref so it reacts to camera tilt without triggering React re-renders.

function NeighbourFloor({
	floor,
	opacityRef,
}: Readonly<{
	floor: Floor;
	opacityRef: React.RefObject<number>;
}>) {
	const groupRef = useRef<THREE.Group>(null);
	const floorY = floor.index * FLOOR_HEIGHT;

	useFrame(() => {
		const group = groupRef.current;
		if (!group) return;
		const opacity = opacityRef.current;
		group.traverse((obj) => {
			if (
				obj instanceof THREE.Mesh &&
				obj.material instanceof THREE.MeshStandardMaterial
			) {
				obj.material.opacity = opacity;
				obj.material.transparent = true;
				// Avoid depth-buffer artifacts at very low opacity
				obj.material.depthWrite = opacity > 0.05;
			}
		});
	});

	return (
		<group ref={groupRef}>
			<mesh position={[0, floorY + FLOOR_SLAB / 2, 0]}>
				<boxGeometry args={[44, FLOOR_SLAB, 22]} />
				{/* Initial opacity matches what the camera angle will give at load */}
				<meshStandardMaterial
					color={FLOOR_COLOR}
					opacity={MAX_NEIGHBOUR_OPACITY}
					transparent
					roughness={1}
				/>
			</mesh>

			{floor.staircases.map((stair) => (
				<StaircaseMesh
					key={stair.id}
					stair={stair}
					floorY={floorY}
					showLabel={false}
				/>
			))}
		</group>
	);
}

// ─── Camera rig ────────────────────────────────────────────────────────────
// Smoothly follows the active floor and drives neighbourOpacityRef based on
// the camera's current polar (tilt) angle.

function CameraRig({
	activeFloor,
	controlsRef,
	neighbourOpacityRef,
}: {
	activeFloor: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	controlsRef: React.RefObject<any>;
	neighbourOpacityRef: React.RefObject<number>;
}) {
	useFrame(() => {
		const controls = controlsRef.current;
		if (!controls) return;

		// Smoothly re-centre on the active floor
		const targetY = activeFloor * FLOOR_HEIGHT + FLOOR_SLAB;
		controls.target.y = THREE.MathUtils.lerp(
			controls.target.y,
			targetY,
			0.08,
		);

		// Map polar angle → neighbour opacity
		const angle = controls.getPolarAngle();
		const t = THREE.MathUtils.smoothstep(angle, TILT_START, TILT_FULL);
		neighbourOpacityRef.current = t * MAX_NEIGHBOUR_OPACITY;

		controls.update();
	});

	return null;
}

// ─── Scene ─────────────────────────────────────────────────────────────────

function Scene({ activeFloor }: Readonly<{ activeFloor: number }>) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const controlsRef = useRef<any>(null);
	const neighbourOpacityRef = useRef<number>(MAX_NEIGHBOUR_OPACITY);

	const initialTarget = useMemo(
		() => new THREE.Vector3(0, activeFloor * FLOOR_HEIGHT + FLOOR_SLAB, 0),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return (
		<>
			<OrthographicCamera
				makeDefault
				position={[30, 38, 30]}
				zoom={13}
				near={0.1}
				far={500}
			/>

			<CameraRig
				activeFloor={activeFloor}
				controlsRef={controlsRef}
				neighbourOpacityRef={neighbourOpacityRef}
			/>

			<OrbitControls
				ref={controlsRef}
				target={initialTarget}
				enablePan
				enableRotate
				enableZoom
				minZoom={6}
				maxZoom={40}
				minPolarAngle={0} // allow full top-down view
				maxPolarAngle={Math.PI / 2.2}
				dampingFactor={0.1}
				enableDamping
			/>

			<ambientLight intensity={0.75} />
			<directionalLight
				position={[20, 40, 20]}
				intensity={1.2}
				castShadow
				shadow-mapSize={[2048, 2048]}
			/>
			<directionalLight
				position={[-10, 20, -10]}
				intensity={0.4}
				color="#cce4ff"
			/>

			{/* Active floor — always full detail */}
			<ActiveFloor floor={FLOORS[activeFloor]} />

			{/* All other floors — slab + stairs, opacity driven by camera tilt */}
			{FLOORS.map((floor) => {
				if (floor.index === activeFloor) return null;
				return (
					<NeighbourFloor
						key={floor.index}
						floor={floor}
						opacityRef={neighbourOpacityRef}
					/>
				);
			})}
		</>
	);
}

// ─── Public component ──────────────────────────────────────────────────────

export default function IndoorMap({
	activeFloor,
}: Readonly<{ activeFloor: number }>) {
	return (
		<Canvas
			shadows
			gl={{ antialias: true }}
			style={{ width: "100%", height: "100%" }}
		>
			<Scene activeFloor={activeFloor} />
		</Canvas>
	);
}
