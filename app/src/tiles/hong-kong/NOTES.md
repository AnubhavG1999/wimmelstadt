# Hong Kong: notes

What a later reader cannot see in the code.

## How the tile lies

Both sides of Victoria Harbour, turned a quarter turn so that it is seen as from Kowloon. The harbour runs down the middle of the board from the north edge to the south edge. Hong Kong Island is the west half and Kowloon the east half. Real north points to the board's east, so Central is at the Island's north end and Causeway Bay at its south end. Nothing is mirrored.

The tile is laid out for the view it opens with, which looks from the south-south-east. A thing as tall as `H` hides the ground for about `1.28 × H` behind it, to the north-north-west. So the Peak road climbs the south face of the Peak, the tall towers stand at the north end of each shore, and whatever stands on the south side of a street or in front of a landmark is low. `BUILDINGS` in `plan.ts` says so where it matters.

## The things on the tile

Numbered so that the count can be checked. Each is a model in `landmarks.ts`, by the id of its lot in `plan.ts`, unless it says otherwise.

The Peak
1. The Peak Tower, with a lookout and a pavilion beside it (a place for a hero)
2. The Peak Tram, up the north face, with a stop at each end
3. The Mid-Levels Escalator
4. Man Mo Temple, in Sheung Wan at the foot of the north face

Central
5. Two IFC
6. The ferry piers, with the Star Ferry's pier and its clock tower
7. The Observation Wheel, which turns
8. Jardine House
9. HSBC, with its two lions
10. Bank of China Tower
11. Central Plaza, with the four lamps on its mast that change colour

Wan Chai and Causeway Bay
12. The Convention and Exhibition Centre: the new wing on its point, the old wing, and the link between them over the road
13. The Blue House, and the yellow house beside it
14. The trams, the length of the Island and round the racecourse, with four stops
15. Happy Valley Racecourse: grandstand, floodlights, and five horses that run
16. The typhoon shelter, with its sampans, and the Noonday Gun
17. The Monster Building

The harbour
18. The Star Ferry: two boats that cross between Central and Tsim Sha Tsui, and a pier at each end
19. A junk under red sails
20. A dragon boat race, in Hung Hom's bay
21. The car ferry at its pier (a place for a hero)
22. A Symphony of Lights: beams from the roofs of the tall buildings, at night
23. The harbour tunnel: a mouth on each shore

Besides these, two lighters with derricks lie at anchor.

Tsim Sha Tsui
24. The Clock Tower
25. The Cultural Centre and the Space Museum's dome
26. The Peninsula, with its forecourt and fountain (a place for a hero)
27. The Avenue of Stars, with the statue
28. Nathan Road: double-decker buses down the middle, neon over the pavement

Kowloon
29. ICC, with towers of flats round its foot
30. M+ and the Xiqu Centre, on a lawn by the water in West Kowloon
31. Lion Rock, with its lion and the tunnel through it
32. Wong Tai Sin Temple
33. Mong Kok's street of signs: goldfish, a pawnshop under its bat and coin, model cars
34. Temple Street Night Market, with a dai pai dong
35. A tower in bamboo scaffolding
36. Hong Kong Coliseum
37. The Whampoa: a shopping mall built as a ship
38. Choi Hung Estate, with the courts on its car park's roof (a place for a hero)
39. A jumbo jet on the old approach to Kai Tak

Between them stand 69 ordinary buildings, built by the engine's `ordinaryBuildings`: tong lau over shops, dark blocks trimmed with neon, slim towers of flats, slabs of public housing, and houses with tiled roofs on the south face of the Peak.

## Roads

Traffic keeps left. No road crosses another on the level, and none runs through anything that is built: `check.ts` looks for both on the development server and says so in the console.

