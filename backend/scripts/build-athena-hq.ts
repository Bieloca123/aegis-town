// Generates the Athena HQ map — Greek-themed office template used as the
// default map for newly-created realms (frontend/utils/defaultmap.json, read
// by CreateRealmModal).
//
// Run:  npx ts-node backend/scripts/build-athena-hq.ts

import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'

// ----------------------------------------------------------------------------
// Schema (mirrors frontend/utils/pixi/zod.ts).
// ----------------------------------------------------------------------------

const TeleporterSchema = z.object({ roomIndex: z.number(), x: z.number(), y: z.number() })
const TileSchema = z.object({
    floor: z.string().optional(),
    above_floor: z.string().optional(),
    object: z.string().optional(),
    impassable: z.boolean().optional(),
    teleporter: TeleporterSchema.optional(),
    privateAreaId: z.string().optional(),
})
const TileMapSchema = z.record(z.string().regex(/^(-?\d+), (-?\d+)$/), TileSchema)
const RoomSchema = z.object({ name: z.string(), tilemap: TileMapSchema, channelId: z.string().optional() })
const SpawnpointSchema = z.object({ roomIndex: z.number(), x: z.number(), y: z.number() })
const RealmDataSchema = z.object({ spawnpoint: SpawnpointSchema, rooms: z.array(RoomSchema) })

type Tile = z.infer<typeof TileSchema>
type Tilemap = Record<string, Tile>
type RealmData = z.infer<typeof RealmDataSchema>

// ----------------------------------------------------------------------------
// Sprite catalog — every name here must exist in
// frontend/utils/pixi/spritesheet/acropolis.ts.
// ----------------------------------------------------------------------------

const T = {
    // floors
    marble_white:        'acropolis-marble_white',
    marble_dark:         'acropolis-marble_dark',
    marble_neon:         'acropolis-marble_neon_grout',
    mosaic_logo:         'acropolis-mosaic_athena_logo',
    circuit_grass:       'acropolis-circuit_grass',
    hex_holo:            'acropolis-hex_holo_floor',
    server_floor:        'acropolis-server_floor',
    oracle_disc:         'acropolis-oracle_disc',
    // walls / above_floor
    wall_top:            'acropolis-marble_wall_top',
    wall_mid:            'acropolis-marble_wall_mid',
    wall_bot:            'acropolis-marble_wall_bot',
    pediment_l:          'acropolis-pediment_l',
    pediment_m:          'acropolis-pediment_m',
    pediment_r:          'acropolis-pediment_r',
    laurel_arch_l:       'acropolis-laurel_arch_l',
    laurel_arch_r:       'acropolis-laurel_arch_r',
    cable_ivy_trim:      'acropolis-cable_ivy_trim',
    brand_crest:         'acropolis-brand_crest',
    // objects
    doric_column:        'acropolis-doric_column',         // 1×3, foot collider
    athena_statue:       'acropolis-athena_holostatue',    // 2×3, foot row
    server_altar:        'acropolis-server_altar',         // 2×2, foot row
    amphora_pc:          'acropolis-amphora_pc',           // 1×2, foot
    laurel_planter:      'acropolis-cyber_laurel_planter', // 1×1
    scroll_desk:         'acropolis-scroll_tablet_desk',   // 2×1, full row
    data_fountain:       'acropolis-data_fountain',        // 2×2, foot row
    omphalos:            'acropolis-omphalos_circle',      // 1×1, no collider
    brand_banner:        'acropolis-brand_banner',         // 2×3, foot row
}

// ----------------------------------------------------------------------------
// Office geometry — the building has 8 walled department rooms (4 left, 4
// right) flanking a central marble atrium. Each dept room has a 2-tile door
// in the wall facing the atrium.
//
// Outer perimeter at x=0 / x=W-1 / y=0 / y=H-1.
// Left  dept rooms occupy x=1..LEFT_X_END  (interior).
// Right dept rooms occupy x=RIGHT_X_START..W-2 (interior).
// Vertical walls separate the dept columns from the atrium.
// Each dept room is ROOM_HEIGHT tiles tall; horizontal walls divide them.
// ----------------------------------------------------------------------------

