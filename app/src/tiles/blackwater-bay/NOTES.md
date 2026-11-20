# Blackwater Bay: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Built, and ready for the collector to judge. Every lot has its model, the ten dragons fly from the homes their show asked for, the roads carry their travellers, two boats move on the water and the tide rises and falls. The checks under "What was checked" were run on the tile as it stands. It is not on the board yet: standing it there, and the documents, the READMEs and the public pictures, are the main session's when it merges the branch. The last two fits between the dragons and the Dragonmont were settled with the main session: the summit is cut level at 44 as a crater's floor that Meraxes lies over, and a rib of rock runs over each cave, so that Vermithor's tail, which lies along the flank, lies in rock.

## Choices made while the collector slept

He went to bed on 20 November 2026 trusting the tile to go on ("trust you have this handled"). Where a choice was his to make, the safer one was taken and built on. Each is one setting, or a small piece of work, to turn the other way.

- **The tide's round.** 150 seconds: low water for 60, rising for 30, high water for 30, falling for 30 (`TIDE` in `tide.ts`). At high water the sea stands a little over the causeway's road. The travellers and the heroes on the causeway ford it rather than stopping: the routes are loops and nothing on them waits.
- **The hero on the sands stays dry.** The place for a hero beside the causeway is a bar of sand that the tide leaves dry, so that at high water the car stands on an island of its own rather than in the sea (`SANDBAR` in `plan.ts`). The other way is to let it stand in the shallows.
- **Few travellers.** Eighteen on six roads: drovers with flocks and cattle, litters, strings of mules and barrows, and no carts. The tile reads as a place of dragons first. More are one number per road in `roads.ts`.
- **The winks at toy cars.** The Dragonpit's forecourt is the meet before the bronze doors, one of the forty vaults stands open as a garage, and the sands are a beach at low water. Each is a place for a hero, and nothing more is made of them.
- **The south road runs on to Massey's Hook**, the whole length of the south shore through the kingswood, for the drovers.
- **"GIVE WAY TO DRAGONS"** stands once, on a board at the top of the climb to the Dragonpit, by order of the Dragonkeepers. It is the screen's picture.
- **A second joke, "LOST: ONE SHEEP".** The research note's other idea for the screen is a shepherd's notice: a white sheep, "Last seen leaving with a dragon", "Reward. Ask at the fold." It hangs small on the fold by the Wendwater, where Sheepstealer takes his sheep, not on the screen. It is one sign in `south-shore.ts`.
- **The Street of the Sisters is dressed for a procession**: crowds two deep, Targaryen and Velaryon banners, pennants strung across. The Golden Wedding that suggested it was in 49 AC; nothing on the tile names it, so it reads as a festival day.
- **Sheepstealer's sheep are alive.** The one penned below his lair is the books' freshly killed sheep made gentler, and the one he takes from the fold is set back down.
- **What moves on the water keeps clear of the dragons.** A merchant cog was to sail a loop in the north bay, under three of the dragons' low passes; it lies at anchor in Duskendale instead. The ferry and a Velaryon galley on patrol are what moves.

## Sources and rights

The books only: Fire & Blood above all, with The World of Ice and Fire and A Song of Ice and Fire, as the research notes read them: [house-of-the-dragon.md](../../../../docs/districts/research/house-of-the-dragon.md) and [the-great-dragons.md](../../../../docs/districts/research/the-great-dragons.md). The builders checked looks against wiki summaries of the books where they could; what each could not confirm is under "Liberties".

Nothing comes from the television series: not its dragons, its Dragonpit, its castles, its lettering or its map. No character is portrayed, nobody rides a dragon, and nothing shows a battle or a death: no bones in the lairs, no fire over a ship. Only the Targaryen and Velaryon arms were checked, so only they are drawn; every other house flies plain colours.

## The things on the tile

