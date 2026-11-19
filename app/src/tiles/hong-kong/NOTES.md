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

Between them stand about sixty ordinary buildings, built by the engine's `ordinaryBuildings`: tong lau over shops, dark blocks trimmed with neon, slim towers of flats, slabs of public housing, and houses with tiled roofs on the south face of the Peak.

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
- **Cost.** With water on a tile the whole city is drawn twice, once for the mirror image, and every train is a draw of its own. The tile takes about 3.4 ms a frame where North America takes 2.4 to 2.9, with as many triangles.

## How it was checked

- By day and by night, from all four sides, and in rain and in snow.
- `npm run typecheck` and `npm run build` pass.
- The console of the development server shows no error and no warning, and the two lines from `check.ts`.
- The traffic, the trams and the places for heroes as said above.
