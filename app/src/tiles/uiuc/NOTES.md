# Urbana-Champaign: notes

What a later reader cannot see in the code.

**Where it stands.** The plan was put to the collector on 19 November 2026. He answered the same day, and this is the plan with what he asked for worked in. The tile is blocked out: its ground, its streets, the railway's embankment with its two viaducts, its routes and its places for heroes are built, and every lot is a plain box with its name on a board until its model is built. One model is built: the Illini Union. The research is in [docs/districts/research/uiuc.md](../../../../docs/districts/research/uiuc.md). Where this file and that note disagree, this file is the later: see "What the research note has wrong".

## Where things are

- `plan.ts` is the tile as data: the streets as middle lines, the ground between them, the lawns and car parks, every lot as a rectangle with a height, the routes, the parked vehicles, the places for heroes, and the places the opening view must see. Nothing in it draws.
- `city.ts` builds the ground, the streets and the embankment, and whatever stands on each lot: its model, once that is entered in `MODELS`, and until then a box.
- `checks.ts` looks at the routes and at the sight lines on every load of the development server, and says what it finds in the console.
- `look.ts` is what the campus is made of: its brick, trim and roofs as colours, how its walls are glazed, and the small parts its buildings share (a dormer, a chimney, a column, steps, a weathervane). A storey on this tile is 2.9 high, and every model takes that from here.
- `union.ts` builds the Illini Union. A model is a function of its lot, so it moves with the plan.

## The models

**The Illini Union** (`union.ts`). In plan a capital I: a long block on Green Street, a long block on the Quad, and a link between them, all three storeys of red brick under slate, with a white band at the foot of the second storey, a white cornice, dormers and chimneys. Each block carries a clock tower with a cap of green copper and a weathervane. The one over Green Street is open, with a bell in it, and the one over the Quad is glazed and lit at night. The Green Street front has a porch of four columns with the name on the band over them. The Quad front has no columns: three tall bays of glass, the name over them, and a terrace 4 deep with steps down to the lawn, four tables under blue umbrellas and people at them. The vanes stand at 20.3.

Not checked against a picture: whether the Green Street porch has columns, and how many. The collector is asked.

## How the tile lies

The campus of the University of Illinois, with Campustown to its west and a strip of Urbana to its east. North is at the top of the board. Nothing is turned and nothing is mirrored, so the tall towers of Campustown stand in the north-west, where tall things belong, and the opening view looks across the Quad at the Illini Union's south front.

The tile takes in the ground from the railway to Gregory Street and from about Springfield Avenue to State Farm Center: in life about 1.7 km by 1.9 km. The board holds that at about 8.3 m to a unit, and most things stand within 15 units of where that scale would put them. What is not to scale is size. At that scale the Illini Union is 10 units by 17, a hall of the Six Pack 8 by 5, which is smaller than a bus, and Foellinger's rotunda 4.5 across. So:

- Whatever is north of, south of, east of or west of something in life is so here.
- Buildings are drawn at one and a half to two times their share of the ground. What pays for it is the ground between them: the streets left out, the car parks, and the buildings nobody would look for.
- Three lines are moved to make room. Wright Street lies 18 units west of its share, so that the Quad has its width, and what stands between Fourth and Wright is squeezed into 22 units where it would have 49. Goodwin Avenue lies 10 units west of its share, where it is a walk, and the laboratories between Mathews and Goodwin are 8 units deep where they would have 26. First Street lies against the railway.
- The edges are cut where the ground runs out, and a few things from beyond them are brought in: see "Liberties".

It is the first weeks of the autumn term, when everything happens at once: Quad Day on the Quad, cars unloading at the Six Pack, a home game at the stadium, and the corn standing in the Morrow Plots.

The plate reads **Urbana-Champaign**.

## The layout

Eight streets. Their carriageways are 10 wide. Sidewalks are 2 on Green Street and 1.5 elsewhere, so a building's front is 7 from the middle of Green Street and 6.5 from the middle of any other.

