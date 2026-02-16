# AAU Indoor Map — POC

A proof-of-concept for indoor navigation across multiple floors, built with **TanStack Start**, **React 19**, **Three.js** and **React Three Fiber**.

## What it does

- Renders a multi-floor building as a 3D scene using an isometric orthographic camera
- **Top-down view** behaves like a regular 2D floor plan — only the active floor is shown
- **Tilting the camera** fades in the other floors (slab + staircase markers only) so you can see the building's scale and where you are in it
- **Floor selector** on the right switches between floors with a smooth camera transition
- **Staircases** use identical geometry at the same XZ position on every floor, so they visually connect the stack in 3D view

## Controls

| Action | Input |
|---|---|
| Orbit / tilt | Left-drag |
| Pan | Right-drag |
| Zoom | Scroll wheel |
| Switch floor | Floor selector (right side) |

## Architecture

```
src/
  types/map.ts               — Room, Staircase, Floor types
  data/floors.ts             — Building data: 4 floors, shared staircase positions
  components/map/
    IndoorMap.tsx            — Three.js canvas, camera rig, scene
    FloorSelector.tsx        — Floor picker overlay
  routes/
    __root.tsx               — Root layout (QueryClient provider, head meta)
    index.tsx                — Map page
```

### Key design decisions

**Camera** — `OrthographicCamera` at a 45° isometric angle. `OrbitControls` allows full rotation from top-down (0°) to near-horizontal (~82°), with pan and zoom. `minPolarAngle: 0` enables the pure 2D top-down view.

**Multi-floor visibility** — driven by the camera's polar angle, computed each frame in `useFrame`. At 0–15° the other floors are fully hidden; they fade in smoothly between 15° and 45°. Material opacity is mutated directly via `group.traverse()` — no React state, no re-renders.

**Staircases** — defined once in `STAIRCASES` and referenced by every floor. The identical XZ position means they stack perfectly in 3D and serve as visual anchors for navigation.

**SSR** — Three.js is excluded from the server bundle via `React.lazy` + a `ClientOnly` wrapper, since WebGL APIs don't exist on the server.

## Stack

| | |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| 3D | [Three.js](https://threejs.org) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) |
| Helpers | [@react-three/drei](https://github.com/pmndrs/drei) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Linting | [Biome](https://biomejs.dev) |

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

```bash
pnpm build      # production build
pnpm test       # vitest
pnpm check      # biome lint + format check
```

## Next steps

- Load real floorplan geometry (SVG or GeoJSON → Three.js shapes)
- Add a waypoint graph per floor and staircase connections between floors
- Animate a navigation path using `THREE.CatmullRomCurve3` + a moving marker
- Room click / hover for info panels
