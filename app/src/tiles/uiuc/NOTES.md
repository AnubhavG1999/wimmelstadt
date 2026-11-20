# Urbana-Champaign: notes

What a later reader cannot see in the code.

**Where it stands.** The plan was put to the collector on 19 November 2026. He answered the same day, and this is the plan with what he asked for worked in. The tile is blocked out: its ground, its streets, the railway's embankment with its two viaducts, its routes and its places for heroes are built, and every lot is a plain box with its name on a board until its model is built. Built so far: the Illini Union, Gregory Place with Basil Thai and Manolo's, the Six Pack, the blocks between Fourth Street and Wright Street, both rows of the Main Quad with Foellinger Auditorium, the stadium with the saucer, the engineering campus, Green Street's south side, the screen on the stadium's board, the scenes on the ground, and what moves on a line of its own: the train, a tractor and an aeroplane. The rest of the lots are being built a file at a time (see "The models"). The research is in [docs/districts/research/uiuc.md](../../../../docs/districts/research/uiuc.md). Where this file and that note disagree, this file is the later: see "What the research note has wrong".

## Where things are

- `plan.ts` is the tile as data: the streets as middle lines, the ground between them, the lawns and car parks, every lot as a rectangle with a height, the routes, the parked vehicles, the places for heroes, and the places the opening view must see. Nothing in it draws.
- `city.ts` builds the ground, the streets and the embankment, and whatever stands on each lot: its model, once that is entered in `MODELS`, and until then a box.
- `checks.ts` looks at the routes and at the sight lines on every load of the development server, and says what it finds in the console.
- `look.ts` is what the campus is made of: its brick, trim and roofs as colours, how its walls are glazed, and the small parts its buildings share (a dormer, a chimney, a column, steps, a weathervane). A storey on this tile is 2.9 high, and every model takes that from here.
- `models.ts` gathers the files of models. Each file builds one group of lots and hands over its models by the id of their lot, the signs it hangs, and `extras` for whatever it builds that is not a lot. A lot no file has a model for is a box. A model is a function of its lot, so it moves with the plan.
- `scenes.ts` holds the screen and the small scenes on the ground between the lots, and `moving.ts` what moves on a line of its own.
- `union.ts` builds the Illini Union, `gregory-place.ts` Gregory Place and Manolo's, and `six-pack.ts` the halls of the Six Pack. The other files of models are named for their part of the tile.

## The models

**The Illini Union** (`union.ts`). In plan a capital I: a long block on Green Street, a long block on the Quad, and a link between them, all three storeys of red brick under slate, with a white band at the foot of the second storey, a white cornice, dormers and chimneys. Each block carries a clock tower with a cap of green copper and a weathervane. The one over Green Street is open, with a bell in it, and the one over the Quad is glazed and lit at night. The Green Street front has a porch of four columns with the name on the band over them. The Quad front has no columns: three tall bays of glass, the name over them, and a terrace 4 deep with steps down to the lawn, four tables under blue umbrellas and people at them. The vanes stand at 20.3.

Not checked against a picture: whether the Green Street porch has columns, and how many. The collector is asked.

**Gregory Place** (`gregory-place.ts`). A block of brick with a stone base, three storeys, a cornice and a flat roof behind a low wall. Its front on Gregory Street is four shops, each under an awning that says what is sold: KOREAN, GRILL and SUBS in dark cloth, and between them Basil Thai's, which is white and half as wide again, and reads BASIL THAI with "at Urbana" under it, as the collector describes it. The lettering is black: its real colour is not known. Two bays at the kerb lie in front: the hero's, before Basil Thai's door, and one south of it with a parked car. They lie south of where a street lamp stands at the kerb, which is why the second bay is not to the north. The head of the stairs stands at the south end of the roof, so that it hides nothing of Manolo's.

**Manolo's** (`gregory-place.ts`). One storey of cream brick with a red band and a red awning, its door on the lane to its north. Its name is on a board on two posts over the west of its roof, turned to face the opening view, and no wider than 4.4, because the block of shops hides everything east of that. The name is on its awning too. What its front really looked like is not known: the collector is asked.

**The Six Pack** (`six-pack.ts`). A storey in a hall of residence is 2.2, not the campus's 2.9, so that four storeys make a hall 9 high, and each hall's number of storeys is its height in the plan divided by that.

