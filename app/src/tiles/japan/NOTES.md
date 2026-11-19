# Japan: notes

This file records what a later reader cannot see in the code.

## Where things are

- `plan.ts` is the tile as data: the water, the streets, the three long roads, the railway, where each thing stands, the routes, and the parked vehicles.
- `lines.ts` draws a road's middle line and takes the lanes from it.
- `terrain.ts` shapes Fuji and the hills.
- `city.ts` builds the ground and the streets, and calls the rest.
- `wangan.ts` builds the Wangan, Daikoku and Tatsumi. `shinkansen.ts` builds the viaduct and the trains. `dragon.ts` builds the dragon.
- `landmarks.ts` builds the towers, the temples and shrines, the castle and the stations.
- `scenes.ts` builds the smaller things: the scramble, the places where cars gather, the mountain's scenes, what floats on the water, and the lanterns.
- `props.ts` holds the small things used all over: vending machines, lanterns, lamp masts, the dekotora.
- `signs.ts` holds the signs.

## The things on the tile

On the mountain:

1. Mount Fuji, cut by the tile's edge.
2. The pass: five hairpins, each with its boards of arrows, a mirror on a post, tyre marks, and a ledge of spectators.
3. The lookout at the top of the pass, with its rail, its vending machines and a place for a hero.
4. Two thatched farmhouses, with rice paddies.
5. The snow monkeys in their hot pool, with steam.
6. The dragon in the air.

Kyoto:

7. The five-storey pagoda on its hill.
8. Fushimi Inari: the tower gate, the two foxes, the tunnel of gates up the hill, and the shrine at the top.
9. Kyoto Station.
10. Kyoto Tower.
11. The castle in its moat, with its red bridge.
12. Kinkaku-ji on its pond.
13. Gion: two rows of townhouses with a lane of lanterns between them.
14. The rock garden, with people on its veranda.
15. The great torii in the water, and the shrine hall with its stage behind it.
16. The red bridge over the river.

The railway:

17. The Shinkansen: the viaduct, the steel girder over the pass's foot, the tunnel mouth, and two trains.

Tokyo:

18. Tokyo Tower.
19. Tokyo Station: the brick front, the two domes, and the platforms behind.
20. The eating places under the arches, behind the station and by the river.
21. Shibuya's scramble: stripes from corner to corner, signals, a crowd at every corner and people in the middle.
22. The tower of screens.
23. The round-fronted tower.
24. Hachikō, his square, and the police box.
25. The neon alleys and the arcade.
26. Sensō-ji: Kaminarimon with its lantern, the lane of stalls, and the hall.
27. The yokocho, under its string of lanterns.
28. Ueno Park: the pond with a hall on its island, and people on blue sheets under the cherry trees.
29. The Ferris wheel, and the festival stalls along the waterfront.

Where cars gather:

30. The Wangan: the toll gate, the ramp, the first bridge, the Bay Bridge, and the green signs.
31. Daikoku parking area: the rest house, the vending machines, the dekotora, the patrol car, and three places for heroes.
32. Tatsumi parking area, on a deck beside the loop at the Wangan's west end, with a place for a hero.
33. The tuner's garage: a showroom with a turntable for a hero, and a workshop with a car on the lift.
34. The parts shop and its car park.
35. The used-car lot.
36. The konbini and its car park, with a place for a hero.
37. The petrol station, with its hoses hanging from the roof.
38. The tofu shop at the foot of the pass.

On the water:

39. The car carrier at Tatsumi's pier, with its ramp down and cars waiting.
40. Four lantern boats: two in the cove, two in the bay.

Along the river:

41. The line of cherry trees in blossom: eleven along Kyoto's bank and five along Tokyo's, with paper lanterns between them, petals on the sidewalk and adrift on the water, and people on the red bridge. Ueno Park's sixteen trees are cherry trees in blossom too.

## Roads

Traffic keeps left. A loop round one block runs anticlockwise in the lanes next to the block and turns left only. The lanes left over on the far side of the streets make one long clockwise loop round each group of blocks. No route crosses another on the level, and none shares a lane.

- `wangan` goes there and back. From the north it drops down the east side of Daikoku, runs through the parking area and climbs to the Bay Bridge. From the west it stays up and crosses the pier's corner. So every lap passes the meet once. Each stretch has a speed of its own: quick over the bridges, slower on the ramps, slow past the meet and round the loops at its two ends.
- `touge` is the pass and Kyoto's outer lanes as one loop: down the pass, south beside the river, west along the shore, north past the castle, east past the station, and up the pass again to the lookout.
- `tokyo-outer` is the outer lanes of Tokyo's streets. It passes under the Wangan's ramp at the avenue.
- The Shinkansen's line runs straight across the tile. It ends at Tokyo Station, and at its other end it runs into a tunnel under Kyoto's hill and ends there out of sight.
- Buildings stand behind the sidewalks: 8 units from the middle of a street in Tokyo, 7 in Kyoto, where the sidewalks are narrower. `BLOCKS` in `plan.ts` is the ground inside the sidewalks.

How many vehicles a route carries is not free. A bend of radius 3.5 is driven at about 7.7, and at that speed a lane passes one vehicle every two seconds. With more than that on a route, a queue forms that never clears and backs up into a fast stretch, and vehicles arriving there cannot stop in time: they drive through each other. Each route here has about three quarters of what its slowest stretch can pass, or less. See "Checks".

## Liberties taken with the real place

