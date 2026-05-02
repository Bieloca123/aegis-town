# Character spritesheets

Each file is one player skin. Numeric ID (`Character_NNN.png`) is the public
identifier and is what gets stored in `profiles.skin` in Supabase. The numbered
roster is registered in `frontend/utils/pixi/Player/skins.ts`.

## Sheet format (mandatory)

- **Image size:** 192×192 px, transparent background.
- **Frame size:** 48×48 px.
- **Layout:** 4 columns × 4 rows = 16 frames.
- **Row order (top → bottom):** `walk_down`, `walk_left`, `walk_right`, `walk_up`.
- **Frame order within a row:** 4 frames of the walk cycle.
- **Anchor:** (0.5, 1) — sprite is anchored at the bottom-center of its 48×48 cell.

Frame mapping is defined once in `frontend/utils/pixi/Player/PlayerSpriteSheetData.ts`
and applies to every skin — do not deviate from this layout.

## Pending art

| ID | Name | Theme | Brand notes |
|---|---|---|---|
| `084` | Athena | Strategy & Wisdom | White/gold chiton; golden aegis breastplate stamped with the Athena Growth column-in-circle mark; miniature owl on shoulder; short spear in right hand; subtle glowing-blue cybernetic laurel headband. Pixel art at 48×48 per frame. |

### Production workflow

1. Generate per-direction strips with an image model (Stable Diffusion / GPT-image)
   — one prompt per direction with consistent palette and pose.
2. Clean up in Aseprite: snap to 48×48 cells, ensure feet sit on the bottom edge,
   verify all four directions share the same color palette.
3. Composite into a single 192×192 PNG matching the layout above.
4. Save as `Character_084.png` here.

No code change is required after dropping the file in — the registry already
references id `084`.
