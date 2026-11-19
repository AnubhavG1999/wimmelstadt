# Building a tile

This page is for whoever builds one tile of the city. Read it first, then read the sample tile, `app/src/tiles/sample/index.ts`, which uses every piece of the kit once, and then look at North America, `app/src/tiles/north-america/`, which is the bar a tile has to reach. The words used here are the ones in [CONTEXT.md](../CONTEXT.md), and the decision behind tiles is [ADR 0009](adr/0009-a-city-of-hand-built-tiles.md).

## What a tile is

A tile is one district on a board of its own: 208 units by 226, standing on its own base like a model on a table. It is built in its own coordinates and knows nothing about any other tile.

- The middle of the board is (0, 0). x runs east from -104 to 104, z runs south from -113 to 113, and y is up.
- One unit is one centimetre of toy. A lane is 5 wide, a storey is 5 high and a car is about 7 long.
- A tile holds at least 20 recognisable things: landmarks, named businesses and set-piece scenes. They are scattered over the whole board, so that every part of it has something to find. North America has 20, and the L besides. A tile is never padded with ordinary buildings to fill it.
- Its ground is whatever its place needs: a harbour, a river, a hill, a wall of ice. Water and relief are welcome where they make the place. They are not a reason to thin out the landmarks.
- Its roads are a pattern of its own. The ring of raised expressway, the flyover, the spiral car park and the L are North America's, and no other tile repeats them. The stack of four ramps in `prototype/two-tiles` has not been used yet.
- Traffic keeps to the side of the road it keeps to in the real place.
- Everything stays inside the edge. Roads loop back inside the tile. Only water may run to the edge, where it ends at the base.
- Heroes are put on a tile at random each time the page loads, on its roads or on show. So a tile needs roads on which a hero can be seen (a raised road, a road along water, a wide avenue: not only streets between towers) and at least three places for a hero on show, such as a turntable, a forecourt or a rooftop.

What ADR 0009 says about names and care holds for every tile:

- Most businesses are invented. A real name is checked before it goes on a sign, and it appears as plain lettering on a plain board, never as a logo.
- Signs are in the language and the script of the place.
- Places of worship, tombs and memorials are drawn with care and are never the setting for a joke. Nothing political is shown.

## The order of work

1. **Read what there is** for the district (see "What to reuse" below): its research note, what the island had planned for it, and the models that exist.
2. **Put the tile to the collector before building anything.** In chat, give the list of things that will stand on it (20 or more), its ground, its road pattern, where heroes will be seen, and a rough map in text. Then wait for the reaction. A drawn map comes after that, if it is wanted.
3. **Block it out**: the ground, the roads and the traffic first, with plain boxes where the landmarks will stand. Show a picture.
4. **Build the landmarks** one at a time. Look at each from several sides, by day and by night, before going on to the next.
5. **Tune it with the collector** until they call it final.

A tile is done when:

- it has its 20 things, and each can be recognised without being told what it is;
- nothing flickers, by day or by night, from any side;
- no vehicle drives through a building or through another vehicle;
- it is alive at night: lamps along its streets, light in its windows and on its landmarks, signs that glow;
- it looks right in rain and in snow (`?weather=rain`, `?weather=snow`);
- a hero can be seen on its roads and on each of its places on show (`?place=`);
- it costs about what North America costs to draw (see "Running it");
- `npm run typecheck` and `npm run build` pass;
- its `NOTES.md` is complete.

## What you may touch

Only your tile's own folder, `app/src/tiles/<id>/`. A tile is found by its folder: its `index.ts` hands a `TileDef` over as its default export, and nothing else needs to know it exists.

- Do not edit `app/src/engine/`, `app/src/main.ts`, `app/src/heroes/`, another tile, the documents, the READMEs or the pictures in `app/screenshots/`. Several sessions work side by side, each on a branch of its own, and this is what keeps their work from colliding.
- If the engine lacks something, build it inside your tile's folder. The engine's own pieces are plain functions that take the `Build`, and a tile can have its own in the same way. Write it down in `NOTES.md` under "For the engine", so that it can be moved there once the tile is merged.
- If the engine has a fault, say so, and mend it in a commit of its own that touches nothing but the engine.
- The engine goes on improving on `main` while you work. Merging `main` into your branch brings the improvements in, and since your branch only adds a folder it merges cleanly.
- Documents, the glossary, the READMEs and the public pictures are brought up to date in one pass when the tile is final. Leave them alone until then.
- Commit to your own branch as you go. Do not push, and do not merge: the tiles are merged from the main session.

