# The Iron Rain: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Built and checked on the branch `claude/red-rising-tile`, for the main session to merge as the ninth tile. The plan, the ground, the roads, the stories and their director are the tile session's; the buildings, the fleet, the Rain, the figures and the column's vehicles are builders' files, each from the brief `tile-red-rising-builders-brief.md` in the shared notes folder, judged and mended by the tile session. No README or picture has been touched: that pass is the main session's.

## The collector's decisions

These were his, on 20 November 2026, and the tile is built on them.

- **Named characters are portrayed.** The guide says a place from a book portrays no character, and Westeros and Blackwater Bay keep to it. This tile portrays the saga's characters because the collector asked for them by name: "Iron Rain, Sovereign, Darrow, Aja Au Grimmus, Alexander Lorn and Lorn arcos for sure", "octavia Sevro Ragnar etc too", "lets get as many of the iconic characters and have them in the scene approrpiately". It is the first liberty of this tile, and his decision, not the tile's.
- **Small stories, several at once**, "just like the dragons ... maybe darrow and co fighting aja etc"; "I don't mind several things happening at once, recognizably ofc".
- **The Rain**: "whicherver will look better", so the Lion's Rain over Agea (GS 35 to 43), which has a city with roads for the heroes.
- **The planet**: "a curved dome", and a dome "that runs to all 4 edges".
- **The fleet**: "Free flying and organic looking, think orbital assault and make it faithful"; then "make the ships more intimidating", "more detail go nuts".
- **Darrow's ship**: the Pax is his flagship in the Lion's Rain; the collector asked for the Morning Star as well, his later flagship ("I was thinking Morning Star"), and for "the ship cassius and lysander were on after the books" (the Archimedes) and "some of the Rim's ships too" (the Charybdis and the Dustmaker).
- **The figures**: "maintain person scale, but let's try and make them recognizable".
- **The traffic**: "army aesthetic for sure": the Augustan ground column.
- **The side of the road**: "doesnt matter". Traffic keeps right.
- **The screen**: the first of three ideas, the forecast board, IRON RAIN TODAY.
- **The look**: "need it to look fuckin sexy m8 love red rising".

## Sources and rights

The six novels only, as the research note reads them through the Red Rising fan wiki's pages with their chapters ([red-rising.md](../../../../docs/districts/research/red-rising.md)), and for the ships the note `tile-red-rising-ships.md` in the shared notes folder. No builder opened the books: every chapter given here and in the files rests on that one wiki, and is marked so where it is used. Nothing from the comics, the audio dramas, The Book of Lorn, the board game, the covers, any official art or blueprint, or fan art. A look the books do not give is the tile's own drawing, and is said to be so in each file's head.

Nobody dies on the tile, and nothing of the books' cruelty is shown: every fight stops at the clash.

## The things on the tile

**Agea**, on the floor of the canyon:
- **The Citadel** (`citadel.ts`): a white podium with seven needle spires in white and crimson, the tallest at 96; a portico of eight columns with a gold lion on its pediment, colonnaded wings, sky bridges, lion statues and four long banners; the outer wall with its walk, the gate court, the tea gardens; the landing pads' deck over lit hangars, with the Sovereign's shuttle and its three decoys in a rank and a bay for a hero at the head of its ramp; the terrace and its steps; the bunker; the Field of Mars with its ring and its gold lion.
- **The towers** (`towers.ts`): the garden of jewelled blades on a plaza of people: six towers, the tallest the Jackal's perch; Tryst and Temptation with their roof decks; the screen on the fourth tower, AGEA TODAY, IRON RAIN, 100%.
- **The walls** (`walls.ts`): the north and south walls with their walks, the North Gate, the South Gate, the Postern with doors that open, and the Grates where the river comes through.
- **The east quarter** (`quarter.ts`): the centre's houses, hospital, hotel and offices on the river walk; the lowColor blocks in many plasters with awnings, washing and roof tanks; the market's ten stalls; alleys and a square; the shield park with its station and four pylons, each crowned with a nexus that flares.

