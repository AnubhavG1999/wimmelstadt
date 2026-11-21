# Gotham City: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Built on the branch `claude/gotham-tile`, as the tenth tile. The plan, the ground, the roads, the elevated railway, the ordinary buildings and what stands over the roads (`blocks.ts`), the life of the paving, the stage and the show's director are the tile session's. The districts, the figures, the machines, the animals, the air, the traffic's kinds and the stories are builders' files, each from the brief `tile-gotham-builders-brief.md` and a task sheet of its own in the shared notes folder, judged and mended by the tile session.

## The collector's decisions

These were his, on 20 November 2026, and the tile is built on them. Where he is quoted, the words are his.

- **Named characters are portrayed**, as on the Iron Rain: "Batman and his rogues gallery", and "add as much and more references cgharacters stories as you can find": the Joker, the Justice League as a gimmick, the rogues, Ra's al Ghul, the Robins. Fifty-eight are in the cast.
- **Batman is black with a yellow chest emblem**, the Batmobile a modern one, and the Batcave is behind a waterfall.
- **The engine as it is**, with the mood curated: the Arkham games' mood of levels and distinct towers, taken in kind and drawn as the tile's own.
- **Dense, and on levels.** The first layout had too much water: "something like the urban design of chicago and newyork where it's super dense with multi levels". Then the west bank: roads that "flow through a building or two", after "the underground roads in chicago next to the river".
- **A Batwing** "like the bat from the nolan movies", as "a coo lflying elemtn alongside batmans logo and the justice league members (who can fly, occasionally ofc)". It is "black and bat themed", flown by "a robin ... or bats himself occasionally". Nothing sticks out under it: "the sleek black body flying through the sky will look cool, when it lands it can land on its belly almost hovering down".
- **The railway loops**, "maybe under and over".
- **Wayne Tower is tall**, as tall as the America tile's towers, and carries Wayne Enterprises' sign after a picture he sent: the name over a block W with wings, "not in gold but silver/gray", "the shape of the W too". Of three shapes for the foot of its dark panel he chose the plain chevron.
- **A helicopter at Wayne Tower** "which bruce wayne will get into and he'll go to wayne manor".
- **Wayne Manor is grand, and the Batcave is hidden under it**: "think of a cool way to keep the batcave hidden too, i want wayne manot to look nice and grand as well, arkham gives off admirable energy".

## Sources and rights

DC's comics, as three research notes read them: [the city](../../../../docs/districts/research/gotham-the-city.md), [Batman and his rogues](../../../../docs/districts/research/gotham-batman-and-rogues.md) and [the wider cast](../../../../docs/districts/research/gotham-the-wider-cast.md). A source given in a file's comment rests on those notes. Nothing is taken from a film, a game or a television series as its own design: where the collector asked for something he knew from one (the Batwing, the sign on Wayne Tower, the mood of the Arkham games), it is taken in kind and drawn as the tile's own. The sign is plain strokes: five letters and a block W. Every emblem on a figure is a plain patch of colour in a plain shape. No building is a copy of one in a film.

Nobody dies and nobody is hurt: a fight stops at the clash, a chase ends in an escape, nobody carries a gun, and no blade is drawn but in a duel between two who both have one.

## The things on the tile

**The upper city, on its terraces** (`towers.ts`, `civic.ts`):
1. Wayne Tower, with its sign, its helipad and its forecourt.
2. The Kane Building. 3. The Elliot Tower. 4. Gotham Cathedral. 5. The Wayne Foundation.
6. Gotham University and its quad. 7. Police headquarters, with the Bat-Signal's lamp on its roof. 8. City Hall. 9. The Public Library. 10. The Courthouse.

**The west quay and the river** (`waterfront.ts`, `blocks.ts`):
11. The Diamond District's two jewellers. 12. Gotham National Bank and Bank Square, with the screen the Joker has borrowed. 13. The Iceberg Lounge. 14. The pier, with the Riddler's booth and maze. 15. The river row: three buildings on piers over the west quay's road, with the railway running through them. 16. The two bascule bridges over the Sprang.

