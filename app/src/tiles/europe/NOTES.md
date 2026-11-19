# Europe: notes

What a later reader cannot see in the code. Everything on the list below is built. The collector has not yet called the tile final.

## The things on the tile

The numbers are the ones in `THINGS` in `plan.ts`.

**London**

1. The Houses of Parliament and Big Ben
2. Tower Bridge
3. The Tower of London
4. The London Eye
5. St Paul's Cathedral
6. Buckingham Palace, with the Changing of the Guard
7. Piccadilly Circus
8. The Gherkin
9. Ace Cafe

**Paris**

10. The Eiffel Tower
11. The Arc de Triomphe in its star
12. The Champs-Élysées and the obelisk of the Concorde
13. The Louvre and its pyramid
14. Notre-Dame on its island
15. Sacré-Cœur on Montmartre
16. The Moulin Rouge
17. A corner café with a Métro entrance
18. The Trocadéro

**Italy**

19. The Leaning Tower of Pisa, with the cathedral and the baptistery
20. The Colosseum
21. Florence's cathedral
22. The Ponte Vecchio
23. Venice: a canal, the Rialto and gondolas
24. A piazza with a fountain
25. Lingotto, with the test track on its roof
26. Maranello's factory gate
27. Sant'Agata's museum

**In the air**

28. Concorde, on a round over London and Paris
29. A Montgolfier balloon, over the left bank

Besides these: Westminster Bridge, Parliament Square, a bus stand with a double-decker, telephone boxes and pillar boxes in London; the Arc du Carrousel, the Tuileries, a merry-go-round, a bandstand in a garden and a painters' square in Paris; the palace of the doges and the bell tower in Venice, a vineyard with its farmhouse, and the baptistery in front of Florence's cathedral in Italy; and two boats on the river.

## Where each thing is built

| File | What is in it |
| --- | --- |
| `plan.ts` | The tile as numbers: the river, the streets' lines, the hill, the list of things, the plots of ordinary buildings |
| `lanes.ts`, `roads.ts` | How a lane is laid from straights and circles, and the tile's streets and loops |
| `index.ts` | The ground, the river, the hill, the streets, the ordinary buildings, trees, and the places for heroes |
| `london.ts` | Parliament and Big Ben, Westminster Bridge, Tower Bridge, the Eye |
| `london-city.ts` | The Tower, St Paul's, the palace, Piccadilly Circus, the Gherkin, Ace Cafe, and London's pavements |
| `paris.ts` | Everything in Paris but the Eiffel Tower itself |
| `italy.ts` | Everything in Italy but the Leaning Tower itself |
| `landmarks.ts` | Big Ben, the Eiffel Tower and the Leaning Tower, which came from the look prototype |
| `parts.ts` | Small parts that several landmarks share |
| `air.ts`, `water.ts` | Concorde and the balloon; the boats |

## Places for heroes

Six. Each is open towards the south-east, where the tile is usually looked at from. That was checked with a ray from the place towards the camera, and it moved two of them: a hero in the piazza stood behind the house on its south side, and one at Maranello's gate stood behind the gate.

- **`ace-cafe`**: in the line of cars in front of Ace Cafe.
- **`trocadero`**: on the terrace at the water's edge below the Trocadéro's fountain, with the Eiffel Tower across the river.
- **`maranello`**: on the forecourt in front of the factory gate.
- **`sant-agata`**: on the turntable in front of the museum. It turns.
- **`piazza`**: in the piazza, by the fountain.
- **`lingotto-roof`**: inside the loop of the test track, on the roof.

## What moves, besides the traffic

The London Eye turns. The guard marches up and down the palace's forecourt. The Moulin Rouge's sails turn, and so does the merry-go-round beside it. A gondola is rowed along Venice's canal and out onto the river, and a boat for sightseers goes round the river's bend between London and Paris. The lamp at the top of the Eiffel Tower sweeps round at night. Concorde flies its round, and the balloon drifts.

## Liberties taken with the real places

**The tile as a whole**

- **One river with three names.** The Thames, the Seine and the Arno are one river here. It comes in at the north edge, turns east, turns south and leaves at the south edge.
- **The Champ de Mars runs down to the Field of Miracles.** The Eiffel Tower's lawn and Pisa's are a street apart. This is where Paris ends and Italy begins.
- **Florence and Venice share the Arno's east bank**, and the Ponte Vecchio joins them to Rome and Pisa on the west.
- **Concorde still flies.** The real ones were retired in 2003. This one carries no airline's name.
- **The balloon is in the Montgolfier brothers' blue and gold.** The first balloons over Paris went up in 1783.
- **No zeppelin.** The collector suggested one. It is Germany's, and Germany has a tile of its own to come, so it is left for that.

**London**