**King's Landing**, behind its walls on the north bank of the Rush:
- **The Dragonpit, whole** (`dragonpit.ts`): a drum of forty bays and a dome of dark lead with bronze ribs on the crown of the Hill of Rhaenys, on a walled terrace. The bronze doors face south onto the forecourt. The forty vaults' iron doors are in the terrace walls, two of them open and one a hero's garage. Dragonkeepers in black with crested helms; their hall on the east apron, the larder and a sheep fold on the west. GIVE WAY TO DRAGONS at the top of the climb.
- **The walls, gates and quays** (`walls.ts`): the curtain with its towers, its walk inside and slits outside; the Iron Gate on the Rosby road and the River Gate on the quays, gold cloaks in their portals; two shut gates; the drovers' pen inside the Iron Gate; the quays with their water stairs, a treadwheel crane, a fish stall, sailors and porters. Where the Dragonpit's terrace meets the wall, the wall is its parapet.
- **The houses** (`houses.ts`): ten blocks of tall timber-and-stone houses, each its own, upper storeys jutting over the lanes; a smithy, a bakery, an inn, a chandler of candles; Visenya's Hill ringed with houses up to a paved close and a seven-sided sept of pale stone under a lead dome; the two squares at the terrace's foot with wells, stalls and crowds; the dressed street.
- **The Red Keep** (`red-keep.ts`): pale red stone, seven drum towers with iron crowns, a barbican before open bronze gates, the throne room's tall windows, Maegor's Holdfast in its dry moat with Kingsguard at its drawbridge, and the great tower, flat on top for Caraxes. Aegon's High Hill is terraced on the city side and falls in a banded cliff to the bay, with stairs to a postern on Aegon's strand, where three small ships of the Conquest lie drawn up.

**The north shore** (`north-shore.ts`), along the Rosby road: Rosby's square keep among its wattle huts; Stokeworth's round tower-house and walled orchard; the fishing village; Duskendale behind pale walls, the road through its two gates, and the Dun Fort on its harbour; Rook's Rest at the road's end, rooks about its keep; Crackclaw Point's hills, pines, bog and a clan's hall in its palisade; Claw Isle's castle on its rock. Farms, a shrine to the Seven, people at work.

**Dragonstone** (`dragonstone.ts`), at the Dragonmont's south-west foot: the castle of black stone with gargoyles for merlons and its buildings shaped as the books say, the Windwyrm rearing, the Sea Dragon watching the water, the Great Hall a dragon on its belly whose mouth is the door and whose tail is the Dragon's Tail arch, the kitchens a dragon coiled round a steaming dome; the Stone Drum with the Painted Table's four windows; Aegon's Garden; the town, the quay and the old inn with its worn gargoyle.

**The Dragonmont** (`dragonmont.ts`): a cone rising to a crater at 44, black where steep and ash where level, a ragged rim round the crater glowing at night, Meraxes lying over it; four lairs, each a level shelf before a cave mouth of rough rock; vents with steam, each 15 or more from every dragon; Grey Ghost's vent on the north-east flank; Sheepstealer's sheep penned below his ledge; the camp of the Sowing at the foot, onlookers pointing up. **Vhagar's rock** lies in the bay under King's Landing's east wall (`land.ts`).

**Driftmark** (`driftmark.ts`): Castle Driftmark, damp and cramped on its rock under seahorse banners; Hull's quay and warehouses; the shipyards with a ship half built on the stocks and the hero's empty slip; Spicetown's warehouses, counting house and quay of bales from the east; the strand by the causeway; fields, farms and flocks.

**High Tide** (`high-tide.ts`): pale stone and silver cones on its islet in the Gullet; the great gate where the causeway comes in; the hall with a glimpse of the Driftwood Throne through its open door; a loggia under striped silk; a court with a seahorse fountain; and, for Meleys, a gallery across the court on one arch to a sea bastion, both at 16. The causeway runs on its low stone body across the sands between marker posts, and the sands carry weed, shells, a stranded boat and cockle gatherers.

**The south shore** (`south-shore.ts`): the ferry's landing with its bell; the meadow and the flock by the Wendwater, the round fold with its notice; the ford over the Wendwater; the kingswood of old oaks and pines with a forester, a charcoal burner, a woodcutter and deer; Massey's Hook with fishing hamlets and a beacon; Stonedance; Sharp Point closing to a prow with a spire.

**The water** (`ships.ts`, `tide.ts`): the Velaryon fleet at anchor across the Gullet and off Hull, galleys and great ships with the seahorse; cogs and a king's galley at the city's quays; three cogs at Duskendale; a Free Cities cog off Spicetown; fishing boats with their nets out; the ferry over the Rush; a Velaryon galley rowing her patrol east of Driftmark; and the tide over High Tide's sands.

**The travellers** (`traffic.ts`) and **the ten dragons** (`dragons.ts`): see below.

## How the tile is put together