**Robinson Park** (`park.ts`): 17. Finger Castle on its knoll. 18. The Botanical Garden. 19. The lawn, the lake and the Alice group.

**Lower Gotham and Tricorner** (`bayside.ts`, `tricorner.ts`, `blocks.ts`):
20. The building over Grand Avenue's ramp, in three steps, and the gatehouse on the bastion. 21. The Underground Highway's boarded mouth. 22. The Clock Tower. 23. The Gotham Gazette, with a typewriter on its roof. 24. The fish market and its jetty. 25. Tricorner Yards: a hull on its slip, a floating dock, two cranes, a gasholder, the light at the point. 26. Rows of ordinary buildings laid out by rule.

**The east bank** (`uptown.ts`, `eastend.ts`, `docks.ts`, `blocks.ts`):
27. River Street's terrace, and four towers against its wall with bridges between them. 28. The tower over Kane Street's ramp. 29. Otisburg. 30. The Bowery. 31. Amusement Mile: the wheel, the coaster, Haly's Circus, the boardwalk. 32. The goods yard and the wharf. 33. The tenements. 34. The Gotham Museum. 35. The old cinema on Park Row, and the court beside it. 36. The Thomas Wayne Clinic. 37. The fire house, and the ball court behind it. 38. Ace Chemicals. 39. The cold store. 40. The Monarch Playing Card Co. 41. The dock cut and its drawbridge, the cranes, the freighter.

**The harbour** (`bay.ts`): 42. The Cobblepot Bridge. 43. The Iceberg Casino. 44. The Statue of Justice. 45. Blackgate.

**Bristol** (`bristol.ts`): 46. Wayne Manor on the cliff's edge. 47. The grotto and its waterfall. 48. The pool garden, whose mirror pool is the lid of the Batcave's lift. 49. The entrance court, the gates and the drive, the helicopter's ring. 50. The Kane Memorial Bridge.

**Mercey Island** (`arkham.ts`): 51. Arkham Asylum on its crag. 52. Its gate. 53. The Trigate Bridge.

**What runs through it**: 54. The elevated railway, a loop with two stations.

What moves is under its own headings below.

## How the tile is put together

- `plan.ts` is the tile as numbers, and imports nothing: the levels, the lands, the roads, the railway's loop, the lots, the places for heroes, the stages of the stories, what the view must see, and the rule that lays out the ordinary buildings (`FILLS`, `fill`).
- `land.ts` lays the ground on its levels, with upright walls between them. `space.ts` answers where there is room.
- `roads.ts` lays the streets, the decks, the lanes and the elevated railway with its stations. `blocks.ts` builds what stands over the roads and the ordinary buildings. `life.ts` furnishes the paving last of all.
- `regions.ts` lists the builders' files of districts. `city.ts` builds each lot by its model, or as a plain box with its name if its model fails, and runs the checks on every load.
- `figures.ts`, `machines.ts`, `beasts.ts`, `air.ts` and `traffic.ts` are builders' files that move.
- `stage.ts` is what a story is written with, `show.ts` its director and its check, `stories.ts` the cast and the book, `stories-west.ts` and `stories-east.ts` the two chapters.

## The ground

Five levels and the water (`Y` in plan.ts): the quays at 0, Bristol's shelf at 4, River Street's terrace at 6, the upper city at 8 with the Crown at 13 on it, Crest Hill at 10 and Arkham's crag at 9. The Sprang River runs up the middle of the view from the harbour to the Trigate, where the Gotham River crosses it; about a sixth of the board is water. The first layout had twice as much, and the collector had it laid out again.

The Batcave is not on the ground at all. Two things are cut into Crest Hill: the shaft of its lift, under the pool garden's lid, and the grotto under the Manor's tower, which the Manor's terrace roofs.

