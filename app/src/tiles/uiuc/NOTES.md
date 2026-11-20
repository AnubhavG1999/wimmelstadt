# Urbana-Champaign: notes

What a later reader cannot see in the code.

**Where it stands.** Built, and waiting for the collector to call it final. The plan was put to him on 19 November 2026 and he answered the same day. Every one of the 85 lots has its model, `main` is merged in, and the checks have been run (see "The checks"). What he has not yet said: whether Wassaja Hall, the Siebel Center, Manolo's front, the lettering on Basil Thai's awning and the Union's Green Street porch are right, each of which was built without a source that shows it. The research is in [docs/districts/research/uiuc.md](../../../../docs/districts/research/uiuc.md). Where this file and that note disagree, this file is the later: see "What the research note has wrong".

## Where things are

- `plan.ts` is the tile as data: the streets as middle lines, the ground between them, the lawns and car parks, every lot as a rectangle with a height, the routes, the parked vehicles, the places for heroes, and the places the opening view must see. Nothing in it draws.
- `city.ts` builds the ground, the streets and the embankment, and whatever stands on each lot: its model, once that is entered in `MODELS`, and until then a box.
- `checks.ts` looks at the routes and at the sight lines on every load of the development server, and says what it finds in the console.
- `look.ts` is what the campus is made of: its brick, trim and roofs as colours, how its walls are glazed, and the small parts its buildings share (a dormer, a chimney, a column, steps, a weathervane). A storey on this tile is 2.9 high, and every model takes that from here.
- `models.ts` gathers the files of models. Each file builds one group of lots and hands over its models by the id of their lot, the signs it hangs, and `extras` for whatever it builds that is not a lot. A lot no file has a model for is a box. A model is a function of its lot, so it moves with the plan.
- `planting.ts` is built last: Quad Day on the Main Quad, and the tile's trees and garden lamps, each put down through a function that refuses a road, a lot, a hero's place, and any place that would stand before something the opening view is to see.
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

**The Urbana side** (`east.ts`, built by an Opus builder and looked at from three sides by day and by night).

- *Krannert Center for the Performing Arts.* Its lot is a terrace 2.5 high, paved in brick, with a band of lit glass in its outer walls that stands for the lobby under it, and wide steps up from the west, the east and the south. The three theatres stand on it as plain masses of reddish-brown brick with pale coping: the Great Hall, with a lower front block of glass, and the Festival Theatre and the Playhouse, each with a fly tower. The amphitheatre is cut into the terrace's south-west part and opens south: seven curved rows of brick seats round a stage, with two brick towers of lamps that colour it at night. People are on the terrace, the steps and the seats, and three plain banners hang there. Its name is on the Playhouse's east face.
- *Roger Adams Laboratory.* Four storeys of 2.15 in red brick with limestone, a pavilion on its east side with its name over the door, and a row of fume hoods on its roof.
- *The Chemical and Life Sciences Laboratory.* A precast ground floor under three storeys of brick, a stair tower of glass at its south-east corner, and three rows of four exhaust stacks on its roof. Its entrance and its name are on its south side, because Manolo's board stands before its east one. A link of glass joins it to Roger Adams.
- *Busey Hall and Evans Hall.* Two Georgian wings of red brick, three storeys of 2.2, under hipped slate roofs with dormers, each with its own door and name, and between them a lower range with a white porch of four columns.
- *The greenhouses.* A head house of brick along the north, and five houses of glass with ridge roofs that glow warm at night. They carry no name: none was found.
- *Illini Grove.* An open shelter with a pitched roof, three picnic tables, and people.
- *The Pennsylvania Avenue halls.* Four wings of four storeys at the lot's corners, with a stair tower at each outer end, round a dining hall of glass under a broad white roof.
- *Oglesby Hall and Trelease Hall.* Two slabs alike, twelve storeys of 1.42 in buff brick with a grid of concrete piers and bands, each on four corner piers over a lobby of glass that is set back, with a low commons of glass between the two.
- *The Round Barns.* Three, alike but not the same: white walls of twelve sides on a concrete base, arched roofs of grey-green shingle, and a red door under a hay door on the south. One has its silo coming up through the top of its roof, one a cupola and a silo beside it, and one a cupola and a wing. Round them: a white fence with a gate half open, three cows, bales of hay, and a board that says ROUND BARNS.

Not confirmed by any source found: Roger Adams Laboratory's materials and storeys; the Pennsylvania Avenue halls' layout and brick; Oglesby's and Trelease's brick and the pattern of their sides; the Round Barns' colours, and which of the three in life stands where; which of Busey and Evans is the western one (Busey is, here).

**West of Fourth Street** (`houses.ts`, built by an Opus builder and looked at from four sides by day and from two by night).

