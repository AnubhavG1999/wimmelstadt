# North America: notes

This file records what a later reader cannot see in the code. North America is the first tile, and it is the [look prototype](../../../../prototype/look)'s board itself: the same size, the same streets, the same ring of raised expressway, flyover and car park, on the same base. What on the prototype's board was North American or invented stayed, and the rest was replaced. See [0009](../../../../docs/adr/0009-a-city-of-hand-built-tiles.md).

## Where things are

- `plan.ts` is the tile as data: its streets and blocks, every lot, the routes vehicles follow, where vehicles are parked, the places for heroes, and every sign. Nothing in it draws anything.
- `ground.ts` lays the ground, and `city.ts` builds everything that stands still from the plan and calls the rest.
- `landmarks.ts` holds the models of the famous things, each a few dozen boxes, cylinders and bars.
- `l.ts` builds the elevated railway and runs its trains.
- `signs.ts` holds the signs.

## The things on the tile

The board is three blocks by three, with a boulevard between the first row and the second.

In the north-west:

1. The Sears Tower.
2. The Twin Towers.

In the north:

3. The Gate Tower, which is invented. The expressway runs through it, a street runs through its base, and it carries the big screen.

In the north-east:

4. The Chrysler Building.
5. The Space Needle.
6. The Painted Ladies, along the street on the east side.
7. Coit Tower, on its hill.
8. The showroom, Big Block Motors, with a turntable for a hero.

In the west:

9. The Empire State Building.
10. The Statue of Liberty, in her pond.
11. The Gateway Arch, which spans the boulevard.
12. The Golden Gate Bridge, which carries the expressway over the boulevard.

In the middle:

13. The park, with Halo Tower, which is invented.

In the east:

14. The Transamerica Pyramid, with redwoods beside it.
15. The Flatiron Building.
16. A diner, with room to park in front and a place for a hero.
17. Marina City.

In the south-west:

18. The car park with its two spiral ramps, Loop Parking, with a place for a hero on its roof.

In the south-east:

19. Wrigley Field.
20. An arch for Route 66, over the street beside it.

Besides these:

- The L: an elevated railway that loops through the east of the tile, with a branch west to Forest Park and a branch by way of Roosevelt to Midway. Three trains run on it, each with a stripe of its own colour, and they share the loop without meeting: a train waits for the stretch of track ahead of it to be clear.
- A helicopter on the pad on the roof of the tower that carries Rocket Cola's sign. Now and then it takes off, goes round over the tile and comes back.
- A street under the expressway in the south, and a square with a fountain.

## Roads

Traffic keeps right. A vehicle follows one loop and never leaves it.

- A loop round every block, clockwise in the lanes next to the kerb, turning right only.
- `perimeter` is the outer lane of the streets round the edge, counter-clockwise round the whole board.
- `boulevard` is the boulevard's two inner lanes: over the flyover, with a turn back through the gap in the median at each end.
- `express-inner` and `express-outer` are the two lanes of the ring of raised expressway, which passes through the Gate Tower and over the Golden Gate Bridge. The inner lane runs clockwise and the outer one counter-clockwise.
- `carpark` goes up one spiral of Loop Parking and down the other.
- `garage-run` is what joins the expressway to the ground. It leaves the car park's roof over an apron, runs round the ring in the outer lane and comes back the same way. It shares that lane with `express-outer`, and where the two come together their vehicles merge: one that has waited two and a half seconds is let in by whoever can still stop.

## How high things stand

The towers are to one scale, about 3.2 metres to a unit, and this tile is where that scale comes from. The other tiles keep to it roughly: see [the page for tile builders](../../../../docs/building-a-tile.md).

| | Units | In life |
| --- | --- | --- |
| The Sears Tower, to its roof | 140 | 442 m |
| The Sears Tower, to the top of its masts | about 175 | 527 m |
| The Twin Towers, to their roofs | 128 | 417 m and 415 m |
| The Empire State Building, to its roof | 112 | 381 m |
| The Empire State Building, to the top of its mast | 136 | 443 m |
| The Chrysler Building | 100 | 319 m |
| The Transamerica Pyramid | 84 | 260 m |
| The Space Needle | 60 | 184 m |
| Marina City | 57 | 179 m |
| The Flatiron Building | 30 | 87 m |
| The Statue of Liberty, to her torch | 29 | 93 m |
| Coit Tower | 21 | 64 m |

The heights in life are the commonly published ones.

## Liberties taken with the real places

- **Five cities on one board.** New York, Chicago, St. Louis, San Francisco and Seattle stand side by side, and the city's invented things stand among them.
- **The marquee.** Wrigley Field's red marquee hangs under the scoreboard, over the gate to the bleachers. The real one is on the corner behind home plate. On this tile that corner faces the expressway and the Gate Tower, and no view of the city can see it.
- **The Golden Gate Bridge** carries the expressway over a boulevard, not over water.
- **Vehicles.** Every vehicle is far too large for the buildings, as on every tile: a car is about 7 units long, which at the towers' scale would be 22 metres.

## What changed from the prototype

Everything on the prototype's board that was North American or invented stayed. The rest was replaced.

| On the prototype | On the tile |
| --- | --- |
| Big Ben | The Chrysler Building |
| The Eiffel Tower | The Space Needle |
| The Leaning Tower of Pisa | Coit Tower |
| Stucco houses with chimneys | The Painted Ladies, and two stucco houses under clay tiles |
| A hotel with a helipad | The Transamerica Pyramid. The helipad moved to the tower with the cola's name on it. |
| A shop on the corner | The Flatiron Building |
| The pagoda | A diner |
| Kyoto Tower | Marina City |
| The torii | The arch for Route 66, which stands over the street on the east side |
| The Taj Mahal and its garden | Wrigley Field |
| Signs in Japanese, and the cafés and bakeries of Europe | Signs in English: deep dish pizza and blues in the east, coffee, sourdough and tacos in the north-east |
| Mochi Motors, Ponpoko Parking, Neko Cola, Kaiju Karaoke, Tofu Turbo, Wanwan Tires | Big Block Motors, Loop Parking, Rocket Cola, Starlite Karaoke, Turbo Tacos, Big Dog Tires |
| Tomica, Advan, Michelin and Pirelli on a few boards | Goodyear, beside Hot Wheels and Mini GT |

The models that left went to the tiles of their own places: Kyoto Tower and the pagoda stand on Japan.

## Real names on signs

The businesses are invented: Big Block Motors, Loop Parking, Rocket Cola, Starlite Karaoke, Turbo Tacos and Big Dog Tires. The real names are these, each in plain lettering on a plain board:

- Hot Wheels, Mini GT and Goodyear, on boards on three roofs.
- Wrigley Field, on its marquee, and Route 66, on a shield over the arch.
- The L's five stations: Addison, State/Lake, Forest Park, Roosevelt and Midway, which are stations of Chicago's own L.