- `plan.ts` is the tile as numbers: every lot as a rectangle with a height, the roads and their rings, the dragons' homes, the fleet, the flock, the places for heroes, and `groundAt`, the height of what a dragon lands on. It imports nothing.
- `land.ts` lays the ground and the water, `roads.ts` the roads and their lanes, `tide.ts` the tide.
- `regions.ts` lists eleven files, one for each part of the tile. Each was built by one builder from one brief (`tile-blackwater-bay-builders-brief.md` in the shared notes folder), in two waves of seven and three, and judged and committed by the main tile session. `look.ts` holds the shared stone, roofs, lights and parts; `space.ts` says where a builder may stand something.
- `city.ts` builds every lot by its region's model, or as a plain box with its name if no model is found or a model fails, and counts the triangles of each part. On the development server it runs the checks on every load: roads, lanes, and what the opening view sees by the plan's boxes.
- `index.ts` builds the dragons last, over everything else.

## The ground

- **The water** is the engine's, at -0.9, and the islands and the shores stand over it on low walls.
- **The tide** is the tile's own (`tide.ts`): a second surface of water over the sands between Driftmark and High Tide, whose middle rises from under the sands to a little over the causeway's road, and whose edge slopes down to below the bay's water eight units out, so that it swells out of the bay rather than standing in a wall. Its normals are level everywhere, as the bay's are, or the light draws a line where the slope meets the level. `blackwater.tide(share)` in the console stands it still for pictures, and `blackwater.tide(null)` lets it go.
- **The causeway** stands on a low dyke of stone across the sands (`DYKE` in `plan.ts`, built in `high-tide.ts`), its top just under the road and its kerbs no higher than the road, so that the road does not float over the sand and the tide covers both. Marker posts show the way across at high water.
- **The sands** lie at -0.35 (`SANDS_Y`): over the bay, under the tide. The sandbar rises to 0.16.
- **King's Landing's hills**: the Dragonpit's terrace at 6 over the Hill of Rhaenys, Visenya's Hill at 6, Aegon's High Hill at 8, terraced and cliffed by the Red Keep's builder.
- **The Dragonmont** (`DRAGONMONT`, `mountAt`) is a cone that would be 50 high, its top cut level at 44 as the crater's floor: Meraxes stands at 42 on the south side of it and her body lies back over it, clear. At each lair the plan cuts a level shelf into the slope and builds one out over it, and a cave runs back into the rock that a dragon's body lies in (`lairAt`); the caves may meet inside. Over each cave the plan raises a rib of rock (`RIB`, in `mountBuilt`): where a cave runs into the mountain the rib is buried, but Vermithor's runs along the east flank, and there it stands up as a spur, up to 13 over the slope at its far end, with his tail in it. `mountAt` is the cone cut at the crater, and the ribs are in `mountBuilt` and `groundAt` only. `landAt` over a cave gives the cave's floor, so whatever stands on the slope above one takes its height from `heightOn(MOUNT)`.
- **Vhagar's rock** (`VHAGAR_ROCK`): a low dark rock 18 by 13, top at 3, at (2, -14).
- **Crackclaw Point's hills and Claw Isle's rock** are the north shore's own (`heightAt` in `north-shore.ts`).
- **The Wendwater** ends a little short of the south edge and of the bay: the river is a hole in the south shore's ground, and a hole that touches its outline will not triangulate. Reeds stand on the strip at its mouth.

## Roads and travellers

Five pieces of land that never join: King's Landing, the north shore, Dragonstone, Driftmark with High Tide, and the south shore. Ships, the ferry and dragons cross the water between them. Six routes, two of them on Driftmark, each a closed loop that ends in a ring; traffic keeps left, as Westeros's does. Every lane is checked on every load against what is built.

The travellers are toy figures at a walk (`traffic.ts`): a drover in a hood with his crook, his dog and eleven black-faced sheep, one black; three head of cattle and their drover; a lord's curtained litter on four bearers' shoulders, a gold cloak of the City Watch ahead; three long-eared pack mules under bales from the east and their muleteer; a fishwife's barrow with a gull riding on it. Each is no longer than 7.4, so the lanes checked with the stand-ins still hold.

## Places for a hero

Six, each kept open to the south-east so that the opening view sees the whole car (`HERO_SPOTS`): an open vault of the Dragonpit; the forecourt before the bronze doors; the sandbar by the causeway; the slip at Driftmark's shipyards, facing east like a ship to be launched; Dragonstone's stone pier by the old inn; Spicetown's quay among the bales.