**The canyon and the plateau** (`canyon.ts`): the north wall in terraces of barracks, hangars and factories with stairs from ledge to ledge; the drone depot; the fall and its pool; the ramps' parapets and retaining walls; the guns on the rim; the Institute's gate and marble square; Olympus, floating over the east hairpin with its bone-pale citadel.

**The south flank** (`flank.ts`): the Augustan camp, with tents, a command pavilion, a hospital, a kitchen, a motor pool and the lion standard; the mine, a tiered pit with homes in its walls, a gravLift and a clawDrill like a hand; pine woods, two hedged fields; cairns on the peaks.

**The planet** (`land.ts`): the dome, the trench's floor, the river and the lake, the three snowy peaks in rock with snow from their shoulders up, and the air along the edges.

**What moves** is under its own headings below: the fleet, the Rain, the cast, and the column on the roads.

## How the tile is put together

- `plan.ts` is the tile as numbers, and imports nothing: the dome, the trench, the roads, the lots, the places for heroes, the stages of the stories, the shield, the fleet's sky, where the Rain lands, and what the opening view must see.
- `land.ts` lays the dome as a field of facets, the trench's paved floor, the river and the lake (the tile's own water, at the floor: the engine's water mirrors about the board's ground), and the air along the four edges. `space.ts` answers where there is room.
- `roads.ts` lays the roads and their lanes, and cuts their benches into the dome.
- `regions.ts` lists six builders' files of buildings: `citadel.ts`, `towers.ts`, `canyon.ts`, `walls.ts`, `quarter.ts`, `flank.ts`. `city.ts` builds each lot by its model, or as a plain box with its name if its model fails, and runs the checks on every load.
- `fleet.ts`, `rain.ts`, `figures.ts` and `traffic.ts` are builders' files that move. `rain.ts` was reworked by the tile session after its builder: how far a shell burns, its trails, where it lands.
- `show.ts` is the tile session's: it sets the fleet, the Rain and the cast going, and directs the stories.

## The ground

The planet is a dome that is 0 at every edge of the board and rises to a crown of 40 along the canyon's rim at z -78 (`DOME`, `domeAt`): the product of a curve from west to east and one from north to south, so that it is round near the crown and follows the edges near them, falling fast over the last thirty units on the north and slowly over the whole south half, which faces the opening view. Agea lies on the level floor of a trench cut into it at y 20 (`F`, `TRENCH`): on the north the canyon's wall, about 20 high in the middle and less towards its ends; on the south a low rim; at the west and east ends the floor meets the dome and the canyon runs on over the planet's curve. The colours are the books' terraformed Mars, green and white from orbit (GS 36), red only where the ground is bare, banded rust and ochre on the canyon's wall (the tile's; `BED`, `bedShift` and `bedColour` in `land.ts` say the beds once, for the ground and for the walls the city has cut), snow on the plateau's north-east (GS 38) and on the peaks in the south-east.

The air along the edges is a band that rises 15 off the ground at the board's edge: a pale haze by day, fading by its own alpha, and an additive blue glow by night.

## Roads

One road climbs out of the canyon on a ramp across its north wall, turns in a hairpin at the rim, runs over the crown of the planet along the canyon's edge, turns in a second hairpin and comes back down the other ramp: two ramps in a V across the wall, meeting on the apron before the North Gate (`LOOP`). The Gate Avenue tees into the V's foot and runs south through the gate to a ring on the Field of Mars. From the shield park a road runs down the river's east bank, through the lowColor quarter and out of the South Gate, and down the south flank to the Augustan camp. Traffic keeps right. Four routes: the loop each way round, the loop the way down the west ramp with the avenue and its ring, and the camp road; 25 travellers. The loop's lanes are shared on purpose, so the checks are `roadFaults` and `throughSolids`.

**The column** (`traffic.ts`): hover skiffs with six Grays aboard, gravBikes, haulers and a command skiff with the lion, all in greys, grey-greens and the Augustan dark red. Four spider tanks are the tile's own and not traffic: two walk a round on the flank (`SPIDER_PATROL`) on legs that find the ground, and two stand parked by the camp.

## Places for a hero

