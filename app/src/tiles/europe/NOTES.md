# Europe: notes

What a later reader cannot see in the code. The tile is at the blockout stage: its ground, roads and traffic are built, and most of its things are still boxes.

## The things on the tile

The numbers are the ones on the boards in the blockout, and in `THINGS` in `plan.ts`.

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

Built so far, in the sense that they can be recognised: Big Ben (1), the Eiffel Tower (10) and the Leaning Tower (19), which are the look prototype's models, and Concorde (28) and the balloon (29). Tower Bridge, the Eye, the Arc, the obelisk, the Louvre, the Colosseum, the Ponte Vecchio and Lingotto have rough shapes of their own, because their shape decides how a road runs. The rest are boxes.

## Liberties taken with the real places

- **One river with three names.** The Thames, the Seine and the Arno are one river here. It comes in at the north edge, turns east, turns south and leaves at the south edge.
- **London is turned a quarter.** Its north bank is the west bank on the tile, and its South Bank the east. This puts Parliament's river front towards the middle of the tile, where it is seen across the water from the usual view. The order along the river is the real one: Parliament and Westminster Bridge at one end, the Tower and Tower Bridge at the other, the Eye between them on the far bank.
- **Piccadilly Circus stands where Trafalgar Square would**, at the end of the street from Westminster Bridge. Trafalgar Square is not on the tile.
- **Ace Cafe is in central London**, at the end of a road from Piccadilly Circus. The real one is on the North Circular, miles out.
- **The star has three roads, not twelve avenues**: the Champs-Élysées, avenue Kléber, and the road that comes down into it from Montmartre. It stands close to the north edge, so there is no room for avenues to the north of it. A ring of trees stands in for them.
- **Avenue Kléber runs from the star straight to the Pont d'Iéna.** The real one ends at the Trocadéro, a little short of the bridge.
- **The Louvre's court opens to the north**, towards the Champs-Élysées, and the Place de la Concorde is at the end of a street from the quay beside it. In Paris the court opens west, and the Concorde lies between it and the Champs-Élysées.
- **The Pont Neuf crosses the east tip of the island.** The real one crosses the west tip.
- **The Champ de Mars runs down to the Field of Miracles.** The Eiffel Tower's lawn and Pisa's are one stretch of grass with the Via Emilia across it. This is where Paris ends and Italy begins.
- **Florence and Venice share the Arno's east bank**, and the Ponte Vecchio joins them to Rome and Pisa on the west.
- **Montmartre stands beside the Champs-Élysées**, and the way up it leaves the avenue just short of the star: a turn to the right, a climb along the foot of the hill, a hairpin onto its first level, and down into the star. The hill has a loop of its own as well, which never comes down to the street.
- **Concorde still flies.** The real ones were retired in 2003. This one carries no airline's name.
- **The balloon is in the Montgolfier brothers' blue and gold**, over the left bank. The first balloons over Paris went up in 1783, from the Champ de Mars among other places.
- **No zeppelin.** The collector suggested one. It is Germany's, and Germany has a tile of its own to come, so it is left for that.

## Left and right

London keeps left, and Paris and Italy keep right. Each quarter's loops are its own, and London's turn the other way round. The two never share a street: London's roads end at the South Bank's road, and a wall of trees stands between that and avenue Kléber.

## Real names on signs

None yet. Every shop sign so far is generic or invented: THE RED LION, TEA ROOMS, FISH & CHIPS, BOOKS; CAFÉ, BOULANGERIE, TABAC, FLEURS, BRASSERIE; GELATERIA, TRATTORIA, BAR, PIZZERIA, FARMACIA.

To be checked before they go on a sign: Ace Cafe London, Hamleys, Moulin Rouge. The two factories are to be named only by their towns' road signs, Maranello and Sant'Agata Bolognese, with no maker's name, script, horse or bull.

## For the engine

Built in this folder, and of use to any tile:

- **`lanes.ts`**: a lane from straights and circles joined by bends that are worked out. The engine's `ring` and `poly` round every corner with one radius, which suits a grid. This does roundabouts, avenues that leave them at any angle, lanes that stay side by side round a bend, teardrop turning circles and hairpins that climb. It gives back the engine's own `Seg`s, so `buildPath`, `street`, `roadDeck` and a `Route` take them as they are.
- **A river of changing width**, in `riverShape` in `index.ts`: `band` in `ground.ts` has one width. This also lets a side canal into one bank.
- **A check that nothing stands in a street**, `clear` in `index.ts`, which warns in the console under `npm run dev`.
- **`air.ts`**: Concorde, which flies a round for ever and leans into its turns, and a balloon that drifts and bobs. Both are made the way the engine's helicopter is. Neither lands, so neither needs a pad.
- **A shape cut off at the edge of the board**, `onBoard` in `index.ts`, for a hill or a lawn that is laid out at an angle and runs off the tile.
- **A picture from straight above.** `wimmel.rig.elev = 1.553` in the console, then `wimmel.shot(..., { az: 0 })` with `?tilt=0` in the address, gives a plan of the tile with north at the top. It was the most useful thing there was for laying out roads. Set `elev` back afterwards.

Missed:

- **A car that has stopped at a merge can wait for ever.** Montmartre's two roads were first laid to share a lane for 21 units, and the engine found it. In fifteen minutes of traffic (`wimmel.advance`), one car of the hill's loop stood at the merge for 895 of the 900 seconds. The other road carried 14 vehicles on about 520 units, one every 37 units, and at 10 units a second that is a gap of under four seconds. A stopped car is given the lane only when the next one is clearly later than it, by more than a second, and from a standstill it needs about three and a half seconds to reach the lane. So a steady stream never lets it in, and whichever car is slower loses a close call. The tile now gives the hill's first level two lanes, and shares none. A waiting car that has waited long enough needs to be let in.

- **Traffic cannot be made to wait**, so a bridge cannot lift while a road crosses it. Tower Bridge stays down.
- **No vehicle of a tile's own shape in the traffic**, as the page says. London's buses are the plain bus in red until a double-decker is built here.
- **Pitched roofs are hip roofs only.** Paris needs mansards and London needs rows of chimney pots, which will be built here.
- **Where two streets meet at a T, the one that ends has to run on to the far kerb of the other** for its junction to be found, and its sidewalks then lie on the other street's. They are the same colour, so nothing shows.
