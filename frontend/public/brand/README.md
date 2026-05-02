# Athena Growth brand assets

Drop-in folder for the official Athena Growth brand marks used inside Aegis City
(loading screens, logo banners, the in-world `brand_banner` / `brand_crest`
sprites in the acropolis tileset, etc.).

## Expected files

| File | Purpose | Format | Notes |
|---|---|---|---|
| `athena-mark.png` | Icon-only mark (column-in-circle with crescent arc) | PNG, transparent BG | Used as wall crest, in-game banner, app favicon. Source ref provided by Gabriel — monochrome, dark variant. |
| `athena-mark-light.png` | Same mark, light/inverted variant | PNG, transparent BG | For dark backgrounds. |
| `athena-wordmark.png` | Full logotype (`ATHENA / GROWTH` lockup) | PNG, transparent BG | Used in modals, loading screens. |

## Source of truth

References were shared in chat on 2026-05-01 by Gabriel. Save the highest-resolution
versions here and keep filenames stable — they are referenced from code (e.g. the
acropolis tileset's `brand_banner` / `brand_crest` sprites bake the mark into the
PNG, but loading screens may load these directly).