Six (`HERO_SPOTS`): the Institute's marble square on the plateau; the landing pads' deck, at the head of its ramp; the Field of Mars, on its white stone; Tryst's roof deck; the camp's motor pool, on a levelled bay; the drive through the shield park. Each is seen from the opening view at its middle and both ends by `wimmel.seen`.

## The fleet

`fleet.ts`. Eleven ships hang over Agea, each on a station of its own between 87 and 135 up, drifting and turning a little, laid so that no stage is lost behind a hull from the opening view:

- **Darrow's**: the Pax, about 85 long, gunmetal with a red spine, the Rain's spitTubes in a grid on her port side (GS 22, 37; MS 45); the Morning Star, about 120, white with her shark-mouth bow, red scythes on both flanks and the sloppy crescent under her keel (MS 45, 57), her spitTubes in two rows to port; two Augustan destroyers; Victra's destroyer, its bay full of leechCraft (GS 38).
- **The Bellona's**: the Warchild, about 70, in blue and silver with the heaviest guns in the sky (GS 38), and two consorts of the same family.
- **The Rim's**, with the defenders: the Dustmaker, about 95 (LB 20), and the Charybdis, black with a three-headed dragon in light (IG 15).
- **The Archimedes**, a corvette 6 long like a reared cobra's head (IG 8).
- Sixteen dogfighters, three dropships, drones that rise from the depot, and under every hull its shadow on the land.

Two stories are the fleet's own: the leeches on the Warchild, whose decks go dark one by one, and the Charybdis chasing the Archimedes through the fleet until the corvette slips away. `rrFleet.check()` flies every path whole, the stories too: nothing comes within 3 of anything built, the ground or the shield, and no two ships within 4 of each other.

The colours of the Pax, Victra's destroyer and the Archimedes, the whole look of the Dustmaker, the Bellona hulls, the destroyers and every small craft are the tile's own drawing. The eagle on the Bellona flanks is the tile session's reading of that house's sign and is not in the research note: it is one painted shape per ship in `fleet.ts`, easy to take off.

## The Rain

`rain.ts`. A wave is fired in a volley that ripples along a ship's row of spitTubes. Each starShell burns most of its way down: its gravBoots fire 24 over where it lands (and never lower than 36), so the fire is a long line from the ship to just over the ground, with a white and yellow core that shows by day and a thin dark trail that hangs for six seconds behind it. Then it comes in on its boots, lands in a ring of dust, stands, splits its husk in two and steps out; a hivepod lets out twelve Grays. Husks are gone nine seconds after they land, so the ground clears between waves. The canyon's guns fire tracers that miss. The shield is a geodesic dome over the city: a shell aimed under it strikes it in a flash and a ripple, skids down the glass and boots off to the nearest ground outside; when Mustang drops it, it breaks section by section from the pylons.

The Rain never stops (`show.ts`): a wave of forty every seventeen seconds, from the Pax and the Morning Star in turn, and a few shells at a time between waves. A wave is shared out by ground: three shares before the south wall, one each on the planet's west and east edges, the peaks and the plateau's two far ends, and, while the shield stands, two shares aimed at the city, which strike it. Once the shield is down, four shells of each wave land on the Field of Mars west of its ring, the one stretch of open floor inside the walls. While a story has the ground before the south wall or the Field for its own marked shells, the Rain keeps off it.

A starShell is 5 tall at the tile's scale (four metres, DA 11) and its husk 5.75, which is taller than a skiff: that is the books' size, kept.

## The cast and the stories

`figures.ts`: 25 named looks and nine kinds of soldier at person scale, each told by its colours, build, hair, cloak and arms; fifteen poses; five griffins; Kavax's fox. `show.ts`: thirteen stories, from section 4 of the research note; see the head of that file.

