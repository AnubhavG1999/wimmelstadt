# Hong Kong: notes

What a later reader cannot see in the code. The tile is at the blockout stage: its ground, its roads, its traffic and whatever moves on rails or on the water are built, and every building on it is still a plain box with its name on a board.

## How the tile lies

Both sides of Victoria Harbour, turned a quarter turn so that it is seen as from Kowloon. The harbour runs down the middle of the board from the north edge to the south edge. Hong Kong Island is the west half and Kowloon the east half. Real north points to the board's east, so Central is at the Island's north end and Causeway Bay at its south end. Nothing is mirrored.

## The things on the tile

Numbered so that the count can be checked. Each is a plain box for now.

The Peak
1. The Peak Tower, on the summit, with a lookout (a place for a hero)
2. The Peak Tram, up the north face
3. The Mid-Levels Escalator (not placed yet)
4. Man Mo Temple, in Sheung Wan at the foot of the north face

Central
5. Two IFC, with the ferry piers
6. The Observation Wheel
7. Jardine House
8. HSBC
9. Bank of China Tower
10. Central Plaza

Wan Chai and Causeway Bay
11. The Convention and Exhibition Centre, on its point, with its link over the shore road
12. The Blue House
13. The trams, the length of the Island and round the racecourse
14. Happy Valley Racecourse
15. The typhoon shelter and the Noonday Gun
16. The Monster Building

The harbour
17. The Star Ferry: two boats that cross between Central's piers and Tsim Sha Tsui
18. A junk under red sails
19. A dragon boat race, in Hung Hom's bay
20. The car ferry at its pier (a place for a hero)
21. A Symphony of Lights (not built yet)

Besides these, two lighters with derricks lie at anchor, and sampans are moored in the typhoon shelter and off Tsim Sha Tsui.

Tsim Sha Tsui
22. The Clock Tower
23. The Cultural Centre and the Space Museum's dome
24. The Peninsula (a place for a hero)
25. The Avenue of Stars
26. Nathan Road, with its buses

Kowloon
27. ICC
28. Lion Rock
29. Temple Street Night Market
30. A row of Mong Kok shops
31. A tower in bamboo scaffolding
32. Hong Kong Coliseum
33. Choi Hung Estate, with courts on its car park roof (a place for a hero)
34. A jumbo jet on the approach to Kai Tak (not built yet)
35. The harbour tunnel: a mouth on each shore

## Roads

Traffic keeps left. No road crosses another on the level: `check.ts` looks for that on the development server and says so in the console. Checked as the page for tile builders asks, over fifteen minutes of traffic let pass with `wimmel.advance`: no two vehicles came within three units of each other (the nearest were 4.2 apart, passing on the Peak road), and none stood still. No two routes share a lane.

- **The harbour run** is one loop about 990 units long. On the Island it runs the length of the shore: north to the ferry piers, back by the water, into the tunnel on the Convention Centre's point, and south from there on a viaduct on stilts across the typhoon shelter. On Kowloon it comes up beside the Coliseum, goes along Nathan Road and round the Peninsula.
- **The Peak road** starts at the car ferry's pier, climbs on stilts along the breakwater, crosses the shore road and the tram as a flyover, and climbs the south face in five legs to a turning place on the summit.
- **The tunnel through Lion Rock** carries the loop round the north of Kowloon.
- **The tram** has two tracks beside the Island's shore road, a turning loop at Central and a loop round the racecourse. **Buses** have the two middle lanes of Nathan Road.

## Liberties taken with the real place

- **Where the Peak stands.** It is in the middle of the Island's west side, south of Central, with its road on the south face. On a first layout it stood behind Central, as it does in life, and Central's towers hid all of it from the view the tile opens with. Mid-Levels and the Peak Tram are on its north face, towards Central.
- **Heights.** The Peak is 39 units high and the towers in front of Mid-Levels are up to 125. In life the Peak is the higher.
- **The tunnel's mouths.** The Island's is on the Convention Centre's point and faces north. The real Cross-Harbour Tunnel comes up beside the Royal Hong Kong Yacht Club, a little further east. Kowloon's is beside the Coliseum, as in life.
- **The Peak road's start.** No road climbs from a ferry pier along a breakwater. It is there so that the road can cross the tram on a flyover.
- **The Monster Building** stands beside the racecourse. It is in Quarry Bay.
- **Temple Street Night Market** is at the front of the board, on Kowloon's south edge, where it can be seen. It is in Yau Ma Tei.
- **The tram** runs beside the shore road. In life it runs a street or two inland.
- **Left out:** the Big Buddha (it stands on Lantau), the Golden Bauhinia and anything with a flag, a liner at Ocean Terminal (the harbour was too narrow with it).

## Real names on signs

None yet. The boards on the boxes are labels for the blockout and will go.

## For the engine

Built in this folder, and worth having in the engine:

- **A road of any shape.** `geom.ts` makes a road from corners: it rounds them, gives every point a height, runs lanes beside it, and hands it to the engine as short `ramp` stretches. The Peak road, the viaduct and the tunnel's ramps are made this way.
- **A check that no two roads cross on the level** (`check.ts`).
- **A tunnel's mouth** (`portal` in `city.ts`): a cutting, a hood, and darkness a little way in, where a vehicle goes out of sight. The ground needs a hole for the cutting, and the road must be about 4 units down before the hole ends.

Missed, or found wanting:

- **The mirror image shows what is under the ground.** Water and wet streets mirror the city from a camera below the ground, and that camera draws every vehicle, including those in a tunnel under the water. At night their lamps show faintly in the harbour above the tunnel.
- **Vehicles of a tile's own shape in the traffic.** The trams and the double-decker buses are `train`s with a car of their own shape (`movers.ts`). A train does not see traffic, so they have lanes that no route uses: the trams their own tracks, the buses the two middle lanes of Nathan Road. A bus that could drive a route among the cars would be better.
- **Boats.** The ferries, the junk and the dragon boats are `train`s too, on lines across the water. A train does not bob.
- **A place for a hero that moves.** The car ferry is moored, because a hero's place on show cannot move. A ferry that carried a hero across the harbour would need the engine's help.
- **Cost.** With water on a tile the whole city is drawn twice, once for the mirror image. The blockout takes about 3.1 ms a frame where North America takes 2.6, with half North America's triangles.