- *Hopkins, Weston, Scott and Snyder*, the four that are left of the six, are built alike by one function: four ranges of brick round a courtyard, a band of stone at every floor, a flat roof, and a tower of stairs at the north-west and south-east corners. Each has its name over its door, and Hopkins and Scott, whose doors face west, have it on their south sides as well.
- *Nugent* is a long block with two stacks of glass on each long side and a taller tower of stairs in buff brick at its west end.
- *Ikenberry Dining* is glass from floor to roof on three sides under a white roof that sails out, with its kitchens in brick behind. Its door and its name are on Fourth Street.
- *Bousfield* is an L of six storeys in orange brick with strips of dark metal, and a corner of glass, a little higher than the rest, where First Street meets Peabody Drive.
- *Wassaja* is five storeys of deep red brick with a top storey of dark metal, fins of pale stone, and a stack of glass lounges at its south-east corner. Its door is on the south side, with its name over it. West of the door, along the walk, stand five baskets of weathered steel, each larger than the last as they near the door, cut through with a pattern and lit from inside at night.

It is move-in day. The hero's place is the car's, on the lawn before the door. What came out of the car stands on the walk east of the door: boxes, a small fridge, a rug, two of the blue carts the halls lend out, a board that says MOVE-IN DAY, with balloons. Nothing stands on the car's place, south or east of it, or before the baskets.

Not checked against a picture: what Wassaja Hall looks like (its brick, its storeys, where its door and its baskets are), and the colour of the old halls' brick. The collector is asked.

**Between Fourth Street and Wright Street** (`sixth.ts`, built by an Opus builder and looked at from both sides by day and by night).

- *The Armory.* The drill hall's vault is half an ellipse in sixteen strips of aluminium grey with five raised ribs, its crown at the lot's height. It runs east and west, and each end is a half-round of glass in a grid of steel bars, lit at night. Round it stand two-storey ranges of red brick with a stone base and a white cornice, a pavilion one storey higher at each corner, and an arched doorway of rusticated limestone on each side. On the paving south of it the marching band is forming up: four rows of five in navy coats with orange and white, tubas and bass drums at the back, a drum major in white in front, and four people watching.
- *The Ice Arena.* Red brick with two rows of tall windows for the rink, a slate gable roof with a glazed lantern along its ridge and a white cupola, and a front with a white pediment, four pilasters and three arched doors on its south side.
- *The Illini Union Bookstore.* A stone ground floor of shop windows under navy awnings, four storeys of red brick with stone bands, a corner bay of glass on Wright Street that rises above the parapet, and a penthouse set back on the roof.
- *Illini Tower* and *Sherman Hall.* Two slabs, with rows of windows lower than the campus's storey so that they read as sixteen storeys and thirteen: the tower pale with precast fins, the hall in brown brick with blank ends.
- *The deck at Sixth and John.* Four open levels of concrete with dark shapes of cars inside and a glazed stair tower. Its roof is flat at the lot's height, with bays painted for the two parked cars that stand on it.
- *The Illini Hall site.* A hoarding of plywood, a foundation slab, a frame of primed steel up two floors, a site cabin, a heap of sand, a small yellow digger, four workers in orange vests, and a tower crane 24 high with a load on its hook and red lamps on its peak and jib.

**The Main Quad's west row** (`quad-west.ts`, built by an Opus builder and looked at from four sides by day and from two by night).

- *The Alma Mater.* The bronze group on a granite block, turned to face north-west, towards the crossing of Green and Wright: the robed figure before her throne with her arms held out, and behind the throne Labor, in a smith's apron, and Learning, with a book, clasping hands. No lettering. Round it an octagon of paving, a bed of flowers, two benches, and five people, one of them having her picture taken.
- *Altgeld Hall.* Pink-buff sandstone under steep roofs of red tile. Its great arched door is on its north side, on Green Street, under a gable, with a round turret at the corner of Green and Wright: the building of 1896 faces north, and that door is its historic front. The bell tower stands at its north-east corner: a shaft with a set-back belfry of two arches a side, lit at night, round turrets at its corners and a steep red pyramid to 18.5. On the Quad side a gabled pavilion with an arched door and the hall's name.
- *Henry Administration.* Three storeys, the ground storey of buff stone and brick above, with stone pilasters through the two upper storeys on the Quad side only, a parapet and a flat roof.
- *The English Building.* Red brick under a slate hip roof with dormers, four massive chimneys and a small white cupola. On the Quad side six tall white columns on a podium between two short towers, with the name on the band over them.
- *Lincoln Hall.* Deep red brick with a band of terra cotta panels and a strongly projecting cornice, a gabled slate roof, and three arched doorways in a stone bay on the Quad side.
- *Gregory Hall.* Red brick with limestone, a hipped slate roof with dormers, and a pedimented pavilion on the Quad side.

