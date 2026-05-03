# Tileset spritesheets

Each file is one tileset palette. Metadata (sprite names, source rects, layers,
colliders) lives in `frontend/utils/pixi/spritesheet/<name>.ts`. Add a sheet to
`SheetName` in `spritesheet.ts` and to the `palettes` array in
`frontend/app/editor/Editor.tsx` to expose it in the editor.

| File | Metadata module | In editor |
|---|---|---|
| `ground.png` | `ground.ts` | yes |
| `grasslands.png` | `grasslands.ts` | yes |
| `village.png` | `village.ts` | yes |
| `city.png` | `city.ts` | no (data only) |
| `acropolis.png` | `acropolis.ts` | yes — **art pending** |

## acropolis.png — Neo-Olympus tileset (pending)

Greek-architecture-meets-tech for the Athena workspace. Marble + neon-trim
palette: ivory white, soft-grey marble, deep black, brand teal/cyan accents
(matched to the Athena Growth logo's high-contrast monochrome with a touch of
glowing blue for the "tech" overlay).

### Sheet specs

- **Image size:** 1024×768 px, PNG with transparent background.
- **Base tile size:** 32×32 px (objects can span multiple tiles).
- **Coordinate origin:** top-left, x increases right, y increases down.

### Sprite layout

Coordinates and sizes are authoritative — they match `acropolis.ts`. Paint each
sprite into its declared rect.

#### Floor tiles (row at y=0, all 32×32)

| x | name | description |
|---|---|---|
| 0   | `marble_white`        | Polished white marble, faint vein. |
| 32  | `marble_dark`         | Polished dark marble, faint vein. |
| 64  | `marble_neon_grout`   | White marble with cyan-glowing grout lines. |
| 96  | `mosaic_athena_logo`  | **Mosaic floor tile featuring the Athena Growth column-in-circle mark.** |
| 128 | `circuit_grass`       | Grass with subtle circuit-trace pattern. |
| 160 | `hex_holo_floor`      | Hex-grid holographic deck. |
| 192 | `server_floor`        | Dark grated metal. |
| 224 | `oracle_disc`         | Glowing teleport-pad indicator (decorative; pair with a `teleporter` zone). |

#### Walls / above-floor (row at y=32, all 32×32)

| x | name |
|---|---|
| 0   | `marble_wall_top` |
| 32  | `marble_wall_mid` |
| 64  | `marble_wall_bot` |
| 96  | `pediment_l` |
| 128 | `pediment_m` |
| 160 | `pediment_r` |
| 192 | `laurel_arch_l` |
| 224 | `laurel_arch_r` |
| 256 | `cable_ivy_trim` |

#### Objects (y=64+, variable size)

| x | y | w×h | name | colliders (tile coords from object's top-left) |
|---|---|---|---|---|
| 0   | 64 | 32×96  | `doric_column`         | `(0,2)` |
| 32  | 64 | 64×96  | `athena_holostatue`    | `(0,2)`, `(1,2)` |
| 96  | 64 | 64×64  | `server_altar`         | `(0,1)`, `(1,1)` |
| 160 | 64 | 32×64  | `amphora_pc`           | `(0,1)` |
| 192 | 64 | 32×32  | `cyber_laurel_planter` | `(0,0)` |
| 224 | 64 | 64×32  | `scroll_tablet_desk`   | `(0,0)`, `(1,0)` |
| 288 | 64 | 64×64  | `data_fountain`        | `(0,1)`, `(1,1)` |
| 352 | 64 | 32×32  | `omphalos_circle`      | none (decorative) |
| 384 | 64 | 64×96  | `brand_banner`         | `(0,2)`, `(1,2)` — **hanging banner with the Athena Growth logo** |
| 448 | 64 | 64×64  | `brand_crest`          | (above_floor wall mount, no collider) — **Athena Growth column-in-circle mark as wall seal** |

### Workflow

1. Generate concept art (Stable Diffusion / GPT-image) per sprite category:
   marble floors, columns, holo-statue, server-altar, etc.
2. Reduce to pixel art at 32×32 base scale in Aseprite.
3. Composite all sprites into a single 1024×768 sheet, snapping each to the
   coordinates above (a transparent grid overlay helps).
4. Bake the brand mark from `/public/brand/athena-mark.png` into
   `mosaic_athena_logo`, `brand_banner`, and `brand_crest` so the logo is
   physically present in the world.
5. Export as `acropolis.png` here.

After the file is in place no code changes are needed — the metadata module and
editor palette are already wired up.