- *Three Greek houses*, each facing east, towards Washington Park: a Georgian one of red brick with a portico of four white columns two storeys high; a Tudor one, brick below and timbered stucco above, with a steep tiled roof and a tall chimney; and one of grey stone with a slate spire on a square tower. None has letters or a name: any letters would be a real chapter's. They are kinds of house, not real houses.
- *Washington Park.* A net across the sand court and a game of four against four, two benches, a table, two blankets.
- *Bromley Hall.* A pale slab of twelve floors of 1.3 over a lobby of glass, with brown brick piers, its name on its crown, and a pool and sun deck to its south.
- *Three blocks of flats*, each different: brick below and boards or panels above, balconies with a chair or a bicycle, outside stairs, a car port.
- *Huff Hall.* Red brick with a stone band and a white cornice under a long slate roof, six tall arched windows down each side, and a pedimented front with three arched doors on Fourth Street. Its name is over its south door, where the opening view reads it.
- *Krannert Art Museum.* The building of 1961 is a box of white marble whose south face is glass behind a gold screen, with beds of gravel where its pool was. The pavilion of 1988 to its east is marble under a band of copper with a glass skylight, and its door stands between two leaning pylons. A sculpture of the builder's own, three twisted blocks of rusted steel, stands on the lawn.

**South of the Main Quad** (`south-campus.ts`, built by an Opus builder and looked at from four sides by day and from one by night).

- *The Main Library.* Three pieces. The front range, at the east end, has a glazed ground storey, tall round-headed windows through two storeys above it, a hipped roof of green slate with four dormers and four tall chimneys, and in the middle of it a limestone pavilion of three arched doorways with the name over them and steps down to the plaza. Behind it, to the west, the reading-room range has five high arched windows on each long side, and beyond that stands the bookstack wing in plain brick.
- *The plaza east of the library.* Three planters, three benches and five people.
- *The McFarland bell tower.* A limestone base, a shaft of brick with piers at its corners and two limestone bands, an open belfry of two arches a side with five bronze bells that are lit from below at night, a cornice, a low slate pyramid and a finial. Nothing is lettered on it and nothing stands at its foot.
- *The South Quad.* Paving round the tower, a walk south to the Stock Pavilion and one from west to east, and six people, none within 3.5 of the tower's foot.
- *The Stock Pavilion.* A long hall of brick with eight tall arched windows on each side, five limestone medallions in its south wall, a great gable roof with a glazed monitor along it, and a gabled front with an arched door at its east end. By that door two handlers lead in three cattle: a Hereford, an Angus and a Holstein.
- *The ACES Library.* A regular octagon: two storeys of brick, a glazed storey set back, a low roof of eight slopes in green slate, and a glazed lantern that is lit at night.
- *Mumford Hall* and *David Kinley Hall.* Two Georgian halls of red brick with white trim under hipped slate roofs, alike but not the same: Mumford has a pediment over its door, and Kinley is a U with a porch of four white columns. Each has its door and its name towards the South Quad.
- *The Business Instructional Facility.* Three bars round a garden court that opens east, limestone below and brown brick above, with walls of glass on the court, thin roofs of zinc that overhang, solar panels on the south bar and a garden on the roof of the north one.
- *The Morrow Plots.* Three plots of five rows of standing corn, a low fence, and a board that says MORROW PLOTS and under it 1876, with two people reading it.

Not confirmed by any source found: what Bromley Hall looks like; Huff Hall's windows and front; the bell tower's materials and top; the Stock Pavilion's roof and where its door is; whether the ACES Library has a lantern, and where its door is; Mumford's and Kinley's roofs and porches.

**Green Street's north side** (`green-north.ts`, built by an Opus builder and looked at from four sides by day and by night). The fronts on this side face south, towards the opening view.

- *Illinois Terminal.* Three storeys of red brick on a stone base with buff bands, round-headed windows in the top storey, a dark green hipped roof with white dormers, and a buff clock tower with a green pyramid cap at its south-east corner, to 15.3. A door at the height of the embankment on its west side opens onto a short glazed bridge that reaches the platform.
- *The buses.* Two of the town's white buses stand in painted bays south of the creek, each with a block of blue at the front of its roof and a band of black windows, beside a shelter with five people.
- *KAMS.* Two storeys of dark red brick with a black ground floor and roll-up glass doors, KAMS in orange neon over the street and on a blade at the corner, and a fenced patio with a bar on its west side.
- *Burnham 310.* A slab of eighteen storeys of 1.25 in tan and brown, with stacks of glass and balconies, and the grocery hall against its east side.
- *HERE Champaign.* White, 27 storeys of 1.0 over a recessed shop of glass, with about 115 panels in four blues and greys scattered over its faces. Its shop sells RAMEN.
- *A tower of flats*, of twelve storeys on a brick podium, with no name.
- *The two rows of shops.* TACOS, CHOPSTIX and COFFEE; BUBBLE TEA, THAI, PIZZA and BARBER. Each front has its own colour, its own height, and an awning or a board.
- *Legends.* Tan brick behind a patio with a black fence, two parasols and about ten people, LEGENDS in red neon on its parapet and BAR & GRILL on its awning.
- *Murphy's Pub.* Old red brick with a corbelled cornice, a ground floor painted green with two wide open windows, its name on a board, and MURPHY'S on a sign hung out over the street.
- *Boneyard Creek*, from the railway east to the line of Wright Street: a stone edge on each bank and three arched footbridges.

