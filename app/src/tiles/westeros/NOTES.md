# Westeros: notes

This file records what a later reader cannot see in the code.

**Where the tile stands, on 19 November 2026:** the ground, the water, the roads and their travellers are laid, the three dragons fly, and the regions are being built one by one. A lot that is not built yet stands as a plain box with its name on a board. Each section is rewritten as the thing it describes is built.

## Sources and rights

The books only: A Song of Ice and Fire, Fire & Blood and The World of Ice and Fire, as the two research notes read them, [westeros.md](../../../../docs/districts/research/westeros.md) and [westeros-dragons-and-more.md](../../../../docs/districts/research/westeros-dragons-and-more.md). The second note says what it could verify and what it could not, and what it marks as unverified is checked before it goes on a sign.

Nothing comes from the television series: not its dragons, its castles, its throne, its lettering or its map. Place names from the books go on plain boards. A house's arms are drawn from their plain description. No character is portrayed, and the Iron Throne is left out.

## The things on the tile, as planned

Beyond the Wall, and on it:

1. The Wall, across the whole north edge, with its walk, its cranes and its torches.
2. Castle Black: five towers and three timber halls at the Wall's foot, with no wall of their own.
3. The switchback stair up the ice, and the winch cage, which goes up and down.
4. The gate through the ice, and the road beyond it: the kingsroad turns round in a clearing of the haunted forest.
5. Eastwatch-by-the-Sea, with a black ship at its quay.
6. The Shadow Tower, under the Frostfangs.
7. The weirwood grove beyond the Wall.
8. A giant and his mammoth in the haunted forest.
9. Mole's Town: mounds with doors, and smoke.
10. Queenscrown: a tower on an island in a lake, its top painted gold.

The North:

11. Winterfell: two walls with the moat between them, and its gatehouse on the kingsroad.
12. The Great Keep and the Great Hall.
13. The broken tower.
14. The First Keep, with its gargoyles.
15. The bell tower and the rookery, from which a raven leaves.
16. The glass gardens.
17. The godswood: the heart tree, the black pool, and three hot pools that steam.
18. The door of the crypts, and the small sept.
19. Winter Town and its market.
20. A direwolf at the gate.
21. The rally stage on the kingsroad: a start arch, a finish banner, a crowd on a snowbank.
22. White Harbor, with its merman.
23. Bear Island.

The Neck:

24. Moat Cailin: three towers, one upright, one broken and one leaning. The road goes through the Gatehouse Tower.
25. The causeway, the crannogs on their stilts, and a lizard-lion.
26. Greywater Watch, which drifts.

The riverlands and the Vale:

27. The Twins, and the Water Tower on the bridge between them, with a toll bar.
28. The Inn at the Crossroads.
29. Riverrun, with its water wheel.
30. Harrenhal.
31. The Gods Eye and the Isle of Faces.
32. The Eyrie on the Giant's Lance, with the castle of snow in its garden.
33. The Bloody Gate, the Gates of the Moon, and Stone, Snow and Sky up the mule path.

The west:

34. Casterly Rock.
35. Lannisport.
36. Pyke, on its sea stacks.
37. Longships.

King's Landing and its bay:

38. The city's walls, and the three gates the roads use: the Dragon Gate, the Lion Gate and the River Gate.
39. The Red Keep.
40. The Great Sept of Baelor.
41. The Dragonpit.
42. The tourney ground, as a meet.
43. The harbour: quays, galleys and the fish market.
44. The armourer's forge, and the pot of stew.
45. Dragonstone and the Dragonmont.

The south:

46. Storm's End.
47. Highgarden.
48. Oldtown and the Hightower.
49. The Citadel, and the Starry Sept.
50. Sunspear.
51. The mummers' wagon, and their stage at the tourney ground.

In the air:

52. to 54. The three dragons.

If the tile has to lose some, these go first: 8, 10, 23, 26 and 35. Not built so far, and still wanted: 8, 20, 21, 26, 37, 44 and 51.


## How the tile is put together

`plan.ts` is the tile as numbers and draws nothing: the coasts, every lot with its height, the Wall, the roads' middles with their gates, bridges and turning rings, the rivers, the islands, the places for a hero, and the line the dragons fly. `land.ts` lays the ground and the water from it, and `roads.ts` the roads and the lanes.