| Street | Middle line | From | To |
| --- | --- | --- | --- |
| Green Street | z -82 | the railway | Gregory Street |
| Gregory Drive | z 7.5 | First Street | Gregory Street |
| Peabody Drive, which east of Fourth Street is Pennsylvania Avenue | z 48.5 | First Street | Gregory Street |
| Kirby Avenue, which in Urbana is Florida Avenue | z 87.5 | the railway | Gregory Street |
| First Street | x -90 | Green Street | Kirby Avenue |
| Fourth Street | x -33 | Green Street | Kirby Avenue |
| Wright Street, for buses only, and south of Gregory Drive Sixth Street | x 2 | Green Street | Peabody Drive |
| Gregory Street, which south of Gregory Drive stands for Dorner Drive | x 97 | Green Street | Kirby Avenue |

The railway's embankment is the west edge, from x -104 to -96, for the whole length of the board. North of Green Street and south of Kirby Avenue there are no streets.

The ground between them, inside the sidewalks:

| | x | z | What stands there |
| --- | --- | --- | --- |
| The north strip | -96 to 104 | -113 to -89 | Illinois Terminal, Campustown's north side, Boneyard Creek, the engineering campus, the Siebel Center, the car teams' workshop |
| Campustown, west | -83.5 to -39.5 | -75 to 1 | the Red Lion, the towers at Third, Washington Park, flats |
| Campustown, east | -26.5 to -4.5 | -75 to 1 | Joe's, the Illini Hall site, a parking deck, the bookstore, the Ice Arena, the Armory |
| The Quad | 8.5 to 58 | -75 to 1 | the Illini Union, the Quad, Foellinger, the Main Library, the Morrow Plots |
| Chemistry | 60.5 to 69 | -47 to -17 | Roger Adams Laboratory and the Chemical and Life Sciences Laboratory, behind Noyes |
| Urbana | 71.5 to 90.5 | -75 to 1 | Krannert Center, Manolo's, Gregory Place with Basil Thai, Busey and Evans halls |
| The Six Pack | -83.5 to -39.5 | 14 to 42 | eight halls, laid out round Wassaja Hall and the lawn before it |
| Fourth to Sixth | -26.5 to -4.5 | 14 to 42 | Huff Hall, the Krannert Art Museum |
| The South Quad | 8.5 to 90.5 | 14 to 42 | the bell tower, the Stock Pavilion, the greenhouses, Illini Grove |
| The stadium | -83.5 to -39.5 | 55 to 81 | Grange Grove and the stadium |
| South of Pennsylvania Avenue | -26.5 to 90.5 | 55 to 81 | a parking deck, a grove with a small cemetery in it, the Pennsylvania Avenue halls, the Florida Avenue towers |
| The south strip | -96 to 104 | 94 to 113 | lot E-14 with the tailgate, State Farm Center, the practice fields, Illinois Field, the corn, the Round Barns |

Two walks stand in for streets east of the Quad: Mathews Avenue, between the Quad's east side and the chemistry laboratories, and Goodwin Avenue, between those and Krannert Center. Oregon Street is a lane between Krannert Center and the block Basil Thai stands on.

## The things on the tile

Numbered so that the count can be checked. None is built.

The Quad:

1. The Illini Union, the tile's centrepiece: red brick, with the glazed cupola over the Quad and the open one, with its clock and bell, over Green Street; a terrace on its Quad side with small tables under blue umbrellas, and no columns; and its circle drive on Green Street.
2. The Main Quad: the lawn, its walks from corner to corner, squirrels, and the tables of Quad Day along the walks, with the car teams' stand.
3. Alma Mater, on her plaza at Green and Wright, facing north-west towards the crossing.
4. Altgeld Hall and its bell tower.
5. Foellinger Auditorium, with the lights in its copper dome.
6. The Quad's west side: the Henry Administration Building, the English Building, Lincoln Hall and Gregory Hall.
7. The Quad's east side: Harker Hall, the Natural History Building, Noyes Laboratory, Davenport Hall and Smith Memorial Hall.
8. The chemistry laboratories behind Noyes: Roger Adams Laboratory and the Chemical and Life Sciences Laboratory.
9. The Main Library, and the fenced plaza beside it where the old library under the ground is being rebuilt.
10. The Morrow Plots, in corn, with the Observatory beside them.