- **London is turned a quarter.** Its north bank is the west bank on the tile, and its South Bank the east. This puts Parliament's river front towards the middle of the tile. The order along the river is the real one: Parliament and Westminster Bridge at one end, the Tower and Tower Bridge at the other, the Eye between them on the far bank.
- **Tower Bridge is squeezed.** The Thames is 20 wide here, so the towers stand closer together than they are tall. Its lifting span stays down.
- **Parliament is its river front.** Westminster Hall and the courts behind it are not there.
- **The Union Flag flies over the Victoria Tower and over the palace.**
- **Piccadilly Circus stands where Trafalgar Square would**, at the end of the street from Westminster Bridge. Its lights are five screens on a curved front, and what they advertise is invented: tea, a show, umbrellas, a fizzy drink and toy cars.
- **Ace Cafe is in central London**, at the end of a road from Piccadilly Circus. The real one is on the North Circular, miles out.
- **The Tower of London has lost its north-west corner**, where Tower Hill's circus comes close. The round turret of the White Tower is on the corner where it shows, and the moat and the outer wall are left out.
- **St Paul's west front looks south**, and the church is short for its height, so that the dome keeps its size.
- **Buckingham Palace is its east front**, and it looks onto the Strand. The Victoria Memorial would stand in the road, and is left out.
- **The guard marches all day.** The real ceremony is at set hours.
- **The statues in Parliament Square are of nobody in particular.**
- **London's moving buses have one deck.** The one double-decker is the one that waits at the bus stand by Ace Cafe.

**Paris**

- **The star has three roads, not twelve avenues**: the Champs-Élysées, avenue Kléber, and the road down from Montmartre. A ring of trees stands in for the rest.
- **Avenue Kléber runs from the star straight to the Pont d'Iéna.** The real one ends at the Trocadéro.
- **Montmartre stands beside the Champs-Élysées**, and the way up it leaves the avenue just short of the star.
- **The Louvre's court opens to the north**, towards the Champs-Élysées, and its east wing is the shorter one, because the Concorde comes close to it. The Tuileries are two lawns and a basin.
- **The island is the other way round.** The Pont Neuf crosses its east tip, where the real one crosses the west, and so Notre-Dame's towers look east.
- **The Concorde's two fountains stand on the island with the obelisk.** The square they really stand in is a roundabout here.
- **Sacré-Cœur looks down the hill to the south-west**, and its steps go down only one level. The hill's roads run where the rest of the steps and the funicular would be, so there is no funicular.
- **The Moulin Rouge stands at the west foot of Montmartre**, with a merry-go-round and the painters' square beside it. The real painters are at the top of the hill.
- **The Trocadéro's wings are straight.** The real ones curve. It stands inside the river's bend, with the Pont d'Iéna beside it.
- **The flag hangs under the Arc de Triomphe every day**, and the lamp at the top of the Eiffel Tower sweeps round every night.

**Italy**

- **The Colosseum's outer wall stands round its north side**, as the real one's does, and it is set so that one looks into the arena from the south-east.
- **Pisa's tower leans a little more than the real one**, and to the south, towards whoever is looking.
- **Florence's cathedral looks south.** The real one looks west. Its square is open to the south for the same reason the hero places are.
- **The Ponte Vecchio's corridor runs along its south side.**
- **Venice is a canal, a bridge and a square.** The Rialto, the bell tower, the palace of the doges and the two columns stand within a few steps of one another. The houses on the canal's north side stand in the water, and the south side is left low, so that the canal is seen.
- **The piazza is nobody's in particular**: a church, a town hall with an arcade and a clock tower, and a fountain, as in any town of Emilia. The house on its south side takes up only half that side.
- **Lingotto's banking stands outside the track.** The traffic drives on the level, so the track on the roof is level, and the slope of each bend is built round it.
- **Maranello's gate looks east onto a forecourt**, with the works behind it. The real one looks onto the road.
- **Sant'Agata's museum has a turntable in front of it**, for a hero.
- **The two factories are named only by their towns' road signs.** No maker's name, no lettering of theirs, no horse and no bull. Over Maranello's arch there is a plain yellow panel where a badge would be.
- **A corner of Tuscany lies beyond the works**: vines, a farmhouse and cypresses, where the blockout had a shed.

## Left and right

London keeps left, and Paris and Italy keep right. Each quarter's loops are its own, and London's turn the other way round. The two never share a street: London's roads end at the South Bank's road, and a wall of trees on a lawn stands between that and avenue Kléber.

## Real names on signs

Two businesses, both checked on 19 November 2026, and both as plain lettering on a plain board:

- **ACE CAFE LONDON**, over the cafe's door. Ace Cafe London is open and trading under that name at Ace Corner on the North Circular Road, in Stonebridge. Red lettering on white. The cafe's own badge, with its ace of clubs, is not drawn.
- **MOULIN ROUGE**, over the cabaret's door. The Moulin Rouge is open, with shows listed to the end of the year. White lettering on red. The mill is built, as the building's own shape, and nothing of the cabaret's own lettering or posters is drawn.

Two towns, as their road signs, black on white: **MARANELLO** and **SANT'AGATA BOLOGNESE**.