## Roads

One long route drives every street's outer lanes there and back without crossing itself, and two short rounds drive the Sprang's ring and the canal. A junction over water (the Trigate), a viaduct and a suspension bridge (the Cobblepot), a ramp along the upper city's wall with a building over it, and a street that climbs through a tower (Kane Street). Lanes that are the show's own, which no traffic enters: the service lane under Crest Hill's cliff and the docks' apron.

The elevated railway is a loop at 11.5: along River Street over the line between its lanes, down Kane Street over its west kerb, along Harbour Road's south sidewalk, over the Sprang on a truss, through the river row and back over the Sprang. Its stations are the tile's own build of the engine's (see "For the engine").

## Places for a hero

Six (`HERO_SPOTS`): a stone stand on the lawn by the Manor's pool garden, where the Batwing rises before it; the Manor's entrance court; Wayne Tower's forecourt; the Battery, before the Iceberg Lounge; the prize turntable on the Iceberg Casino's deck; Amusement Mile's boardwalk.

The first plan had a place inside the open Batcave. A hidden cave cannot show a car: from the opening view, at 38 degrees, a cliff six high shows about three units of floor inside a mouth. So that place moved up to the lawn.

## What moves

- **Traffic** (`traffic.ts`): the tile's own kinds in its dark paint: police cruisers and vans, yellow cabs, an armoured car, a news van, Ace's tanker, an ice lorry, old sedans and coupes. On the harbour the Blackgate launch crosses between the pier and the isle, a tug tows a barge round, and a police boat patrols; they are timed so that they never meet.
- **The elevated railway**: a train of two cars round the loop, stopping at both stations.
- **The air** (`air.ts`): the Bat-Signal on its cloud, which can show a bat, a question mark or a pumpkin; searchlights; the waterfall's curtain, which parts; fog on the water, steam from the streets, smoke.
- **Machines** (`machines.ts`), each the tile's own drawing: the Batmobile, the Batwing, Wayne Enterprises' helicopter, the Jokermobile with its glove, plank and cards, the Joker's rowing boat, Wonder Woman's invisible plane, the Red Hood's motorcycle. Built and in no story yet: the Batboat, the Batplane, the Batgyro, the Batcycle and the police helicopter.
- **Animals** (`beasts.ts`): Titus, Bat-Cow and Alfred the cat on the Manor's lawn, Catwoman's cat, Harley's hyenas, Aquaman's seahorse; and flocks: the cave's bats, the Scarecrow's crows, pigeons, gulls, fish.
- **The Manor's pool and lift** (`buildHatch` in bristol.ts) and **the docks' drawbridge** (`buildDrawbridge` in docks.ts).

## The cast and the stories

Fifty-eight named figures (`LOOKS` in figures.ts) and a few kinds of unnamed ones. Each named figure has a post where it rests in a way of its own, and the director (`show.ts`) plays up to four stories at once, each holding its stage and whatever only one story may have (`holds`: the sky, the Signal, a machine). A figure that a story calls from far off swings in on a line, flies, or walks out of sight and in again where it is wanted (`WAYS` in stories.ts).

**The west bank and Bristol** (`stories-west.ts`), eighteen: the Signal; out of the Batcave (the Batmobile through the waterfall); the Batwing's patrol, with Robin, Damian, Nightwing or Batman flying it by turns; the Cat and the Bat at the jeweller's; the Riddler's row of question marks on the pier; Two-Face's coin, with two endings by turns; Ivy's vines on Finger Castle, and Harley; the Scarecrow's crows; the League looks in; the Mad Hatter's tea; the Talon on Wayne Tower; the night of the pumpkin; the League's fly-bys, a different flyer each time; and Bruce Wayne's helicopter home and back to work.