North of Green Street:

11. Engineering Hall, in orange brick under a blue roof, facing the Union across Green Street.
12. The Bardeen Quad, with Boneyard Creek, its footbridges, and the bronze man on his bench with a laptop.
13. Grainger Engineering Library.
14. The Siebel Center for Computer Science.
15. The car teams' workshop, with a formula car, a solar car and an off-road buggy on its forecourt.

Campustown:

16. Green Street's north side: KAMS, Legends and Murphy's Pub, with shops between.
17. The Red Lion and its beer garden.
18. Joe's Brewery.
19. The towers: 309 Green and HERE Champaign facing each other across Green Street, Burnham 310 behind, and the Tower at Third.
20. Wright Street, for buses only, with the Transit Plaza's shelters and a bus with a joint in its middle at the stop.
21. The Illini Union Bookstore, and the parking deck at Sixth and John behind it.
22. The Illini Hall site: a hole, a tower crane and diggers.
23. Washington Park, which students call Frat Park: a sand court for volleyball, with houses with white columns beside it.
24. The Armory, under its barrel roof, with the Ice Arena beside it.
25. The Marching Illini, forming up outside the Armory before the game.

The railway:

26. The railway on its embankment, Illinois Terminal, and a train that runs the length of the tile and back.
27. The two viaducts, where Green Street and Kirby Avenue go under the railway.

The south-west:

28. Wassaja Hall, with its baskets lit from inside, a lawn before it, and cars being unloaded at its door.
29. The Six Pack's four halls of 1958 to 1961: Hopkins, Scott, Snyder and Weston, each round a courtyard.
30. Nugent Hall, Bousfield Hall and the Ikenberry Dining Center.
31. Gies Memorial Stadium: its two rows of columns, its press box, and its video board over the south end, which is the tile's screen.
32. Grange Grove: tents, the drumline, and the statue at the stadium's west gate.
33. The parking deck at Fourth and Pennsylvania, across the street from the stadium.
34. State Farm Center, the saucer.
35. The tailgate in lot E-14, beside the saucer: pickups, tents, grills that smoke.

Urbana:

36. Krannert Center for the Performing Arts: its terraces and the steps of its amphitheatre.
37. Gregory Place, with Basil Thai among its shopfronts on Gregory Street, under a white awning.
38. Manolo's, on Oregon Street, across from Krannert Center.
39. Busey and Evans halls.

The south campus:

40. The South Quad, with the McFarland bell tower.
41. Mumford Hall and the ACES Library.
42. The Stock Pavilion, with cattle outside it, and the greenhouses.
43. The Florida Avenue towers, Oglesby and Trelease, with the Pennsylvania Avenue halls.

The south edge:

44. Illinois Field, the baseball diamond, and the practice fields beside it.
45. A field of corn at harvest: a combine in the corn, and a tractor with a wagon on the farm lane.
46. The three Round Barns.

In the air:

47. An aeroplane towing a banner round the stadium, and a skein of geese.

Besides these: a grove south of Pennsylvania Avenue, with a small cemetery in it (see "Care"). And between the things stand ordinary buildings: shops along Green Street, a tower of flats, Sherman Hall, Illini Tower, Bromley Hall, blocks of flats, Huff Hall, the Krannert Art Museum, David Kinley Hall, the business school, and laboratories north of Krannert Center.

## Roads

Traffic keeps right. The ground is flat, so nothing here is raised but the railway. What this tile has that no other does:

- **A square of four streets round the whole campus**, Green, Gregory, Kirby and First, driven both ways as two long loops. The outer lanes are one loop, anticlockwise. The inner lanes are another, clockwise. The loops inside them are one to a block, clockwise in the lanes next to the block, turning right only.
- **Loops inside loops.** Every lane lies next to one block and is driven clockwise round it. A loop round several blocks together uses the same lanes where its edge is theirs, shares them, and goes straight on where they turn off. Two loops never cross as long as, of any two, one lies inside the other or they lie apart: that is the rule the routes are chosen by. The thirteen routes planned were tried against each other from their corners, and none crosses another.
- **A street that only buses use.** Wright Street, from Green Street to Gregory Drive. One bus loop comes down its west lane and another goes up its east lane, and both slow to a walk at the Transit Plaza: a stretch of a route can have a speed of its own. The buses are the engine's plain bus in white.
- **Two viaducts under the railway.** The Illinois Central raised its line through Champaign in 1924, and Green Street and Kirby Avenue are two of the streets that pass under it. Here each runs on west under the embankment, and the outer loop turns round out of sight beneath it. The train goes over while the traffic goes under.
- **A car park that is part of the road.** Lot E-14 has an aisle of its own that goes round its row of bays, and a route that drives it, among the tailgaters. It touches no street.
- **A farm lane** that no route uses, for the tractor and its wagon.

What moves on a line of its own: the train, the tractor and its wagon, the combine, the aeroplane and the geese.

Thirteen routes and 45 vehicles in the blockout. The counts are budgeted as the page for tile builders says: with corners of radius 4 a lane takes 0.42 vehicles a second, and the busiest lane here, Green Street's south lane east of Wright, is planned at 0.41. The turn under the railway has a radius of 2.5 and takes 0.29, and the outer loop brings it 0.24.

**The traffic check, on the blockout.** With the engine as it is on `main` at `ec1328a`, the tile fails it: over three runs the traffic locked for good after 4, 40 and 124 simulated minutes, each time at a place where a block's loop joins a lane of the loop round the campus. The cause is in the engine and is under "For the engine". With the mend described there tried in a working copy, more than four simulated hours ran with nothing standing longer than 8.4 seconds, nothing nearer than 5.0 to anything else, and every route's vehicles at least 8.6 apart. The mend is not this tile's to make: it was put back, and the main session was told.

Where a hero is best seen on the road, by the sums below: on Kirby Avenue and on Gregory Street, where every unit of both lanes is in sight, on Peabody Drive, on Green Street's far lane, and on First Street's far lane.

## Places for heroes

Seven, each open to the south-east. A hero on show faces east, south, or between the two.

| Id | Where |
| --- | --- |
| `quad-day` | on the Quad's west walk in front of the Union, beside the car teams' stand. Its middle line is 2.5 south of the foot of the terrace's steps. |
| `basil-thai` | in a slanted bay in front of Basil Thai, on Gregory Street, backed in so that it faces the street |
| `move-in` | on the lawn before Wassaja Hall's door, where cars are unloaded |
| `tailgate-1`, `tailgate-2` | in lot E-14, among the pickups and tents |
| `car-teams` | on the forecourt of the workshop, north of Green Street |
| `deck-roof` | on the roof of the parking deck at Fourth and Pennsylvania |

## The screen

One board shows what the collector is playing: the stadium's video board. It is an ordinary sign of the engine's kind `screen`, as North America's on its gate tower is, and the engine fills it when a track is playing. The tile builds nothing for the music. One screen to a tile is the collector's rule, and a second only where it earns its place: the saucer has none.

- **Where.** On a frame over the stadium's south end, 16 wide and 9 high, from 9.5 up to 18.5, which makes it the highest thing on the stadium. The real board of 2026 is about 17,000 square feet, and 16 by 9 units is about that at the city's scale.
- **Its faces.** North to the field, and south to Kirby Avenue and the tailgate, which is the face the opening view sees.
- **By the sums.** Its south face is in sight from end to end and from foot to top. What it newly hides is all inside the stadium: part of the field, and the lower rows of the west stand.