**Quad Day** (`planting.ts`). Two rows of six stalls face each other across an aisle down the middle of the Main Quad's lawn. Each has a table under a cloth, a board on two legs that says what its club does (CHESS, ROBOTS, BAND, SAILING, COOKING, FILM, HIKING, RADIO, DANCE, DEBATE, GARDEN, CYCLING), two people who keep it, and whoever has stopped. Every other one has a canopy, unless a canopy there would stand before something the opening view is to see. A banner that says QUAD DAY hangs over the north end of the aisle. The car teams' table stands by itself beside the hero's place, with a small model of a car on it. About forty more people are in the aisle and on the grass. Nobody stands on the hero's place or just south or east of it.

**The trees** (`planting.ts`). Ninety: a row down each long side of the Main Quad and of the South Quad, about fifty in the grove, tall dark ones at the cemetery's corners and gate, rows along two sides of Illini Grove and of Washington Park, three on the lawn before Wassaja Hall, and a small one in the courtyard of each of the four old halls. Lamps on posts stand along the two quads and the grove's walk.

Not confirmed by any source found: what Illinois Terminal, KAMS, Legends and Murphy's Pub look like from the street (the terminal is "multistory, along classical lines", Legends has seats outside, and Murphy's has wide windows that open onto Green Street), and Burnham 310's colours. HERE Champaign's blue and white panels are from one caption.

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
- *The crop duster.* The collector asked for something in the air on 19 November 2026: "a little cropduster flying around with I-L-L ... I-N-I on a banner streaming out behind it". It is a yellow biplane with blue wingtips, a bar of nozzles under its lower wing, and a cream banner on a line behind it that reads I-L-L and I-N-I, the two halves of the chant that one side of the stadium calls to the other, the first in orange and the second in navy. The letters are built of plain strokes on both faces of the banner, so that they read from left to right from whichever side they are seen. It flies a long oval, 64 by 28, 24 up, over the stadium's south end, Kirby Avenue and the fields beyond. From where the tile is first looked at, a thing in the air stands further north-west than it is, so from there the oval is seen over the stadium, and nowhere on it does the aeroplane seem to fly out over the edge of the board. It keeps well west of the grove and its cemetery, in fact and to the eye.

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

Numbered so that the count can be checked. All 47 are built.

The Quad:

1. The Illini Union, the tile's centrepiece: red brick, with the glazed cupola over the Quad and the open one, with its clock and bell, over Green Street; a terrace on its Quad side with small tables under blue umbrellas, and no columns; and a porch of four columns on Green Street.
2. The Main Quad on Quad Day: the lawn, two rows of stalls across an aisle, a banner, a crowd, and the car teams' table.
3. Alma Mater, on her plaza at Green and Wright, facing north-west towards the crossing.
4. Altgeld Hall and its bell tower.
5. Foellinger Auditorium, under its dark dome with ribs of green copper and lamps set in it.
6. The Quad's west side: the Henry Administration Building, the English Building, Lincoln Hall and Gregory Hall.
7. The Quad's east side: Harker Hall, the Natural History Building, Noyes Laboratory, Davenport Hall and Smith Memorial Hall.
8. The chemistry laboratories behind Noyes: Roger Adams Laboratory and the Chemical and Life Sciences Laboratory.
9. The Main Library, and the plaza beside it.
10. The Morrow Plots, in corn, with the Observatory beside them.

North of Green Street:

11. Engineering Hall, in orange brick under a blue roof, facing the Union across Green Street.
12. The Bardeen Quad, with Boneyard Creek, its footbridges, and the bronze man on his bench with a laptop.
13. Grainger Engineering Library.
14. The Siebel Center for Computer Science.
15. The car teams' workshop, with a solar car and a formula car on its forecourt.

Campustown:

16. Green Street's north side: KAMS, Legends and Murphy's Pub, with shops between, and on its south side two more rows of shops and a bar.
17. The Red Lion and its beer garden.
18. Joe's Brewery.
19. The towers: 309 Green and HERE Champaign facing each other across Green Street, Burnham 310 behind, and the Tower at Third.
20. Wright Street, for buses only, paved in brick where the buses slow, with a shelter on each side.
21. The Illini Union Bookstore, and the parking deck at Sixth and John behind it.
22. The Illini Hall site: a frame of steel going up, a tower crane and a digger.
23. Washington Park, which students call Frat Park: a sand court for volleyball, with houses with white columns beside it.
24. The Armory, under its barrel roof, with the Ice Arena beside it.
25. The Marching Illini, forming up outside the Armory before the game.

The railway:

26. The railway on its embankment, Illinois Terminal with its clock tower, the platform, two buses in their bays, and a train that runs the length of the tile and back.
27. The two viaducts, where Green Street and Kirby Avenue go under the railway.

The south-west:

28. Wassaja Hall, with its baskets lit from inside, a lawn before it, and cars being unloaded at its door.
29. The Six Pack's four halls of 1958 to 1961: Hopkins, Scott, Snyder and Weston, each round a courtyard.
30. Nugent Hall, Bousfield Hall and the Ikenberry Dining Center.
31. Gies Memorial Stadium: its two rows of columns, its press box, and its video board over the south end, which is the tile's screen.
32. Grange Grove: tents, tables, grills and a crowd.
33. The parking deck at Fourth and Pennsylvania, across the street from the stadium.
34. State Farm Center, the saucer.
35. The tailgate in lot E-14, beside the saucer: parked vehicles, a tent, a grill, and a game of bags.

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
45. A field of corn at harvest: a combine at the edge of what stands, and a tractor with a wagon on the track round the field.
46. The three Round Barns.

In the air:

47. A crop duster towing a banner with the chant on it round the stadium.

Besides these: a grove south of Pennsylvania Avenue, with a small cemetery in it (see "Care"). And between the things stand ordinary buildings: shops along Green Street, a tower of flats, Sherman Hall, Illini Tower, Bromley Hall, blocks of flats, Huff Hall, the Krannert Art Museum, David Kinley Hall, the Business Instructional Facility, and laboratories north of Krannert Center. Each of these has a model of its own too: the tile has no plain boxes.

## Roads

Traffic keeps right. The ground is flat, so nothing here is raised but the railway. What this tile has that no other does:

- **A square of four streets round the whole campus**, Green, Gregory, Kirby and First, driven both ways as two long loops. The outer lanes are one loop, anticlockwise. The inner lanes are another, clockwise. The loops inside them are one to a block, clockwise in the lanes next to the block, turning right only.
- **Loops inside loops.** Every lane lies next to one block and is driven clockwise round it. A loop round several blocks together uses the same lanes where its edge is theirs, shares them, and goes straight on where they turn off. Two loops never cross as long as, of any two, one lies inside the other or they lie apart: that is the rule the routes are chosen by. The thirteen routes planned were tried against each other from their corners, and none crosses another.
- **A street that only buses use.** Wright Street, from Green Street to Gregory Drive. One bus loop comes down its west lane and another goes up its east lane, and both slow to a walk at the Transit Plaza: a stretch of a route can have a speed of its own. The buses are the engine's plain bus in white.
- **Two viaducts under the railway.** The Illinois Central raised its line through Champaign in 1924, and Green Street and Kirby Avenue are two of the streets that pass under it. Here each runs on west under the embankment, and the outer loop turns round out of sight beneath it. The train goes over while the traffic goes under.
- **A car park that is part of the road.** Lot E-14 has an aisle of its own that goes round its row of bays, and a route that drives it, among the tailgaters. It touches no street.
- **A track round the corn** that no route uses, for the tractor and its wagon.

What moves on a line of its own: the train, the tractor and its wagon, and the crop duster. The combine stands at the edge of the corn.

Thirteen routes and 45 vehicles. The counts are budgeted as the page for tile builders says: with corners of radius 4 a lane takes 0.42 vehicles a second, and the busiest lane here, Green Street's south lane east of Wright, is at 0.41. The turn under the railway has a radius of 2.5 and takes 0.29, and the outer loop brings it 0.24.

**The traffic check.** On the blockout, with the engine as it was on `main` at `ec1328a`, the tile failed it: over three runs the traffic locked for good after 4, 40 and 124 simulated minutes, each time at a place where a block's loop joins a lane of the loop round the campus. The cause was in the engine. The main session mended it there, in `15d4458`, and with that merged in the tile passes: see "The checks".

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

## The merge

`main` was merged in on 19 November 2026, at `15d4458`, once every lot was built. Nothing conflicted.

- The `TileDef` has `place: { lon: -88.2, lat: 40.1 }`, for the tile's pin on the map of the world that the table stands on.
- `wimmel.fights('uiuc')` comes back empty.
- The view tilts from 14 to 80 degrees. From 14 to 16 degrees the tile was looked at over the Union from both fronts, Basil Thai from the street, the Six Pack, the stadium and its parking deck, the Green Street viaduct from the east, and up Fourth Street by night. Nothing is open from below: the builders were asked for undersides from the start, and the awnings, canopies, porch roofs, decks and the bridges have them.
- The engine's mend for two vehicles at a merge is in (see "For the engine"), and the traffic check passes with it.

## How high things stand

Decided together, before anything was built, and kept, but for what is said under "Liberties". The city's scale is about 3.2 m to a unit. Nothing here is tall: the tallest tower is 82 m, a fifth of the Sears Tower. The towers stand a little over the city's scale, the campus's own landmarks about half over, and its low halls at about twice, since at the city's scale a hall of four storeys would be lower than a car is long. Everything with a known height stands in the order it does in life, but for the saucer.