**The east bank, Lower Gotham, the harbour and Arkham** (`stories-east.ts`), sixteen: the Jokermobile's chase on the docks, over the rising drawbridge; the Laughing Fish; the Penguin's umbrella at the museum; Mr. Freeze's cold snap; Bane's crate; Killer Croc in the Sprang; Arkham's night out; the Demon's heir (Damian's duel with Ra's al Ghul); Man-Bat over the Clock Tower; the race across the roofs; the lamp on Park Row; Clayface at the pictures; Firefly and the fire house; Killer Moth at the light; Kite Man; Harley rings the bell.

Each story's source is in a comment over it, as the research notes give it. The show's check (`gothamShow.check(id)` on the development server, and at load) plays a story through offline every tenth of a second and says where a figure stands inside something built, in the air, sunk into what it stands on, or within 0.7 of another.

## How high things stand

| | Top |
| --- | --- |
| Wayne Tower (its mast a little over) | 148 |
| The Kane Building | 80 |
| The Elliot Tower | 68 |
| Gotham Cathedral | 58 |
| The Clock Tower (its finial to 59.5) | 56 |
| The East End's four towers | 42 to 54 |
| The tower over Kane Street | 48 |
| The river row | 28 to 48 |
| The gatehouse over Grand Avenue | 40 |
| Police headquarters | 32 |
| Ace Chemicals' stack | 30 |
| Arkham Asylum | 30 |
| The Statue of Justice | 29.5 |
| The Cobblepot Bridge's cables (its towers 23) | 29.4 |
| Amusement Mile's wheel | 28.6 |
| The Kane Memorial Bridge | 28 |
| The elevated railway's rails | 11.5 |

Wayne Tower stood at 100 at first. The America tile's towers stand between 100 and 166, and the collector wanted it to look tall beside them: its stages are now shares of its height. Gotham's towers are not real ones, so no height in life stands beside these.

**What the towers hide.** The view hides about 1.3 times a thing's height to its north-north-west. What is tall stands along the west edge, where what it hides falls off the board: on the board of nine, Old Gotham's towers hide part of whichever tile stands west of this one, as every tile's towers do. Along the north edge things keep under `ceilingAt` in space.ts, but for the top of the Manor's tower and of Arkham's.

## Names on boards

Every name is a place of the comics as the research gives it, in plain capitals: Wayne Tower, Kane Building, Elliot Tower, Gotham Cathedral, Wayne Foundation, Gotham University, G.C.P.D., City Hall, Public Library, Courthouse, Diamond District, Gotham National Bank, Iceberg Lounge, Underground Highway, Clock Tower, Gotham Gazette, Robinson Park, Finger Castle, Botanical Garden, Amusement Mile, Otisburg, The Bowery, Thomas Wayne Clinic, Gotham Museum, Park Row, Fire House, Ace Chemicals, Cold Store, Monarch Playing Card Co., Wayne Manor, Kane Memorial Bridge, Arkham Asylum, Trigate Bridge, Blackgate, Statue of Justice, Iceberg Casino, Cobblepot Bridge, Fish Market, Tricorner Yards. Fire House, Cold Store, Fish Market, Public Library, Courthouse and City Hall are plain words. Nothing names the Batcave.