## The dragons

The show is `dragons.ts`, written by the main session on the engine's dragons (`engine/dragons/`); ask it for a change rather than editing there. It builds last, over everything else, and on the development server it checks itself on every load: the console says how near each dragon comes to what is built (never under 6) and where each fire goes.

- **Homes** (`HOMES` in `plan.ts`) are spread over the whole tile, because dragons this size need room to come and go. Half-spans run from 13 (Sheepstealer) to 44 (Balerion), and seven lairs on a cone 50 high put a wing through a neighbour at nearly every take-off. Balerion lies on the Dragonpit's crown and Dreamfyre in its doors, Caraxes on the Red Keep's great tower, Vhagar on her rock in the bay (`VHAGAR_ROCK`), and Meleys across High Tide. On the Dragonmont, Meraxes crowns the summit as Balerion crowns the dome, Vermithor and Silverwing lie side by side on the south face, Sheepstealer is on the west face and the Cannibal on the north. Each of those four lies at a lair, a level shelf with a cave behind it (`LAIR`, `lairAt`).
- **What the homes ask of what is built.** The Red Keep's great tower ends flat at 30 behind a low iron rim, and Maegor's Holdfast flat inside battlements that stop at 27, for Caraxes's tail. High Tide keeps a roofline at 16 along z 80 for Meleys. The show lays tails over the lot tops of `rk-tower`, `rk-holdfast`, `red-keep` and `high-tide`, so those roofs stay close to their lots' tops. No mast stands over 14, nothing tall within 16 of Vhagar's rock, every vent is 15 or more from every dragon's home, and no smoke rises in front of a dragon at home: High Tide's hall chimney stands cold under Meleys, the crater does not smoke under Meraxes, and only Vermithor's and the Cannibal's mouths have a thin wisp from the rock behind their shoulders.
- **Ledges.** The Dragonmont's dragons drop off their ledges with their wings drawn in and open them once they are clear, and come home the same way, as a falcon does on a cliff (the kit's cue `tuck`).
- **Moments**, all from the books:
  - Balerion's three slow laps over the city, then his black fire straight up.
  - Dreamfyre twice round the dome.
  - Vermithor and Silverwing across the bay and round the Dragonpit.
  - Sheepstealer taking a sheep from the flock by the Wendwater (`FLOCK[0]`, which nothing else stands on).
  - Caraxes along the Rush and home to his tower, where he shrieks with his wings spread.
  - The race, which Meleys wins.
  - Meleys low over the Velaryon fleet.
  - The Cannibal's hunt over the bay.
  - Vhagar round the bay.
  - Meraxes far to the west.
  - Rarely, the three of the Conquest round King's Landing, one behind another.
- **The director** chooses what plays next. At most three dragons are in the air, and no two moments share a piece of sky. It opens with Balerion's laps and Meleys over the fleet, so the first view has dragons in the air.
- **At home** each dragon looks about in its own way, watches whoever flies near, and yawns or roars now and then. Balerion, Vhagar and Caraxes sometimes rise, spread their wings and roar, but never while another flies near.
- **Fire** goes only straight up or out over open water. At night it lights the water under it only when it flies low over it.
- **Checked by hand**, as the main session's record shows rather than the code: every pair of dragons, mesh against mesh, through every moment. The nearest is Vermithor passing Silverwing on her ledge at about 1, with his wings drawn in. For pictures, `bay.play(id)`, `bay.at(id, key, t)` and `bay.where(key)` in the console.

## What else moves

The tide; the ferry, poled across the Rush between the city's water stairs and the south landing, waiting eight seconds at each; the Velaryon galley on patrol east of Driftmark, her oars pulling; smoke from chimneys, smokehouses, the charcoal mound, Dragonstone's kitchen dragon and the Dragonmont's vents. `blackwaterShips.hold(t)` in the console stands the boats as they are at `t` seconds, and `hold(null)` lets them go. Moving meshes cast no shadow: the shadow map is drawn once.

## How high things stand