const W = 80
const H = 49

const ROOM_HEIGHT = 11        // interior rows per dept room
const FIRST_ROOM_TOP = 1      // y of the topmost dept-room interior

const LEFT_X_END     = 24
const LEFT_WALL_X    = 25     // vertical wall column between left rooms and atrium
const ATRIUM_X_START = 26
const ATRIUM_X_END   = 53
const RIGHT_WALL_X   = 54     // vertical wall column between atrium and right rooms
const RIGHT_X_START  = 55

// y of each horizontal divider between stacked rooms (interior)
const DIVIDERS_Y = [
    FIRST_ROOM_TOP + ROOM_HEIGHT,                  // 12
    FIRST_ROOM_TOP + 2 * ROOM_HEIGHT + 1,           // 24
    FIRST_ROOM_TOP + 3 * ROOM_HEIGHT + 2,           // 36
]
// y range for each of the 4 stacked rooms (top..bottom inclusive, interior only)
const ROW_RANGES: Array<[number, number]> = [
    [FIRST_ROOM_TOP,                          DIVIDERS_Y[0] - 1], // 1..11
    [DIVIDERS_Y[0] + 1,                       DIVIDERS_Y[1] - 1], // 13..23
    [DIVIDERS_Y[1] + 1,                       DIVIDERS_Y[2] - 1], // 25..35
    [DIVIDERS_Y[2] + 1,                       H - 2],             // 37..47
]

type Rect = { x: number; y: number; w: number; h: number }
type Seat = { x: number; y: number }

type Department = {
    id: string
    name: string
    privateAreaId: string
    channelId: string
    side: 'left' | 'right'
    rowIndex: 0 | 1 | 2 | 3        // which stacked room slot
    floorTile: string
    desks: Array<{ owner: string; deskX: number; deskY: number; seat: Seat }>
    extraObjects?: Array<{ x: number; y: number; tile: string; spans?: { w: number; h: number; colliders: Array<{x:number;y:number}> } }>
}

function mkDesk(owner: string, deskX: number, deskY: number) {
    return { owner, deskX, deskY, seat: { x: deskX, y: deskY + 1 } }
}

// Helper to compute the door-gap y-pair for a row index.
function doorGapForRow(rowIndex: 0 | 1 | 2 | 3): [number, number] {
    const [top, bot] = ROW_RANGES[rowIndex]
    const mid = Math.floor((top + bot) / 2)
    return [mid - 1, mid]
}

