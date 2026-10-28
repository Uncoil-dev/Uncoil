# Dashboard workspace

## Surface

Owns the capture-faithful Uncoil dashboard presentation shared by authenticated live projects and the public populated Sandbox.

## Entry points

- `/dashboard/[projectId]` mounts the live data adapter.
- `/playground/[[...slug]]` mounts the deterministic read-only Sandbox adapter.
- `CapturedWorkspace` renders normalized workspace data without querying account state.

## Structure

- `contracts.ts` defines the shared live/Sandbox view-model boundary.
- `sandbox-data.ts` owns versioned deterministic Uncoil fixtures.
- `components/` owns view-only captured dashboard surfaces.

## State ownership

Server state stays in the live Convex/Tinybird adapters. Route state stays in Next.js routes. Filters and open menus are local to the mounted workspace. Sandbox fixtures never query or mutate account data.

## Stability boundaries

The supplied static captures are the visual authority. Product names and example records are Uncoil-owned, while layout, density, controls, and empty/populated behavior remain aligned with the references.