Names looked up beyond the research, by Uptown's builder with a web search: NOONAN'S (Sean Noonan's bar in Hitman, first in The Demon Annual 2, 1993) and FINNIGAN'S (the police's bar in Gotham Central; some sources spell it Finnegan's). HALY'S CIRCUS, DR. THOMPKINS and PATENT PENDING (a nod to the Laughing Fish) are from the research. The rest of the lettering is trades and wares: PAWN, OYSTERS, LOCKSMITH, BAIL BONDS, DELI, LAUNDRY, ICE, COAL & COKE and the like.

## Liberties taken with the comics

- **The city is one board.** The comics' Gotham is three islands and a mainland; here it is two banks of the Sprang with the Gotham River across the north, Arkham on its island in the north-west corner, Bristol on the north shore, and Tricorner and the harbour in the south. Places keep their neighbours where the research gives them (Ace Chemicals beside the Monarch Playing Card Co., the clinic on Park Row, the Bowery's taverns), and little else of the map.
- **Every era at once.** Four Robins, Batgirl, Batwoman and the rest of the family, rogues from 1940 to 2011, and the League on its visits stand on one tile.
- **Bruce Wayne and Batman are both in the cast**, and are never in sight together: where one goes in, the other comes out.
- **Looks the comics do not give** are the tile's own drawing, and each builder's file says which: nearly every building, the Batwing, the helicopter, Wayne Tower's sign, the Manor, the pool that opens.
- **Wayne Manor stands on a cliff over the river**, with the waterfall under its tower. The research has the Manor on a hill with the cave under it and a river in the cave; the cliff, the grotto, the fall and the pool's lid are the tile's, to the collector's wishes.
- **The Batwing** is flown by a Robin, Nightwing or Batman by turns, and lives under the Manor's pool.
- **Nobody is hurt**, so the Joker's crimes are a chase and a laugh, Bane's strength is a crate thrown into the dock, and Mr. Freeze freezes a pipe.

## What it costs

On the development server, a second one with hot reload off, the pane not in front, the window 1024 by 768, each tile alone and one straight after the other in the same tab, three runs of `wimmel.bench()` at 14 and at 21 o'clock:

| | A frame, ms | Draw calls | Triangles that stand still |
| --- | --- | --- | --- |
| Gotham, with its show | 6.3 to 7.9 | about 300 | 135,000 |
| Blackwater Bay | 6.0 to 7.9 | about 100 | 94,000 |
| The Iron Rain | 7.9 to 9.1 | 160 to 295 | 78,000 |

Gotham has more standing still than any tile before it: the towers 10,800, the Manor and Bristol 11,000, Arkham 11,000, the ordinary buildings and what stands over the roads 14,600, the roads and the railway 14,300, and the other districts between 3,500 and 10,000 each. The life of the paving is 2,900. The still tile alone draws in about 3 ms with the pane in front. The first place to look if it must cost less: the towers' gargoyles and the railway's sleepers.

## What the collector may still turn

- **Which stories play, and how often**: each story's `weight` in the two chapters, and `AT_ONCE` in show.ts (four at once now). `PAUSED` in stories.ts leaves a story out.
- **How tall Wayne Tower is**: the `wayne-tower` lot's height in plan.ts. Its stages, its sign and its helipad follow.
- **The sign**: `wayneSign` in towers.ts. Its silver, its panel's shape (`cut`), the letters' strokes.
- **How many drive**: one number per route at the end of roads.ts. The long route is reckoned for more heroes than drive today.
- **How much stands on the paving**: `MOST` and `STEP` in life.ts, and the weights in `FIXTURES`.
- **The pool's water**: `MIRROR` in bristol.ts.

## Views for the pictures

`gotham.aim(x, y, z, az, elev)` with `zoom` gives each, on the development server; az 42 and elev 38 are the opening side. `gothamShow.only(id)` plays one story, and `wimmel.advance(seconds)` brings it to its moment.