**What it shows when nothing is playing.** Most people will see this, so it is a picture of its own: the `screen` sign gets a `paint(ctx, s, w, h)` that draws the whole of its 640 by 360 pixels each time it is called and keeps nothing between calls. It is a scoreboard before kick-off, and nothing on it looks like a display of what is playing:

- a navy board with a row of orange lamps round its edge;
- GAME DAY across the top in orange block letters, large enough to read from across the tile;
- under it HOME and GUESTS, each with a 0, either side of a clock that stands at 0:00, with 1ST below the clock;
- along the bottom a row of small drawn corn cobs and footballs.

It carries no name, no letter I and no mark of the university's, and no brand. The stadium is a memorial, so the board is a plain scoreboard in good spirits and makes no joke.

## When `main` is merged

Told by the main session on 19 November 2026, and not on `main` yet. Until the word comes to merge, the plan only leaves room.

- The `TileDef` gets `place: { lon: -88.2, lat: 40.1 }`, for the tile's pin in the map of the world that the table stands on.
- `wimmel.fights('uiuc')` lists surfaces that lie in one plane, and the tile has to pass it.
- The view tilts up and down, so the tile is looked at from low down as well as from above. What is seen from below gets built: the undersides of the two railway bridges, of canopies and of the stadium's upper decks, and the backs of boards. The sums under "What the opening view sees" are for the view the tile opens with, and say nothing of a low one.
- The engine clears road markings wherever two streets overlap, not only where they cross.

## How high things stand

Decided together, before anything is built. The city's scale is about 3.2 m to a unit. Nothing here is tall: the tallest tower is 82 m, a fifth of the Sears Tower. The towers stand a little over the city's scale, the campus's own landmarks about half over, and its low halls at about twice, since at the city's scale a hall of four storeys would be lower than a car is long. Everything with a known height stands in the order it does in life, but for the saucer.

| | In life | At the city's scale | Planned |
| --- | --- | --- | --- |
| 309 Green | 82 m | 26 | 29 |
| HERE Champaign | 81 m | 25 | 28.5 |
| Burnham 310 | 68 m | 21 | 25 |
| The Tower at Third | 62 m | 19 | 23.5 |
| The McFarland bell tower | 56 m | 17.5 | 22 |
| Illini Tower | 51 m | 16 | 20.5 |
| Bromley Hall | 46 m | 14 | 19 |
| Altgeld Hall's tower | 40 m | 12.5 | 18.5 |
| Oglesby and Trelease halls | 40 m, from one database | 12.5 | 18 |
| Sherman Hall | 39 m | 12 | 17.5 |
| The Illini Union, to the top of its cupolas | not found | | 18, and 20 with the vanes |
| The stadium's stands, its press box, and the top of its video board | 34 m for the stands of 1923 | 10.5 | 14, 17 and 18.5 |
| The Armory, at its crown | 30 m | 9 | 12 |
| Foellinger's dome | not found | | 13 |
| Bousfield Hall, of six storeys | not found | | 12.5 |
| The Main Library, to its ridge | not found | | 13.5 |
| Wassaja Hall | not found | | 11 |
| The Siebel Center, of five storeys | not found | | 11 |
| The parking decks, of four levels | not found | | 11 |
| Roger Adams Laboratory | not found | | 10 |
| Hopkins, Scott, Snyder and Weston halls, of four storeys | about 14 m | 4.5 | 9 |
| Gregory Place, of three storeys | about 11 m | 3.5 | 8.5 |
| State Farm Center | about 32 m above the ground | 10 | 6.5 |
| The railway's embankment | about 5 m | 1.5 | 6 |

The heights in life are those the research found. State Farm Center is the one thing drawn lower than its scale height: its dome is 122 m across, which at the city's scale would be 38 units, and it is 18 across here, so it is kept low to stay a saucer. The embankment is as high as it has to be for a toy car to pass under it.

## What the opening view sees

Worked out from the plan with the test that `hiddenBy` in `engine/checks.ts` uses, for the foot and the middle of each thing, three points on each place for a hero, and a car's roof every four units along each lane.