What stands on the ground is built region by region, each in a file of its own: `wall`, `holds`, `winterfell`, `neck`, `vale`, `riverlands`, `kings-landing`, `stormlands`, `reach`, `west` and `dragonstone`. A region hands over a model for each of its lots (`models.ts` says how), and `city.ts` builds a lot from its model, or as a plain box with its name on a board while it has none. So the tile was whole at every stage, and a region's file can be rebuilt without touching another. `look.ts` holds what the castles share: stone by where it was quarried, roofs, the loops and lancets that glow at night, ramparts, towers, banners, braziers, the weirwood, the name board.

The regions were built by Opus builders, one to a file, each from the same brief and a task of its own, and each looked at from the opening side and from behind, by day and by night, before it was kept. The plan, the ground, the roads and the dragons are the main session's.

`westeros` in the page's console, on the development server, has the tools the tile was looked at with: `hold` stands a dragon still, `at`, `rate`, `split` and `goto` set the show's clock, `off` takes the dragons away, and `look`, `close`, `sheet` and `fourViews` take pictures with `wimmel.shot`. `?bare` leaves the ground empty, with one of each kind of traveller in a row.

## The ground

A continent between two seas. The sea runs down both edges and widens to the south, and the south-east corner is open water. The Wall is the north edge, and the Frostfangs stand over its top in the north-west corner. North of the Neck the ground is snow. The Neck is bog. South of it the ground is green, and Dorne is sand.

- Rivers, each a shape of its own that stops a hair short of the water it runs into: the Trident from Riverrun to the bay, the Green Fork into it from the Neck, the Mander along Highgarden's north wall, and the Blackwater's last stretch into the river mouth under King's Landing.
- Still water: the Gods Eye, Winterfell's moat, Queenscrown's lake, Riverrun's rivers, and the pools of the Neck. The last four are "wet lots": the ground is left out there, and whoever builds the place floors it.
- Islands, laid as level ground in the sea: Bear Island, Dragonstone, Battle Isle, and the foot of Casterly Rock.
- High ground is each region's own, built as faceted hills, and `groundAt` in `regions.ts` is the highest of them at any place. The dragons' shadows fall on it.

## Roads

Traffic keeps left: the collector's choice.

The pattern, which no other tile has: **a tree with three loops in it, on which every lane turns left at every meeting of roads.** The kingsroad is the trunk, from beyond the Wall to the fork before Storm's End, and every other road leaves it or a branch of it. The roads cut the land into four pieces: three inside the loops, and everything outside them. Each route is the one lane that runs all the way round one piece, keeping it on its left. So at a meeting of roads nobody goes straight on across anybody: each lane turns left round its own corner, as on a roundabout where everyone takes the first exit. No lane crosses another and none joins one, so nobody ever waits, and the engine's check finds no two roads that cross on the level.

- `kingsroad`, the long way round the outside, about 940 units: from the ring beyond the Wall south through the tunnel in the ice, through Castle Black, past Winterfell, through Moat Cailin's Gatehouse Tower, left at the crossroads up the high road through the Bloody Gate to the Gates of the Moon and back, over the Trident by the inn, through the Dragon Gate and along King's Landing's quays and river front, over the Blackwater through the River Gate, up to Storm's End and round its drum, through Sunspear's three gates and back, down the roseroad, over the bridge to Battle Isle and round the Hightower, up the ocean road and the west coast between the Gods Eye and Casterly Rock, over the Twins' bridge under the Water Tower, and north again to the Wall.
- `riverlands`, about 160: north up the kingsroad from the crossroads, west over the Twins' bridge, and back east along the river road.
- `westerlands`, about 360: west along the river road, south between the lake and the Rock, east along the goldroad through the Lion Gate and along the river front, and north along the quays.
- `reach`, about 265: west along the goldroad, down the ocean road, back along the roseroad, and north over the Blackwater bridge.

A branch ends in a ring to turn in, which traffic goes round with the clock: round a weirwood beyond the Wall, in the yard of the Gates of the Moon, round Storm's End's drum, in Sunspear's inner court, and round the Hightower.

A lane is 4 wide and a road 8, narrower than the city tiles' roads, because nothing wider than a wain uses them. The roads have no markings. Every road is packed earth where it meets another: two colours in one plane would flicker. Between their ends the goldroad is yellow stone, the roseroad rose-coloured setts and the ocean road shell sand, and the kingsroad north of the Neck is frozen mud.

Storm's End stands on a headland 3.2 high, so the road climbs to its gate, and the ring round its drum is the one stretch of road that is not on the ground. Its wall is low towards the sea, so that the opening view sees a traveller come round the drum.

## Who travels the roads