const DEPARTMENTS: Department[] = [
    {
        id: 'leadership', name: 'Leadership',
        privateAreaId: 'dept:leadership', channelId: 'dept-leadership',
        side: 'left', rowIndex: 0, floorTile: T.mosaic_logo,
        desks: [
            mkDesk('Gabriel (CEO)',            6, 5),
            mkDesk('Marina (CFO)',             12, 5),
            mkDesk('Jose Martins (Projetos)',  18, 5),
        ],
        extraObjects: [
            { x: 4,  y: 9, tile: T.laurel_planter },
            { x: 20, y: 9, tile: T.laurel_planter },
        ],
    },
    {
        id: 'design', name: 'Design',
        privateAreaId: 'dept:design', channelId: 'dept-design',
        side: 'left', rowIndex: 1, floorTile: T.hex_holo,
        desks: [
            mkDesk('Samuel (Designer Pleno)',  8, 17),
            mkDesk('Isaque (Designer Junior)', 16, 17),
        ],
        extraObjects: [
            { x: 12, y: 21, tile: T.amphora_pc, spans: { w: 1, h: 2, colliders: [{ x: 0, y: 1 }] } },
        ],
    },
    {
        id: 'trafego', name: 'Tráfego Local Services',
        privateAreaId: 'dept:trafego', channelId: 'dept-trafego',
        side: 'left', rowIndex: 2, floorTile: T.circuit_grass,
        desks: [
            mkDesk('Camila Leite',  8, 29),
            mkDesk('Thiago Koury', 16, 29),
        ],
    },
    {
        id: 'sucesso', name: 'Sucesso do Cliente',
        privateAreaId: 'dept:sucesso', channelId: 'dept-sucesso',
        side: 'left', rowIndex: 3, floorTile: T.marble_neon,
        desks: [
            mkDesk('Lari Auricho', 8, 41),
            mkDesk('Julie',        16, 41),
        ],
        extraObjects: [
            { x: 12, y: 44, tile: T.laurel_planter },
        ],
    },
    {
        id: 'sales', name: 'Sales',
        privateAreaId: 'dept:sales', channelId: 'dept-sales',
        side: 'right', rowIndex: 0, floorTile: T.marble_neon,
        desks: [
            mkDesk('Bruno (SDR)',            60, 5),
            mkDesk('Kananda (Closer)',       66, 5),
            mkDesk('William Alves (Closer)', 72, 5),
        ],
        extraObjects: [
            { x: 58, y: 9, tile: T.laurel_planter },
            { x: 75, y: 9, tile: T.laurel_planter },
        ],
    },
    {
        id: 'gcrm', name: 'Google & CRM',
        privateAreaId: 'dept:gcrm', channelId: 'dept-gcrm',
        side: 'right', rowIndex: 1, floorTile: T.server_floor,
        desks: [
            mkDesk('Jhulya (Analista Jr)',           60, 17),
            mkDesk('Matheus Rodrigues (Pleno)',      72, 17),
        ],
        extraObjects: [
            { x: 65, y: 21, tile: T.server_altar, spans: { w: 2, h: 2, colliders: [{ x: 0, y: 1 }, { x: 1, y: 1 }] } },
        ],
    },
    {
        id: 'finance', name: 'Finance',
        privateAreaId: 'dept:finance', channelId: 'dept-finance',
        side: 'right', rowIndex: 2, floorTile: T.marble_dark,
        desks: [
            mkDesk('Guilherme (Analista Financeiro)', 66, 29),
        ],
        extraObjects: [
            { x: 60, y: 30, tile: T.amphora_pc, spans: { w: 1, h: 2, colliders: [{ x: 0, y: 1 }] } },
            { x: 72, y: 33, tile: T.laurel_planter },
        ],
    },
    {
        id: 'callcenter', name: 'Call Center',
        privateAreaId: 'dept:callcenter', channelId: 'dept-callcenter',
        side: 'right', rowIndex: 3, floorTile: T.marble_dark,
        desks: [
            mkDesk('Lauane (Atendimento)', 66, 41),
        ],
        extraObjects: [
            { x: 60, y: 42, tile: T.amphora_pc, spans: { w: 1, h: 2, colliders: [{ x: 0, y: 1 }] } },
            { x: 72, y: 45, tile: T.laurel_planter },
        ],
    },
]

// ----------------------------------------------------------------------------
// Painter
// ----------------------------------------------------------------------------

class Painter {
    tiles: Tilemap = {}
    private get(x: number, y: number): Tile {
        const k = `${x}, ${y}`
        if (!this.tiles[k]) this.tiles[k] = {}
        return this.tiles[k]
    }
    floor(x: number, y: number, name: string)         { this.get(x, y).floor = name }
    above(x: number, y: number, name: string)         { this.get(x, y).above_floor = name }
    object(x: number, y: number, name: string)        { this.get(x, y).object = name }
    impassable(x: number, y: number)                  { this.get(x, y).impassable = true }
    privateArea(x: number, y: number, areaId: string) { this.get(x, y).privateAreaId = areaId }