| | In life | At the city's scale | Here |
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
| The Illini Union, to the top of its cupolas | not found | | 18, and 20.3 with the vanes |
| The stadium's stands, its press box, and the top of its video board | 34 m for the stands of 1923 | 10.5 | 14, 17 and 18.5 |
| The Armory, at its crown | 30 m | 9 | 12 |
| Foellinger's dome | not found | | 13 |
| Bousfield Hall, of six storeys | not found | | 13.5 |
| The Main Library, to its ridge | not found | | 13.5 |
| Wassaja Hall | not found | | 11 |
| The Siebel Center | not found | | 11 |
| Illinois Terminal, and its clock tower | not found | | 12 and 15.3 |
| The parking decks, of four levels | not found | | 11 |
| Roger Adams Laboratory | not found | | 10 |
| Hopkins, Scott, Snyder and Weston halls, of four storeys | about 14 m | 4.5 | 9 |
| Gregory Place, of three storeys | about 11 m | 3.5 | 8.5 |
| State Farm Center | about 32 m above the ground | 10 | 6.5 |
| The railway's embankment | about 5 m | 1.5 | 6 |

The heights in life are those the research found. State Farm Center is the one thing drawn lower than its scale height: its dome is 122 m across, which at the city's scale would be 38 units, and it is 18 across here, so it is kept low to stay a saucer. The embankment is as high as it has to be for a toy car to pass under it.

## What the opening view sees

Worked out twice. First from the plan, with the test that `hiddenBy` in `engine/checks.ts` uses: that still runs on every load, for the 32 places in `MUST_SEE`. Then, on 19 November 2026, measured on the built tile with `wimmel.seen`, which says whether anything built stands between a place and the view, and does not count people, trees or vehicles: five places along the south side of every lot and five along its east side, 0.6 out from the lot, at 0.5 and 1.6 above the ground and at half the lot's height; a grid of places on every lawn and car park; and a car's roof, 1.6 up, every four units along each lane. What follows is the second.

In sight from the foot up: the Union's Quad front from end to end, its terrace, and both its cupolas; Basil Thai's shopfront and its awning; Wassaja Hall's south side from end to end, behind nothing but its own baskets and the canopy over its door; Scott's, Snyder's and Bousfield's south sides, Weston's and Snyder's east sides, and the dining hall's east side; every place for a hero; the Siebel Center's south side from end to end; Roger Adams Laboratory's east side, and the Chemical and Life Sciences Laboratory's south side and most of its east; the stadium's east columns, its south end and its screen; the saucer and both its car parks; the Armory's south and east sides, and the band; Foellinger's front and its dome; the west side of the Quad from Henry to Lincoln Hall, and the west two thirds of its lawn, with Quad Day on it; most of the Main Library's east front; the Morrow Plots' south edge, and the Observatory; Krannert Center's east side, its three theatres, and the west of its amphitheatre; Engineering Hall's front; KAMS, Legends and Murphy's Pub; the Red Lion, and the north-west of its garden; Joe's name on its east wall and on the board over its roof; the Illini Hall site; the west side of the Transit Plaza; the Stock Pavilion and its cattle; the grove and its cemetery; the Round Barns; the tailgate's lot, Illinois Field and the practice fields; the track along the whole embankment, and both viaducts.

Hidden, and why it is left so:

- **Alma Mater**, behind Altgeld Hall, which stands south of her in life too. She is seen from the north and the west, which is the way she faces.
- **Wassaja Hall's east side**, behind Nugent Hall, which stands two units from it. Of the lawn before it, the opening view sees a wedge: the hall's full width at its wall, narrowing to the south, with Bousfield Hall before its south-west and Hopkins Hall before its east end. The hall's door and its baskets are on its south side for that reason: see "Liberties".
- **Hopkins Hall's walls**, behind Scott, Snyder and Weston; Nugent's south side, behind Hopkins; and the dining hall's south side, behind Weston. Their roofs and courtyards are in sight.
- **Manolo's walls**, behind Gregory Place. Its roof is in sight, and its name stands on a board above it.
- **The south end of the Quad's lawn**, behind Foellinger, and its east third, behind the buildings of the east side. Of Noyes Laboratory and the Natural History Building only the roofs are in sight: their fronts are to the Quad, away from the view, and the chemistry laboratories stand before their backs.
- **The stadium's field and Grange Grove**, behind the stands.
- **The Bardeen Quad and Boneyard Creek**, behind Engineering Hall and the north side of Green Street, and the Ice Arena's south side, behind the Armory.
- **Joe's front**, which faces west to Fourth Street, and the south of its garden, behind the bookstore. Its name is on its east wall and over its roof for that reason.
- **The deck at Sixth and John**, behind the bookstore and Illini Tower, the foot of Illini Tower itself, behind Sherman Hall and the Ice Arena, and Gregory Hall's south side, behind the Main Library.
- **The east side of the Transit Plaza**, with its shelter, behind Altgeld Hall and the Henry Administration Building.
- **The foot of Burnham 310 and the shops west of HERE Champaign**, behind the towers on Green Street.

Lanes, as the share of each in which a car's roof is in sight:

| | Near lane | Far lane |
| --- | --- | --- |
| Green Street | 71% | 88% |
| Gregory Drive | 59% | 96% |
| Peabody Drive | 67% | 96% |
| Kirby Avenue | 98% | 98% |
| First Street | 73% | 96% |
| Fourth Street | 49% | 89% |
| Wright Street | 40% | 100% |
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
- **The Natural History Building has three gables.** In life it has one to the north as well. From where the tile is first looked at, that one stood exactly before the east end of the Union's terrace, so it is left off, and the building is a little shorter from north to south and half a unit lower than first planned.
- **The plaza east of the Main Library** is a paved square with benches. In life the old undergraduate library lies under that ground and is being rebuilt, so in 2026 it is a building site.
- **The Main Library is a third of itself.** In life it is a figure of eight round two courtyards with eleven dormers on its front. Here it has one front range, one reading-room range and the bookstack wing, and four dormers.
- **The business school stands east of Sixth Street.** In life it is at the south-west corner of Sixth and Gregory, west of the street. It has four storeys in life and three here.
- **The Stock Pavilion's door for the cattle is at its east end.** A source gives its renovated entrance as on the south side.
- **Krannert Center's amphitheatre opens south.** In life it is on the west front, before the Great Hall's lobby windows. Here it is at the south-west of the terrace, where the opening view sees it, and the Great Hall's glass looks over it. Its lamp towers and its banners stand higher than the terrace, which is the lot's own height.
- **The Chemical and Life Sciences Laboratory has four storeys.** In life it has five.
- **Busey-Evans has no patio on its south side.** Its lot ends half a unit from the sidewalk. The porch between the two halls stands in for it.
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
- Left out altogether: the university's block I, its seal and its wordmarks, every athletic mark, and the former mascot in any form. The chant on the crop duster's banner is the one thing of the kind on the tile, and the collector asked for it: it is plain lettering, and its capital I is one bare upright stroke with no serifs, which is not the mark. No protest, no flag of a cause and no slogan is drawn.
- The saucer carries no name: its name is an insurer's.
- The tile's seed is 217, the dialling code. It is not a date.

## Real names on signs

On signs so far: KRANNERT CENTER FOR THE PERFORMING ARTS, ROGER ADAMS LABORATORY, CHEMICAL AND LIFE SCIENCES LABORATORY, BUSEY HALL, EVANS HALL, PENNSYLVANIA AVENUE RESIDENCE HALLS, OGLESBY HALL and TRELEASE HALL, each as the university writes it, and ROUND BARNS (since May 2026 the barns' full name is the Leah J. Wightman Round Barns); MAIN LIBRARY, STOCK PAVILION, ACES LIBRARY INFORMATION & ALUMNI CENTER (the university writes "and"), MUMFORD HALL, DAVID KINLEY HALL, BUSINESS INSTRUCTIONAL FACILITY, and MORROW PLOTS with 1876 under it; HUFF HALL, KRANNERT ART MUSEUM, and BROMLEY HALL, a private hall that the university's list of certified housing has under that name at 910 S. Third Street; ILLINOIS TERMINAL; KAMS, twice; LEGENDS, with BAR & GRILL on its awning, as its listings write its name; MURPHY'S PUB, and MURPHY'S on its hung sign; CHOPSTIX; RED LION and JOE'S BREWERY, each twice; CRACKED and MIA ZA'S, each twice; 309 GREEN and THE TOWER AT THIRD, each over its door and high on its east face; ENGINEERING HALL, GRAINGER ENGINEERING LIBRARY, THOMAS M. SIEBEL CENTER FOR COMPUTER SCIENCE, EVERITT LABORATORY and TALBOT LABORATORY, each on its building; CHAMPAIGN-URBANA, the name of the railway's station, on the platform; ALTGELD HALL, HENRY ADMINISTRATION BUILDING, ENGLISH BUILDING, LINCOLN HALL and GREGORY HALL, each over its door on the Quad; FOELLINGER AUDITORIUM, HARKER HALL, NATURAL HISTORY BUILDING, NOYES LABORATORY, DAVENPORT HALL, SMITH MEMORIAL HALL (the university's full name for it is Tina Weedon Smith Memorial Hall) and ASTRONOMICAL OBSERVATORY, each where the opening view can read it; GIES MEMORIAL STADIUM (so named on 9 September 2025) on the stadium's south wall, and ILLINOIS FIELD on its grandstand; ARMORY, ICE ARENA, SHERMAN HALL, ILLINI TOWER and ILLINI UNION BOOKSTORE, each on its building (Illini Tower is a private hall: its own leasing pages and the university's list of certified housing have it under that name for 2026 to 2027), and a P on the parking deck; the names of the Six Pack's seven halls and of the Ikenberry Dining Center, each over its door, as the research note gives them; ILLINI UNION, on both fronts of the Union; BASIL THAI, with "at Urbana" under it, on its awning; and MANOLO'S, with PIZZA & EMPANADAS under it, on its board and on its awning. The rest are the names the plan would use, each as plain lettering on a plain board, with what the research found on 19 November 2026. Each is checked again as its sign is written.

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
| Chopstix | 202 E. Green Street | the Experience C-U map of July 2026, and live listings for delivery. On the tile. |
| Illinois Terminal | 45 E. University Avenue | the research note. On the tile. |
| Legends | 522 E. Green Street | The Daily Illini, 5 December 2025; OpenStreetMap, March 2026 |
| Murphy's Pub | 604 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| The Red Lion | 211 E. Green Street | The Daily Illini's Best of CU, 5 March 2026 |
| Joe's Brewery | 706 S. Fifth Street | The Daily Illini, 5 December 2025; OpenStreetMap, August 2026 |
| Illini Union Bookstore | 809 S. Wright Street | its own site, with hours for 2026 |

