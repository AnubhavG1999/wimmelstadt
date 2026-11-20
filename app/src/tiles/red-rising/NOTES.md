# The Iron Rain: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Being built, on the branch `claude/red-rising-tile`. The plan, the ground, the roads, the stories and their director are the tile session's; the buildings, the fleet, the Rain, the figures and the column's vehicles are builders' files, each from the brief `tile-red-rising-builders-brief.md` in the shared notes folder.

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

The six novels only, as the research note reads them through the Red Rising fan wiki's pages with their chapters ([red-rising.md](../../../../docs/districts/research/red-rising.md)), and for the ships the note `tile-red-rising-ships.md` in the shared notes folder. Nothing from the comics, the audio dramas, The Book of Lorn, the board game, the covers, any official art or blueprint, or fan art. A look the books do not give is the tile's own drawing, and is said to be so below.

Nobody dies on the tile, and nothing of the books' cruelty is shown: every fight stops at the clash, as the research's stories say.

## How the tile is put together

- `plan.ts` is the tile as numbers, and imports nothing: the dome, the trench, the roads, the lots, the places for heroes, the stages of the stories, the shield, the fleet's sky, where the Rain lands, and what the opening view must see.
- `land.ts` lays the dome as a field of facets, the trench's paved floor, the river and the lake (the tile's own water, at the floor: the engine's water mirrors about the board's ground), and the glow of the planet's air along the four edges.
- `roads.ts` lays the roads and their lanes, and cuts their benches into the dome.
- `regions.ts` lists six builders' files of buildings: `citadel.ts`, `towers.ts`, `canyon.ts`, `walls.ts`, `quarter.ts`, `flank.ts`. `city.ts` builds each lot by its model, or as a plain box with its name, and runs the checks on every load.
- `fleet.ts`, `rain.ts`, `figures.ts` and `traffic.ts` are builders' files that move.
- `show.ts` is the tile session's: it sets the fleet, the Rain and the cast going, and directs the stories.

## The ground

The planet is a dome that is 0 at every edge of the board and rises to a crown of 40 along the canyon's rim at z -78 (`DOME`, `domeAt`): the product of a curve from west to east and one from north to south, so that it is round near the crown and follows the edges near them, falling fast over the last thirty units on the north and slowly over the whole south half, which faces the opening view. Agea lies on the level floor of a trench cut into it at y 20 (`F`, `TRENCH`): on the north the canyon's wall, about 20 high in the middle and less towards its ends; on the south a low rim; at the west and east ends the floor meets the dome and the canyon runs on over the planet's curve. The colours are the books' terraformed Mars, green and white from orbit (GS 36), red only where the ground is bare, banded rust and ochre on the canyon's wall (the tile's), snow on the plateau's north-east (GS 38) and on the peaks in the south-east.

## Roads

One road climbs out of the canyon on a ramp across its north wall, turns in a hairpin at the rim, runs over the crown of the planet along the canyon's edge, turns in a second hairpin and comes back down the other ramp: two ramps in a V across the wall, meeting on the apron before the North Gate (`LOOP`). The Gate Avenue tees into the V's foot and runs south through the gate to a ring on the Field of Mars. From the shield park a road runs down the river's east bank, through the lowColor quarter and out of the South Gate, and down the south flank to the Augustan camp. Traffic keeps right. Four routes: the loop each way round, the loop the way down the west ramp with the avenue and its ring, and the camp road. The loop's lanes are shared on purpose, so the checks are `roadFaults` and `throughSolids`.

## The stories

Thirteen, in `show.ts`, from section 4 of the research note; see the head of that file. The cast rest at posts between stories, where the opening view sees them: the attackers on the canyon's rim between the guns, Sefi and the Valkyrie with their griffins in the snow, the Sovereign and her guard on the landing pads, Cassius, the Wind Knight and the Bellona on the north wall, Lysander and Atalantia on the south wall, Lorn's force, Kavax, Daxo, Holiday and Thraxa in the camp, the Jackal on the tallest tower's roof. A story calls its cast to its stage; each flies there on gravBoots, or walks if near; plays its part; and goes home. The director plays four on the ground and one in the sky at once, never one figure in two stories and never two stories on one stage, each in its turn. The show plays every story through on load on the development server and says where a figure stands in something built or under the ground, passes through another, or flies lower than what is under it. For the console: `rrShow.play(id)`, `rrShow.running()`, `rrShow.stories()`.

## Liberties taken with the books

- **Named characters**, at the collector's wish (above).
- **Everyone at once.** Figures of different years stand in one battle: Alexandar grown (IG, DA) beside the boy he was in 742 (IG 45), Sefi and the Valkyrie (MS), Holiday and Thraxa (MS, IG), Lysander and Atalantia (DA), the Morning Star (MS on), the Archimedes (IG), the Rim's ships (IG, LB). Each stands with the side it fought on. Stories 9 and 10 are scenes from Morning Star played in this battle's places, and Cassius fights beside Darrow in story 9 and against him in the others, as he did in different books.
- **Where things stand**: the Institute's gate and square on the plateau above the canyon, not cut into its wall; Olympus floating over the canyon's east end, not 80 km up a side canyon; the shield's generators in a park on the city's east side.
- **The river** comes over the canyon's rim in a fall and ends in a lake inside the city.
- **The stories end gently**: no death, no drowning, no burning.