- **The harbour run** is one loop about 990 units long. On the Island it runs the length of the shore: north to the ferry piers and round Jardine House, back by the water, into the tunnel on the Convention Centre's point, and south from there on a viaduct on stilts across the typhoon shelter. On Kowloon it comes up beside the Coliseum, goes along Nathan Road and round the Peninsula.
- **The Peak road** starts at the car ferry's pier, climbs on stilts along the breakwater, crosses the shore road and the tram as a flyover, and climbs the south face in five legs to a turning place on the summit.
- **The tunnel through Lion Rock** carries the loop round the north of Kowloon.
- **The tram** has two tracks beside the Island's shore road, a turning loop at Central and a loop round the racecourse. Every tram stops at every stop for as long as the others do, which is what keeps them apart. **Buses** have the two middle lanes of Nathan Road.

Checked as the page for tile builders asks, with `wimmel.advance`, over fifteen minutes of traffic: no two vehicles came within three units of each other (the nearest were 4.2 apart, passing on the Peak road), none stood still, and no two routes share a lane. Over twenty minutes no two trams on one track came nearer each other than trams that pass on the two tracks side by side.

## What moves besides the traffic

All of these are the engine's `train` with a car of the tile's own shape (`movers.ts`), each on a line of its own: six trams, three buses, the two Star Ferries, the junk, three dragon boats, the Peak Tram, five racehorses and the jumbo jet. The Observation Wheel is a mesh that turns. The beams of the Symphony of Lights and the lamps on Central Plaza's mast are meshes with a material of their own, changed on every frame.

## Places for a hero, and parked vehicles

Four places on show, each in sight of the opening view: the lookout on the Peak, the Peninsula's forecourt, the deck of the car ferry, and the south end of the roof at Choi Hung, on the stripes of the rainbow. They were checked with a box the size of a car standing on each, not with a hero, so that no picture with a hero in it was made. No figure stands where a hero would.

On the roads a hero is best seen on the viaduct, on the Peak road, on the Island's shore road and on Nathan Road.

Ten plain vehicles are parked: two on the summit, one waiting for the car ferry, and the rest in Sheung Wan and Kowloon. Two public light buses and the Peninsula's green car are shapes of the tile's own that stand still.

## How high things stand

Added by the main session on 19 November 2026, when the tile joined the board. The city's towers are roughly to one scale, about 3.2 metres to a unit, which North America's set: see [the page for tile builders](../../../../docs/building-a-tile.md).

| | Units | In life | At that scale |
| --- | --- | --- | --- |
| ICC | 145 | 484 m | 153 |
| Two IFC | 125 | 416 m | 132 |
| Central Plaza, to the top of its mast | 121 | 374 m | 118 |
| Bank of China Tower, to its roof | 110 | 315 m | 100 |
| Bank of China Tower, to the top of its masts | 125 | 367 m | 116 |
| Jardine House | 60 | 179 m | 57 |
| HSBC | 55 | 179 m | 57 |
| The Clock Tower | 30 | 44 m | 14 |
| The Coliseum | 24 | 41 m | 13 |
| The Peak | 39 | 552 m | 175 |

The towers are within a tenth of the scale and stand in the order they do in life. The Clock Tower and the Coliseum are small landmarks and stand about twice their scale height, so that they can be recognised. The Peak is a toy, as every mountain is. The heights in life are the commonly published ones.

## Liberties taken with the real place

