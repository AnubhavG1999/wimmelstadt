# Gotham City: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Built on the branch `claude/gotham-tile`, as the tenth tile. The plan, the ground, the roads, the elevated railway, the ordinary buildings and what stands over the roads (`blocks.ts`), the life of the paving, the stage and the show's director are the tile session's. The districts, the figures, the machines, the animals, the air, the traffic's kinds and the stories are builders' files, each from the brief `tile-gotham-builders-brief.md` and a task sheet of its own in the shared notes folder, judged and mended by the tile session.

## The collector's decisions

These were his, on 20 and 21 November 2026, and the tile is built on them. Where he is quoted, the words are his.

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

## For the engine

- **A station whose stairs can be told where to go.** `station` in rail.ts runs its stairs straight on from the platform's far end down to height 0 as solid steps. On Gotham that was into the river at the docks and into a terrace six up on River Street. The tile has its own (`elStation` in roads.ts): it takes the ground's height, an end to leave from, and whether the flights turn back on a landing.
- **Furnishing ground that is dark, or not at height 0.** `furnish` reads only pale stone lying at height 0. Gotham's ground is dark and on five levels, so `life.ts` finds its own bare ground the same way, from the triangles that are built, and uses the engine's fixtures with `placed` to stand them at any height. A colour test and a level that a tile can set would let `furnish` do it.
- **A parked car is not seen by a tile's own checks.** Gotham keeps its parked cars eight clear of every stage and place of a story, since a figure would otherwise walk through one unnoticed.
- **A lamp that can be put out.** A story could not darken a street lamp that a builder had built; it draws its own instead.
