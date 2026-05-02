// Neo-Olympus tileset — Greek-architecture-meets-tech for the Athena workspace.
// Layout spec lives in /frontend/public/sprites/spritesheets/README.md so the
// art can be produced to match these coordinates exactly.

import { SpriteSheetTile } from './spritesheet'
import { SpriteSheetData } from './SpriteSheetData'

const width = 1024
const height = 768
const url = '/sprites/spritesheets/acropolis.png'

const sprites: SpriteSheetTile[] = [
    // --- Floor (row 0, y=0, 32x32 each) ---
    { name: 'marble_white',        x: 0,   y: 0, width: 32, height: 32 },
    { name: 'marble_dark',         x: 32,  y: 0, width: 32, height: 32 },
    { name: 'marble_neon_grout',   x: 64,  y: 0, width: 32, height: 32 },
    { name: 'mosaic_athena_logo',  x: 96,  y: 0, width: 32, height: 32 },
    { name: 'circuit_grass',       x: 128, y: 0, width: 32, height: 32 },
    { name: 'hex_holo_floor',      x: 160, y: 0, width: 32, height: 32 },
    { name: 'server_floor',        x: 192, y: 0, width: 32, height: 32 },
    { name: 'oracle_disc',         x: 224, y: 0, width: 32, height: 32 },

    // --- Walls / above_floor (row 1, y=32) ---
    { name: 'marble_wall_top',     x: 0,   y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'marble_wall_mid',     x: 32,  y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'marble_wall_bot',     x: 64,  y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'pediment_l',          x: 96,  y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'pediment_m',          x: 128, y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'pediment_r',          x: 160, y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'laurel_arch_l',       x: 192, y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'laurel_arch_r',       x: 224, y: 32, width: 32, height: 32, layer: 'above_floor' },
    { name: 'cable_ivy_trim',      x: 256, y: 32, width: 32, height: 32, layer: 'above_floor' },

    // --- Objects (row 2+, y=64+, variable size) ---
    // Doric column — 1 tile wide, 3 tiles tall (32x96), bottom tile blocks movement.
    { name: 'doric_column',        x: 0,   y: 64, width: 32, height: 96, layer: 'object',
      colliders: [{ x: 0, y: 2 }] },

    // Holo-statue of Athena — 2x3 tiles (64x96), the brand-defining centerpiece.
    { name: 'athena_holostatue',   x: 32,  y: 64, width: 64, height: 96, layer: 'object',
      colliders: [{ x: 0, y: 2 }, { x: 1, y: 2 }] },

    // Server-altar — 2x2 tiles (64x64), bottom row blocks.
    { name: 'server_altar',        x: 96,  y: 64, width: 64, height: 64, layer: 'object',
      colliders: [{ x: 0, y: 1 }, { x: 1, y: 1 }] },

    // Amphora-PC — 1x2 tiles.
    { name: 'amphora_pc',          x: 160, y: 64, width: 32, height: 64, layer: 'object',
      colliders: [{ x: 0, y: 1 }] },

    // Cyber-laurel planter — 1x1 decorative.
    { name: 'cyber_laurel_planter', x: 192, y: 64, width: 32, height: 32, layer: 'object',
      colliders: [{ x: 0, y: 0 }] },

    // Scroll-tablet workstation desk — 2x1 tiles.
    { name: 'scroll_tablet_desk',  x: 224, y: 64, width: 64, height: 32, layer: 'object',
      colliders: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },

    // Data fountain — 2x2 tiles, bottom row blocks.
    { name: 'data_fountain',       x: 288, y: 64, width: 64, height: 64, layer: 'object',
      colliders: [{ x: 0, y: 1 }, { x: 1, y: 1 }] },

    // Omphalos meeting circle — 1x1 decorative (place inside a privateAreaId zone).
    { name: 'omphalos_circle',     x: 352, y: 64, width: 32, height: 32, layer: 'object' },

    // --- Brand banner — 2x3 tiles (64x96), the Athena Growth logo as a hanging banner. ---
    { name: 'brand_banner',        x: 384, y: 64, width: 64, height: 96, layer: 'object',
      colliders: [{ x: 0, y: 2 }, { x: 1, y: 2 }] },

    // --- Brand crest — 2x2 tiles (64x64), the logo as a wall-mounted seal. ---
    { name: 'brand_crest',         x: 448, y: 64, width: 64, height: 64, layer: 'above_floor' },
]

const acropolisSpriteSheetData = new SpriteSheetData(width, height, url, sprites)

export { acropolisSpriteSheetData }