- **Where the Peak stands.** It is in the middle of the Island's west side, south of Central, with its road on the south face. On a first layout it stood behind Central, as it does in life, and Central's towers hid all of it from the opening view. Mid-Levels and the Peak Tram are on its north face, towards Central.
- **Heights.** The Peak is 39 units high and the towers in front of Mid-Levels are up to 125. In life the Peak is the higher.
- **Central Plaza** stands with Central's towers. It is in Wan Chai, beside the Convention Centre.
- **Jardine House** stands on the island inside the turning loop of the shore road, between Two IFC and the piers. Where it first stood it hid HSBC from the harbour.
- **The Peak Tram's lower stop** is in Sheung Wan beside Man Mo Temple. It is in Central.
- **The Mid-Levels Escalator** climbs straight up the hill. The real one turns from street to street.
- **The tunnel's mouths.** The Island's is on the Convention Centre's point and faces north. The real Cross-Harbour Tunnel comes up beside the Royal Hong Kong Yacht Club, a little further east. Kowloon's is beside the Coliseum, as in life.
- **The Peak road's start.** No road climbs from a ferry pier along a breakwater. It is there so that the road can cross the tram on a flyover.
- **The Monster Building** stands beside the racecourse. It is in Quarry Bay.
- **The tram** runs beside the shore road. In life it runs a street or two inland.
- **The Star Ferry's boats** come in to their piers bow first. The real ones come alongside.
- **The Peninsula** faces south, on to Nathan Road. In life it faces the harbour, which on this tile is to its west, where its own wing would hide the forecourt.
- **Tsim Sha Tsui east of Salisbury Road, and the south side of Nathan Road,** are low, so that the waterfront and the road show past them.
- **The lion on Lion Rock** lies east and west with its head to the east, so that the opening view sees it from its side with its head to the right, as Kowloon sees the real one.
- **Choi Hung Estate.** Each storey is one colour of the rainbow. That the real blocks are banded storey by storey was not confirmed: the sources found say only that they are painted in the colours of the rainbow. Its car park stands in front of the flats, as in the photograph everybody takes.
- **Temple Street Night Market** is at the front of the board, on Kowloon's south edge, where it can be seen. It is in Yau Ma Tei.
- **M+** shows its screen on both its faces. The real one has it on the face to the harbour.
- **The big screen** hangs on the east face of the tall neon block at the east end of Nathan Road's north side (`nathan-n3`), 10 high, under its roof; that face has no shop signs, to leave it room. The waterfront's faces look west, away from the opening view, so the screen is on Nathan Road instead. It shows what is playing on Spotify, and otherwise its own picture: yum cha in neon, a bamboo steamer with three dumplings and steam rising, with 飲茶 ("yum cha") and 休息一下 ("taking a break"). Those words are plain phrases and nobody's name.
- **Kai Tak** closed in 1998. The jumbo goes round over Kowloon and the harbour like a toy aeroplane on a wire, and never lands.
- **Left out:** the Big Buddha (it stands on Lantau), the Golden Bauhinia and anything with a flag, a liner at Ocean Terminal (the harbour was too narrow with it).

## Real names on signs

A shop's sign says what the shop sells (茶餐廳, 金魚, 模型車, 當舖) and not whose it is, so no shop on the tile has a name. The names below are the only real ones. Each is plain lettering on a plain board, and each was checked by a search of the web on 19 November 2026.

| On the sign | Where | What confirmed it |
| --- | --- | --- |
| 天星小輪 STAR FERRY | both piers | wingontravel.com's page on 天星小輪, and Wikipedia's on the Star Ferry |
| 山頂纜車 PEAK TRAM | its lower stop | trip.com's guide to 山頂纜車, and the University of Hong Kong's library record for 山頂纜車徑 |
| 文武廟 | Man Mo Temple | Time Out's guide to Hong Kong's temples |
| THE PENINSULA 半島酒店 | the hotel's roof | Cathay Pacific's page in Chinese on 香港半島酒店 |
| 黃大仙祠 | the temple's gateway | the University of Hong Kong's library record "Wong Tai Sin Temple 黃大仙祠" |
| 廟街 TEMPLE STREET | the night market's gateways | Cathay Pacific's page in Chinese on 廟街夜市, and Discover Hong Kong |
| 跑馬地馬場 HAPPY VALLEY RACECOURSE | the grandstand | the government's notices of traffic arrangements for race meetings |
| 海底隧道 CROSS-HARBOUR TUNNEL | both mouths | the same notices |
| 午炮 NOONDAY GUN | its enclosure | Wikipedia's and Discover Hong Kong's pages on the Noonday Gun (怡和午炮) |
| TINY 微影 | a tower in Yau Ma Tei | unwire.hk, 31 March 2021, on TINY 微影's models of Hong Kong's buses |
| TARMAC WORKS | a tower in Admiralty | hobbyDB's page for the brand |
| MINI GT | a tower in Tsim Sha Tsui East | lamleygroup.com, 24 January 2018, on Mini GT from TSM Model |

The last three are makers of diecast models, as North America's tile names Hot Wheels and Mini GT.

Temples are shown from outside only, with what stands in front of every such temple: an urn for incense, lanterns, lions of stone. Nothing on the tile is political: there is no flag, and the tile's seed is Hong Kong's dialling code.