| | Top |
| --- | --- |
| The Dragonmont, at the crater's floor (Meraxes over it) | 44 |
| The Dragonpit's dome (Balerion on its crown at 39.4) | 40 |
| The Red Keep's great tower (Caraxes) | 30 |
| Maegor's Holdfast | 27 |
| The Windwyrm | 24 |
| The Stone Drum | 22 |
| The Sea Dragon | 18 |
| The Red Keep's drums and throne room | 17 |
| High Tide, gallery and bastion (Meleys) | 16 |
| Rook's Rest; King's Landing's land walls' towers | 12; 11 |
| Rosby, Stokeworth, Claw Isle, Stonedance | 10 |
| Duskendale | 9 |
| Houses | 5 to 8 |
| Masts | 14 over the water at most |

North of z -100, outside the lots, nothing stands over 4 but Crackclaw's pines: the opening view looks over the north shore at Delhi's southern strip beyond the board's edge, and the lots' tops were set to keep it in sight.

## Liberties taken with the books

- **Where the dragons rest** is the show's choice for room to fly, not the books': Meleys on High Tide, Caraxes on the Red Keep's great tower, Vhagar on a rock in the bay, Meraxes on the Dragonmont's summit. High Tide was given a gallery and a bastion for her, and the Red Keep's tower and Holdfast flat roofs.
- **The Dragonpit's bronze doors face south**, to the opening view; the books do not say.
- **The Red Keep's gate faces the river**, and its barbican, whose standing in 129 AC was not found, is built because the castle was finished under Maegor. The Holdfast's corner turrets are the tile's own; the seven drums, iron crowns, bronze gates and the throne room running north and south are the books'.
- **Visenya's Hill's sept** is the tile's drawing of the grander sept that stood there under Aegon I, whose look was not found.
- **The north shore's castles** (Rosby, Stokeworth, Rook's Rest, Claw Isle) are the tile's own; their looks were not found. Duskendale's pale walls and the Dun Fort's round towers are from the later books.
- **Dragonstone's plan** is the tile's own; the shapes of its buildings, the garden and the Painted Table's four windows are the books'. Its Stone Drum stands in the west range, off its first lot, because the road runs through the yard.
- **Castle Driftmark** is on the island's north side, where one wiki has it and another does not.
- **High Tide's plan** is the tile's own: keep, hall, round court, sea wall, loggia. One reading of the books has the causeway dry at high tide with the sea round the castle; the collector asked for the tide to cover it.
- **The lairs, the camp of the Sowing and the vents** are the tile's own drawing; the books give the smoky caverns, the dragons won at the Sowing and Grey Ghost's shyness.
- **Gold cloaks** of the City Watch stand at the gates and walk ahead of the litter; the Watch had them from about 104 AC by the wikis.
- **The ships' types** (galleys with rams, great ships with castles, cogs) are the age's as the tile reads it; only the Velaryon colours and arms are checked. A king's galley at the quays is the tile's own.
- **The Wendwater** is the research note's inference for the river that runs north into the bay.
- **Stonedance and Sharp Point** are the tile's own; Sharp Point's spire is a play on its name.

## Names on boards

Places: THE DRAGONPIT, THE RED KEEP, IRON GATE, RIVER GATE, KING'S LANDING, VISENYA'S HILL, ROSBY, STOKEWORTH, DUSKENDALE, ROOK'S REST, CRACKCLAW POINT, CLAW ISLE, DRAGONSTONE, DRIFTMARK, HULL, SPICETOWN, SHIPYARDS, HIGH TIDE, FERRY, STONEDANCE, SHARP POINT. Trades: INN (two), ALE (two), FISH (three), BREAD, CANDLES, SMITH, ROPE. And the two jokes: GIVE WAY TO DRAGONS on the screen, and LOST: ONE SHEEP at the fold. Each lot's name also has a board kept in the sign sheet, for a lot whose model fails and stands as a box.

## What was checked

On the tile as it stands, on a development server with hot reload off:

- `npm run typecheck` is clean, and `npm run build` builds.
- The console has no errors. The road check: no road crosses another on the level, and none runs through anything built. The lane check: every lane is clear by rays along it through what is built, nothing hangs lower over one than 4.0 over its middle, and none of the tile's people stands in one. The sight check by the plan's boxes hides no place it should show but the Street of the Sisters behind the River Gate.
- `wimmel.fights('blackwater-bay')` finds nothing.
- **Traffic**: twenty minutes in steps of a twentieth of a second, the tile's own moving things set aside: the nearest any two travellers come is 3.86, where Driftmark's two loops pass; none follows another on its route closer than 8, but on the city's loop 7.1, a short barrow behind a flock; nothing stands still longer than 3.7 seconds, a hero doing its party trick; no lane is shared.
- **Heroes**: each builder saw its places for heroes from the opening view with `wimmel.seen`.
- **Rain and snow**: rain by day and night, snow by day. In snow the water freezes over, as the engine has it on every tile.
- **The dragons**: the show's own check keeps every dragon 6 clear of everything built, and every fire goes straight up or out over open water.