    fillFloor(rect: Rect, name: string) {
        for (let dy = 0; dy < rect.h; dy++)
            for (let dx = 0; dx < rect.w; dx++)
                this.floor(rect.x + dx, rect.y + dy, name)
    }
    fillPrivateArea(rect: Rect, areaId: string) {
        for (let dy = 0; dy < rect.h; dy++)
            for (let dx = 0; dx < rect.w; dx++)
                this.privateArea(rect.x + dx, rect.y + dy, areaId)
    }

    /** Paint a horizontal interior wall along row y, spanning x∈[x1, x2], skipping `gaps` (inclusive ranges). */
    horizontalWall(y: number, x1: number, x2: number, gaps: Array<[number, number]> = []) {
        for (let x = x1; x <= x2; x++) {
            if (gaps.some(([gx1, gx2]) => x >= gx1 && x <= gx2)) continue
            this.above(x, y, T.wall_mid)
            this.impassable(x, y)
        }
    }
    /** Paint a vertical interior wall along column x, spanning y∈[y1, y2], skipping `gaps` (inclusive ranges). */
    verticalWall(x: number, y1: number, y2: number, gaps: Array<[number, number]> = []) {
        for (let y = y1; y <= y2; y++) {
            if (gaps.some(([gy1, gy2]) => y >= gy1 && y <= gy2)) continue
            this.above(x, y, T.wall_mid)
            this.impassable(x, y)
        }
    }
}

// Place a multi-tile object (anchor at FOOT tile per the renderer's anchor.y
// convention) and mark its colliders impassable.
function placeMultiTileObject(
    p: Painter, x: number, y: number,
    spriteName: string,
    colliders: Array<{ x: number; y: number }>,
) {
    p.object(x, y, spriteName)
    for (const c of colliders) p.impassable(x + c.x, y + c.y)
}

// ----------------------------------------------------------------------------
// Build
// ----------------------------------------------------------------------------