## For the engine

On 19 November 2026 the main session moved these into the engine as they were, and this tile uses them from there. In `app/src/engine/`: `geom.ts` is now `corners.ts`, `check.ts` is `checks.ts`, and `terrain.ts`, `shapes.ts` and `movers.ts` keep their names. The tunnel's mouth is `tunnelMouth` in `tunnel.ts`, and the sign hung out over a street is `hungSign` in `props.ts`. The check of what hides what, under "For the next tile", is `hiddenBy` in `checks.ts`. Where these notes say that one of them is in this folder, read it with that in mind.

Built in this folder, and worth having in the engine:

- **A road of any shape.** `geom.ts` makes a road from corners: it rounds them, gives every point a height, runs lanes beside it, and hands it to the engine as short `ramp` stretches. The Peak road, the viaduct, the tunnel's ramps and the jumbo's flight are made this way.
- **Ground that slopes.** The engine builds a hill in level steps (`terrace`), and the Peak and Lion Rock looked like stairs that way. `terrain.ts` makes a hill as a sheet of flat facets over a grid: its height is worked out at every corner, each facet is green or rock by how steep it is, and an edge that is cut off gets an upright face in beds of rock. `carved` in the same file cuts a road into such a hill. `groundAt` in `plan.ts` gives the height anywhere, so that trees, figures and buildings stand on the slope.
- **Checks for roads** (`check.ts`): that no two cross on the level, and that none runs through a building.
- **A tunnel's mouth** (`portal` in `city.ts`): a cutting, a hood, and darkness a little way in, where a vehicle goes out of sight. The ground needs a hole for the cutting, and the road must be about 4 units down before the hole ends.
- **Shapes** (`shapes.ts`): a slab between two points at different heights, a roof that follows a line (`shell`), pitched and hipped roofs, a wall round a plan of any number of corners, a rail.
- **A sign hung out over a street** (`hung` in `landmarks.ts`), read from both ways along the street.

Missed, or found wanting:

- **The mirror image shows what is under the ground.** Water and wet streets mirror the city from a camera below the ground, and that camera draws every vehicle, including those in a tunnel under the water. At night their lamps show faintly in the harbour above the tunnel.
- **Vehicles of a tile's own shape in the traffic.** The trams and the double-decker buses are `train`s with a car of their own shape. A train does not see traffic, so they have lanes that no route uses. A bus that could drive a route among the cars would be better, and so would a parked vehicle of a given kind and colour: the Peninsula's green car and the public light buses are shapes that the tile builds itself.
- **A train casts no shadow.** The jumbo passes low over Kowloon's roofs and leaves none on them.
- **Boats.** The ferries, the junk and the dragon boats are `train`s too, on lines across the water. A train does not bob. In snow the water turns white, and they sail on it all the same.
- **A place for a hero that moves.** The car ferry is moored, because a hero's place on show cannot move.
- **Ordinary buildings take a storey to be 5 high.** Hong Kong's are lower here (3.4), so a sign over a shop hangs at the height of the floor above it. A billboard on a roof is as wide as the building, which makes it small on a narrow lot.
- **Cost.** With water on a tile the whole city is drawn twice, once for the mirror image, and every train is a draw of its own. The tile takes 2.6 to 3.5 ms a frame where North America takes 2.4 to 2.9, with as many triangles.

## How it was checked

- By day and by night, from all four sides, and in rain and in snow.
- `npm run typecheck` and `npm run build` pass.
- The console of the development server shows no error and no warning, and the two lines from `check.ts`.
- The traffic, the trams and the places for heroes as said above.

## For the next tile

What building this tile taught, for whoever is about to start one of their own. It leaves out what is under "For the engine" above.

### First: what the opening view can see

The view a tile opens with (`az` 42) has the camera in the south-south-east, looking down at 38 degrees. Most of the time lost on this tile was lost for not doing sums with that at the start. The numbers:

- **Towards the camera** is 0.67 east and 0.74 south for each unit along the ground, and the line of sight rises 0.78 for each such unit.
- **A thing `H` high hides the ground for `1.28 × H` behind it**, to the north-north-west. A point at height `y` is hidden by a building `H` high that stands `t` units towards the camera if `y + 0.78 × t < H`.
- **A street is hidden by its own south side.** A building south of a road hides the middle of the road if it is taller than about its distance from that middle line (1.05 times it; on the east side, 1.17 times). Nathan Road is 20 wide with pavements of 3, and anything over 15 on its south side hid the buses.
- **To take a picture of something high up**, aim `wimmel.shot` at the ground behind it: for a thing at height `y`, at `x - 0.86 × y` and `z - 0.95 × y`. Its `x` and `z` are a place on the ground.

What it cost here:

- The first layout had the Peak behind Central's towers, as in life. The towers are 110 to 125 high and hid the whole road up the Peak, which is the road the tile is about. The Island was laid out again after the blockout.
- Boxes for ordinary buildings 28 and 40 high, put east of Salisbury Road to fill the ground, hid the Cultural Centre and the Space Museum. It was found only once those two were modelled.
- Two places for a hero were hidden by what they belong to: the Peninsula's forecourt by the hotel's own wing, and Choi Hung's courts by the flats beside them. Both were turned round.
- The lion on Lion Rock lay end-on to the view and looked like a pile of rock. A thing whose outline is the point must lie across the view.

So do these sums on the map in text, before the collector sees it. Put what is tall in the north and the west. Put the road worth watching, and every place for a hero, on the south or the east side of what it belongs to. Give every lot its height in the blockout, the ordinary buildings too: their heights are part of the layout, not filling.

Then check with numbers and not by eye. On the development server the page can read the tile's own plan. Pasted into the console, this says which lots stand between a point and the camera, where a lot is `{ id, x0, z0, x1, z1, top }` and a point `{ x, y, z }`:

```js
const plan = await import('/src/tiles/<id>/plan.ts');
const E = Math.sin(42 * Math.PI / 180), S = Math.cos(42 * Math.PI / 180), UP = Math.tan(38 * Math.PI / 180);
const hides = (p, lots) => lots.filter((l) => {
  const tx = [(l.x0 - p.x) / E, (l.x1 - p.x) / E], tz = [(l.z0 - p.z) / S, (l.z1 - p.z) / S];
  const t0 = Math.max(Math.min(...tx), Math.min(...tz), 0), t1 = Math.min(Math.max(...tx), Math.max(...tz));
  return t1 > t0 && p.y + UP * t0 < l.top;
}).map((l) => l.id);
```

Ask it about the foot and the middle of every landmark, about the middle of every street worth watching and about every place for a hero, after the blockout and again whenever a height changes. Written late on this tile, it still found what no picture had shown yet: Mong Kok's shops behind a block on Nathan Road, half of Choi Hung's long block and all of its courts behind the other block, and the Star Ferry's pier behind the Clock Tower.

### The order of work I would follow

1. Read the page for tile builders, the sample tile, North America and the district's research note.
2. Draw the map in text with heights on it, and do the sums above for the road worth watching, the places for heroes and the landmarks at the front.
3. Put it to the collector.
4. Write the tile as data (`plan.ts`): the shapes of the ground, every road as a list of corners, every lot as a rectangle with a height, the ordinary buildings as well as the landmarks. Build it as a blockout: boxes with their names on boards, the roads, the traffic. Write the check for roads now and have it run on every load. Run the traffic check and the sight-line check. Take pictures by day and by night from all four sides, and show the collector.
5. Build what the engine lacks before any landmark: ground that slopes, a tunnel, shapes. Landmarks stand on it. Merge `main` first, because the engine may have gained it since: on this tile the ferries were written by hand and then written again when `train` learnt to turn back at the end of a line.
6. What moves on a line of its own: trams, boats.
7. Landmarks, one area at a time and about ten to a batch: write, typecheck, load, read the console, take one picture of the whole tile and three or four close ones by day and one by night, mend, commit.
8. Ordinary buildings and their signs. Check every real name as it is written, and enter it in `NOTES.md` at once with what confirmed it.
9. People, trees, lamps and parked vehicles in one pass, through helpers that know where the roads are (see the traps).
10. The places for heroes, with a box standing in for the hero.
11. The list under "A tile is done when", and `NOTES.md`.