`NOTES.md`, in the tile's folder, records what a later reader cannot see in the code:

- the things on the tile, numbered, so the count can be checked;
- liberties taken with the real place, and why;
- every real name on a sign, and how it was checked;
- "For the engine": what was built in the tile's folder that belongs in the engine, and what was missed.

## Running it

A worktree has no installed packages of its own, so install them once, in `app/`:

```
npm ci
```

The app runs on a port of its own for each session, so that several can run at once. The port is in your brief. In the root of your worktree, write `.claude/launch.json` (it is ignored by git) and start the app from it:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "tile", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev", "--prefix", "app", "--", "--port", "5191"], "port": 5191 }
  ]
}
```

What the address takes:

| | |
| --- | --- |
| `?tiles=<id>` | your tile alone. `?tiles=<id>,north-america` stands it beside the bar. `?tiles=sample` is the sample tile. |
| `?hour=21.5` | the hour of the day, held still. Without it the clock runs. |
| `?weather=rain` | `clear`, `cloudy`, `rain`, `storm`, `fog` or `snow`. Without it the city has weather of its own. |
| `?drift=0` | stops the view from turning by itself. |
| `?place=<id>` | puts the heroes on one route or one place on show, by its id, for checking it. |
| `?x=&z=&az=&zoom=` | where the view starts. |

In the page's console, `wimmel` is a handle on the city:

- `wimmel.shot('check-<id>-<what>', { hour, x, z, az, zoom, weather })` saves a picture in `app/screenshots/`. Pictures whose names start with `check-` are ignored by git: use that name for every picture taken while working. `x` and `z` are the middle of the picture, `az` is where the camera stands in degrees (42 is the south-east, looking north-west), and `zoom` is how many units the picture is high: about 270 shows a whole tile, 60 to 90 one landmark.
- `wimmel.info()` gives the triangles and draw calls of the last frame, and `wimmel.bench()` the milliseconds a frame takes. North America is about 34,000 triangles of things that stand still, 250 people and 80 moving vehicles. Stay within about twice that, and compare `bench()` with North America's on the same machine.

**Heroes are private.** They are made from the collector's own pictures, which are never checked in. The development server finds them in the main checkout, so they drive on your tile too. A picture from `wimmel.shot` leaves them out unless it is asked for with `heroes: true`, and then it is saved with the hero's capture and not in the app. Never put a picture that shows a hero anywhere else, and never copy anything out of `captures/`.

## The kit

A tile is a `TileDef`: an id, a name, a seed, its signs, and a `build(k)` that builds everything that stands still and hands back the tile's routes, its parked vehicles and its places for heroes. `k` is the `Build`, described in `app/src/engine/tile.ts`. Everything is in `app/src/engine/`, and every piece below is used in the sample tile.

| File | What it gives |
| --- | --- |
| `tile.ts` | `TileDef`, `Build`, `Route`, `ParkedSpot`, `HeroSpot`, and the size of the board, `TILE`. |
| `geo.ts` | `k.b`, the builder everything solid goes into: `box`, `obox` (a box at an angle), `cyl` (a cylinder, a cone or a prism), `quad`, `tri`, `sweep` and `beam` (bars along a line). A wall's `win` gives it windows that light up at night. |
| `ground.ts` | `ground` (the paving, with holes for water), `area` (a lawn, a square, a beach), `water`, `terrace` (one level of a hill), and the shapes `rect`, `oval` and `band`. |
| `paths.ts` | `buildPath`: a line that roads, rails and vehicles follow, from stretches of four kinds: `ring` (closed, with rounded corners), `poly` (open), `ramp` (open and rising) and `helix` (a spiral). |
| `roads.ts` | `street` (a street on the ground along any path: junctions and zebra crossings are made where streets cross), `lampsAlong`, and `roadDeck` (a road above the ground: a viaduct, a bridge, a ramp). |
| `buildings.ts` | `ordinaryBuildings`: boxes in the tile's own styles, with roofs, shopfronts and signs, from a list of lots. |
| `rail.ts` | `track`, `trestle` (the steel under a raised track), `station` and `train`. A train can have a car of the tile's own shape, so the same pieces make a tram, a bullet train or a ferry. |
| `build.ts` | `placed`: builds something elsewhere and at an angle. For anything that is not square to the board, and for a model written to stand at (0, 0). |
| `signs.ts` | `SignDef`: neon lettering, lit boxes, painted boards, and signs a tile paints itself. `font` sets a sign in another script: `JAPANESE`, `CHINESE` and `DEVANAGARI` are there, and a tile can name its own. |

`k` also plants and places the small things, which are drawn together however many there are: `k.tree`, `k.person`, `k.lamp`, `k.sign`, and `k.glows` and `k.lights` for whatever shines at night. `k.each` is called on every frame, for the few things that move. `k.rand` gives random numbers that are the same on every load.

Rules that are not obvious from the code:

- **Two surfaces must never lie in the same plane.** Where they do, they flicker, and it shows most at night. A floor stops inside the walls round it, a roof sits above the tops of the walls, and a patch on the ground is a hair higher than the ground.
- **Routes know nothing of each other.** Vehicles on one route keep their distance from each other, but drive straight through the vehicles of another. So routes must never cross on the level. North America does it with one loop round each block, clockwise, in the lane by the kerb: right turns only, and no loop ever crosses another. Where two roads do cross, one goes over the other.
- **A route is a closed loop.** Its direction is the order of its corners, and that is what makes traffic keep left or right.
- **A route can say what its vehicles are**: `types` picks among the plain kinds (`sedan`, `hatch`, `van`, `pickup`, `bus`), and `paint` gives them a city's colours, such as red taxis. A hero may be put on any route that does not say `heroes: false`.
- **Windows.** `win.kind` is 0 for plain windows, 1 for a wall of glass, 2 or 3 for windows above a shopfront, 4 for small windows and 6 for tall slits. `interior(lit)` is for a surface inside a lit room.
- **Streets are laid in the tile's own coordinates**, not inside `placed`, or their junctions are not found.

The kit does not yet have: vehicles of a tile's own shape in the traffic (a rickshaw, a double-decker), people who walk, slopes other than ramps and terraces, or tunnels. Where a tile needs one of these, build it in the tile's folder with `k.group` and `k.each`, as `train` in `rail.ts` does, and note it for the engine.

## What to reuse

Much of the thinking for every district has been done, and some of the building.

- **The research notes**, `docs/districts/research/`. One or more for each district, named after it. They say what the place is known for and what a collector of diecasts would look for there.
- **What the island had planned.** The island was the plan before tiles, and it is kept on the branch `island-prototype`. It is read without checking the branch out:
  - `git show island-prototype:app/src/island/districts.ts` gives each district's theme, its ground, the road worth driving there, its quarters and whether traffic keeps left.
  - `git show island-prototype:app/src/island/landmarks.ts` names what was to stand in each district, about 280 landmarks in all. It is a list to choose from: a tile holds the 20 or so that make the place, not all of them.
- **Models that exist.** They are written around (0, 0) and take `{ b, glows, lights }`, which the `Build` is, so they work as they are inside `placed`. Copy the ones you need into your tile's folder.
  - `git show island-prototype:app/src/world/landmark-models.ts`: Big Ben, the Eiffel Tower, the Leaning Tower of Pisa, Kyoto Tower, a pagoda, a torii and the Taj Mahal, besides the American ones.
  - `git show island-prototype:app/src/world/delhi-models.ts`: Hauz Khas, the Qutub Minar, India Gate, the Lotus Temple, the Red Fort, Rashtrapati Bhavan and Connaught Place.
  - `prototype/look/src/scene-data.ts` has the look prototype's Japanese signs and the brands with Japanese names.
- **North America**, as the worked example of a whole tile: `plan.ts` is the tile as data, `city.ts` builds it, `landmarks.ts` holds its models, `l.ts` its railway, `ground.ts` a ground material of its own and `signs.ts` the signs it paints itself. Its pictures are in `app/screenshots/`.
- **The stack**, in `prototype/two-tiles`: four ramps between a boulevard and a freeway above it. A road pattern waiting for a tile.