- The opening view, by day and by night. By night with the Signal lit (`gothamShow.only('signal')`) is the picture of the tile.
- The whole tile from straight above, as a map: az 0, elev 89, zoom 236.
- Wayne Tower's sign: `gotham.aim(-71, 84, 30, 42, 26)`, zoom 64, by day and at 22.
- The helipad and the helicopter: `gotham.aim(-61, 65.5, 28, 42, 30)`, zoom 34. With Bruce Wayne on his way to it: `gothamShow.only('heliHome')`, body time 8.5.
- Wayne Manor: `gotham.aim(34, 16, -92)`, zoom 86, by day and at 22. The grotto and the fall: `gotham.aim(40, 12, -86, 42, 30)`, zoom 50. The pool open with the lift up: `gothamHatch.open(1)`, `gothamHatch.lift(1)`, `gotham.aim(14, 11, -93)`, zoom 50.
- The chase over the drawbridge, by night: `gothamShow.only('chase')`, body time 5.2 to 9.8; about `gotham.aim(93, 3, 45)`, zoom 50.
- The East End under the railway: `gotham.aim(60, 8, 2)`, zoom 92. The docks and Ace's vats at night: `gotham.aim(78, 6, 36)`, zoom 100, hour 22.
- Amusement Mile at night: `gotham.aim(88, 12, -30)`, zoom 96, hour 22.
- The harbour, with the bridge, the casino, Justice and Blackgate: `gotham.aim(66, 8, 76)`, zoom 130.
- Lower Gotham, with the Clock Tower and the Gazette's typewriter: `gotham.aim(-76, 14, 86)`, zoom 110.
- The police roof and the Signal's lamp: `gotham.aim(-52, 33, 18)`, zoom 44.
- Rain at night and snow by day, from the opening view.

## For the next tile

- **Show the collector the blockout early, and expect to lay it out again.** This tile was laid out three times: he wanted half the water, then the west bank denser. What made it dense: buildings that stand over their roads on piers (a lot whose `base` is its underside), streets on terraces, and a railway overhead.
- **When he sends a picture, build the choice.** The sign's panel was settled in one message once three shapes stood side by side in a picture; a switch in the page's address made the three quick to render.
- **A place for a hero cannot be inside something hidden.** From the opening view a mouth six high shows three units of floor. Decide what "hidden" means for such a place before building it.
- **Ask `wimmel.seen` of everything once all of it stands**, not of the plan: a jetty lay behind a neighbour's iceberg and a bridge's tower, a whole yard behind a terrace's wall, and a story's seat behind the railway. The plan's boxes knew none of it, and each builder had checked only its own.
- **Ask every story builder for a ray check of every post**, and give it the stages only after the buildings stand.
- **A story can stall the page.** The show checks every story at load; when Bristol was planned afresh, one written for the old places never came back, and no tab loaded. A list of stories to leave out (`PAUSED`), a way to load without the check (`?gotham=unchecked`) and a check of one story at a time (`gothamShow.check(id)`) found it in a minute.
- **Things that chapters share by number collide**: two chapters drew on the same eight rings. Give each its own.
- **Keep one tab of your own open at all times.** When the pane's last tab closes, its tab numbers begin again, and a builder that closes "its" tab by an old number closes yours.
- **Builders on Opus take 25 to 45 minutes each**, and six at once on one development server worked, each with a stub whose exports were whole from the first save. Judge on a second server with hot reload off.
- **Write a patch script with the editor's own tools, not in the shell**: a script pasted into the shell loses its backticks.
- **The edges between districts are yours.** A bridge's anchor blocks, a station's stairs, a lamp before a museum's steps: each builder flagged what it met, and none could mend it.

## For the engine

- **A station whose stairs can be told where to go.** `station` in rail.ts runs its stairs straight on from the platform's far end down to height 0 as solid steps. On Gotham that was into the river at the docks and into a terrace six up on River Street. The tile has its own (`elStation` in roads.ts): it takes the ground's height, an end to leave from, and whether the flights turn back on a landing.
- **Furnishing ground that is dark, or not at height 0.** `furnish` reads only pale stone lying at height 0. Gotham's ground is dark and on five levels, so `life.ts` finds its own bare ground the same way, from the triangles that are built, and uses the engine's fixtures with `placed` to stand them at any height. A colour test and a level that a tile can set would let `furnish` do it.
- **A parked car is not seen by a tile's own checks.** Gotham keeps its parked cars eight clear of every stage and place of a story, since a figure would otherwise walk through one unnoticed.
- **A lamp that can be put out.** A story could not darken a street lamp that a builder had built; it draws its own instead.