What I did otherwise and would not do again: ordinary buildings last, as filling (their heights turned out to matter); a hill in terraces before a hill that slopes (the collector asked whether the steps were meant to be mountains); people and trees put in by hand early (many stood on carriageways); and the notes at the end (the sources for the real names had to be found again).

### What worked, and is worth doing again

- **The tile as data, and a model as a function of its lot.** `plan.ts` draws nothing. Each landmark is one function `(k, lot) => void` in `landmarks.ts`, found by the lot's id, and it takes every measure from the lot's rectangle. Seven landmarks were moved or resized by changing one line of the plan, and their models followed.
- **Boxes with their names on them.** In the blockout every lot without a model was a plain box with its name on a painted board (a `SignDef` of `kind: 'board'` for each lot in the list). The collector could read the first picture, and a box gave way to its model the moment the model was registered.
- **A check that speaks on every load.** `check.ts` prints one line in the console when no road crosses another on the level and none runs through a building, and a warning that names the two when one does. A mistake in a road showed on the next load, not in a picture much later.
- **`train` for everything that goes round a line of its own**: trams, double-decker buses, ferries, a junk, racehorses, a jumbo jet. A car is a `GeoBuilder` shape that stands on y = 0 with its nose along +x and its middle at the origin. For what goes to and fro (a ferry, a funicular) the path is the line out and the same line back (`joined` in `engine/paths.ts`), with `ends` at the far end and at 0 and a stop just short of each, and the car is the same at both ends so that it never needs to turn. Trains on one loop keep apart if all have the same `stops` and the same `dwell`.
- **`ordinaryBuildings` with styles of the tile's own.** One call built 69 buildings in seven styles. The `neon` style alone gives a building 14 high or more a sign that stands out from its wall, a building up to 50 high a billboard on its roof, and every one strips of light round its roof. With a pool of signs in the place's own script, that was most of Kowloon by night. `sign` puts a name near a building's top on all four sides.
- **Shop signs that say what is sold, not whose shop it is** (茶餐廳, 金魚, 當舖). An invented name in another language is quite likely the name of a real shop; a trade is not. Only twelve names on the tile are real, and each could be checked.
- **Storeys lower than the engine's 5**: 3.4 for shops and offices, 2.6 for flats. Towers read as tall and thin without being taller.
- **Pictures to the collector at each milestone**, by day and by night. His two remarks (roads and density under all the sights; steps are not mountains) both changed the tile.
- **A commit for each batch, with a message that says what and why.** This session's memory ran out once and it was carried on from a summary. What it really carried on from was the plan, the notes and the commits.

### Traps

Building:

- `b.quad` turns its triangles to face the way its normal points, but it decides from corners 0, 1 and 3. A triangle written as a quad with two corners alike can come out facing away, and then it is not drawn. `b.tri` turns nothing. `face3` in `shapes.ts` is a triangle that always faces its normal: have one, and use it for every triangle.
- `b.box` takes two corners, and `b.obox` a middle and half sizes. `b.cyl` with 4 sides and `phase: Math.PI / 4` is a square, and its radius is to the corner: half the side times 1.41. With `r0` smaller than `r1` its walls lean outwards.
- `b.box` leaves out its bottom. What is seen from below (a canopy, a deck, the board behind a sign) needs `faces` with `B` in it.
- Windows are placed by height above the ground. Storeys stacked as boxes of their own line up only if each box is as high as the `storey` of its `win`.
- Two boxes that end flush flicker where they meet. Let one stand 0.3 proud. Paint on a floor goes 0.02 to 0.05 above it, each layer at a height of its own. A sign hangs 0.06 to 0.12 off its wall.
- A sign is one face and is seen from one side only. A sign that hangs in the air needs a second one back to back, and a thin dark box between the two. `k.signs.atlas.rects.get(id)` gives a sign's `aspect` and `color`, to size that box and to colour the light the sign throws.
- Give a small sign a `size` in pixels (a plaque of three characters is 240 by 72), or it takes a row 120 or 176 high on the sheet. Two lines of neon, the script above and English below, read on a shopfront 5 wide at `aspect: 2`.
- A glow (`k.glows`) is a box that is always drawn, dim by day and bright by night: a red lantern is nothing but a glow. A light (`k.lights`) is a pool on the ground by night and nothing by day. A landmark with no light near it stands in the dark with its windows lit: give each one or two, of radius 8 to 14 and `k` 0.5 to 0.9.
- For something that turns, build it with a `GeoBuilder` of its own, make a mesh of it with `k.mat.city()`, add it to `k.group` and turn it in `k.each`. What hangs on it should look the same however far it has turned: the wheel's cabins are drums on the wheel's own axle.
- Use `k.rand()`, never `Math.random()`. Each call moves all the later ones, so a crowd shifts when something is added before it.
- `area` cannot have a hole. Where a square has a cutting or a pool in it, use `flat(k.street, shape, y, colour, { holes, win })` from `engine/ground.ts`, or the square is drawn across the hole.
- `k.person`, `k.tree` and `k.lamp` each take a height as their last argument, so figures can stand on a terrace, a roof or a deck.

