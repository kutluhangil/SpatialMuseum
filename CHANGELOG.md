# Changelog

Newest entries at the top.

## 2026-09-23
- The room is a breastfeeding class, not a generic lecture hall: a low nursing chair with its C-pillow and swaddled teaching doll stands in front of the board, beside the table the expressing section is taught from (pump, funnel, bottles, folded muslins) and a demonstration bassinet on its stand. All of it merges into the one classroom mesh, so it costs no draw call.
- Wall screens play like players now: once started they carry a control strip with a play/pause mark, the elapsed and total time, and a progress line along the foot of the picture.
- Baked light pass on the hall: daylight now falls off across the whole room instead of sitting within a few per cent of white, and carries a warm/cool split (cool by the glass, warm where only the fittings and the floor bounce reach).
- Ceiling panels throw a wash on the wall beside them, so a fourteen-metre wall reads as scalloped by fittings rather than as an even gradient.
- Furniture is occluded towards the floor, and every desk and chair is tinted a few per cent off its neighbours, so a row of thirty stops reading as one model copied.
- Contact shadows gained a core under the legs on top of their penumbra; corner, floor-seam and ceiling-seam occlusion on walls and floor deepened.
- Wall plaster covers 2.5 m per repeat with roller patches and deterministic speckle, which breaks up the flatness without tiling visibly.
- The class's own work is in the room: 24 poster pages hung in two rows along the back wall and six video stations on the side wall, imported from `content/media/raw` by `npm run media:classroom` (KTX2 atlases for the pages, H.264 for the videos).
- The posters are drawn as two atlases, so the whole exhibition costs one draw call per sheet instead of one per page; `posterWall` in `content/museum.json` decides where the run hangs and the schema checks it clears the door and fits the wall.
- Pages drawn in white ink on a transparent background are flattened onto a dark board rather than white paper, which is what makes half of them readable at all.
- The room grew to a 14 × 12 m hall (30 desks, 60 seats, 3.4 m ceiling) so the exhibition has wall to hang on; the board and screen are centred on the front wall, and the pin board gave way to the posters.
- The lesson plays the class's own videos: six sections now, with expressing and storing milk, and the difficulties that come up.
- Wall screens got a bezel and a play mark, so they read as something to press.
- Meta Quest 2 is now the baseline device: quality profiles per headset (framebuffer scale, foveation, target frame rate, anisotropy), the two decorative transparent passes switched off there, and a `?stats` panel on the wall so the headset can be calibrated from inside it (ADR `docs/decisions/0006-quest2.md`).
- Teleporting blinks to black for a tenth of a second, which is what keeps a jump cut comfortable.
- English throughout: lesson, sections, painting labels and interface, chosen by `?lang=en`, a switch in the corner or the browser's language, and remembered.
- A loading screen with real progress, and the playing video's title written under the screen.
- Real lesson: four sections and fourteen steps of breastfeeding teaching (first days, positions and latch, night feeds, art), written for students. Draft content — a lactation consultant should review it before any class uses it.
- The lesson resumes where the student left off (localStorage, guarded), and `[` / `]` jump whole sections.
- Sound: a procedural room tone and step clicks built in WebAudio (no audio files), started on the first gesture, with a switch in the corner that is remembered.
- The light switch and the blind chains work: the LED panels go dark, the blinds roll up and down (instantly for anyone who asked for reduced motion), and the sunlight patches follow the blinds.
- The window now looks onto a campus lawn with paths and benches (Poly Haven charolettenbrunn_park, CC0) instead of a meadow.
- Visual regression tests: `npm run test:visual` drives three fixed viewpoints in headless Chromium, compares them against reference screenshots, checks the draw-call budget and fails on console errors.
- Graphics pass: floor wear at the doorway and down the aisle baked into the tiles, window reflections smeared across the polished floor, full anisotropy on floor and ceiling.
- The view outside reads as daylight: the panorama carries an outdoor exposure and haze gathering towards the horizon, so windows look bright rather than flat green.
- Walls carry a faint plaster texture (world-anchored UVs, one square metre per repeat) instead of flat colour; the whiteboard keeps the ghosts of wiped marker.
- Desks got their ABS edge band and chairs a darker moulded rim, so both read as school furniture rather than slabs.
- The class is students, not mothers: welcome note and code comments updated.

## 2026-09-22
- Classroom visual level 2: roller blinds part-way down in every window (cassette, bottom bar, bead chain; seeded drop); double sockets along the walls, light switch and fire alarm call point by the door; four markers and an eraser on the whiteboard tray; door hardware (lever on rosette, key escutcheon, frosted vision panel, kick plate, hinges, overhead closer, threshold); ceiling diffusers, smoke detectors and front speakers in whole grid tiles. All merged into existing meshes: no new draw calls.
- Fixed: the outdoor panorama showed through the gap between the shut door leaf and its casing, and under the leaf.
- Sunlight patches on the floor now stop where the blinds do: each patch is shortened by how far its window's blind is down.
- Classroom visual level 3: waste bin beside the lecturer (with its own contact shadow), coat rail with three hooks and two pinned notices on the back wall, thermostatic valves and return pipes on the radiators.
- Classroom visual level 4: the lecturer's desk is left in use — a stack of marked papers with the top sheet askew, a mug and a small pot plant.
- Classroom visual pass: contact shadows under desks, chairs and radiators; chairs slightly turned and shifted (seeded, same every load; the visitor's own chair stays put); notebooks, pens and bottles on some desks; baked daylight across walls, floor, ceiling and furniture (window wall backlit, far side dimmer); Fresnel sheen on the glazed floor; tinted window glass with reflection streaks and tilt-and-turn handles; ceiling T-bar grid and mineral-fibre speckle baked into a mipmapped tile texture (no grid shimmer in the headset).
- Fixed: soft shadows were invisible (alphaMap reads the green channel; the texture was black on transparent). Picture-frame drop shadows now show too.
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