- Fuji, the pass, the snow monkeys and the thatched farmhouses share one corner. In life the pass is Haruna's, the monkeys are Jigokudani's and the farmhouses are Shirakawa-go's, all far from Fuji. They are together because the corner is the tile's one piece of mountain.
- The castle is Matsumoto's, the black "crow castle", which is in the Alps and not in Kyoto. It is the castle whose shape reads best at this size.
- The great torii and its shrine are Itsukushima's, which is near Hiroshima and not near Kyoto. Boats do pass through the real one at high tide.
- Tokyo's sights stand side by side: the scramble, Tokyo Tower, Sensō-ji, Ueno Park and the station are each a block from the next.
- Daikoku's ramps are one sweep round the parking area and a bypass, not the real junction's stacked loops.
- Tatsumi and Daikoku are on one road here, with the Bay Bridge between them. In life the bridge is on Daikoku's other side. The real parking area is called Tatsumi No. 1; its sign here says only Tatsumi.
- Kyoto and Tokyo are 90 units apart. The Shinkansen goes on past Kyoto in life; here its line ends under the hill.
- The dragon is not a liberty with any place. The collector asked for one.

## Real names on signs

No business on a sign is real. The names on the tall signs and the screens (Kaiju Karaoke, Tornado Ramen, Dream Electric, Neon Sushi, Doughnut Galaxy, Cat Cola) are the look prototype's own inventions. The tuner's garage is 幅広ワークス, "Habahiro Works", which says "wide": a search on 19 November 2026 found no business of that name. The tofu shop is 角の豆腐店, "the tofu shop on the corner". Every other shop's sign says only what is sold there.

The real names are names of roads and places, and what a real thing says on itself:

- 湾岸線, 大黒ふ頭, 大黒PA, 辰巳, 東京: the Bayshore Route and the places it leads to, on the green signs. Daikoku's are written as the Metropolitan Expressway's own pages write them (shutoko.jp, looked at on 19 November 2026).
- ETC and 一般: the two kinds of lane at a toll gate.
- 雷門: Kaminarimon, on its lantern.
- 東京駅 and 京都駅: the two stations.
- 忠犬ハチ公: "the faithful dog Hachikō", on the plate under the statue.

## For the engine

Built in this folder, and worth moving:

- `lines.ts`: a road drawn as straight stretches and arcs with a height at each joint. Lanes are taken from it by moving it sideways, so a lane has the deck's own height all the way round a bend. The engine's `ramp` rises evenly along its own length, so the inside and the outside of a climbing bend come out at different heights.
- `terrain.ts`: a hill as a sheet of facets over a grid, with a level bench cut wherever a road runs, and a cone cut off at the edge of the board. The engine's `terrace` makes level steps only.
- `dragon.ts`: a long body that follows a round in the air, as joints drawn many times over.
- In `props.ts`: vending machines, paper lanterns, a lamp mast, a car that stands still in given colours.

Used from the engine as it now is: a stretch's own speed (the Wangan), a train that runs to the end of its line and back (the Shinkansen), a train with a shape of the tile's own (the Shinkansen, and the lantern boats), and `Smoke` (the hot pool's steam).

Missed:

- `train` gives every car the same shape. A bullet train's end cars differ from the rest, so the Shinkansen here is one long piece, which only works because its line has no bends.
- `street` paints the lanes of a four-lane street evenly. The avenue's kerb lanes run wider apart than that, to leave room for the ramp.
- Traffic cannot be made to wait. A scramble crossing wants the vehicles to stop while the crowd crosses. Here the crowd stands in the middle, where no vehicle's way comes.
- A vehicle slows for the one ahead and for the bend it is in, but not for a slow stretch or a queue that is still ahead of it. That is what limits how many vehicles a route can carry: see "Roads".
- The engine finishes a junction only where two streets' middle lines cross. Where a ring of streets turns a corner at the place two other streets end, as at the scramble, it paints crossings on two of the four arms. The other two are painted in `scenes.ts`.
- `tree` cannot be asked for a kind of tree: nine in ten come out green. The cherry trees are the tile's own, in `scenes.ts` (`cherryTrees`), drawn the way the engine draws its trees.
- `GeoBuilder.tri` shows from one side only and does not turn itself to face its normal, as `quad` does. A gable drawn with it on a north face must give its corners the other way round.
- The hills are drawn as flat facets three units across, so the ground a figure stands on is not quite where `groundHeight` says on a steep bank. The spectators on the pass stand on ledges of concrete for that reason.

## Checks

All on 19 November 2026.

- Traffic: over twenty simulated minutes in steps of a twentieth of a second, no two of the 72 moving vehicles came within 4.3 units of each other, and none stood still. The nearest were in neighbouring lanes, where the Wangan's lanes turn round in the rotary beside the avenue's kerb lane. Along each route, one vehicle never came nearer than 11 units to the next. No lanes were found shared, which is as meant. With 18 vehicles on the Wangan and 16 on Tokyo's outer loop, tried first, vehicles drove through each other at the foot of Daikoku's ramp: hence the counts.
- Heroes: with `?place=`, each of the seven places on show (`daikoku-1` to `daikoku-3`, `tatsumi`, `lookout`, `garage`, `konbini`) and each of the nine routes took a hero.
- Weather and hours: looked at by day and by night from all four sides, and in rain and in snow.
- What it costs to draw, measured with `wimmel.bench()` on one machine, each tile alone at the same size and the same hour, after the cherry trees were planted: by day 5.2 ms for Japan and 4.6 ms for North America, and at night 5.3 ms and 5.0 ms. Japan draws 238,000 triangles in about 107 calls at any hour. North America draws 132,000 in 52 by day and 265,000 in 90 at night. The difference by day is the water: the engine draws a tile that has water a second time, as its mirror image, whatever the weather (`board.mirrors`). North America, which has no water of the engine's kind, was drawn twice at night and once by day. Japan has 32,000 triangles that stand still, 368 people, 72 moving vehicles and 34 parked.
- `npm run typecheck` and `npm run build` pass, and the console shows no warnings and no errors.