Roads, and what stands beside them:

- `street`'s `width` is the carriageway alone. The pavement is `sidewalk` wide outside it. A figure on the pavement of a road 20 wide stands 10 to 13 from its middle, not 8.
- Figures, trees and parked vehicles do not know where the roads are. From the blockout until the models were nearly done, this tile had crowds in the kerb lanes of Nathan Road, on the racecourse's track and on the ramp into the tunnel, and six trees on carriageways. In a still picture they look right. Place crowds through one function that refuses a place inside a lot, on a hero's place or on a parked vehicle, and check every rectangle given to it against the plan.
- A tree is 7 to 8 times its size high, and its crown reaches 2.7 times its size to each side. A lamp is 8 high with an arm of 2.3. A figure is about 2.5 high. Under a deck 5 up, a tree of size 0.6 can come through the road.
- Lay every street before calling `lampsAlong`, and give it half the carriageway and 1.2. It keeps lamps out of other streets, but it knows nothing of buildings or hills: for a road that goes into a tunnel, call it on a path of the open stretch alone.
- A lot on the island inside a turning loop: the lane reaches 2.5 to either side of the line the route follows, and the loop's corners are rounded, so the island is smaller than the corners of the loop suggest.
- What worked for a road up a hill: hairpins of radius 7.5 with the lanes 2.1 to either side, a grade of 0.15, a speed of 13. The ramps into the tunnel have a grade of 0.27 and still drive well. Ease every change of slope over 3 to 5 units.
- The ground is at 0, water at -0.9 and the floor of the base at -2.4. A road can sink below all three, as the tunnel does at -6.5, and is then out of sight from above.

Looking and checking:

- **Never take a picture of the page with the browser's own tools.** The heroes drive on the development server, so such a picture has them in it. `wimmel.shot` leaves them out, and it is the only way to take a picture.
- `?place=` puts a hero on a place, and a picture of that may not be kept or shown. To check a place without a hero, add a plain box the size of a car (7 by 2.6 by 3) at each `HeroSpot` from the console and take an ordinary picture. What is needed to make the box is in the scene already: a train's mesh is a `Mesh`, and the mesh of glows has a `BoxGeometry` and a `MeshBasicMaterial`.
- A hero on show looks best with a heading of 0 or of a quarter turn, facing east or south: the opening view then sees its front and one side.
- A train's mesh is not moved by its `position`. From the console, find trains by `name === 'train'` and read `matrix.elements[12]`, `[13]` and `[14]`.
- The console keeps the lines of earlier loads. After a change, load the page afresh and read the last lines only, and read the warnings as well as the errors: a sign whose id is not on the sheet only warns ("There is no sign called …") and is simply not there.
- `wimmel.shot` also takes `w` and `h`, the size of the picture. 1100 to 1300 wide is enough to judge a landmark, and 1500 the whole tile.
- On this machine a shell command with backquotes or long quoted text in it is mangled. Write a script to a file and run the file. Where a script edits a file, have it stop if the text it means to replace is not there.