Nobody drives a plain car: the collector's choice, "sparse or no cars, maybe we can substitute with something else that feels on brand". So a hero is the only car on the tile, and round it go seven kinds of traveller, 17 in all: a rider at the gallop, a knight under a banner, two brothers of the Night's Watch with a torch, a cart, a haywain behind two oxen, a covered wain, and a wheelhouse behind four white horses. A rider's cloak and a knight's banner are in the plain colours of a house, and there are no arms on them. They are toy figures of lead and wood, and stand in one pose, as toy horses do: they do not move their legs. Torch and lanterns burn at night, and none throws a beam on the road.

The engine draws each kind as one batch, and they keep their distance and their lanes as plain traffic does. The engine gained this for the tile: see "For the engine".

## Places for a hero

On show, each open to the south-east (`HERO_SPOTS` in plan.ts):

- `tourney`: on the lists before the royal stand at the tourney ground, which is a meet.
- `inn`: the yard of the Inn at the Crossroads.
- `castle-black`: the yard at the foot of the stair, where the cage comes down.
- `winter-town`: the market square.
- `quay`: the fish market on the wharf under the Red Keep.
- `highgarden`: a court of roses beside the roseroad.
- `sunspear`: the court inside the third gate.

On the roads a hero is seen best on the causeway through the Neck, on the Twins' bridge, along the quays under the Red Keep, on the goldroad between the lake and the river, between the Gods Eye and the Rock, and coming round Storm's End's drum.

## What is playing

Every tile has one board that shows what is playing: the cover, the title and the artist. The engine does all of it, through a sign of kind `screen`. It is the one modern thing on this tile.

**The herald's board at the tourney ground**: a painted board on a timber frame east of the royal stand, about 11 wide and 6 high, facing the opening view. A tourney has a herald, and the meet has its bill. It is the sign `herald` in `signs.ts`, and the riverlands' file hangs it.

When nothing plays, the board shows its own picture (`herald.ts`), and that is what most people see. It is a bill a herald would paint, bold enough to read from across the tile: **"WINTER is COMING"**, the Starks' words, beside a grey direwolf's head set in a cart wheel that stands in a snowdrift, with "fit your winter wheels" beneath, and "The wheelwright, Winter Town" as the one who paid for it. It is an advertisement, as the boards of the built tiles are, and the wink at toy cars is the wheels. The wolf is this tile's own drawing.

One board is enough. A second, a singer's board in the yard of the inn, was thought of and left out.

## The tile's place in the world

The table stands on a desk whose top is an old map of the world, and each tile has a pin in it. Westeros is in no atlas, so it brings its own land (`place` in `index.ts`): its coast as the books describe the continent, in this tile's own drawing, 27 degrees from north to south, in the empty South Pacific at 134 west and 32 south. The words lettered beside it: "Hic sunt dracones". The map's own sea serpent swims just off its southern tip, and the words run under both.

On the map the continent is drawn long and narrow, as in the books. On the board it is squeezed: see "Liberties".

## The dragons

Three, after the books' three and in the books' colours: Drogon black and scarlet, 14 long with a span of 19, whose fire is black shot with red. Rhaegal green and bronze with wings of jade, 12 and 16, whose fire is orange and yellow veined with green. Viserion cream and gold, 11.5 and 15.5, whose fire is pale gold flecked with red. Section 2 of the second research note is their design: lean and long, two legs with the wings as forelimbs, everything swept back, wings that change shape with speed, a hard bank into every turn, few strong wingbeats and long glides, fire as a narrow lance after a glow in the throat, and shadows that race over the ground. They carry no rider: the collector's choice. They are this tile's own drawing, and nothing of them is taken from the television series.

**How one is made** (`dragon.ts`). A dragon is one mesh of rigid parts: a head with its horns and frill, a jaw, five joints of neck, three of body and ten of tail, and for each wing an upper arm, a forearm, a hand of three claws and four fingers, with a leg of three bones under each hip. On every frame each part is turned and moved to where the pose puts it, and the skin of the wings is drawn afresh between the shoulder, the elbow, the wrist, the finger tips and the flank. The tail follows where the body pointed a moment ago. The material is the city's cel shading with both sides of every face drawn, and light of its own in the eyes and the throat.

**How one flies** (`dragons.ts`, `flight.ts`, `show.ts`). The show is places as a function of time: the leader's line through the plan's waypoints, and a slot beside it for each of the other two that changes with the formation called. From where a dragon was and will be come its speed and how hard it turns, and from those its heading, its bank (never more than 78 degrees), how far its wings sweep back (spread below 22 units a second, a dart above 55), the turn of its head into a bend before its body follows, and the ribbon off each wing tip in a hard turn. It beats its wings once every few seconds while it cruises, and on command at the pull-up and at take-off.