**The Main Quad's east row and its south end** (`quad-east.ts`, built by an Opus builder and looked at from four sides by day and from two by night).

- *Foellinger Auditorium.* A drum of red brick with sixteen sides under a low dome of dark weathered metal with eight ribs of green copper and a bronze pineapple on top, which is what the dome looks like today: it is not green. Small lamps are set in the dome and glow at night. The entrance block faces north, to the Quad: six limestone columns grouped one, two, two and one between masses of brick, three arched doors behind them, an attic with stone panels, and broad steps down to the lawn. Its lot is a unit deeper than first planned, so that the drum is nearly as wide as the lot.
- *Harker Hall.* Red brick on a rough stone base, with a mansard of slate patterned in red and teal diamonds, to which it has been restored, ten dormers, and its door up a tall flight of steps on its south side.
- *The Natural History Building.* Red brick with an orange band patterned in deep-red diamonds, a steep slate roof with four cross gables, and pointed windows at the top.
- *Noyes Laboratory.* Red brick on rough stone, round-headed windows in threes, a deep porch of rough stone on the Quad side, and a roof crowded with chimneys and fume stacks.
- *Davenport Hall.* Red-brown brick with bands of orange-buff terra cotta, two columns in a recessed entrance on the Quad side, and two wings that run back east round a court.
- *Smith Memorial Hall.* Its main front, with four columns under a pediment, faces east, onto Mathews Avenue, as it does in life. Its west side, on the Quad, is plain brick.
- *The Observatory.* A low wing of buff brick, which is what it is built of, and an eight-sided tower with a white gallery and a silver dome.

**Game day** (`stadium.ts`, built by an Opus builder and looked at from four sides by day and by night).

- *Gies Memorial Stadium.* Two stands, east and west, each with a lower tier, a concourse and an upper deck that overhangs it, and outside each a wall of red brick with tall arched openings and, on a ledge of limestone above it, a colonnade of 26 plain round limestone columns under a plain entablature. Nothing is lettered on them, hung on them or staged against them. A stair tower of brick stands at each corner, the press box on the west stand, a low north end, and a horseshoe of five rows at the south end. The board over the south end is a dark box on two masts, with its two faces left blank for the screen. The field has a white line every ten yards and plain orange end zones, with no mark at midfield. Seven players in orange face seven in white, and about 280 people stand in the stands.
- *State Farm Center.* A band of lit glass at its foot, a bowl of 48 folded plates that flares outward, a white ring that overhangs all round, and a shallow dome of 24 folded plates. It carries no name.
- *The deck at Fourth and Pennsylvania.* Four open levels with cars inside. Its roof is flat at the lot's height, with a low wall of 0.6 on its south and east sides, painted bays, and the hero's place and the two parked cars' places kept clear. The stair tower is at its north-west corner.
- *Illinois Field.* A small grandstand with a roof behind home plate, the diamond, two dugouts, a navy fence with yellow foul poles, and a few players.
- *Grange Grove.* Seven canopies in orange, navy and white with a table under each, four grills, and about forty people. No lettering.
- *The practice fields.* Two, side by side, with their lines and goal posts.

**The engineering campus** (`engineering.ts`, built by an Opus builder and looked at from four sides by day and by night).