Names and care:

- Check a real name in the script it will be written in, with both forms in one search. A search for the English name confirms only the English name.
- A number can be political too. The tile's seed was first the date of the handover. It is now the dialling code.

### How it was checked, and the numbers that mattered

- **Traffic.** Pasted into the console, this lets fifteen minutes pass half a second at a time:

  ```js
  const v = wimmel.board.tiles[0].vehicles, last = new Map();
  let nearest = Infinity, longest = 0;
  for (let i = 0; i < 1800; i++) {
    wimmel.advance(0.5);
    const ps = v.positions();
    ps.forEach((p, n) => {
      for (const q of ps.slice(n + 1)) nearest = Math.min(nearest, Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z));
      const was = last.get(n), stood = was && Math.hypot(was.x - p.x, was.z - p.z) < 0.01 ? was.stood + 0.5 : 0;
      last.set(n, { x: p.x, z: p.z, stood });
      longest = Math.max(longest, stood);
    });
  }
  ({ nearest, longest, shared: v.shared() })
  ```

  `nearest` must stay above 3: nearer than that, two vehicles overlap. `longest` is the longest any vehicle stood still, in seconds. Here the nearest was 4.2, two vehicles passing on the Peak road; nothing stood still at all; and no lane is shared. It takes a few seconds.
- **Roads.** `check.ts` takes a point about every unit along every route and rail. Two lines nearer than 2.9, at heights less than 3.4 apart, are a crossing on the level. A point within 1.5 of the ground a lot covers, and no higher than its top, is a road through a building.
- **Trams.** The same loop over the trains' meshes, for twenty minutes. Trams that pass on two tracks 3 apart come within 3 of each other, so those pairs are left out, or nothing else shows.
- **Cost.** `wimmel.setHour(20)` on both tiles, then `await wimmel.bench()` several times on each, one tile straight after the other. It varies from run to run, and with what else the machine is doing while other sessions build beside you: Hong Kong gave 2.6 to 3.5 ms a frame over four runs, and 4.9 on a fifth, straight after the traffic check; North America gave 2.4 to 2.9. `wimmel.info()` at that hour: about 135 draws against 90. `wimmel.info().city`: 44,800 triangles standing still against 42,400, 521 people against 259, 206 trees against 57, 174 signs against 73, 61 moving vehicles against 86. People, trees, lamps and glows are cheap however many there are. What costs is water, and every mesh of its own: here 22 trains, the wheel, eight beams of light and four lamps.
- **Sides and weather.** `az` 42, 132, 222 and 312, by day (`hour: 13`) and by night (`hour: 21`); `weather: 'rain'` at dusk and by night (`hour: 18.5` and `20`); `weather: 'snow'` by day. Rain by night is where wet streets and signs show best. Snow lies on everything in `k.b` that faces the sky, paint on a roof included, and turns water white.
- **Flicker** was looked for by reading the models for faces in one plane, and in still pictures from the four sides. That is weaker than watching the tile turn. The one flicker found showed in a still picture as stripes of the wrong colour: stair towers flush with the ends of a block.

### What the page for tile builders could say

- That `az` 42 is the south-south-east, with the numbers above, and that a layout is checked against them before the blockout.
- That ordinary buildings are part of a tile. "A tile is never padded with ordinary buildings to fill it" reads as if a tile should have few. North America's density needs them, and this tile has 69 between its 39 things. What the sentence means is that they do not count towards the 20.
- An order of work with the steps it leaves out: the sight-line check, ordinary buildings and signs, the pass for people, trees and lamps, and the check of the places for heroes.
- How to check a place for a hero without making a picture of a hero, and that the browser's own screenshot must never be used.
- That `street`'s `width` is the carriageway alone; that a sign is seen from one side; that `wimmel.shot` takes `w` and `h` and aims at the ground; that `lampsAlong` comes after every street; and that `ordinaryBuildings` wants a lot as a corner and a size (`x`, `z`, `w`, `d`, `y0`, `y1`), not as two corners.
- The heights under the ground: 0, -0.9 and -2.4.