In sight: the foot of the Union's Quad front from end to end, its terrace, and both its cupolas; the foot of Basil Thai's shopfront and its awning; Wassaja Hall's south side from end to end, at its foot and half way up; Scott's and Snyder's south sides, Weston's and Snyder's east sides, Bousfield's south side and the dining hall; every place for a hero; the Siebel Center's south side from end to end; Roger Adams Laboratory's east side and the Chemical and Life Sciences Laboratory's east and south sides; the stadium's east columns, its south end and its screen; the saucer; the Armory and the band; Foellinger's dome; the west side of the Quad from Henry to Lincoln Hall; the Main Library's east front; the Morrow Plots; Krannert Center and its amphitheatre; Engineering Hall's front; KAMS, Legends and Murphy's Pub; the Red Lion's garden; Joe's sign; the Illini Hall site; the Transit Plaza; the Stock Pavilion; the grove and its cemetery; the Round Barns; the train, and both viaducts.

Hidden, and why it is left so:

- **Alma Mater**, behind Altgeld Hall, which stands south of her in life too. She is seen from the north and the west, which is the way she faces.
- **Wassaja Hall's east side**, behind Nugent Hall, which stands two units from it, and the south half of the lawn before it, behind Scott Hall. Its door and its baskets are on its south side for that reason: see "Liberties".
- **Hopkins Hall's walls**, behind Scott, Snyder and Weston, and Nugent's south side, behind Hopkins. Their roofs and courtyards are in sight.
- **Manolo's walls**, behind Gregory Place. Its roof is in sight, and its name stands on a board above it.
- **The south end of the Quad's lawn**, behind Foellinger, and its east edge, behind the buildings of the east side.
- **The stadium's field and Grange Grove**, behind the stands.
- **The Bardeen Quad**, behind Engineering Hall, and the Ice Arena's south side, behind the Armory.

Lanes, as the share of each in which a car's roof is in sight:

| | Near lane | Far lane |
| --- | --- | --- |
| Green Street | 74% | 87% |
| Gregory Drive | 53% | 96% |
| Peabody Drive | 57% | 100% |
| Kirby Avenue | 100% | 100% |
| First Street | 63% | 100% |
| Fourth Street | 51% | 90% |
| Wright Street | 24% | 100% |
| Gregory Street | 100% | 100% |

The near lane is the one on the camera's side of the buildings that hide it: the south lane of a street that runs east and west, the east lane of one that runs north and south.

## Liberties taken with the real place

