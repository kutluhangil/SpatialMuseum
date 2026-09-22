# Changelog

Newest entries at the top.

## 2026-09-22
- Museum → university classroom: one realistic lecture room (9.6 × 8 m) with 20 two-person desks, lecturer desk, whiteboard, pull-down screen, ceiling projector, clock, radiators, cork board, suspended ceiling with LED panels and a beige ceramic tile floor (Poly Haven interior_tiles, CC0); all furniture merged into one draw call (worst view 24 draw calls, was 93).
- Lesson flow: sections and ordered steps in museum.json v2; videos start on the projection screen, notes appear on the whiteboard; Next/Previous on the desk, N/Space/B keys and A/X/B/Y on controllers. The visitor starts seated in the second row and stands up when walking or teleporting.
- museum.json v2 with a v1 migration; removed lobby and rooms, milk path, door signs, benches, skylights, light moods, corner props, gilt frames and the Poly Haven prop models. Doors that lead nowhere are drawn shut.
- Fixed: lesson/wall videos stayed black in development (StrictMode dropped the video src and the texture's frame callback); two-line panel titles overlapped the body text.
- KTX2 (Basis Universal) textures everywhere: paintings and prop maps UASTC, parquet and panorama ETC1S; estimated GPU texture memory ~187 MB → ~39 MB. Encoded by `scripts/lib/ktx2.ts` (ffmpeg + ktx2-encoder WASM) from `media:artworks` / `media:polyhaven`; props load through three's GLTFLoader with `KHR_texture_basisu`.
- Windows with deep reveals, architraves, sills and glazing bars, looking out onto a CC0 meadow panorama (Poly Haven meadow_2); sunlight patches with glazing-bar shadows on the floor. Schema: `room.windows` (exterior walls only, validated).
- Room light moods (`room.mood`: gallery / morning / night): tinted baked light, spot and sun intensity; the night room gets a dark-blue skylight.
- Classic gallery architecture: panelled dado with chair rail, picture rail, cornice caps over doors, coffered soffit around skylights; lobby raised to 4.5 m with the museum name inscribed.
- Props from free room corners (`room.decor`): plants in ceramic planters, a nursing corner with rocking chair and side table (Poly Haven CC0 models via `npm run media:polyhaven`).
- XR sharpness: framebuffer ×1.25 paid for with foveation 0.75 (to calibrate on Quest 3S).
- Rooms load within two doorways (no panorama showing through the hub's far door); rooms two doors away render at reduced detail. Frame shadows and card backgrounds merged: worst view 164 → 93 draw calls.

## 2026-09-21
- Visual pass (Faz 5 pulled forward): herringbone parquet (Poly Haven, CC0, AO baked in), baked wall/floor/ceiling AO, baseboards, crown moulding, door casings, skylights with mullions, ceiling spot fixtures and additive light pools per exhibit.
- Virtual paintings: 9 public-domain / CC0 mother-and-child paintings (Cassatt, Morisot, Renoir) in moulded gilt and walnut frames with soft drop shadows; `npm run media:artworks` fetches them after checking each licence on Wikimedia Commons.
- New gallery room "Sanatta annelik" south of the lobby (5 rooms, 19 exhibits); room-name plaques above doors; upholstered benches; golden "süt yolu" floor path branching from the lobby.
- Desktop walking collides with walls and benches and slides along them; XR teleport targets are kept 0.4 m off walls.
- Placards size themselves to their text and centre under narrow works.
- Faz 2: Zod schema for museum.json with cross-reference rules (rooms, doors, overlaps, door openings, tour stops) and `npm run validate` wired into the build.
- Faz 2: procedural museum — per-room merged walls with door openings, door trim, baked vertex-colour light; lazy loading of current room + door neighbours.
- Faz 2: basic exhibit drawing (video poster + click to play, image with frame, text panel, wall label) with dmm-based text sizes.
- Faz 2: sample museum.json (lobby + 3 rooms) and unit tests for schema and wall math.
- Faz 0: Vite + React + TypeScript (strict) scaffold with R3F, drei, @react-three/xr, uikit, Tailwind, ESLint, Prettier, Vitest.
- Faz 0: /spike device-test room — legibility chart (30/40/50/70 dmm), Turkish glyph test in troika and uikit, 1080p test video, teleport and 45° snap turn, drag-to-look + WASD on desktop.
- Faz 0: Atkinson Hyperlegible Next static 400/600/700 instances generated from the variable font.
