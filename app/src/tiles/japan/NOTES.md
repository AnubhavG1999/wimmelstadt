# Japan: notes

This file records what a later reader cannot see in the code. The tile is a blockout: its ground, its roads, its traffic and its railway are built, and most of what stands on it is still a plain box with its name on a board.

## Where things are

- `plan.ts` is the tile as data: the water, the streets, the three long roads, the railway, and where each thing stands.
- `lines.ts` draws a road's middle line and takes the lanes from it.
- `terrain.ts` shapes Fuji and the hills.
- `city.ts` builds everything.
- `signs.ts` holds the signs.

## The things on the tile

Built so far, as more than a box:

1. Mount Fuji, cut by the tile's edge.
2. The pass: five hairpins, with the lookout at its top.
3. The Wangan: the ramp from the avenue, the first bridge, Daikoku's ramps and the Bay Bridge.
4. Daikoku parking area, with its meet.
5. Tatsumi parking area, on the loop at the Wangan's west end.
6. The Ferris wheel.
7. The great torii in the water.

Still boxes, each named on a board:

8. The five-storey pagoda.
9. Fushimi Inari's gates (a line of plain gates so far).
10. The snow monkeys' hot spring.
11. The thatched farmhouses.
12. Kyoto Tower and Kyoto Station.
13. The castle in its moat.
14. Kinkaku-ji on its pond.
15. Gion (ordinary townhouses so far) and the rock garden.
16. The river and its red bridge.
17. Tokyo Tower.
18. Tokyo Station.
19. The Shinkansen (the engine's own train so far, in white and blue).
20. Shibuya crossing, the screens, the round-fronted tower and Hachikō.
21. Sensō-ji: Kaminarimon, the lane of stalls and the hall.
22. The neon alleys (ordinary buildings so far), the arcade and the yokocho.
23. Ueno hill.
24. The car carrier.
25. The tuner's garage, the parts shop, the used-car lot and the toll gate.
26. The konbini and the petrol station.
27. The tofu shop at the foot of the pass.

## Roads

Traffic keeps left. A loop round one block runs anticlockwise in the lanes next to the block and turns left only. The lanes left over on the far side of the streets make one long clockwise loop round each group of blocks.

- `wangan` goes there and back. From the north it drops down the east side of Daikoku, runs through the parking area and climbs to the Bay Bridge. From the west it stays up and crosses the pier's corner. So every lap passes the meet once.
- `touge` is the pass and Kyoto's outer lanes as one loop: down the pass, south beside the river, west along the shore, north past the castle, east past the station, and up the pass again.
- `tokyo-outer` is the outer lanes of Tokyo's streets. It passes under the Wangan's ramp at the avenue.
- The Shinkansen's line runs straight across the tile and turns round out of sight inside a hill at each end.

## Liberties taken with the real place

- Fuji, the pass, the snow monkeys and the thatched farmhouses share one corner. In life the pass is Haruna's, the monkeys are Jigokudani's and the farmhouses are Shirakawa-go's, all far from Fuji.
- The great torii is Itsukushima's, which is near Hiroshima and not near Kyoto.
- Daikoku's ramps are one sweep round the parking area and a bypass, not the real junction's stacked loops.
- Tatsumi and Daikoku are on one road here, with the Bay Bridge between them. In life the bridge is on Daikoku's other side.
- Kyoto and Tokyo are 90 units apart, and the Shinkansen turns round inside a hill.

## Real names on signs

None yet. Every business on a sign is invented: the names on the tall signs are the look prototype's own, and the rest say only what a shop sells.

## For the engine

Built in this folder, and worth moving:

- `lines.ts`: a road drawn as straight stretches and arcs with a height at each joint. Lanes are taken from it by moving it sideways, so a lane has the deck's own height all the way round a bend. The engine's `ramp` rises evenly along its own length, so the inside and the outside of a climbing bend come out at different heights.
- `terrain.ts`: a hill as a sheet of facets over a grid, with a level bench cut wherever a road runs, and a cone cut off at the edge of the board. The engine's `terrace` makes level steps only.

Missed:

- `train` gives every car the same shape. A bullet train needs its two end cars to differ from the rest.
- `street` paints the lanes of a four-lane street evenly. The avenue's kerb lanes run wider apart than that, to leave room for the ramp.
- Traffic cannot be made to wait. A scramble crossing wants the vehicles to stop while the crowd crosses.

The engine has since gained three things this tile does not use yet (merged from `main` on 19 November 2026):

- A stretch of a route can have a speed of its own. The Wangan wants this: fast over the bridges, slow through Daikoku's parking area.
- Routes may share a lane, so a slip road can join the Wangan.
- A train can run to the end of a line and back (`ends`). With that the Shinkansen needs no hill to turn round in.

## Checks

- Traffic, on 19 November 2026, after merging `main`: over fifteen simulated minutes in half-second steps, and over eight in steps of a tenth of a second, no two of the 68 moving vehicles came within three units of each other and none stood still for twenty seconds. The nearest any two came was 4.4 units, where the Wangan's lanes turn round in the rotary beside the avenue's kerb lane. No lanes were found shared, which is as meant.