Everything else is generic or invented: THE RED LION, TEA ROOMS, FISH & CHIPS, BOOKS; CAFÉ, BOULANGERIE, TABAC, FLEURS, BRASSERIE, MÉTRO; GELATERIA, TRATTORIA, BAR, PIZZERIA, FARMACIA; and the five screens of Piccadilly Circus, TEA TIME, WEST END LIVE, BROLLY DAYS, FIZZ POP! and TOY CARS 1:64. Hamleys was thought of for London and is not used.

## What it costs

On the machine it was built on: about 30,000 triangles, 440 people, 97 trees and 89 vehicles, and 3 to 4 thousandths of a second for a frame with `wimmel.bench(60)`. North America, on the same machine, is about 43,000 triangles and 5 thousandths of a second.

Fifteen minutes of traffic, stepped a quarter of a second at a time with `wimmel.advance`: no two vehicles at the same height came closer than 4.95, none stood still, and `vehicles.shared()` was empty.

## For the engine

Built in this folder, and of use to any tile:

- **`lanes.ts`**: a lane from straights and circles joined by bends that are worked out. The engine's `ring` and `poly` round every corner with one radius, which suits a grid. This does roundabouts, avenues that leave them at any angle, lanes that stay side by side round a bend, teardrop turning circles and hairpins that climb. It gives back the engine's own `Seg`s.
- **A river of changing width**, in `riverShape` in `index.ts`: `band` in `ground.ts` has one width. This also lets a side canal into one bank.
- **A check that nothing stands in a street**, `clear` in `index.ts`, which warns in the console under `npm run dev`. It found the Louvre's east wing standing in the Concorde's road, which no picture had shown. Each quarter's file lists the boxes it is to be asked about.
- **A check that a hero's place is seen**: a ray from the place towards the camera, tried against the tile's own triangles in the browser's console. It is not in the code. It would make a good `wimmel.seen(x, y, z)`.
- **`parts.ts`**: small parts that several landmarks share. `lathe` turns an outline into a dome, a cap or a fountain's basin. `hipped` is a roof with four slopes and a flat top: a mansard, or stacked twice the tall roof of a French pavilion. `archway` cuts a round arch through a wall. `roundel` is a rose window or a clock. `figure` is a person in uniform, for a guardsman or a statue, since the tile's own people are dressed at random. `wheel` is a wheel on a level axle, since `cyl` only stands upright. `twoWheeler` is a motorbike or a scooter.
- **`air.ts`** and **`water.ts`**: Concorde, the balloon, and the boats, each a mesh of its own moved by `k.each`, as the engine's helicopter is.
- **A shape cut off at the edge of the board**, `onBoard` in `index.ts`, for a hill or a lawn that is laid out at an angle and runs off the tile.
- **A beam of light**, in `champDeMars`: two long triangles in a material that adds to what is behind it, faded in with the night.
- **A picture a sign paints for itself**, with `paint` and `size` on a `SignDef`: the screens of Piccadilly Circus, and Ace Cafe's band of black and white squares, which is one sign 30 long instead of a hundred small boxes.
- **A picture from straight above.** `wimmel.rig.elev = 1.553` in the console, then `wimmel.shot(..., { az: 0 })` with `?tilt=0` in the address, gives a plan of the tile with north at the top. It was the most useful thing there was for laying out roads. Set `elev` back afterwards.

Missed:

- **`tri` trusts the order of its corners, and `quad` does not.** A triangle given the wrong way round is drawn only from behind, so a gable or the end of a hipped roof is a hole from the side it is meant to be seen from. Parliament's roof and Tower Bridge's had this until it was found. `tri` in `parts.ts` puts the corners right, as `quad` does.
- **A window is always a pane of glass.** A ring of them made the Colosseum an office block. Its arches are built instead, five triangles each: a dark opening that glows at night. A kind of window that is a dark arch would have saved 570 triangles there, and would suit every old building in Europe.
- **A car that has stopped at a merge can wait for ever.** Montmartre's two roads were first laid to share a lane for 21 units, and the engine found it. In fifteen minutes of traffic, one car of the hill's loop stood at the merge for 895 of the 900 seconds. The other road carried 14 vehicles on about 520 units, one every 37 units, and at 10 units a second that is a gap of under four seconds. A stopped car is given the lane only when the next one is clearly later than it, and from a standstill it needs about three and a half seconds to reach the lane. So a steady stream never lets it in. The tile now gives the hill's first level two lanes, and shares none. A waiting car that has waited long enough needs to be let in.
- **Traffic cannot be made to wait**, so a bridge cannot lift while a road crosses it. Tower Bridge stays down.
- **No vehicle of a tile's own shape in the traffic**, as the page says. London's moving buses are the plain bus in red.
- **The tile's people cannot be dressed.** The guard, the Yeoman Warders and the gondolier are built as boxes in the tile's own mesh.
- **Pitched roofs are hip roofs only.** The ordinary houses of Paris have them in zinc, where they would have mansards.
- **Where two streets meet at a T, the one that ends has to run on to the far kerb of the other** for its junction to be found, and its sidewalks then lie on the other street's. They are the same colour, so nothing shows.