## What it costs

On the development server, the pane not in front and the canvas small, so a frame's numbers are rough and mostly the processor's: with everything, 4 to 8 ms a frame, depending on how many dragons are in the air; 4.5 ms with the tile's own moving things set aside. The show was 8.3 ms by day until the main session had a dragon at rest posed on every third frame, each on a frame of its own, and on every frame only while it turns, yawns, watches one fly near or rises to spread its wings.

About 89,100 triangles stand still, just within the 90,000 asked: the ships 9,300, the north shore 9,300, houses 8,900, the Dragonmont 8,400, walls 8,000, the south shore 8,000, the Dragonpit 7,900, Dragonstone 7,400, the Red Keep 7,000, Driftmark 6,800, High Tide 5,300, the land 1,900 and the roads 800. About 170 draw calls. 430 people and 260 trees.

## What the collector may still turn

- Each of the choices made while he slept, at the top of this file.
- The tide's round, and how high it rises: `TIDE` in `tide.ts`.
- How many travellers: one number per road in `roads.ts`.
- Massey's Hook is the plainest stretch of the tile: grass, rocks, two fishing hamlets and a beacon between Stonedance and Sharp Point.
- The Stone Drum reads from afar as a plain dark round tower.
- Trimming triangles, if the whole board runs slowly: no one part is dear.

## For the engine

- **Arrow loops** (given, on this branch): window kind 7 draws a narrow slit, dark by day and warm at night. Kind 4's small square panes are pale glass by day, and on a castle's wall they read as an office block. `LOOPS` and `LOOPS_CLOSE` in `look.ts` use it.
- **The gable's open ends** (asked, not done): `gable` in `shapes.ts` stops its end triangles short of the roof by rise × over / run, so a slit shows under the roof at each gable end, and its slopes have no underside, so a low view under the eaves looks through them. `houses.ts` and `driftmark.ts` close both with a `pitched` of their own. Mending `gable` itself would change every tile's roofs, so it is left to the main session.
- **Moving meshes and the dragons' check**: the show checks its dragons against what stands still, but cannot see what a tile moves of its own, so a moving boat's path had to be checked against the show's flights by hand.

## Views for the pictures

`blackwater.aim(x, y, z, az, elev)` with `zoom` gives each; az 42 is the opening side.

- The opening view, by day and by night.
- Balerion on the dome, Dreamfyre in the doors: (-60, 25, -32), az 42, elev 38, zoom 70.
- Caraxes on the Red Keep: (-26, 24, 47), az 42, elev 34, zoom 40.
- Meleys on High Tide, and the causeway at high water: (34, 9, 80), az 42, elev 36, zoom 44, with `blackwater.tide(1)`.
- The Dragonmont and its five: (62, 22, -42), az 42, elev 38, zoom 80.
- The fleet across the Gullet: (78, 3, 78), az 42, elev 34, zoom 50, by night as well.
- King's Landing's quays and the ferry: (-60, 2, 77), az 42, elev 36, zoom 46.

## For the next tile

- **Say where a big animated thing will rest before the ground and the buildings under it are built.** A lot's top is a ceiling, not a roof, and the dragons' show laid tails over lot tops: High Tide had to be given a gallery and a bastion at 16, and the Red Keep's tower and Holdfast flat roofs, after they were built. Seven lairs were cut into the Dragonmont before the show found that the wings needed more room, and a home under the summit cut the peak flat until it became a perch.
- **An effect must not cover a model**: no smoke rising in front of a dragon at home, and keep vents 15 from every home.
- **Lay paths for moving things after the flights are known.** The show cannot see a moving boat, and a cog's loop lay under three low passes, one with fire.
- **Castles want slits, not panes.** The engine's small windows read as an office block on pale stone and on black; kind 7 is the arrow loop.
- **Builders, one to a file, in waves**, judged on a second server with hot reload off. The browser held seven builders' tabs and the judge's at once. A builder's half-written file without its exports broke every tab for twenty minutes: keep a file's exports whole from its first save.
- **A tide is a second water surface** whose edge slopes under the bay's, with level normals; it needs no engine.