- **Sizes, and three lines moved.** See "How the tile lies".
- **The north edge is about Springfield Avenue.** The Beckman Institute, the Electrical and Computer Engineering Building and University Avenue are beyond it. Three things that stand north of Springfield Avenue are brought in to the edge: Illinois Terminal, Burnham 310, and the Siebel Center, which stands here on Green Street's north side, east of Engineering Hall.
- **The east edge is Gregory Street.** The Illinois Street halls, the Spurlock Museum, the Hallene Gateway, Gregory Place East and Lincoln Avenue are beyond it. The Pennsylvania Avenue halls and the Florida Avenue towers, which in life stand east of this line and west of Lincoln Avenue, are brought in to its west side.
- **The west edge is the railway, and the railway is straight.** In life it slants away to the south-west, and by Kirby Avenue it is 500 m west of First Street. Illinois Terminal stands east of the tracks here. In life it stands west of them, on the side of downtown Champaign, and so does lot E-14, which is west of First Street.
- **The south edge is State Farm Center.** St. Mary's Road is beyond it. The Round Barns, which stand south of St. Mary's Road, are brought in to the edge. Japan House and the Arboretum, east of Lincoln Avenue, are left out.
- **Streets left out.** Springfield Avenue, University Avenue, John, Daniel, Chalmers, Armory Avenue, Second, Third, Fifth, Illinois and Nevada, and Stadium Drive with its viaduct opposite the Six Pack. Mathews Avenue and Goodwin Avenue are walks, and Oregon Street is a lane.
- **Peabody Drive and Pennsylvania Avenue are one street.** In life Pennsylvania Avenue lies about 80 m further south.
- **Wright Street is for buses for its whole length**, and runs on south as Sixth Street. In life the two are a block apart, and only the block of Wright Street between John and Daniel is the Transit Plaza.
- **Fourth Street ends at Green Street**, and so does First Street.
- **The Six Pack is laid out round Wassaja Hall.** Wassaja stands in the group's north-west corner, as in life, and the ground south of it is kept open as a lawn, so that the opening view sees its south side over Scott Hall. In life Hopkins Hall stands on part of that ground: here it stands east of the lawn, south of Nugent. Wassaja's door and its baskets are on its south side, towards the lawn. Where the real door is has not been checked.
- **A car on the lawn before Wassaja Hall.** It is move-in day.
- **The Activities and Recreation Center**, between Peabody Drive and the stadium, is left out, and so are the halls along Fourth Street on the Six Pack's east side.
- **The saucer's car parks** are a lot on either side of it. In life four lots stand round it, with their aisles slanted towards it, and drives that ring it.
- **It is game day and the streets are open.** In life First, Fourth, Kirby and Peabody are closed round the stadium on a game day.
- **The stadium's video board shows on both its faces.** The real one faces the field.
- **The grove south of Pennsylvania Avenue.** In life Roselawn and Mount Hope cemeteries fill that ground from Fourth Street to Maryland Drive. Here it is a grove of trees with one small cemetery in it.
- **Manolo's is open.** It closed on 20 October 2026. It stands as it stood, and carries its name on a board above its roof, where the opening view can read it.
- **Altgeld Hall and Illini Hall.** Altgeld is drawn finished, without the scaffolding of its renovation. Illini Hall is drawn as the building site it is in 2026.
- **A hero on the Quad.** Quad Day's rules keep vehicles off the Quad. The solar car and a formula car have stood at their teams' tables, and that is the stand the hero's place is beside.
- **The embankment is 6 high**, where 5 m would be less than 2.

## Care

- The stadium's columns carry the names of the university's dead of the First World War. They are drawn plainly, with no lettering, and nothing is staged against them.
- The McFarland bell tower is a memorial. It is a bell tower and nothing more.
- Wassaja Hall is named for the university's first Native American graduate, and its baskets are about his journey home. It is drawn as it stands.
- The cemetery in the grove is small, as the collector asked: lawn, trees and plain stones, with no lettering, and nothing stands, drives or is staged in it.
- Left out altogether: the university's block I, its seal and its wordmarks, every athletic mark, and the former mascot in any form. No protest, no flag of a cause and no slogan is drawn.
- The saucer carries no name: its name is an insurer's.
- The tile's seed is 217, the dialling code. It is not a date.

## Real names on signs

One is on a sign: ILLINI UNION, on both fronts of the Union. The rest are the names the plan would use, each as plain lettering on a plain board, with what the research found on 19 November 2026. Each is checked again as its sign is written.

| Name | Where | What confirmed it |
| --- | --- | --- |
| Illini Union | 1401 W. Green Street, Urbana | the research note, from the university's own pages. On the tile. |
| Basil Thai | 701 S. Gregory Street, Urbana | OpenStreetMap, checked on site 26 May 2026; reviews into autumn 2026. Its awning is white and reads BASIL THAI, with "at Urbana" under it, as the collector describes it. |
| Manolo's | 1115 W. Oregon Street, Urbana | Its last day was 20 October 2026 (Smile Politely; the Daily Illini, 16 November 2026). It is on the tile because the collector asked for it by name. |
| KAMS | 102 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| Legends | 522 E. Green Street | The Daily Illini, 5 December 2025; OpenStreetMap, March 2026 |
| Murphy's Pub | 604 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| The Red Lion | 211 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| Joe's Brewery | 706 S. Fifth Street | The Daily Illini, 5 December 2025; OpenStreetMap, August 2026 |
| Illini Union Bookstore | 809 S. Wright Street | its own site, with hours for 2026 |