- *The Siebel Center.* An L of four storeys of 2.6 each: red brick for the two lower storeys and glass for the two upper, under grey pitched roofs of standing seam that overhang, with a tall tower of buff stone beside the entrance, which is set in under the building at its south-west corner behind a flat white canopy on slender columns. On the inside of the L it is all glass, with a drum clad in green copper standing out of it. That is what photographs and the department's own pages show: a traditional south face and a modern north one. Its full name is on a board beside the entrance.
- *Engineering Hall.* A stone ground storey, salmon-orange brick above, round-headed windows on the main floor, three pavilions on Green Street with the middle one gabled, a low hipped roof of dark blue-grey, and a wing at the back with a veranda over the creek.
- *Grainger Engineering Library.* Three storeys of red brick with a white cornice under a big grey hipped roof with a band of skylights, half-round dormers over its end pavilions, and a small white porch of columns in the middle of its south front.
- *The car teams' workshop.* Brick and metal sheet, with three roller doors standing open on a lit hall: benches, a formula chassis on stands, shelves of tyres, a solar shell on trestles. On the forecourt west of the hero's place: a solar car, a teardrop covered in dark blue cells, and a white and orange formula car, with cones, a tool chest, a stack of tyres and five people. The boards over the doors say SOLAR CAR and FORMULA. No team's name, no sponsor, no maker and no number is drawn.
- *Everitt Laboratory* and *Talbot Laboratory.* Two brick laboratories of three storeys, Talbot with a high bay between two wings.
- *The laboratories south of Green Street.* Two storeys of red brick with four ridges of skylight and loading doors at the back.
- *Boneyard Creek*, from the line of Wright Street east to the Siebel Center: two courses of stone on each bank, three arched footbridges, walks, benches, and the bronze man who sits on a bench with a laptop in front of Grainger.

**Green Street's south side** (`campustown.ts`, built by an Opus builder and looked at from four sides by day and by night). The fronts on this side face north, so the opening view sees their backs first: every back has its doors, stairs, bins and roof units, and each real name is hung twice, once on the front and once where the opening view can read it.

- *The Red Lion.* One tall storey of deep red-brown brick with RED LION in red neon on its front and again on its east wall, over its beer garden: a board fence with a gate onto Green Street, four picnic tables, two parasols, four strings of lamps from the bar's wall to three posts, and about twenty people.
- *The two rows of shops.* A stone ground floor and one storey of flats over each shop, each in its own brick. West of 309 Green: TACOS, BUBBLE TEA and BARBER. By Wright Street: CRACKED, SHAWARMA and MIA ZA'S, with CRACKED again on a board over the roof and MIA ZA'S again on the east wall.
- *309 Green.* A foot of brick with COFFEE, the lobby and BIKES, and over it a mass of red-brown brick to 24 and one of buff to 26, in storeys of 1.0, with balconies on the east face, a pool behind a glass rail on the roof, a corner of blue glass and a mast with a red lamp at 29.
- *The Tower at Third.* A lobby of bronze glass, nineteen floors of cream concrete with fins, a blank stair core up the west face, and a glazed top floor that is lit at night, where the hotel's restaurant was.
- *A bar and grill*, with no name: BAR & GRILL in neon on its front, and BAR & GRILL and SPORTS on boards on its roof.
- *Joe's Brewery.* Two storeys of old brick with a stepped front and a corbelled cornice, JOE'S BREWERY painted large on its east wall and on a board on its roof, and a beer garden under a pergola on its east side.

Not confirmed by any source found: what 309 Green, the Tower at Third, the Red Lion and Joe's Brewery look like (a pool on 309 Green's roof is in its listings, and the Tower at Third was a hotel of 1972 with 21 floors and a restaurant on top), and that Joe's has a beer garden.

**The screen** (`scenes.ts`). An ordinary sign of the kind `screen` on both faces of the board over the stadium's south end, with the picture described under "The screen" as its own `paint`. Nobody stands on the top row of the south end under it: their heads would be in the board.

**The scenes on the ground** (`scenes.ts`).