**On the ground** a dragon with two legs stands as a bat does: on its feet and on the claws at the wrists of its wings, set down ahead of its chest and wide of it, elbows out, chest held up, fingers folded back along its flanks, neck run forward and down so that its head hangs low. The collector asked for this in place of an upright sitting pose, which looked like a bird's. Feet and wing claws are set on the ground by reach: each limb bends to where it must stand and hangs towards the ground while it is still out of reach, so the same joints carry the flare, the landing and the leaving.

**A display circuit**, 38 seconds:

1. The run-in: east along the south shore in a vic, down to the sea in the south-east corner, and a banked turn to the north.
2. The low fast pass: north along the east edge over open water, at 45 a second and 22 high, in echelon. Each gives one short burst ahead, a third of a second apart.
3. The vertical: a pull-up off the end of the pass, all three beating together, straight up to 110 over the mouth of the bay, slowing until they almost hang. One long lance of flame each, straight up.
4. Off the top to the west-north-west, down to 55 over the bay and the north end of the city, and north up the kingsroad over the Twins and the Neck.
5. Once round Winterfell at 57 high, the other way to the clock.
6. North-east to the Wall's east end, and west along the Wall in line astern at 37 high, below its top, with a roll one after another.
7. Left at the Shadow Tower and south down the west coast at 50, in echelon, past Pyke and Casterly Rock.
8. Once and a quarter round the Hightower at 40, in trail, and east along the south shore to the run-in.

The research note gives one circuit as about 100 seconds. That does not agree with its own speeds: at 30 a second a dragon crosses the whole tile in under 8 seconds. The speeds are kept, since they are the feeling of a jet, and the circuit is as long as it comes out.

**A split**, about one circuit in four and never two in a row, 60 seconds: at the top of the vertical they burst three ways and are apart for 24 seconds. Drogon dives to the sea in the south-east corner with one long breath over open water, comes back north past Storm's End and up the west side of Dragonstone, turns hard round the north of the Dragonmont, comes down its east rim and lands on its south-east corner, facing the bay and the view the tile opens with. He stands there braced for nine seconds, looking about, then drops off the south edge with three strong beats. The shelf is on the seaward corner because on the landward one it would have stood between the Dragon Gate and the opening view. Rhaegal goes west across the riverlands, south over Pyke and past the Rock, very low down the sea past the Hightower on its seaward side with one short breath, and once round Highgarden. Viserion climbs in widening circles over Winterfell, runs the Wall alone, and comes back down the east side over the Vale. They come together again over the city.

Where a breath may go: straight up; over open sea; into the Dragonpit's empty sand; onto the Hightower's beacon and the beacon on the Wall at Castle Black; and into the Dragonmont's crater. Nowhere else, and never over a godswood, a sept, a town or the tourney ground. Fire harms nothing. Only the first two are used so far.

**What they cost**: about 0.7 ms a frame on the build machine for all three with their fire, shadows and ribbons, and 14 draw calls. They cannot cast real shadows, because the engine draws its shadow map once: each has a flat shadow of its own, draped on the ground.

## How high things stand

The city's towers are roughly to one scale, about 3.2 metres to a unit. Westeros is an imagined place, so what counts here is the order the books give: the Hightower above the Wall, Harrenhal's towers above Winterfell's, the Red Keep smaller than Winterfell. The heights were chosen together, from that order and from what each one hides.

| | Units | In the books |
| --- | --- | --- |
| The Frostfangs | 44 to 54 | mountains: a toy |
| The Giant's Lance | 52 | a mountain: a toy |
| The Hightower | 48 | the tallest thing built in the Seven Kingdoms, taller than the Wall |
| The Eyrie's towers | 47, on a shoulder at 38 | the smallest of the great castles, high on the mountain |
| The Wall | 42 | 700 ft, which is 67 at the city's scale. It is taken as a landform, as mountains are |
| The Great Sept, to its crystal towers | 36, on a hill of 6 | |
| Casterly Rock | 34 | three times the Wall's height: a toy |
| Harrenhal's Kingspyre | 32, and its other four towers 24 to 28 | the largest castle, its towers the tallest |
| The Red Keep | 31, on a hill of 8 | smaller than Winterfell |
| The Dragonmont | 30 | a mountain: a toy |
| Winterfell's broken tower | 27 | once its tallest |
| Winterfell's Great Keep | 26, on a ward raised to 6 | |
| Storm's End's drum | 25, on a headland of 3 | one colossal tower |
| Highgarden's towers | 24, on its hill | |
| The Dragonpit | 22, on a hill of 4 | |
| The Twins' keeps | 20, and the Water Tower 17 | |
| Sunspear's Spear Tower | 20, and the Tower of the Sun 14 | 130 to 150 ft |
| Moat Cailin | 18, 14 and 9 | |
| Pyke | 18, on its stacks | |
| Riverrun | 16 | |
| The Shadow Tower | 20 | |
| Castle Black's towers | 10 to 15 | the tallest a third of the Wall |
| Winterfell's walls | 11 within and 8 without | 100 ft and 80 ft |