function build(): { realm: RealmData; tileCount: number } {
    const p = new Painter()

    // 1) Base floor everywhere inside the perimeter (atrium look).
    p.fillFloor({ x: 1, y: 1, w: W - 2, h: H - 2 }, T.marble_white)

    // 2) Atrium walkway gets neon-grout marble for that polished hall feel.
    p.fillFloor(
        { x: ATRIUM_X_START, y: 1, w: ATRIUM_X_END - ATRIUM_X_START + 1, h: H - 2 },
        T.marble_neon,
    )
    // Mosaic-logo carpet below the omphalos huddle.
    p.fillFloor({ x: 38, y: 25, w: 5, h: 5 }, T.mosaic_logo)

    // 3) Department rooms — floor, desks, extra furniture, private-area zone.
    for (const dept of DEPARTMENTS) {
        const [yTop, yBot] = ROW_RANGES[dept.rowIndex]
        const xStart = dept.side === 'left' ? 1 : RIGHT_X_START
        const xEnd   = dept.side === 'left' ? LEFT_X_END : W - 2
        const room: Rect = { x: xStart, y: yTop, w: xEnd - xStart + 1, h: yBot - yTop + 1 }

        p.fillFloor(room, dept.floorTile)
        p.fillPrivateArea(room, dept.privateAreaId)

        for (const d of dept.desks) {
            // scroll_tablet_desk is 2×1, anchor at top-left, both cells block.
            p.object(d.deskX, d.deskY, T.scroll_desk)
            p.impassable(d.deskX, d.deskY)
            p.impassable(d.deskX + 1, d.deskY)
        }
        for (const obj of dept.extraObjects ?? []) {
            if (obj.spans) placeMultiTileObject(p, obj.x, obj.y, obj.tile, obj.spans.colliders)
            else { p.object(obj.x, obj.y, obj.tile); p.impassable(obj.x, obj.y) }
        }
    }

    // 4) Atrium centerpieces — column of brand iconography down the middle.
    const ax = 39 // atrium center-left column (statue spans x=39..40)
    placeMultiTileObject(p, ax, 6,  T.brand_banner,  [{ x: 0, y: 2 }, { x: 1, y: 2 }])
    placeMultiTileObject(p, ax, 14, T.athena_statue, [{ x: 0, y: 2 }, { x: 1, y: 2 }])
    placeMultiTileObject(p, ax, 22, T.data_fountain, [{ x: 0, y: 1 }, { x: 1, y: 1 }])
    p.object(40, 27, T.omphalos)
    p.fillPrivateArea({ x: 38, y: 25, w: 5, h: 5 }, 'dept:allhands')

    // 5) Doric columns lining the atrium — alternating along both inner walls.
    const colRowsLeft  = [4, 10, 16, 22, 28, 34, 40, 46]
    const colRowsRight = [4, 10, 16, 22, 28, 34, 40, 46]
    for (const y of colRowsLeft)  placeMultiTileObject(p, ATRIUM_X_START,    y, T.doric_column, [{ x: 0, y: 2 }])
    for (const y of colRowsRight) placeMultiTileObject(p, ATRIUM_X_END,      y, T.doric_column, [{ x: 0, y: 2 }])

    // 6) Outer perimeter walls (pediment top, marble walls on sides, wall_bot at bottom).
    for (let x = 0; x < W; x++) {
        const ped = x === 0 ? T.pediment_l : x === W - 1 ? T.pediment_r : T.pediment_m
        p.above(x, 0, ped); p.impassable(x, 0)
        p.above(x, H - 1, T.wall_bot); p.impassable(x, H - 1)
    }
    for (let y = 1; y < H - 1; y++) {
        p.above(0, y, T.wall_mid);     p.impassable(0, y)
        p.above(W - 1, y, T.wall_mid); p.impassable(W - 1, y)
    }

    // 7) Interior walls — vertical dividers (with door gaps) and horizontal
    //    partitions between stacked rooms.
    const leftDoors  = ([0, 1, 2, 3] as const).map(i => doorGapForRow(i))   // y-gap pairs
    const rightDoors = ([0, 1, 2, 3] as const).map(i => doorGapForRow(i))
    p.verticalWall(LEFT_WALL_X,  1, H - 2, leftDoors)
    p.verticalWall(RIGHT_WALL_X, 1, H - 2, rightDoors)
    // Horizontal partitions on left side (between stacked dept rooms).
    for (const y of DIVIDERS_Y) {
        p.horizontalWall(y, 1, LEFT_X_END, /* no door gaps */)
        p.horizontalWall(y, RIGHT_X_START, W - 2, /* no door gaps */)
    }

    // 8) Build the realm.
    const realm: RealmData = {
        spawnpoint: { roomIndex: 0, x: 40, y: 42 }, // bottom of atrium, central
        rooms: [
            { name: 'Athena HQ', tilemap: p.tiles, channelId: 'athena-hq-main' },
        ],
    }

    return { realm, tileCount: Object.keys(p.tiles).length }
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

function main() {
    const repoRoot = path.resolve(__dirname, '..', '..')
    const defaultMapPath = path.join(repoRoot, 'frontend', 'utils', 'defaultmap.json')

    const { realm, tileCount } = build()
    const validated = RealmDataSchema.parse(realm)

    const totalSeats = DEPARTMENTS.reduce((n, d) => n + d.desks.length, 0)
    if (totalSeats !== 16) {
        throw new Error(`expected 16 seats across departments, got ${totalSeats}`)
    }

    fs.writeFileSync(defaultMapPath, JSON.stringify(validated))

    console.log('Athena HQ map built.')
    console.log(`  dimensions:  ${W} × ${H}`)
    console.log(`  tile count:  ${tileCount}`)
    console.log(`  rooms:       8 walled departments + central atrium`)
    console.log(`  seats:       ${totalSeats} across ${DEPARTMENTS.length} departments`)
    console.log(`  spawnpoint:  (${realm.spawnpoint.x}, ${realm.spawnpoint.y}) in room ${realm.spawnpoint.roomIndex}`)
    console.log(`  wrote:       ${path.relative(repoRoot, defaultMapPath)}`)
}

main()