Bangkok Thai (410 E. Green) is not used: the map of July 2026 lists it as "Bangkok Thai & Pho 911" and another listing marks it closed, so its front says THAI.

Not used: Brothers, which the research had at 613 E. Green Street. Listings and the Experience C-U map of July 2026 have it at 601 S. First Street, so the bar on its lot here has no name. And Sakanaya (403 E. Green), which one listing marks as closed for good and nothing from 2026 confirms as open.

Not to be used, because they have closed: the Canopy Club (May 2026), Timpone's (December 2025), Firehaus, The Clybourne, the old Kam's on Daniel Street, and the Maize hut at First and Green, which was pulled down in July 2024.

Basil Thai's neighbours in Gregory Place in 2026, from north to south, are Kaja, Rosati's Pizza, Basil Thai and Subway, and the county's list of new restaurants has a Dubai Grill at the same address. Their awnings carry trades, not names: KOREAN, GRILL, SUBS. So do the other fronts on Green Street: TACOS, COFFEE, BUBBLE TEA, THAI, PIZZA, BARBER, RAMEN, GROCERY, SHAWARMA, BIKES. One block of flats has a banner that says NOW LEASING. The stalls of Quad Day say what each club does, and no club's name. The university's buildings carry their own names. The chains on Green Street are trades too: TACOS, COFFEE, NOODLES.

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

## The checks

Run on 19 November 2026, after the merge, with every lot built.

- **Type check and build** pass. The build warns that its main piece is 1,418 kB, where `vite.config.ts` sets 1,200 as the size to warn at: this tile's source is 633 kB, three times Europe's, because ten builders each wrote their own small parts.
- **The console** says nothing from the tile but its own three lines: no route crosses another, all 32 places that must be seen are in sight, and 90 trees are planted.
- **Flicker.** `wimmel.fights('uiuc')` is empty.
- **Traffic.** Three starts, in steps of a tenth of a second: 281, 245 and 125 simulated minutes. No lock in any. Once under way, no two vehicles came nearer than 5.0, which is two lanes of one street. The longest any vehicle stood was 10.5 seconds, on `grove` at the corner of Pennsylvania Avenue and Gregory Street, where it waits to join Gregory Street's lane, and it did not grow. The least room along a route was 8.6. All 38 records of shared lanes come in pairs. One thing at the start: a hero put on `grove` stood 3.5 behind a vehicle of `campus` in the lane the two routes share, and they parted within seconds.
- **Places for heroes.** For each of the seven, `wimmel.seen` was asked about the middle of the car and its two ends, half a unit and 1.6 above the ground, from the opening view: all seen. So are the foot of the Union's Quad front from end to end, its umbrellas, Basil Thai's shopfront, Manolo's board, and Wassaja's door and baskets.
- **Weather.** Looked at in rain by night and in snow by day.
- **Cost.** With the tile alone on the board, in the same minute as North America alone: by day 5.3, 3.7 and 3.2 ms a frame against 4.8, 3.2 and 3.0, and by night 3.6, 3.6 and 3.4 against 4.2, 4.0 and 3.4. It draws 92 calls where North America draws 126.
- **What stands still:** 68,093 triangles, 149 signs, 407 glows, 90 trees and 816 people, of whom about 280 are the stadium's crowd. 45 vehicles drive and 15 are parked.

## For the engine