Beside a toy car 7 long, Drogon at 14 is a young dragon, as in the books when he is first ridden. How big the three are is one number each, and is the collector's to turn.

## Liberties taken with the books' map

- The whole continent is squeezed onto one board. North to south is squeezed hardest, and the North most of all: Castle Black stands at Winterfell's north wall, and Moat Cailin at its south-east corner.
- **Harrenhal stands on the Gods Eye's east shore**, not its north. What stands north-north-west of a tall thing is hidden by it, and there it would have hidden the river road.
- **The Gods Eye is small**, so that the road down the west side passes between its shore and the foot of Casterly Rock.
- **The kingsroad swings east to the bay and runs along King's Landing's quays**, outside the wall, where the books take it through the city. Inside, the three hills would have hidden it.
- **The crossroads lies north-east of King's Landing**, at the foot of the Vale, and the Trident is crossed just south of it, as in the books.
- **Dorne is the middle of the south edge, and the south-east corner is open sea.** It is the water the dragons' low pass and their fire need, at the front of the opening view.
- **Winterfell's ward is raised to 6**, as a castle on a mound, so that the godswood, the pools and the glass gardens are seen over the walls.
- **Storm's End stands on a headland and its wall is low towards the sea**, where the books give it a wall higher towards the sea. A tall wall there would hide the whole bailey and the junction north-west of it.
- **Oldtown is a harbour row, the Citadel and the Starry Sept on the south shore, and the Hightower on its isle**: the city between them is left out, because the ocean road needs the ground.
- **Every lane turns left at every meeting of roads**, as under "Roads".
- Bridges stand where the books have a ford or a ferry: over the Trident by the inn, and over the Blackwater.
- Rivers are short and narrow, and only the Trident, the Green Fork, the Mander and the Blackwater's mouth are there.
- The tourney ground is a meet, and the inn's yard a place to pull in. These are the collector's own interest, put where the opening view shows it.

## What was checked

- **Roads.** `checkRoads` runs on every load of the development server: no road crosses another on the level, and none runs through anything built but through its gate.
- **Surfaces in one plane.** `wimmel.fights('westeros')` came back empty with the ground, the water and the roads laid. It is run again with every region.
- **The dragons' circuit.** `clearance.ts` flies both kinds of circuit on every load, in tenths of a second, with each dragon's wing swept by its speed and banked by its turn, against every lot of the plan. Nothing comes nearer than 8. The nearest are Storm's End's drum (8.1), Casterly Rock and the Wall's top (8.6) and the Hightower (9.4). The landing is left out, since a dragon is meant to be near what it lands on.
- **What hides what**, from the opening view, was worked out on the plan before building, and is done again on what is built.

## Open, for the collector

- How big and how fast the dragons are. They are small at the size the whole tile is seen at, and that is the books' size beside a car.
- How often the pass with fire comes: every circuit, every 38 seconds, or less often with a slow high wheel between.
- The winks at toy cars: the tourney ground as a meet, the inn's yard, the wheelwright's bill. A rally stage on the kingsroad and a toll at the Twins were planned and are not built.

## For the engine

Asked for and given while this tile was built:

- **Traffic of a tile's own shape.** A tile can hand the engine kinds of traffic beside its routes. Without it this tile would have had cars or nothing.

Still wanted:

- **Something that keeps a thing in the air in focus.** The soft focus blurs by depth, so a dragon high over the table is blurred when the view is close, and so are the towers under it. `?focus=off` and the B key turn it off for the whole view.
- **Shadows for what moves.** The shadow map is drawn once, so anything a tile moves casts none. The dragons carry flat shadows of their own. A second, small shadow map for moving things would let them shade the towers they pass.
- **Where the map's words go.** The words beside a land that a tile brings run under the map's own sea serpent here.