- *The corn.* The field south of Florida Avenue, inside the track the tractor drives round it. Its west two thirds stand, in rows that run north and south, green with gold on top. Its east third is stubble, and a red combine works north along the edge of what stands.
- *The tailgate.* Lot E-14 has a row of five bays inside its aisle. The first and the last hold parked vehicles and the second and the fourth are the heroes'. In the middle one stands an orange tent with a table, a grill, two coolers, four chairs and five people, and south of it a game of bags thrown at two boards. Everything is inside the middle bay, so that it hides neither hero.
- *The bus stops.* Wright Street is paved in brick where the buses slow, with a shelter on each side of it: west of the street on the open ground between the building site and the bookstore, and east of it before Henry Administration's end wall. Each has a roof on four posts, a back of glass, a bench, five people, and a board that says BUS.
- *The grove and its cemetery.* The cemetery is a hedge round a lawn, a gate with two stone posts on its north side, a path in from the gate and one across, and rows of plain stones of slightly different heights. Nothing is lettered and nobody is in it. Outside it a walk runs the length of the grove, with three benches and a few people out walking.
- The saucer's east car park has lines for the two rows of cars that stand there.

**What moves** (`moving.ts`).

- *The train.* One piece, as Japan's bullet train is: a locomotive in navy and grey at each end, each with its cab outwards, and two silver coaches of two decks between them with a band of navy, red and white, 26 long in all. It has no lettering and no mark. The engine turns a train end for end where its line ends, and a train that is the same from both ends can do that where it stands: trains on this line often do run with a locomotive at each end. It runs the length of the embankment at 15, stands ten seconds at the south edge of the board, and ten at the north one beside a platform.
- *The platform.* A slab on the embankment's east side beside Illinois Terminal, 23 long, with a roof on posts, two benches, seven people, and the station's name, CHAMPAIGN-URBANA, in white on navy, once for the tile and once for the train.
- *The tractor.* A green tractor with a wagon of bales, one piece, on a track of bare earth that runs round the field of corn south of Florida Avenue.
- *The aeroplane.* A small yellow aeroplane that tows a plain orange banner round a ring 24 across, 26 up, a little south-east of the stadium. From where the tile is first looked at, a thing in the air stands further north-west than it is, so the ring is seen over the stadium, and nowhere on it does the aeroplane seem to fly out over the edge of the board. The banner has no lettering.

Not confirmed by any source found: what the Siebel Center's south front looks like in full, and which corner its entrance is on (it is put at the south-west, where the opening view sees it); where the car teams really work (the workshop is the plan's own); what Everitt and Talbot look like.

Not confirmed by any source found: the shape of the roofs of Altgeld's tower and turrets; how many columns the English Building's colonnade has; Lincoln Hall's roof, brick and doorway; that Gregory Hall is Georgian with a hipped roof and a pediment; which side Noyes Laboratory's great porch is on; Smith Hall's roof colour; whether the stadium's columns are round, and how many there are (sources give 181 and 200).

Not confirmed by any source found: that the Armory has towers at its corners (modest pavilions stand there), which way its vault runs, what Sherman Hall and Illini Tower look like, and that the Ice Arena's front is Georgian.

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
| `basil-thai` | in a bay at the kerb in front of Basil Thai's door, on Gregory Street, facing south |
| `move-in` | on the lawn before Wassaja Hall's door, where cars are unloaded. The opening view sees it from the ground up, through the gap between Bousfield and Scott. |
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
| Bousfield Hall, of six storeys | not found | | 13.5 |
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

In sight: the foot of the Union's Quad front from end to end, its terrace, and both its cupolas; the foot of Basil Thai's shopfront and its awning; Wassaja Hall's south side from end to end, from its foot up, with its door and its baskets, and the lawn before it; Scott's and Snyder's south sides, Weston's and Snyder's east sides, Bousfield's south side and the dining hall; every place for a hero; the Siebel Center's south side from end to end; Roger Adams Laboratory's east side and the Chemical and Life Sciences Laboratory's east and south sides; the stadium's east columns, its south end and its screen; the saucer; the Armory and the band; Foellinger's dome; the west side of the Quad from Henry to Lincoln Hall; the Main Library's east front; the Morrow Plots; Krannert Center and its amphitheatre; Engineering Hall's front; KAMS, Legends and Murphy's Pub; the Red Lion's garden; Joe's sign; the Illini Hall site; the Transit Plaza; the Stock Pavilion; the grove and its cemetery; the Round Barns; the train, and both viaducts.

Hidden, and why it is left so:

- **Alma Mater**, behind Altgeld Hall, which stands south of her in life too. She is seen from the north and the west, which is the way she faces.
- **Wassaja Hall's east side**, behind Nugent Hall, which stands two units from it, and the west end of the lawn before it, behind Bousfield Hall. Its door and its baskets are on its south side for that reason: see "Liberties".
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
- **The Six Pack is laid out round Wassaja Hall.** Wassaja stands in the group's north-west corner, as in life, and the ground south of it is kept open as a lawn, so that the opening view sees its south side. It sees it through the gap between Bousfield Hall and Scott Hall, which is 9 wide: Scott stands well east of Bousfield, as it does in life, and close to Snyder. In life Hopkins Hall stands on part of the lawn's ground: here it stands east of the lawn, south of Nugent. Wassaja's door and its baskets are on its south side, towards the lawn. Where the real door is has not been checked.
- **A car on the lawn before Wassaja Hall.** It is move-in day.
- **The Activities and Recreation Center**, between Peabody Drive and the stadium, is left out, and so are the halls along Fourth Street on the Six Pack's east side.
- **The saucer's car parks** are a lot on either side of it. In life four lots stand round it, with their aisles slanted towards it, and drives that ring it.
- **It is game day and the streets are open.** In life First, Fourth, Kirby and Peabody are closed round the stadium on a game day.
- **The stadium's video board shows on both its faces.** The real one faces the field.
- **The grove south of Pennsylvania Avenue.** In life Roselawn and Mount Hope cemeteries fill that ground from Fourth Street to Maryland Drive. Here it is a grove of trees with one small cemetery in it.
- **Manolo's is open.** It closed on 20 October 2026. It stands as it stood, and carries its name on a board above its roof, where the opening view can read it.
- **Gregory Place has three storeys.** In life the block Basil Thai is in has four. A fourth would hide Manolo's board behind it.
- **Bays at the kerb before Gregory Place**, where the sidewalk would be. In life cars park there too, at a slant.
- **Altgeld Hall and Illini Hall.** Altgeld is drawn finished, without the scaffolding of its renovation. Illini Hall is drawn as the building site it is in 2026: the campus's construction map for 2026 has structural steel rising from the foundation, set by a crane that came in November 2025.
- **Storeys on the Quad.** The English Building and Lincoln Hall have four storeys in life and three here, at the heights the plan gives them, and the English Building's colonnade is three storeys high in life. Henry Administration's storeys are 2.6, so that its three stand 8 high. Its addition of 1964 is left out, and so are Smith Hall's backstage wings of 1985 and Foellinger's additions at the back.
- **The stadium.** Its columns are 26 a side, not 100. The plaques to the dead of the Second World War and of Korea on its north and south sides are left out. Its seats are full, and the crowd stands.
- **The towers' storeys.** Illini Tower has 17 floors in life and shows 16 rows of windows. The bookstore is four storeys above the ground with a fifth set back, as its builder's page and a university page between them say.
- **A hero on the Quad.** Quad Day's rules keep vehicles off the Quad. The solar car and a formula car have stood at their teams' tables, and that is the stand the hero's place is beside.
- **The embankment is 6 high**, where 5 m would be less than 2.
- **The train stops at the edge of the board and goes back.** In life it runs on to Chicago and to Carbondale. Its platform is on the embankment's east side, beside a terminal that in life stands west of the tracks.
- **The Siebel Center is four storeys.** One database says five.

## Care

- The stadium's columns carry the names of the university's dead of the First World War. They are drawn plainly, with no lettering, and nothing is staged against them.
- The McFarland bell tower is a memorial. It is a bell tower and nothing more.
- Wassaja Hall is named for the university's first Native American graduate, and its baskets are about his journey home. It is drawn as it stands.
- The cemetery in the grove is small, as the collector asked: lawn, trees and plain stones, with no lettering, and nothing stands, drives or is staged in it.
- Left out altogether: the university's block I, its seal and its wordmarks, every athletic mark, and the former mascot in any form. No protest, no flag of a cause and no slogan is drawn.
- The saucer carries no name: its name is an insurer's.
- The tile's seed is 217, the dialling code. It is not a date.

## Real names on signs

