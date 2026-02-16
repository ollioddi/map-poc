import type { NavPath } from "../types/map";

/**
 * Demo route: Entrance Hall (Ground Floor) → Stair A → Lab 201 (2nd Floor).
 * Stair A sits at x = -16, z = 0 — identical on every floor.
 * The transition waypoints share the same XZ so the 3D line goes straight up
 * through the staircase geometry.
 */
export const DEMO_PATH: NavPath = {
	id: "demo-path",
	label: "Entrance Hall → Lab 201",
	waypoints: [
		{ x: 0, z: 9, floorIndex: 0 }, // Start: Entrance Hall
		{ x: 0, z: 1.5, floorIndex: 0 }, // Into main corridor
		{ x: -13, z: 0, floorIndex: 0 }, // Along corridor toward Stair A
		{ x: -16, z: 0, floorIndex: 0 }, // Stair A — ground level
		{ x: -16, z: 0, floorIndex: 2 }, // Stair A — 2nd floor (diagonal rise)
		{ x: -13, z: 0, floorIndex: 2 }, // Exit stair into corridor
		{ x: -10, z: 1.5, floorIndex: 2 }, // Approaching Lab 201
		{ x: -10, z: 9, floorIndex: 2 }, // End: Lab 201
	],
};