The cast rest at posts between stories, where the opening view sees them: the attackers on the canyon's rim between the guns; Sefi and the Valkyrie with their griffins in the snow, east of the shadow Olympus throws on it; the Sovereign, Aja, Karnus and Fitchner on the pads' deck at the head of an aisle of eight Praetorians that leads to her shuttle's ramp; Cassius, the Wind Knight and the Bellona on the north wall; Lysander and Atalantia on the south wall; Lorn's force, Kavax, Daxo, Holiday and Thraxa in the camp; the Jackal on the tallest tower's roof. A story calls its cast to its stage; each flies there on gravBoots, or walks if near; plays its part; and goes home. The director plays up to four on the ground and one in the sky at once, never one figure in two stories and never two stories on one stage, each in its turn; Darrow is in seven of the eleven ground stories, so two or three at once is usual. It opens with the Reaper's squadron falling before the south wall and Ragnar going for the postern.

Marked shells carry the stories' own figures down: the Reaper's is red. A story learns from the Rain when each of its shells has opened, and shows its figure then.

The show plays every story through on load on the development server and says where a figure stands in something built or under the ground, passes within 0.75 of another, or flies lower than what is under it. For the console: `rrShow.only(id)` plays one story alone and `rrShow.resume()` gives the director back; `rrShow.at(id)` is how far into its body a story is; `rrShow.wave('pax', 40)`; and the builders' own handles `rrRain`, `rrFleet`, `rrCast`, `rrTraffic`. `?rr=still` on the development server leaves the show out.

## How high things stand

| | Top |
| --- | --- |
| The shield's crown | 104 |
| The Citadel's great spire (its finial to 100) | 96 |
| The Jackal's tower | 86 |
| The second tower | 78 |
| The tower with the screen | 74 |
| The Howlers' tower | 60 |
| Olympus, its keep's spire a little over | 62 |
| The Institute | 44 |
| The shield pylons | 42 |
| The guns on the rim | 41 |
| The planet's crown, at the canyon's rim | 40 |
| The great peak | about 36 |
| The North Gate | 35 |
| The north wall's walk | 30 |
| The south wall's walk | 28 |
| The pads' deck | 26 |
| The city's floor | 20 |

The fleet flies above all of it: see its own heading.

## Liberties taken with the books

- **Named characters**, at the collector's wish (above).
- **Everyone at once.** Figures of different years stand in one battle: Alexandar grown (IG, DA) beside the boy he was in 742 (IG 45), Sefi and the Valkyrie (MS), Holiday and Thraxa (MS, IG), Lysander and Atalantia (DA), the Morning Star (MS on; she was taken at Ilium, MS 49, and was not Darrow's at the Lion's Rain), the Archimedes (IG), the Rim's ships (IG, LB). Each stands with the side it fought on. Stories 9 and 10 are scenes from Morning Star played in this battle's places, and Cassius fights beside Darrow in story 9 and against him in the others, as he did in different books.
- **Where things stand**: the Institute's gate and square on the plateau above the canyon, not cut into its wall; Olympus floating over the canyon's east end, not 80 km up a side canyon; the shield's generators in a park on the city's east side.
- **The river** comes over the canyon's rim in a fall and ends in a lake inside the city.
- **The Reaper's squadron** comes down before the south wall and not on the snow-covered mountain of GS 38: the peaks stand in the tile's south-east corner as that mountain, but there is no ground on them for six shells to open and be seen, and the open ground before the wall is what the opening view looks straight down on.
- **The Sovereign's shuttle** is one of four in a rank on the deck; Darrow runs an aisle of Praetorians to reach its ramp. The Praetorians and their aisle are the tile's.
- **The stories end gently**: no death, no drowning, no burning. Aja salutes and leaves in a decoy; Fitchner sets Darrow down and salutes.
- **The lowColor quarter's signs** say what a place is and never whose: NOODLES, BATHS, HOSPITAL.

## Names on boards

Name boards on posts: The Citadel, Landing Pads, The Terrace, Bunker, Field of Mars; North Gate, South Gate, The Postern, The Grates, AGEA; Tryst, Temptation and the towers' own; Valles Marineris, Drone Depot, The Institute, Olympus; Shield Park, Market; Augustan Camp, The Mine. The quarter's neon and painted boards are trades. Every sign's id begins with its file's name. The screen is `forecast` (`forecast.ts`).

## What was checked

On the tile as it stands, on a second development server with hot reload off:

- `npm run typecheck` is clean, and `npm run build` builds.
- The console has no errors and no warnings. The road check: no route crosses another, none meets another head-on, and none runs through anything built. The lane check: every lane is clear by rays along it through what is built, nothing hangs lower over one than 3.4 over its middle, and none of the tile's people stands in one.
- `wimmel.fights('red-rising')` finds nothing.
- **Sight**: by `wimmel.seen` from the opening view, every point of `SIGHT`, every place for a hero at its middle and both ends, and the middle of every stage are seen, but for the middle of the snow (Olympus) and of the shield park (a pylon), whose stories were moved to where they are seen. The plan's boxes hide about a sixth of the loop's lanes behind the North Gate and the north wall, and an eighth of the camp road behind the quarter and the South Gate.
- **Traffic**, the show left out: three hours in steps of a tenth of a second, and from another start 130 minutes in steps of a twentieth. The nearest any two travellers come is 4.87; the least any follows another on its route is 6.3 on the gate route, between two gravBikes, which are 3.8 long, and 8.0 and more on the others; the longest any stands is 4.0 seconds, waiting its turn onto the loop at the apron, and it does not grow. All 25 were moving at the end of each run.
- **The show**: its own check passes for all thirteen stories. Each ground story was looked at in pictures at its chief moments. Six minutes of the show run on raised no error and no warning; nine of the thirteen stories played in that time, and there were never more than 106 shells at once, of the 180 the Rain allows.
- **The fleet**: `rrFleet.check()` flies every path for its whole lap and both of its stories: the nearest a ship comes to anything built, the ground or the shield is 4.5, to another ship 10.0 at its station and 5.2 in a story, and no stage is lost behind a hull from the opening view.
- **Rain and snow**: rain by day and at night, snow by day and at dusk.
- **Heroes**, by numbers alone, since no picture is taken of one: with the collector's fifteen on the tile, twelve of them driving among 37 travellers and the show playing, the nearest any two come is still 4.87, the longest stand is 3.7 seconds, a hero at its party trick, and nothing is said in the console. Four ground stories and one of the sky were seen playing at once.
- **Not checked**: the frame rate on the iPhone, and how a hero looks standing on each of the six places.

## What it costs

On the development server, the pane not in front and the canvas four pixels across, so a frame's numbers are the processor's: with everything, 5.7 to 6.5 ms a frame (about 165 draw calls, 240,000 triangles drawn with shadows), of which the scripts are 1.3 ms. Blackwater Bay, measured the same way in the same tab, is 5.8 ms and 1.5 ms; North America 1.9 ms and 0.07 ms. The whole board of nine, measured the same way, is 16.2 ms a frame; the eight without this tile are 13.5 ms.

About 78,000 triangles stand still: the quarter 15,500, the land 14,600, the canyon 11,100, the Citadel 9,500, the flank 8,800, the towers 8,600, the walls 7,700 and the roads 2,000. The fleet moves about 30,000 more, and 37,000 at its peak. The Rain adds 20,000 to 27,000 with two waves on the ground and in the air, in a handful of draw calls. The cast is about 50 draw calls, a mesh for each kind of part, and writes only the figures that moved: its draw calls are the first place to look if the whole board runs slowly.

## What the collector may still turn

- **How hard it rains**: `WAVE` and `WAVE_EVERY` in `show.ts`, and the shares of each ground in `outside`.
- **How long a shell burns**: `BOOTS_OVER` and `BOOTS_LEAST` in `rain.ts`; its trail, `TRAIL` and `SMOKE_HOT`.
- **How long husks stand**: `HUSK_FADE` and `HUSK_GONE` in `rain.ts`.
- **How large a starShell is**: `SIZE` in `rain.ts`. It is the books' four metres now.
- **Which stories open the show**, and how many play at once: the end of `buildShow` in `show.ts`, `AT_ONCE`.
- **The shield**: how long it stays down after Mustang drops it (75 seconds, in the director).
- **How many travellers**: one number per route in `roads.ts`.
- **The dome's height** and the floor's: `DOME.H` and `F` in `plan.ts`; everything follows them.