On signs so far: RED LION and JOE'S BREWERY, each twice; CRACKED and MIA ZA'S, each twice; 309 GREEN and THE TOWER AT THIRD, each over its door and high on its east face; ENGINEERING HALL, GRAINGER ENGINEERING LIBRARY, THOMAS M. SIEBEL CENTER FOR COMPUTER SCIENCE, EVERITT LABORATORY and TALBOT LABORATORY, each on its building; CHAMPAIGN-URBANA, the name of the railway's station, on the platform; ALTGELD HALL, HENRY ADMINISTRATION BUILDING, ENGLISH BUILDING, LINCOLN HALL and GREGORY HALL, each over its door on the Quad; FOELLINGER AUDITORIUM, HARKER HALL, NATURAL HISTORY BUILDING, NOYES LABORATORY, DAVENPORT HALL, SMITH MEMORIAL HALL (the university's full name for it is Tina Weedon Smith Memorial Hall) and ASTRONOMICAL OBSERVATORY, each where the opening view can read it; GIES MEMORIAL STADIUM (so named on 9 September 2025) on the stadium's south wall, and ILLINOIS FIELD on its grandstand; ARMORY, ICE ARENA, SHERMAN HALL, ILLINI TOWER and ILLINI UNION BOOKSTORE, each on its building (Illini Tower is a private hall: its own leasing pages and the university's list of certified housing have it under that name for 2026 to 2027), and a P on the parking deck; the names of the Six Pack's seven halls and of the Ikenberry Dining Center, each over its door, as the research note gives them; ILLINI UNION, on both fronts of the Union; BASIL THAI, with "at Urbana" under it, on its awning; and MANOLO'S, with PIZZA & EMPANADAS under it, on its board and on its awning. The rest are the names the plan would use, each as plain lettering on a plain board, with what the research found on 19 November 2026. Each is checked again as its sign is written.

| Name | Where | What confirmed it |
| --- | --- | --- |
| Illini Union | 1401 W. Green Street, Urbana | the research note, from the university's own pages. On the tile. |
| Basil Thai | 701 S. Gregory Street, Urbana | OpenStreetMap, checked on site 26 May 2026; reviews into autumn 2026. Its awning is white and reads BASIL THAI, with "at Urbana" under it, as the collector describes it. |
| Manolo's | 1115 W. Oregon Street, Urbana | Its last day was 20 October 2026 (Smile Politely; the Daily Illini, 16 November 2026). It is on the tile because the collector asked for it by name. |
| KAMS | 102 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| Cracked | 619 E. Green Street | the Experience C-U map of July 2026 has "Cracked: The Egg Came First" there. On the tile. |
| Mia Za's | 629 E. Green Street | the same map, and a sale listing for 629 E. Green that names it as the tenant. On the tile. |
| 309 Green | 309 E. Green Street | its owner's current listing of the building under that name. On the tile. |
| The Tower at Third | Third Street | current listings of student housing under that name. On the tile. |
| Legends | 522 E. Green Street | The Daily Illini, 5 December 2025; OpenStreetMap, March 2026 |
| Murphy's Pub | 604 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| The Red Lion | 211 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| Joe's Brewery | 706 S. Fifth Street | The Daily Illini, 5 December 2025; OpenStreetMap, August 2026 |
| Illini Union Bookstore | 809 S. Wright Street | its own site, with hours for 2026 |

Open in 2026 and free to use on Green Street's shops, each to be checked as its sign is written: Chopstix (202 E. Green) and Bangkok Thai (410 E. Green).

Not used: Brothers, which the research had at 613 E. Green Street. Listings and the Experience C-U map of July 2026 have it at 601 S. First Street, so the bar on its lot here has no name. And Sakanaya (403 E. Green), which one listing marks as closed for good and nothing from 2026 confirms as open.

Not to be used, because they have closed: the Canopy Club (May 2026), Timpone's (December 2025), Firehaus, The Clybourne, the old Kam's on Daniel Street, and the Maize hut at First and Green, which was pulled down in July 2024.

Basil Thai's neighbours in Gregory Place in 2026, from north to south, are Kaja, Rosati's Pizza, Basil Thai and Subway, and the county's list of new restaurants has a Dubai Grill at the same address. Their awnings carry trades, not names: KOREAN, GRILL, SUBS. The university's buildings carry their own names. The chains on Green Street are trades too: TACOS, COFFEE, NOODLES.

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