Open in 2026 and free to use on Green Street's shops, each to be checked as its sign is written: Chopstix (202 E. Green), Sakanaya (403 E. Green), Bangkok Thai (410 E. Green), Cracked (619 E. Green) and Mia Za's (629 E. Green).

Not to be used, because they have closed: the Canopy Club (May 2026), Timpone's (December 2025), Firehaus, The Clybourne, the old Kam's on Daniel Street, and the Maize hut at First and Green, which was pulled down in July 2024.

Basil Thai's neighbours in Gregory Place in 2026, from north to south, are Kaja, Rosati's Pizza, Basil Thai and Subway. Their fronts carry trades, not names. The university's buildings carry their own names. The chains on Green Street are trades too: TACOS, COFFEE, NOODLES.

## What the research note has wrong

Found on 19 November 2026, after the note was written. The note is left as it was.

- Its "Kirby Avenue, south of State Farm Center" is St. Mary's Road. Kirby Avenue and Florida Avenue are one street, and it runs between the stadium and State Farm Center. The name changes on the line of Wright Street.
- Armory Avenue runs along the Armory's north side, about 75 m north of where the note has it.
- The Stock Pavilion, Turner Hall and the greenhouses stand north of Pennsylvania Avenue. South of it, from Fourth Street to Maryland Drive, are a parking deck, Roselawn Cemetery and Mount Hope Cemetery.
- The Ice Arena stands north of Armory Avenue between Fourth and Fifth, not in the blocks north of the Six Pack, which are private flats and fraternity houses.
- The railway is raised, on an embankment of 1924, and seven streets pass under it between University Avenue and Kirby Avenue. Illinois Terminal is on its west side, with the platform at its second floor.
- The Canopy Club, Timpone's and Manolo's, across the block from Basil Thai, have closed.
- Amtrak's Illini and Saluki run with two-level cars behind a locomotive in navy and grey. The buses are white with a block of blue at the front of the roof and a band of black windows.
- The Marching Illini wear navy with orange and white.
- The formula team has tested its car among cones in lot E-14.
- Vehicles are not allowed on the Quad at Quad Day, by its rules for 2026.
- The Alma Mater faces north-west, towards the crossing of Green and Wright. The Union is red brick, and its porch on the Quad has no columns.

## For the engine

Found while blocking the tile out, on 19 November 2026, against `main` at `ec1328a`.

- **Two vehicles at a merge can each wait for the other, for ever.** Each route keeps its own record of a lane it shares with another (`Share` in `vehicles.ts`), and the two records of one stretch differ by about half a unit in where it starts, because `findShares` matches points a unit apart. So one vehicle reckons its own room before the lane as a little more than nothing while the other reckons it as a little less, and takes it for one that can no longer stop. When both stand waiting within half a unit of their waiting places, each decides that the other goes first. North America's `garage-run` goes through the same code. What held in a trial: making the two records agree straight after `findShares`, by copying one route's `a0`, `b0` and `len` into the other's record of the same stretch.
- **`checkRoads` takes a shared lane for a crossing.** It reports any two routes that come within 2.9 of each other, and two routes in one lane are 0 apart. This tile shares lanes on purpose, so it has a check of its own in `checks.ts`: `roadFaults` finds two routes whose lines cross at more than about 25 degrees, and two that meet head-on in one lane, and leaves alone a lane that two routes drive the same way.
- **Vehicles start without regard to the lanes they share.** Each route's vehicles are spread along it, and two from different routes can start in one place and sort themselves out in the first second. On this tile's blockout the nearest two at the start are 2.9 apart. The counts are looked at again when the tile is done, so that none starts inside another.
- **A bus cannot stop.** The buses slow to a walk at the Transit Plaza, on a stretch of their route with a speed of its own, and that stands in for a stop.