- **Mended on `main`, in `15d4458`: two vehicles at a merge could each wait for the other, for ever.** This tile's roads found it: its loops share a lane in 19 places. Each route had its own record of a lane it shares, and the two records of one stretch differed by up to a unit. Vehicles of plain traffic that started in one place on a shared lane are mended by the same commit.
- **A hero can still start close behind another route's vehicle** on a lane the two share: 3.5 apart in one start here. They part within seconds.
- **`checkRoads` takes a shared lane for a crossing.** It reports any two routes that come within 2.9 of each other, and two routes in one lane are 0 apart. This tile shares lanes on purpose, so it has a check of its own in `checks.ts`: `roadFaults` finds two routes whose lines cross at more than about 25 degrees, and two that meet head-on in one lane, and leaves alone a lane that two routes drive the same way. The main session means to take it into the engine when the tile is brought in.
- **A bus cannot stop.** The buses slow to a walk where Wright Street is paved in brick, on a stretch of their route with a speed of its own, and that stands in for a stop.
- **`station` builds a platform on columns**, for a line on a trestle. A platform on an embankment is a slab, a roof on posts and a board, built here in `moving.ts`.
- **`train` turns a train end for end where its line ends.** That is right for a train that is alike from both ends, as this one is, with a locomotive at each. A train with one locomotive would have to turn out of sight.
- **A sign cannot lie on a slope or move.** Basil Thai's lettering is on the awning's valance, not its cloth. The lettering on the crop duster's banner is built as shapes, stroke by stroke, on both faces.
- **Refusing a place that stands before something the opening view is to see**: `hides` and `clear` in `planting.ts`. Every tree and every stall's canopy goes through it. It would serve any tile.
- **A file for each group of models, gathered in one place** (`models.ts`, `ModelFile` in `plan.ts`), with a model that fails caught and said in the console: what let ten builders work in one folder at once without touching one another's files.
- **People stand.** A stadium's crowd stands on its rows.

## For the next tile

What building this one taught.

**Building with several builders at once**

- Ten Opus builders built 80 of the 85 lots, each in one file of its own, in two waves of five. Each took 14 to 33 minutes. What made that work: a stub for every file and one registry that gathers them, written before any builder started, so that no builder touches a shared file; one brief that every builder reads first, which says what the tile is, what to read and in what order, how its one file is found by the registry, the bar, the rules of building, care and names, how to check its own work in a tab of its own, what it must not touch, and what to report; a task that names each lot, what it is, what it must keep clear, and a number of triangles for each; and the centrepiece built first by the session itself, as the worked example.
- Say plainly in each task that what you write about a building's looks is from memory, and ask the builder to look it up and correct you. Nearly every builder came back with something the task had wrong: the Siebel Center is brick below and glass above under pitched roofs, Foellinger's dome is not green, Smith Memorial Hall's front faces east, the Observatory is buff brick, Brothers has moved. A builder who is told the description is certain will build the mistake.
- Builders need the page in a tab of their own, and the browser pane holds only about eight tabs. Tell each builder to close its tab when it is done, or the second wave cannot open one.
- With several builders on one development server, every edit by any of them loads every tab afresh, and a picture in flight is cut off. One picture to a call, after waiting for `wimmel.board.tiles`, gets through.
- Look at every file yourself before keeping it, from two sides by day and by night. None of the ten had to be sent back, but two things only showed once the files stood together (see below).
- Ten builders wrote ten copies of the same small parts: an arch, a name board, a bench. The tile's source is three times the size of Europe's for it. Put the parts they will all want into the shared file before the first wave, not after.

**Sight lines**

- The plan's sums use each lot's height, and a roof rises above it. The Natural History Building's north gable stood exactly before the east end of the Union's terrace, and the plan's check said all was in sight. After every batch, ask `wimmel.seen` about the foot of the centrepiece and of each must-have, not only about the plan.
- `wimmel.seen` answers for the view as it was last drawn. While the browser pane is hidden nothing is drawn between pictures, so it answers for wherever the last picture was taken from. Load the page afresh, or take a picture from the opening view, before asking it.
- Ask it about the whole tile once everything stands, and not only about the must-haves: five places along the south and the east side of every lot, a grid on every lawn, a car's roof along every lane. It takes ten seconds, and it found that the plan's list of what is in sight had three things in it that are not: the east side of the Transit Plaza, the dining hall's south side, and half of the lawn before Wassaja Hall.
- When a place for a hero is seen only over a roof, look for the real layout before lowering anything. Scott Hall stood next to Bousfield in the first plan and hid Wassaja's lawn. In life it stands well east of Bousfield, and putting it there opened a gap that shows the lawn from the ground up.
- Whatever is scattered late (trees, canopies) goes through one function that knows the roads, the lots, the heroes' places and the sight lines. It refused only two places of ninety-two here, because the rows were laid out with the sight lines in mind, but it is what makes that safe.
- A thing in the air is seen further north-west than it is, by about 0.9 of its height each way. Lay out a flight path by where it will be seen, and check both that and where it really is.

**Small things that cost time**

- `lampsAlong` stands a lamp wherever its count falls. One stood in a parking bay at the kerb, through a parked car. Lay out bays at a kerb after the lamps, and look.
- Two parked vehicles in the plan stood one inside the other for a whole stage, because no picture showed that car park from near. Check the parked spots against each other with numbers.
- Halls of residence and towers need a storey of their own. At the campus's 2.9 a hall of four storeys is 11.6 high, not 9, and a tower of twenty-four is 70.
- A long script on the command line gets mangled. Write it to a file and run the file.
- The tool that reads the page's console filters by a plain piece of text, not by a pattern: `a|b` finds nothing, and a warning was missed that way.
- Parasols, people and tables have to be to one scale with each other. The first umbrellas on the Union's terrace were lower than the people beside them.