## For the engine

- **A tile's own water above the board's ground.** The engine's water mirrors about y 0. This tile's river and lake lie at 19.2, so they are its own meshes with `makeWaterMaterial`, and the mirror is a little off. A water level per tile would mend it.
- **`wimmel.seen` wants a frame first.** On a fresh page whose pane is hidden, the camera has not been placed until a frame is drawn, and `seen` then looks along z and calls everything hidden. `rr.frames(6)` before it.
- **`wimmel.seen` counts a tile's flying meshes as built.** A ship of the fleet between the view and the rim hides a post until it has drifted on.
- **Parts worth sharing**, from the builders: `folk` (a person of a Color, told by hair), `boardSign`, `bladeSign`, `stringLights` and `cloth` in `quarter.ts`; `rockWall` in `canyon.ts`; the `Batch` of glows, ribbons and smoke written afresh each frame in `rain.ts`, which any tile with fire or exhaust could use.
- **A ring's island** counts as road in this tile's `toRoad`, so nothing is planted or lands on it. The engine's own helpers leave an island open.

## Views for the pictures

`rr.aim(x, y, z, az, elev)` with `zoom` gives each; az 42 is the opening side. Let the show run half a minute first (`wimmel.advance(30)`), so that a wave is in the air.

- The opening view, by day and by night. By night as a wave falls from the Morning Star is the picture of the tile.
- The planet's curve with the fleet over it and the Rain falling, at dusk: `rr.aim(0, 30, -10, 42, 17)`, zoom 300, hour 18.2. Wait for a wave: `rrRain.state().flying` over 34, and three seconds more.
- The Reaper's landing: `rrShow.only('reaper')`, body time 31; (1, 24, 69), zoom 52.
- The Sovereign's shuttle: `rrShow.only('shuttle')`, body time 12 and 21; (-21, 28, 15), zoom 34.
- The fight with Aja: `rrShow.only('aja')`, body time 27; the same view.
- The Willow Way: `rrShow.only('willow')`, body time 8; (-41, 26, 45), zoom 30.
- The shield breaking: `rrShow.only('shield')`, body time 25; the opening view, by night.
- The snow, the griffins up: `rrShow.only('snow')`, body time 12; (52, 40, -94), zoom 62.
- The canyon wall, the fall and Olympus: (10, 28, -70), zoom 110.
- The camp and the mine: (-50, 22, 71), zoom 62; (50, 14, 96), zoom 95.
- The quarter and the shield park at night: (50, 22, 10), zoom 90, hour 22.
- The city's skyline from low in the south-west: `rr.aim(-10, 16, 84, 215, 16)`, zoom 150.

## For the next tile

- **Give every builder a stub with its exports whole from the first save**, and a registry: seven builders worked at once and no tab broke.
- **Judge on a second server with hot reload off.** Builders' saves reloaded the judge's page mid-picture until a second server was started from a config of its own (`server.hmr: false`).
- **Know where the view's shadows fall before you place a stage.** A floating island hid the middle of the stage behind it, and a pylon the middle of its own park. Ask `wimmel.seen` for every mark of every story, not only the stage's middle.
- **A story's stage wants its ground kept clear by the plan**: a place for a hero in the middle of the pads' deck cut the deck in two, and had to move once the stories were laid.
- **Lay the stories after the buildings are built.** Four stories written against a stub had to be laid again on the Citadel as built: the shuttles stood in a rank facing north, not side by side facing east.
- **A falling thing wants a long bright line.** A shell that burned only the top third of its fall read as a pod drifting; burning to just over the ground, with a core that shows by day and a trail that hangs, made a wave read as rain.
- **Share a wave out by ground.** Even shares put as many shells on a steep edge sixteen units wide as on open ground, and they heaped; a ground given twice in the list gets two shares.
- **A landing zone inside a ring is a road.** Shells landed on a roundabout's island against its monument until the island counted as road.
- **One figure in most stories keeps the stories from playing at once.** Darrow is in seven of eleven; split a supporting cast between stories (two Obsidians each) so that the ones without him can overlap.
