# Building a tile

This page is for whoever builds one tile of the city. Read it first, then read the sample tile, `app/src/tiles/sample/index.ts`, which uses every piece of the kit once, and then look at the tiles that are built: North America, Japan, Hong Kong, Europe, Delhi, Urbana-Champaign and Westeros, in `app/src/tiles/`. They are the bar a tile has to reach. The words used here are the ones in [CONTEXT.md](../CONTEXT.md), and the decision behind tiles is [ADR 0009](adr/0009-a-city-of-hand-built-tiles.md).

Much of this page is what the builders of the earlier tiles found out the hard way. Each wrote it down at the end of its tile's `NOTES.md`, under "For the next tile", and those sections are worth reading in full: [Japan's](../app/src/tiles/japan/NOTES.md), [Hong Kong's](../app/src/tiles/hong-kong/NOTES.md), [Europe's](../app/src/tiles/europe/NOTES.md), [Delhi's](../app/src/tiles/delhi/NOTES.md), [Urbana-Champaign's](../app/src/tiles/uiuc/NOTES.md) and [Westeros's](../app/src/tiles/westeros/NOTES.md).

## What a tile is

A tile is one district on a board of its own: 208 units by 226, standing on its own base like a model on a table. It is built in its own coordinates and knows nothing about any other tile.

- The middle of the board is (0, 0). x runs east from -104 to 104, z runs south from -113 to 113, and y is up.
- One unit is one centimetre of toy. A lane is 5 wide, a storey is 5 high and a car is about 7 long. A tile may have lower storeys where that makes its towers read as tall and thin: Hong Kong's are 3.4 for shops and offices and 2.6 for flats. Delhi's are 3.4 too: it is a low city, and its two and three storeys should read as low beside its domes. Urbana-Champaign's are 2.9, with halls of residence at 2.2 and each tower at a storey of its own, from 1 to 1.4, so that its floors fit the height it is given: at 2.9 a hall of four storeys would stand 11.6 high, and a tower of twenty-four 70.
- Heights are roughly to one scale across the whole city, and looking good comes before it. A tower that people know by its height stands at about 3.2 metres to a unit, which is the scale North America's towers set: the Sears Tower's roof is 442 m up in life and 140 units up here. Within a tenth of that is near enough, and the towers of a tile should stand in the order they do in life. Decide heights together: before building, write the real heights of the tall things side by side and choose each toy height from them. A small landmark, such as a temple, a clock tower or a row of houses, may be about twice its height at that scale, so that it can be recognised. A mountain is always a toy: at scale it would be taller than the tile is wide. Where keeping to scale would make the tile look worse, the look wins, and `NOTES.md` says so.
- A tile holds at least 20 recognisable things: landmarks, named businesses and set-piece scenes. North America has 20, Japan 41, Hong Kong 39, Europe 29, Delhi 44, Urbana-Champaign 48 and Westeros 64. Aim for 30 to 40. Many of them can be small scenes, such as a tofu shop, monkeys in a hot pool or a night market: Japan's last fifteen took about a third of the time, and they are what fills the ground between the landmarks. They are scattered over the whole board, so that every part of it has something to find.
- Ordinary buildings stand between the things to find, and a tile needs them for its density: Hong Kong has 69. They have heights, styles and signs of the place's own, and their heights are part of the layout. They do not count towards the 20, and a tile is never filled with them in place of things to find.
- The collector's own interest has a place on every tile, and that interest is car culture: Japan has the Wangan, Daikoku and a tuner's garage. Ask early what the collector wants to see by name, and put it where the opening view shows it.
- Its ground is whatever its place needs: a harbour, a river, a hill, a wall of ice. Water and relief are welcome where they make the place. They are not a reason to thin out the landmarks. Give a hill room to slope: a level place on it belongs near the middle of its ground, for in a corner it leaves two sheer faces and reads as a block, whatever is drawn on it.
- Its roads are a pattern of its own. The ring of raised expressway, the flyover, the spiral car park and the L are North America's. The pass of hairpins and the bayshore road with its parking areas are Japan's. The harbour run through a tunnel and the road up the Peak are Hong Kong's. The star, the roundabouts in place of a grid, and two rules of the road on one tile are Europe's. The Ring Road with its flyovers and its bridge over the river, the hexagon round India Gate, the Metro on its viaduct above the Ring Road's verge, and Chandni Chowk for cycle rickshaws only are Delhi's. Loops inside loops that share lanes on purpose, a railway on an embankment with streets passing under it, and Wright Street for buses only are Urbana-Champaign's. A tree of roads with three loops, on which every lane turns left at every meeting, its trunk the kingsroad the length of the continent through the tunnel in the Wall, is Westeros's: there riders, carts and wains of a `TrafficKind` of its own are the traffic, and a hero is the only car. No other tile repeats them. The stack of four ramps in `prototype/two-tiles` has not been used yet.
- Traffic keeps to the side of the road it keeps to in the real place, and on a place that is in no atlas, to the side the collector chooses.
- Everything stays inside the edge. Roads loop back inside the tile. Only water may run to the edge, where it ends at the base.
- Heroes are put on a tile at random each time the page loads, on its roads or on show. So a tile needs roads on which a hero can be seen (a raised road, a road along water, a wide avenue: not only streets between towers) and at least three places for a hero on show, such as a turntable, a forecourt or a rooftop. A place on a turntable takes the table's top as its `y`. A hero on show looks best facing east or south, so that the opening view sees its front and one side.
- A tile says where its place in the world is, with `place: { lon, lat }` in its `TileDef`, in degrees, with east and north positive. The map on the desk under the table has a pin there, the tile's name beside it, and a red thread from the pin to the tile. North America's pin is in the middle of the United States, Japan's at Tokyo, Hong Kong's at Hong Kong, Europe's at Paris, Delhi's at Delhi and Urbana-Champaign's in the middle of Illinois. A place that is in no atlas brings its own land: `place: { lon, lat, land: [[east, north], ...], words: '...' }` draws that coast at the place, as the real coasts are drawn, and letters the words beside it. Each corner of `land` is so many degrees east and north of the place. Since it is drawn over the map like any land, put it in open sea. Westeros is the worked example: `place: { lon: -139, lat: -30, land: COAST, words: 'Hic sunt dracones' }`, with `COAST` in its `index.ts`, puts the continent in the empty South Pacific. Read the comment on `place` in `app/src/engine/tile.ts`.
- A tile hangs one screen for the music, where the opening view sees it, and a second only where it earns its place. A screen is a `SignDef` with `kind: 'screen'`, 640 by 360 on the sheet unless it gives a `size`, placed like any sign, on something that would carry a big screen in life. The engine shows on it what is playing on Spotify. When nothing is playing, and for everyone who has not linked an account, it shows its own picture, so that picture is what most people see: give the sign a `paint` of its own, which the engine calls whenever no track is showing, and so has to draw the whole rectangle each time and keep nothing. Make it fun and of the place, bold enough to read from across the tile, and nothing that looks like a "now playing" display. North America's is an advertisement for its own Rocket Cola, on the gate tower; Japan's a giant cat on its break, over the crossing at Shibuya; Hong Kong's yum cha in neon, on Nathan Road; Europe's KEEP CALM AND DRIVE ON, at Piccadilly Circus; Delhi's दिल्ली दिलवालों की, a saying about the city, round a heart in a lorry's colours, on a roof at Connaught Place; Urbana-Champaign's a scoreboard before kick-off, on the stadium's video board; and Westeros's a herald's bill for winter wheels, on a painted board at the tourney ground.

What ADR 0009 says about names and care holds for every tile:

- Most businesses are invented. A real name is checked before it goes on a sign, and it appears as plain lettering on a plain board, never as a logo. Check it in the script it will be written in: a search for the English name confirms only the English name.
- A shop's sign can say what is sold and not whose shop it is. An invented name in another language is quite likely the name of a real shop, and a trade is not.
- Signs are in the language and the script of the place. Check every word by reading a page written in that script, not a search's summary of pages in English: Hindi Wikipedia's titles and its own search settled most of Delhi's.
- Places of worship, tombs and memorials are drawn with care and are never the setting for a joke. Nothing political is shown, and a number can be political too: a date is not a seed.

A place from a book is drawn from the books alone: Westeros takes nothing from the television series, not its castles, its lettering or its map, and portrays no character.

## Lay it out for the view it opens with

Most of the time lost on Hong Kong was lost for not doing sums with the opening view at the start. The view a tile opens with (`az` 42) has the camera in the south-south-east, looking down at 38 degrees.

- **A thing `H` high hides the ground for about `1.3 × H` behind it**, to the north-north-west. So put what is tall in the north and the west, and what is low towards the south and the east. By the same sum a thing in the air is seen further north-west than it is, by about 0.9 of its height each way: lay out a flight path by where it will be seen, so that it never seems to leave the board, and check where it really is as well.
- **A street is hidden by its own south side.** A building south of a road hides the middle of the road if it is taller than about its distance from that middle line. Nathan Road is 20 wide with pavements of 3, and anything over 15 high on its south side hid the buses.
- **The road worth watching, and every place for a hero, goes on the south or the east side of what it belongs to.** On Hong Kong's first layout the towers of Central hid the whole road up the Peak, and two places for a hero were hidden by the buildings they belong to. Europe had two more: one behind the house on a piazza's south side, and one behind the very gate it stood at. A place has to be seen, not only be there, and it can pass `?place=` and still stand behind a wall. Open each square to the south-east. A place for a hero needs the whole car on its own ground, 7.8 by 3.1 with room to spare, and nothing taller than a person in the strip between it and the view: a tree hides as well as a wall, and `wimmel.seen` does not count trees.
- **A thing whose outline is the point lies across the view.** The lion on Lion Rock lay end-on at first and looked like a pile of rock.

Do these sums on the map in text, before the collector sees it, and give every lot its height in the blockout, the ordinary buildings too. Then check with numbers and not by eye. `hiddenBy` in `engine/checks.ts` says which lots stand between a point and the camera, from the plan alone, where a lot is `{ id, x0, z0, x1, z1, top }` and a point `{ x, y, z }`. A tile can call it as it builds, or it can be asked in the console of the development server:

```js
const { hiddenBy } = await import('/src/engine/checks.ts');
const plan = await import('/src/tiles/<id>/plan.ts');
hiddenBy({ x: 46.6, y: 1, z: -19.4 }, plan.LOTS.map((l) => ({ ...l, top: l.h })))
```

Ask it about the foot and the middle of every landmark, the middle of every street worth watching and every place for a hero, after the blockout and again whenever a height changes. Once things are built, `wimmel.seen(x, y, z)` in the console says the same of what really stands there: whether a place is seen from where the view is, or how far off the first thing in the way is.

Ask again of what is built, after every batch, and not only of the plan. A roof rises above its lot's height, and `hiddenBy` knows only what stands on the ground: on Urbana-Champaign a gable stood exactly before one end of the Union's terrace while the plan said all was in sight, and on Delhi what the Metro's viaduct and stations hide was found only on the built tile. Once everything stands, ask about the whole tile and not only the places in the plan's list: five places along the south and the east side of every lot, a grid on every lawn, and a car's roof every four units along every lane. That takes ten seconds, and on Urbana-Champaign it found three things that the plan had in sight and that are not. Before asking, load the page afresh or take a picture from the opening view: `wimmel.seen` answers for the view as it was last drawn, and while the browser pane is hidden nothing is drawn between pictures.

On the board a tile has neighbours, and the view can be turned, so nothing should depend on being seen from one side only. But the opening view is the one that is seen most. And a builder can know where the tile will stand. The board sets the tiles in the order of `ORDER` in `app/src/tiles/index.ts`, which is the order they were built, west to east and then north to south, in rows of three while there are five to nine; a tenth makes rows of four and moves every tile. So an eighth tile stands in front of Delhi, to its south, and a ninth in front of Urbana-Champaign. Westeros stands in front of Europe, and its Wall, along its north edge, hides Europe's southern strip, Lingotto and Pisa, from the view the board opens with. A tall edge belongs where the board puts nothing behind it, or the question goes to the collector before building.

## The order of work

1. **Read what there is** for the district (see "What to reuse" below): its research note, what the island had planned for it, the models that exist, and the tiles that are built.
2. **Draw the map in text, with heights on it**, and do the sums above for the road worth watching, the places for heroes and the landmarks at the front.
3. **Put the tile to the collector before building anything.** In chat, give the list of things that will stand on it, its ground, its road pattern, where heroes will be seen, what flies over it, two or more ideas for the screen's own picture, and the map. Every built tile has something in the air, and Delhi, which planned nothing, took three rounds over it once the collector asked. The screen's picture is what most people see: Delhi offered a choice only after its first was built, and the other was chosen. Ask before building anything of a state's ceremony, such as a parade or its flypast. Put questions as a short numbered list, each saying what stands now and what the other choice is: four on Delhi were answered in one line. Then wait for the reaction. A drawn map comes after that, if it is wanted.
4. **Write the tile as data**, in `plan.ts`, which draws nothing: the water, the streets as middle lines, the ground inside each block's sidewalks, the long roads, the routes, every lot as a rectangle with a height and every thing to find with an id and its lot, the places for heroes as one list, and the places the opening view must see. Every model takes its place and its size from there, so that moving a street later moves what stands beside it. On Delhi that let seven files be built at once without two of them meeting, and let things move late. A short script that draws the plan flat on a canvas is the quickest way to see the whole layout. Draw every lot's box, every turning ring and every river at its width on it, and look where they touch: on Westeros a river ran under a turning ring and two lots shared ground, and nothing showed it until the castles stood.
5. **Block it out**: the ground, the roads and the traffic, and a plain box for every lot with its name on a board that faces the opening view. Call the engine's checks on every load, so that the console says when two roads cross on the level or a road runs through a lot (`checkRoads`, or `roadFaults` and `throughSolids` where routes share lanes on purpose: see "Checking it"), and when a lot stands in a street (`clearOfStreets`). Run the traffic check and the sight-line check now, not at the end. Show the collector the opening view, the night and one other side, and say where you think it is thin.
6. **Merge `main`, then build what the engine lacks** before any landmark, since landmarks stand on it. The engine has ground that slopes, roads with heights, roundabouts and a tunnel's mouth, which the first tiles built for themselves, and it may have gained more since you branched.
7. **What moves on a line of its own**: trams, boats, a train.
8. **The landmarks**, largest first and about ten to a batch, or in files built at once by several builders (see below). Build the tile's centrepiece first and properly, and show it: the tallest thing on a tile and its best-known sight deserve the most triangles. On Europe the Eiffel Tower and the Colosseum had the least work at first, and they are the two the collector sent back. Give the best-known things their small detail before the first showing too, since what everybody knows a monument by is often small: Delhi's were right in their masses and came back for the words cut on India Gate and the battlements and arches of the Red Fort's walls. Show what flies over the tile in a close picture, as any landmark. Look at each landmark from two opposite sides, by day and by night, before going on. Most faults show only in a close picture from the far side. Write a file for the small parts that landmarks share, such as a dome, a roof, an arch or a rose window, before the first of them: each later one is quicker, they look like one city's, and a mend to a part mends them all. When the collector asked for more on the Red Fort's walls, its battlements got their points in one place, in Delhi's `mughal.ts`.
9. **The ordinary buildings and their signs.** Check every real name as it is written, and enter it in `NOTES.md` at once with what confirmed it.
10. **The small scenes, then people, trees, lamps and parked vehicles in one pass**, through helpers that know where the roads are (see the traps under "The kit").
11. **The places for heroes**, checked without a hero (see "Checking it").
12. **The checks**, in this order: `npm run typecheck`, the console (its warnings as well as its errors), `wimmel.fights()`, traffic, heroes, rain and snow, cost, `npm run build`. Then merge `main` and run the traffic and the cost again: both can change with the engine.
13. **Tune it with the collector** until they call it final. Then write "For the next tile".

Keep the list of things, the liberties and the real names in `NOTES.md` as you go. Commit at every stage, with a message that says what now stands: a long session is summarised part-way through and loses detail, and the plan, the notes and the commits are what the work is picked up from.

A tile is done when:

- it has its things, and each can be recognised without being told what it is;
- nothing flickers, by day or by night, from any side, and `wimmel.fights('<id>')` comes back empty;
- no vehicle drives through a building or through another vehicle;
- it is alive at night: lamps along its streets, light in its windows and on its landmarks, signs that glow;
- it looks right in rain and in snow (`?weather=rain`, `?weather=snow`);
- a hero can be seen on its roads and on each of its places on show;
- it costs about what the built tiles cost to draw (see "Checking it");
- `npm run typecheck` and `npm run build` pass;
- its `NOTES.md` is complete.

## Building with several builders at once

A tile can be built by several builders at once, each writing one file, while you keep the plan. Delhi was built so in seven files, one for each quarter and one for the Metro, Urbana-Champaign by ten builders in two waves of five, who built 80 of its 85 lots, and Westeros in twelve files side by side, in about forty minutes each. What it takes:

- **Before any builder starts**, write a stub for every file and one registry that gathers them, so that no builder touches a shared file: Urbana-Champaign's is `models.ts`. Put the places for heroes in `plan.ts` as one list: on Delhi they were typed into four files first. And put the parts every builder will want, such as an arch, a name board and a bench, in the shared file of parts: ten builders on Urbana-Champaign wrote ten copies of each, and its source is three times the size of Europe's.
- **Build the centrepiece yourself, first**, as the worked example.
- **One brief that every builder reads first**: what the tile is, what to read and in what order, how its file is found by the registry, the bar, the rules of building, care and names, how to check its own work in a tab of its own, what it must not touch, and what to report.
- **A task for each builder** that names each of its lots, what it is, what it must keep clear, and how many triangles it may have. Give each small scene to one file too: on Delhi two builders staged the same game of gully cricket, and so did whoever kept the plan.
- **Say plainly in each task that what it says of a building's looks is from memory**, and ask the builder to look it up and correct it. Nearly every builder on Urbana-Champaign came back with something its task had wrong, such as a dome that is not green or a front on the wrong side. A builder told the description is certain builds the mistake.
- **The browser pane holds about eight tabs**, and each builder needs one of its own. Each closes its tab when it is done, or you close it when the builder reports: otherwise the next wave cannot open one.
- **Every save by any builder loads every tab afresh**, and a picture or a check in flight is cut off. Take one picture to a call, after waiting for `wimmel.board.tiles`, and leave the long checks, traffic above all, until the builders are done. Or judge on a second server with hot reload turned off, and tell the builders it is there.
- **Look at every file yourself before keeping it**, from two sides by day and by night. Judge in sheets: one picture made of six or nine, each cut to what matters, from the opening side and from behind, by day and by night, is read in one look, and a builder sent back with exact numbers takes three to five minutes. The builders do not commit: you mend what they ask for in files that are not theirs, and you commit.
- **The edges between lots are yours.** Each builder checks its own lot, and things meet at the edges: on Delhi a lamp mast stood before another quarter's place for a hero, a tree before another's yard, a tent hard against a tomb's gate. Only you can ask `wimmel.seen` about every place at once, and you have to, after every file.

## What you may touch

Only your tile's own folder, `app/src/tiles/<id>/`. A tile is found by its folder: its `index.ts` hands a `TileDef` over as its default export, and nothing else needs to know it exists.

- Do not edit `app/src/engine/`, `app/src/main.ts`, `app/src/heroes/`, another tile, the documents, the READMEs or the pictures in `app/screenshots/`. Several sessions work side by side, each on a branch of its own, and this is what keeps their work from colliding.
- If the engine lacks something, build it inside your tile's folder. The engine's own pieces are plain functions that take the `Build`, and a tile can have its own in the same way. Write it down in `NOTES.md` under "For the engine", so that it can be moved there once the tile is merged.
- If the engine has a fault, say so, and mend it in a commit of its own that touches nothing but the engine.
- The engine goes on improving on `main` while you work. Merging `main` into your branch brings the improvements in, and since your branch only adds a folder it merges cleanly.
- Documents, the glossary, the READMEs and the public pictures are brought up to date in one pass when the tile is final. Leave them alone until then.
- Commit to your own branch as you go. Do not push, and do not merge: the tiles are merged from the main session.
- When your tile joins the board, the main session may add to its notes: a table of heights, or the line that says the tile is final. If you go on working after that, merge `main` first and read your folder against it, with `git diff main -- app/src/tiles/<id>`. Two hands in one file can merge without a conflict and leave the notes saying two things.

`NOTES.md`, in the tile's folder, records what a later reader cannot see in the code:

- the things on the tile, numbered, so the count can be checked;
- how high each of its towers stands, in units, beside its height in life, so that the scale can be checked;
- liberties taken with the real place, and why;
- every real name on a sign, and how it was checked;
- what was built from a description, with no source or picture to go by, so that it is the first place to look if something is found wrong;
- the views the collector was shown, as `wimmel.shot` takes them, written down before the `check-` pictures are deleted: the public pictures are taken later, by other hands, and the view is half the work;
- "For the engine": what was built in the tile's folder that belongs in the engine, and what was missed;
- "For the next tile": what building this one taught you that whoever builds the next should know. What worked, what cost time and how you got past it, what you would do differently, and anything this page got wrong or left out. Write it when the tile is done. It is gathered into this page when the tile is merged, so that every tile starts from what the earlier ones learned.

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
| `?tiles=<id>` | your tile alone. `?tiles=<id>,north-america` stands it beside the first tile. `?tiles=sample` is the sample tile. |
| `?hour=21.5` | the hour of the day, held still. Without it the clock runs. |
| `?weather=rain` | `clear`, `cloudy`, `rain`, `storm`, `fog` or `snow`, or `auto` for the city's own weather. Without it the sky is clear. |
| `?drift=0` | stops the view from turning by itself. |
| `?place=<id>` | puts the heroes on one route or one place on show, by its id, for checking it. |
| `?x=&z=&az=&zoom=` | where the view starts. |
| `?elev=24` | the tilt the view starts at, in degrees. It opens at 38. |
| `?room=0` | leaves out the room round the table, so that the board stands on the plain backdrop, and the view is no longer kept inside the room. |
| `?music=stand-in` | plays four invented songs in turn, twenty seconds each, so that a screen can be checked without a Spotify account. |
| `?focus=off` | turns the soft focus off, and `deep` makes it stronger. The B key goes through them. |

In the page's console, `wimmel` is a handle on the city:

- `wimmel.shot('check-<id>-<what>', { hour, x, z, az, zoom, weather, w, h })` saves a picture in `app/screenshots/`. Pictures whose names start with `check-` are ignored by git: use that name for every picture taken while working, and delete them when the tile is done.
  - `x` and `z` are a point on the ground, which is put in the middle of the picture. Something high up is not there: from the opening view, aim at about `x - 0.86 × y` and `z - 0.95 × y` for a thing at height `y`, and half that for the middle of a tower.
  - `az` is where the camera stands, in degrees: 42 has it in the south-east, which is the opening view, 132 in the north-east, 222 in the north-west and 312 in the south-west.
  - `zoom` is how many units the picture is high, and it stops at 34: about 270 shows a whole tile, 120 a quarter, 60 to 90 one landmark, and 34 a shopfront.
  - `w` and `h` are the size of the picture. 1,100 to 1,300 wide is enough to judge a landmark.
  - It moves the view and the hour of whatever page it is called on. If the collector may be looking at that page, open a tab of your own for checks and leave theirs alone.
  - `plan: true` takes the picture from straight above, with north at the top and nothing blurred. On Europe every decision about where a road or a building went was made on such a picture.
  - `elev` is how steeply the picture looks down, in degrees. Without it a picture is taken at 38, whatever the view is doing.
  - Pictures now have the desk and the map in them round the board, and the view is kept inside the room: a picture asked for from further out than the room allows is taken from as far out as it does allow. If either is in the way of a check, open the page with `?room=0` for the plain backdrop.
- `wimmel.fights()` lists every pair of flat surfaces that lie in one plane and overlap, and `wimmel.fights('<id>')` those of one tile (see "Flicker" under "Checking it"). It answers with a table, and an empty one shows in the console as `Array(0)`: that line is its answer, not a fault.
- `wimmel.info()` gives the triangles and draw calls of the last frame, and `wimmel.info().city` the tile's own counts. `wimmel.bench()` gives the milliseconds a frame takes.
- `wimmel.advance(60)` lets a minute pass at once, without drawing it.
- `wimmel.frame(t)` draws one frame, with `t` a time in milliseconds that grows by about 17 at each call. While the browser pane is hidden the page draws nothing by itself, and whatever waits for a frame waits for ever.
- `wimmel.board.tiles[0].vehicles.shared()` lists the lanes that routes were found to share, and `.positions()` says where every moving vehicle is, on which route and how fast.
- `wimmel.seen(x, y, z)` says whether a place is seen from where the view was when it was last drawn, or how far off the first built thing in the way is. People, trees and vehicles are not counted.

After an edit the running page can hold a mix of old and new. Load the page afresh before trusting a picture or a check, read the last lines of the console only, and read its warnings as well as its errors: a sign whose id is not on the sheet only warns, and is simply not there. The tool that reads the console filters by a plain piece of text, not a pattern: `a|b` finds nothing, and a warning was missed that way. A long script passed to the shell inline is mangled, backticks above all: write it to a file and run the file.

**Heroes are private.** They are made from the collector's own pictures, which are never checked in. The development server finds them in the main checkout, so they drive on your tile too. A picture from `wimmel.shot` leaves them out unless it is asked for with `heroes: true`, and then it is saved with the hero's capture and not in the app. So `wimmel.shot` is the only way to take a picture: never use the browser's own screenshot on the page, which has the heroes in it. Never put a picture that shows a hero anywhere else, and never copy anything out of `captures/`.

## Checking it

**Traffic.** Let twenty minutes pass in steps of a twentieth of a second: at half a second a quick vehicle moves more than two lengths in a step. Measure two things. How near any two vehicles come is not enough by itself, because the two lanes of one road pass each other closely and that is as it should be. So also measure how near one vehicle comes to the next along its own route.

```js
const v = wimmel.board.tiles[0].vehicles, dt = 0.05;
let nearest = 1e9, stuck = 0;
const still = new Map(), follow = new Map();
for (let step = 0; step < 24000; step++) {
  wimmel.advance(dt);
  if (step % 2) continue;
  const p = v.positions(), byRoute = new Map();
  p.forEach((a, i) => {
    still.set(i, a.v < 0.3 ? (still.get(i) ?? 0) + 2 * dt : 0);
    stuck = Math.max(stuck, still.get(i));
    if (!byRoute.has(a.route)) byRoute.set(a.route, []);
    byRoute.get(a.route).push(a);
    for (let j = i + 1; j < p.length; j++) nearest = Math.min(nearest, Math.hypot(a.x - p[j].x, a.y - p[j].y, a.z - p[j].z));
  });
  for (const [route, list] of byRoute) {
    list.sort((a, b) => a.s - b.s);
    for (let i = 0; i + 1 < list.length; i++) follow.set(route, Math.min(follow.get(route) ?? 1e9, list[i + 1].s - list[i].s));
  }
}
({ nearest, stuck, follow: [...follow], shared: v.shared() })
```

`nearest` under 3, any `follow` under about 8, or `stuck` over a few seconds is a fault. On the built tiles `nearest` is between 4 and 5, and 3.8 on Westeros, whose lanes are 4 wide. A hero stops on the road for a few seconds to do its party trick, and whoever is behind it waits: `positions()` says which is a hero. Before the run, take away what the tile moves of its own that has nothing to do with the traffic: Westeros's dragons made each step five times slower.

Where routes share lanes the numbers read a little differently, and the check wants longer. A vehicle that waits its turn to join a lane stands for a few seconds, and that is as it should be: on North America the longest such stand is about six seconds, and on Urbana-Champaign, whose loops share lanes in 19 places, ten and a half. What is a fault there is a `stuck` that goes on growing. In a queue two of the shortest vehicles stand 8.6 apart, so that is the least `follow` to expect. And give such a tile two hours and more, not twenty minutes: a fault in how vehicles took their turns once took two hours to show on one set of roads, and after it nothing on them moved again. Run it from more than one start as well: before the engine was mended, one fault locked Urbana-Champaign's traffic after 4, 40 and 124 minutes in three runs. A check that long is quicker in steps of a tenth of a second, looked at every step.

A tile whose routes share lanes on purpose, as Urbana-Champaign's loops round blocks run in the lanes of the loops round them, checks them with `roadFaults` and `throughSolids` from `engine/checks.ts` instead of `checkRoads`, which takes a shared lane for a crossing: two routes in one lane are no distance apart. `roadFaults` finds two routes that cross at more than about 25 degrees and two that meet head-on in one lane, and leaves alone a lane that two routes drive the same way. `throughSolids` finds a route that runs through something built. Each hands back a list for the tile to print in the console. Urbana-Champaign's builder wrote both, and they moved into the engine when the tile joined the board.

These checks go by the boxes the tile hands them, and a box is not what is built. On Westeros rays along every lane, upwards for anything lower than a traveller and ahead for anything standing in it, found a traveller clipping the low wall of a ramp that the boxes had passed. They are `checkLanes` in `engine/checks.ts`: `checkLanes('<name>', routes, k.b, { kinds, people: k.people })`, called once the tile is built and on the development server only. It sweeps each lane with what really drives there, as wide as the widest of the route's kinds and as tall as each is at each distance from the middle, and in a bend as far as the longest swings out, and it says where something built stands in a lane or hangs lower over it than what drives there, and where one of the tile's people stands in one. It hands back what it finds. Run it from the first road onwards: on Westeros it found 31 short stretches the boxes had passed. It cannot see trees, which `Build` does not list.

**How many vehicles a road can carry.** This is the number that mattered most on Japan, and nothing said that it existed.

- A vehicle is about 7 units long, and keeps 2.4 + 0.55 × its speed between itself and the one ahead. So at a speed of v a lane passes v / (9.4 + 0.55 v) vehicles a second.
- A bend is driven at 2.2 × its radius, and never slower than 5.5. A block's corner of radius 3.5 is driven at 7.7, which passes 0.57 vehicles a second.
- Each vehicle drives at between 0.86 and 1.16 of the speed its road allows, and a queue moves at the pace of its slowest. So take 0.86 of a stretch's speed.
- What arrives is the route's count divided by the time one lap takes.
- Keep what arrives under three quarters of what the slowest stretch passes. Above that a queue forms that never clears. It backs up into a faster stretch, vehicles arriving there cannot stop in time, and they drive through each other.
- The heroes drive on the routes too, and the engine chooses how many go on each. On Delhi a route reckoned for twelve carried sixteen, four of them heroes, and between a check with ten heroes on the tile and one with twelve the least distances moved, though no road had changed. Leave room on a route for more than drive on it today, and run the traffic check again on the day the tile is called final.

Budget a route's count from this before choosing it. A count can pass the check and still be at the very edge.

**Places for heroes, without looking at a hero.** A picture with a hero in it may not be kept or shown, so check where a hero stands and not what it looks like. Either read positions: open the tile with `?place=<id>` in a frame of its own, and read `wimmel.board.heroes[0].pos`, as Japan's notes show. Or stand a plain box the size of a car, 7 by 2.6 by 3, on each place from the console and take an ordinary picture, as Hong Kong's notes show. Whether a place can be seen is a matter of what stands in front of it. `hiddenBy` says so from the plan, and `wimmel.seen(x, y, z)` from what is built, for a few points on the car: its middle and its two ends, a unit or two above the ground.

**Cost.** Measure your tile and a built one in the same minute, at the same size of window and the same hour, one straight after the other, each alone on the board (`?tiles=<id>&drift=0`): `wimmel.setHour(14)`, wait a moment, then `await wimmel.bench()` three times, and the same at 21. The numbers move with the size of the window, with the engine and with what else the machine is doing, and are rough while the browser pane is not in front. What stands still on the built tiles, from `wimmel.info().city`:

| | Triangles that stand still | People | Moving vehicles |
| --- | --- | --- | --- |
| North America | 43,000 | 260 | 86 |
| Japan | 32,000 | 368 | 72 |
| Hong Kong | 44,800 | 521 | 61 |
| Europe | 34,700 | 440 | 89 |
| Delhi | 84,400 | 591 | 66 |
| Urbana-Champaign | 69,400 | 816 | 45 |
| Westeros | 102,500 | 474 | 17 travellers, with 3 dragons, 3 ships and a kraken |

Stay within about twice what the first four stand at: Delhi is at that edge, and Westeros, at 2.4 times North America's, past it. Triangles that stand still are not what a tile's own frame costs, though, for a frame is mostly the heroes' triangles: Delhi's costs what Europe's does, and Westeros's about what North America's does. But the whole board has to run, and seven tiles together take about 12 ms a frame on the desktop. Count the triangles part by part from the first day: the engine has no such count yet, and Westeros's `city.ts` keeps one in the console. It was at 100,000 before anybody added them up. People, trees, lamps and glows are cheap however many there are. What costs is water, since a tile that has any is drawn a second time as its mirror image at every hour, and every mesh of its own: each train, a wheel that turns, a beam of light. Delhi has few meshes of its own, and its water is one river and four small tanks.

**Sides and weather.** `az` 42, 132, 222 and 312, by day (`hour: 13`) and by night (`hour: 21`); `weather: 'rain'` at dusk and by night; `weather: 'snow'` by day. Rain by night is where wet streets and signs show best. Snow lies on everything that faces the sky, and turns water white. Then look from low down, at an `elev` of 14 to 18, since the view tilts that far: whatever is seen from below needs its underside, every deck, canopy, eave and balcony.

**Flicker.** Two surfaces in one plane flicker as the view moves, and no still picture shows it: on Europe, road lines flickered at two places that no picture had caught. So go by the check and by heights.

- **The check.** `wimmel.fights()` in the console of the development server lists every pair of flat surfaces that face the sky, lie in one plane (nearer than 0.0035 in height), overlap, and do not look the same. It gives where they are in the tile's own coordinates and what each is: `city`, `deck`, `street` or `base`, with its colour, and "with lines" for a road with markings. `wimmel.fights('<id>')` looks at one tile. It is `flatFights` in `engine/checks.ts`. It does not look at walls, and it answers for the moment it is asked: ask again while what moves is moving, for on Westeros two moving shadows met only now and then. All seven built tiles come back empty, and a tile is not done until it does.
- **What the engine mends by itself.** `finishStreets` makes a junction and zebra crossings where the middles of two streets cross, and lays a plain patch over every other place where two carriageways lie over each other: where one street runs on along another, joins the bend of another, or ends in a turning circle. A `street` and a `roadDeck` no longer fold over themselves on the inside of a bend tighter than they are wide: the inner edge waits at the corner. A raised road builds no low wall where the wall would have no height, as where a road with `skirt` comes down to the ground. Where a raised road closes on itself, as a loop to turn in does at its neck, no wall is built across its own surface and a plain patch clears the lines.
- **What a tile has to do itself.** Two different raised roads that meet must not lie at one height. Give the one that branches off a `lift` 0.01 greater than the road it leaves. Japan's lookout loop and slip roads and North America's bridges to the car park's roof were mended that way.
- **Heights.** The engine lays a sidewalk at 0.015, a carriageway at 0.03, the patch over a junction at 0.045 and the bars of a crossing at 0.055, and `area` lays at 0.02 unless told otherwise. So a square can lie over a sidewalk as it is, a driveway across a sidewalk goes at 0.025, and paint on a junction at 0.07. Two boxes that end flush flicker where they meet: let one stand 0.3 proud. A board or a screen is a dark box 0.1 proud of its wall, with the sign 0.03 in front of that.

## The kit

A tile is a `TileDef`: an id, a name, a seed, its signs, and a `build(k)` that builds everything that stands still and hands back the tile's routes, its parked vehicles and its places for heroes. `k` is the `Build`, described in `app/src/engine/tile.ts`. Everything is in `app/src/engine/`. The pieces in the first table are each used once in the sample tile. Those in the second were built by tiles for themselves and then moved into the engine, and the tile named beside each is where to see it used.

| File | What it gives |
| --- | --- |
| `tile.ts` | `TileDef`, `Build`, `Route`, `ParkedSpot`, `HeroSpot`, and the size of the board, `TILE`. A `TileDef`'s `place` says where in the world the tile's place is, for its pin on the map. |
| `geo.ts` | `k.b`, the builder everything solid goes into: `box`, `obox` (a box at an angle), `cyl` (a cylinder, a cone or a prism), `quad`, `tri`, `sweep` and `beam` (bars along a line). A wall's `win` gives it windows that light up at night. |
| `ground.ts` | `ground` (the paving, with holes for water), `area` (a lawn, a square, a beach), `flat` and `walls` (the floor and the walls of any outline: a moat, a pond, a cutting, a curved front), `water`, `terrace` (one level of a hill), and the shapes `rect`, `oval` and `band`. A band's width can change along its length, for a river. `onBoard` cuts a shape off at the edge of the board. |
| `paths.ts` | `buildPath`: a line that roads, rails and vehicles follow, from stretches of four kinds: `ring` (closed, with rounded corners), `poly` (open), `ramp` (open and rising) and `helix` (a spiral, or any arc). A stretch can have a `speed` of its own. `joined` and `stretch` make one path out of pieces of others. |
| `roads.ts` | `street` (a street on the ground along any path), `lampsAlong`, and `roadDeck` (a road above the ground: a viaduct, a bridge, a ramp). Once every street is laid, `finishStreets` makes a junction and zebra crossings where the middles of two streets cross, and a plain patch wherever else two carriageways lie over each other: where one runs on along another, joins its bend, or ends in a turning circle. Neither a street nor a deck folds over itself on the inside of a bend tighter than it is wide. A deck builds no low wall where the wall would have no height, as where a road with `skirt` comes down to the ground, and none across its own surface where it closes on itself. `open` leaves a gap in a deck's low wall where another road joins it. `clearOfStreets` warns in the console when a lot stands in a street. |
| `buildings.ts` | `ordinaryBuildings`: boxes in the tile's own styles, with roofs, shopfronts and signs, from a list of lots. A lot is a corner and a size (`x`, `z`, `w`, `d`, `y0`, `y1`), not two corners. |
| `rail.ts` | `track`, `trestle` (the steel under a raised track), `station` and `train`. A train can have a car of the tile's own shape, so the same pieces make a tram, a bullet train, a ferry, a racehorse or a jumbo jet. A line can end (`ends`): the train changes ends there and goes back. Trains that share track wait for each other (`blocks`). North America's `l.ts` does both. |
| `air.ts` | `helicopter`: it rests on a pad, and now and then takes off, flies a round and lands. |
| `effects.ts` | `Smoke`: exhaust, and steam over a hot pool. Japan uses it. |
| `build.ts` | `placed`: builds something elsewhere and at an angle. For anything that is not square to the board, and for a model written to stand at (0, 0). |
| `signs.ts` | `SignDef`: neon lettering, lit boxes, painted boards, and signs a tile paints itself. `font` sets a sign in another script: `JAPANESE`, `CHINESE` and `DEVANAGARI` are there, and a tile can name its own. A sign of kind `screen` shows what is playing on Spotify, and when nothing is, the picture its own `paint` draws. |

| File | What it gives | Where to see it used |
| --- | --- | --- |
| `lanes.ts` | Roads that are not a grid: a lane from straights and circles, with the bends between them worked out. A roundabout, an avenue that leaves one at any angle, lanes that stay side by side round a bend, a teardrop to turn in. | Europe |
| `lines.ts` | A road drawn as with a pen: straight stretches and arcs, each with a height at its ends, so that a road can climb through hairpins or run on stilts. A lane beside it keeps the road's own height round a bend. `thereAndBack` makes one route of a road with a turning loop at each end. | Japan |
| `corners.ts` | A road as a list of corners, rounded and then given heights, with the changes of slope eased. Lanes beside it, and the road handed over as a path. Also for a line that a train, a boat or an aeroplane follows. | Hong Kong |
| `terrain.ts` | Ground that slopes: `field` works out a hill's height over a grid, `drawField` draws it in flat facets, green or rock by how steep each is, `carved` cuts a level bench into it for a road, and `heightOn` gives its height anywhere, so that trees, people and buildings stand on the slope. | Hong Kong |
| `tunnel.ts` | `tunnelMouth`: a cutting, a hood, and darkness a little way in, where a vehicle goes out of sight. | Hong Kong |
| `shapes.ts` | Shapes for landmarks: `face3` (a triangle that always faces the way it is told to), `prism` (walls round a plan of any number of corners), `gable` and `hip` (roofs), `slab` (between two points at different heights), `shell` (a roof that follows a line), `drum`, `railing`, and `beacon` (a lamp for the top of a tower). | Hong Kong |
| `parts.ts` | Small parts for landmarks: `lathe` (a dome, a cap or a basin turned from an outline), `hipped` (a roof with four slopes: a mansard), `archway`, `roundel` (a rose window or a clock), `pinnacle`, `wheel` (on a level axle), flags, `parasol`, `twoWheeler`, `figure` (a person in uniform: a guard, a statue), and a `tri` that faces the way it is told to. | Europe |
| `props.ts` | Small things for a street: `vending` machines, a paper `lantern`, a lamp `mast`, `standingCar` (a car in given colours that is part of a scene and never drives), a `dekotora`, and `hungSign` (a sign hung out over a street, read from both ways). | Japan, Hong Kong |
| `movers.ts` | Cars for `train`, each a shape that goes along a line of its own: a tram and a bus with two decks, a ferry, a junk, a dragon boat, a funicular's car, a racehorse, a jumbo jet, and a sampan, a minibus and a lighter that stand still. | Hong Kong |
| `aircraft.ts`, `eastern-dragon.ts` | Things in the air that never land: `concorde`, a `balloon`, and a `dragon` that flies a round after a pearl, long and without wings. | Europe, Japan |
| `dragons/` | Winged dragons of the books, which fly, breathe fire and land. `model.ts`: a `Dragon`, built from a `DragonKind` (its colours, its length, its fire, its manner of flight and its own `shape`: the lengths of its neck, body and tail, its bulk, the reach and breadth of its wings, horns and how far they curl up like a bull's, crest, fangs, torn wings and scars). `kinds.ts`: Westeros's three and the ten great dragons of the Targaryens (`GREAT_DRAGONS`), each known at a glance. `pilot.ts`: a `Pilot` turns where a dragon is at each moment into a pose, in its kind's manner, banking, beating, gliding, landing and looking about, and leaves its fire and ribbons to the tile to draw. Its `Cue` says what the tile tells it besides where it is: fire, a roll, beats, how far it sits, its jaws open of themselves (a roar), a turn of its head to watch something, `tuck`, its wings drawn in as it drops off a ledge with others close beside it, or drops onto one, and `lift`, its body carried higher than its line without turning it, for a home on a roof that falls away under a dragon too large for its line to clear it. `track.ts`: a smooth line in the air, flown at the speeds given. `fire.ts` and `trails.ts`: the fire, as large as each kind's flame and as wide as its `spread` (a great dragon's billows), and the ribbons off the wing tips. A hidden tile, `?tiles=dragon-yard`, lines up every kind and flies each a round of its own: `yard.line()` stands them in the air, `yard.line(1)` lands them, and `yard.fly()` flies them again. | Westeros, Blackwater Bay |
| `checks.ts` | `checkRoads` (two roads that cross on the level, a road that runs through something built), `hiddenBy` (what stands between a place and the camera) and `flatFights` (flat surfaces that lie in one plane and overlap, which `wimmel.fights()` runs). They speak in the console. On a tile whose routes share lanes on purpose, `roadFaults` (two routes that cross on the level or meet head-on) and `throughSolids` (a route that runs through something built) take the place of `checkRoads`, and hand back what they find for the tile to print. `checkLanes` sweeps every lane through the tile's own triangles, not through boxes. | Hong Kong; Urbana-Champaign for `roadFaults` and `throughSolids`; Westeros for `checkLanes` |

Three of these lay out a road, and which to use depends on the road. On the flat, with roundabouts or bends that are not corners of a grid: `lanes.ts`. Up and down, drawn stretch by stretch: `lines.ts`. Up and down, given as corners: `corners.ts`. A grid of streets needs none of them: `ring` and `poly` in `paths.ts` do it.

`k` also plants and places the small things, which are drawn together however many there are: `k.tree`, `k.person`, `k.lamp`, `k.sign`, and `k.glows` and `k.lights` for whatever shines at night. `k.tree`, `k.person` and `k.lamp` each take a height as their last argument, so they can stand on a terrace, a roof or a deck. `k.each` is called on every frame, for the few things that move.

Rules that are not obvious from the code:

- **Two surfaces must never lie in the same plane.** Where they do, they flicker, and it shows most at night. A floor stops inside the walls round it, a roof sits above the tops of the walls, and a patch on the ground is a hair higher than the ground.
- **Two raised roads that meet must not lie at one height.** The engine does not mend this for you. Give the one that branches off a `lift` 0.01 greater than the road it leaves, as Japan's lookout loop and slip roads and North America's bridges to the car park's roof have.
- **Routes may share a lane, and may not cross.** Where two routes run along the same lane the same way, the engine finds it, and their vehicles take turns: they merge where the routes come together, follow each other along the lane, and part where the routes do. That is how a road joins another: a slip road, a driveway, a roundabout with roads off it. For it to be found, the two routes must run on the same line, within half a unit, at the same height. Routes that only cross are not found, and their vehicles drive straight through each other, so two roads never cross on the level: one goes over the other. North America has one loop round each block, in the lane by the kerb, so that no loop crosses another, and one longer route, `garage-run` in its `plan.ts`, that shares lanes with three of the others. On a tile with shared lanes the traffic drives for four seconds before the tile is shown. Vehicles are spread along their own routes, so two from different routes can be put down in one place on a lane they share, and in that time they part.
- **Decide who owns each lane before laying a road.** What worked on Japan, for traffic that keeps left: one loop round each block, anticlockwise, in the lanes next to the block, turning left only; the lanes left over on the outside of a group of blocks as one long clockwise loop; and a road that goes there and back as one route with a turning loop at each end. For traffic that keeps right, mirror it. No junction then needs anyone to wait.
- **A route is a closed loop.** Its direction is the order of its corners, and that is what makes traffic keep left or right.
- **A stretch of a route can have a speed of its own**, where the road it runs on is slower or faster than the rest: a spiral ramp, a driveway, a stretch of expressway.
- **A route can say what its vehicles are**: `types` picks among the plain kinds (`sedan`, `hatch`, `van`, `pickup`, `bus`), and `paint` gives them a city's colours, such as red taxis. A hero may be put on any route that does not say `heroes: false`.
- **A tile can bring traffic of its own shape**: a rider, a cart, an auto-rickshaw. It hands each kind over as a `TrafficKind` in `kinds`, beside its routes: a name, a shape with its nose along +x standing on y = 0, a length, a width and the colours its paint is picked from. A route's `types` and a parked spot's `type` then ask for it by name, alone or mixed with the plain kinds. The shape is made with `shapeFrom`, `shapePart` and `PART` in `vehicles.ts`, where a comment shows a whole one: paint is given in white and takes the colour picked for each, everything else keeps its own colour. A kind without lamps says `lamps: false`, and then throws no beam on the road at night. Such traffic drives as the plain kinds do: it keeps its distance, takes turns on a shared lane, and is drawn in one batch for the whole kind, however many there are.
- **Windows.** `win.kind` is 0 for plain windows, 1 for a wall of glass, 2 or 3 for windows above a shopfront, 4 for small windows, 6 for tall slits, and 7 for a castle's arrow loops, narrow, dark by day and lit only warm at night. `interior(lit)` is for a surface inside a lit room. Windows are placed by height above the ground, so storeys stacked as boxes of their own line up only if each box is as high as the `storey` of its `win`.
- **Streets are laid in the tile's own coordinates**, not inside `placed`, or their junctions are not found.

Traps the earlier tiles fell into:

- **`street` lays a sidewalk on each side.** Its `width` is the carriageway alone, and the sidewalk is `sidewalk` wide outside it, 3 unless told otherwise. So the front of a building belongs at half the carriageway plus the sidewalk from the street's middle: 8 units for a street of two lanes. Japan's blockout had its buildings at the kerb, and putting that right meant moving every lot. Work out the ground inside each block's sidewalks straight after the streets, and place every lot from it.
- **Figures, trees and parked vehicles do not know where the roads are.** In a still picture a crowd in a kerb lane looks right. Place them through one function that refuses a place on a carriageway, inside a lot, in water, on a hero's place, on a parked vehicle, or where it would stand before something the opening view is to see. The engine has none yet: Delhi's, Urbana-Champaign's and Westeros's are under "What to reuse". Refuse by height, not by a blanket zone: on Westeros a clear zone before every name board cost 76 trees and a farm, and a limit on height by how far before the board a thing stands cost none. Check parked vehicles against each other with numbers too: two on Urbana-Champaign stood one inside the other for a whole stage, and no picture showed it.
- **`k.rand` is one run of numbers.** Add or remove one call and everything scattered after it moves: trees, people, and which trees are in blossom. Use it, never `Math.random()`, but once the collector has seen the tile, scatter anything new from numbers of your own, so that nothing else changes.
- **Sizes typed into a model, and not taken from the plan, put things inside each other**: a platform inside a station's roof, a bridge on dry land. A model is a function of its lot.
- **`lampsAlong` comes after every street.** Its `off` is how far the lamps stand from the middle of the road: about 1.2 more than half the carriageway. It keeps lamps out of other streets, but it knows nothing of buildings, hills or parked cars: on Urbana-Champaign one stood in a bay at the kerb, through a car. Lay out bays at a kerb after the lamps, and look.
- **A sign shows from one side.** A sign that hangs in the air needs a second one back to back, and a thin dark box between the two. Give every sign a small `size` in pixels, or it takes a whole row of the sheet. A square of the sheet holds about 150 signs, and a sheet can be two squares and no more: past that the last signs are cut off, with a warning.
- **A glow and a light are different things.** A glow (`k.glows`) is a box that is always drawn, dim by day and bright by night. A light (`k.lights`) is a pool on the ground by night and nothing by day. A landmark with no light near it stands in the dark with its windows lit: give each one or two.
- **`quad` turns itself to face its normal and `tri` does not.** A triangle given the wrong way round is drawn only from behind, so a gable is a hole from the side it is meant to be seen from. Three tiles fell into this. Use `face3` in `shapes.ts` or `tri` in `parts.ts` for every triangle: both always face the way they are told to.
- **The engine's windows are panes of glass.** That is right for a house and wrong for a ruin: the Colosseum with windows was an office block. Tall slits (`kind: 6`) pass for Gothic windows and small ones (`kind: 4`) for a castle's, and anything round-headed has to be built. A dark colour with `interior(lit)` and a large `lit` is dark by day and glows at night: an arch, a doorway, a porch with a lamp in it. On Delhi a lamp-lit window was a dark warm colour with a `lit` of 2 to 3, and a floodlit wall its own colour with 0.3 to 0.5. Say how tall each window is to be, and look at dark stone by day: there the pale panes make an office block too.
- **Thin bars come out dark**, because the outline is drawn round every bar. Paint ironwork a good deal lighter than it should look.
- **Where two streets meet at a T**, the one that ends no longer has to run on to the far kerb of the other for its markings to be cleared: the engine lays a plain patch where the two overlap. It still has to cross the other street's middle to get zebra crossings.
- **`k.b.moved(x, y, z, yaw, fn)` turns and moves whatever is added inside it.** A building written along x can be stood along z with one line. `walls` and `flat` in `ground.ts` build the walls and the floor of any outline, which is how a curved front or an oval is made.
- **`cyl` measures its radius to its corners.** A four-sided one that is to be w wide needs a radius of w × 0.707 and `phase: Math.PI / 4`.
- **`box` leaves out its bottom.** What is seen from below, such as a canopy or a deck, needs `faces` with `B` in it. `cyl` takes `faces` and ignores it, so a disc has no underside unless one is built.
- **Heights under the ground.** The ground is at 0, water at -0.9 and the floor of the base at -2.4. A hull goes down to -1.2 or lower. A hole in `ground` must not touch the edge of the board: bring water that runs to the edge in by 0.2.
- **For something that turns**, build it with a `GeoBuilder` of its own, make a mesh of it with `k.mat.city()`, add it to `k.group` and turn it in `k.each`.

What the kit does not yet have, as the built tiles found:

- **Traffic that waits**: at a crossing where people walk, for a bridge that lifts, or at a bus stop. Urbana-Champaign's buses slow to a walk instead, on a stretch of their route with a speed of its own.
- **A deck that climbs round a bend.** Its stretches are twisted, and each is drawn with a line across the road. Climb on the straight and turn on the level, as Delhi's bridge does.
- **A deck that ends square on a bend.** Where another deck goes on from there, the two overlap by a sliver, which `wimmel.fights` finds: end it on a unit of straight road.
- **A palette for the plain kinds alone.** A route's `paint` repaints every kind on it, a tile's own too, so Delhi made its ordinary cars kinds of its own.
- **Which kind a moving vehicle is.** `positions()` does not say, so a picture of one kind has to be hunted for.
- **People who walk, who sit, and who can be dressed.** A stadium's crowd stands on its rows. A guard or a gondolier is built as boxes with `figure` in `parts.ts`.
- **A window that is not a pane of glass**, such as a dark arch, and **roofs other than hip roofs** on ordinary buildings. A window is also four tenths of its cell wide whatever its kind, but for an arrow loop, which is an eighth.
- **An `obox` whose faces know their length.** A window spec on one draws one stretched window: Westeros's `rampart` in `look.ts` builds its wall as a box that is turned and moved instead.
- **A sign that is not an upright rectangle**: one that follows a curve, lies on a slope or moves. Lettering on a curved canopy or on a banner is built of strokes, and an awning's goes on its upright valance.
- **A sign drawn once and lettered many times**, for a tile with many small signs of one kind, such as a name board before every building.
- **Kinds of tree**, for snow and dark woods too. Nine in ten come out green, and a pine in snow is as bright as any. Japan's cherry trees are its own, in its `scenes.ts`.
- **A shadow for what moves.** The shadow map is drawn once, so a train or a dragon casts none: Westeros's dragons carry flat shadows of their own. And **boats that bob.**
- **A platform beside a track that is not on a trestle.** `station` builds one on columns.
- **A train with one locomotive, at the end of its line.** `train` turns a train end for end there, which is right only for one that is alike at both ends: any other has to turn out of sight.
- **A place for a hero that moves**, such as the deck of a ferry that sails.
- **A mirror image that leaves out what is under the ground.** At night the lamps of vehicles in a tunnel under water show faintly in the water above.
- **Water that is dark, or seen through.** Westeros's bog pools want to be black and are pale blue.
- **A thing in the air kept in focus.** The soft focus blurs by depth, so a dragon high over the table is blurred when the view is close: `?focus=off` turns it off for the whole view.
- **A clean face where a field is cut off steeply** at the board's edge. `drawField` draws teeth there, and Westeros's regions draw their own.
- **A say in where the map's words go.** Those beside Westeros's coast run under the map's own sea serpent.
- **Asking what stands at a place**: the height of what is built at (x, z), and which figures, lamps and trees stand near it. Urbana-Champaign worked both out in the console (see "What to reuse").
- **A chunk of its own for each tile.** All tiles are bundled into one, and `npm run build` warns that it is over the 1,200 kB the app's settings allow. That is the app's to settle, not the tile's.

Where a tile needs one of these, build it in the tile's folder with `k.group` and `k.each`, as `train` in `rail.ts` does, and note it for the engine. One thing a tile may still want to read rather than use: Japan's own `terrain.ts`, which shapes a mountain with a level bench wherever a road runs, straight from its plan.

## What to reuse

Much of the thinking for every district has been done, and some of the building.

- **The research notes**, `docs/districts/research/`. One or more for each district, named after it. They say what the place is known for and what a collector of diecasts would look for there.
- **What the island had planned.** The island was the plan before tiles. What is of use from it is kept in `prototype/island`:
  - `prototype/island/plan/districts.ts` gives each district's theme, its ground, the road worth driving there, its quarters and whether traffic keeps left.
  - `prototype/island/plan/landmarks.ts` names what was to stand in each district, about 280 landmarks in all. It is a list to choose from: a tile holds the 30 or 40 that make the place, not all of them.
- **Models that exist.** They are written around (0, 0) and take `{ b, glows, lights }`, which the `Build` is, so they work inside `placed` once their imports point at `app/src/engine`. Copy the ones you need into your tile's folder.
  - `prototype/island/models/landmark-models.ts`: a torii and the Taj Mahal, besides the American ones. Kyoto Tower and the pagoda from there stand on Japan now, and Big Ben and the Leaning Tower of Pisa on Europe.
  - `prototype/island/models/delhi-models.ts`: Hauz Khas, the Qutub Minar, India Gate, the Lotus Temple, the Red Fort, Rashtrapati Bhavan and Connaught Place. Delhi now has models of its own of all seven.
  - `prototype/look/src/scene-data.ts` has the look prototype's Japanese signs and the brands with Japanese names.
- **The tiles that are built**, as worked examples of a whole tile. In each, `plan.ts` is the tile as data. On the first four, `city.ts` builds it and `landmarks.ts` holds its models; Delhi, Urbana-Champaign and Westeros have a file of models for each quarter, group of lots or region. Their pictures are in `app/screenshots/`.
  - **North America**: `l.ts` is a railway with branches, and `ground.ts` a ground material of its own.
  - **Japan**: a mountain and a pass (its own `terrain.ts`, with the engine's `lines.ts`), a road on stilts over water with parking areas (`wangan.ts`), a train of its own shape (`shinkansen.ts`), and many small scenes (`scenes.ts`).
  - **Hong Kong**: a harbour between two shores, a road up a hill and through a tunnel (`city.ts`, with the engine's `corners.ts`, `terrain.ts` and `tunnel.ts`), trams, buses, ferries and a jumbo jet each on a line of its own, and checks that run on every load.
  - **Europe**: roads that are not a grid, with roundabouts (`roads.ts`, with the engine's `lanes.ts`), traffic that keeps left in one quarter and right in the others, a river of changing width with a canal let into its bank (`riverShape` in `index.ts`), a file for each quarter, and boats on the river (`water.ts`).
  - **Delhi**: the parts every monument is made of, a dome, a chhatri, arches, a minaret, battlements and steps, in one file (`mughal.ts`); words cut in stone, as strokes and not a sign (`CAPITALS` and `carved` in `axis.ts`); words round a circle in a script that joins its letters, written straight on a canvas of their own and laid round in strips (`bent` in `signs.ts`); coloured smoke that hangs, one mesh in one call (`Trails` in `flypast.ts`); a flight that leans into its turns, also in `flypast.ts`, which keeps its lean when no time passes, or every picture would show it level, and starts its round near the end, so that it passes within seconds of the page opening; everything small placed through one helper that refuses a lane, a lot, water and a hero's place (`Places` in `life.ts`); and ten kinds of traffic of its own shape (`traffic.ts`).
  - **Urbana-Champaign**: a file for each group of models, gathered in `models.ts` (`ModelFile` in `plan.ts`), and a model that fails said in the console while the rest of the tile is still built (`city.ts`); trees and canopies put down through `clear` and `hides` in `planting.ts`, which refuse a place that would stand before something the opening view is to see; boards placed before every building by measuring the built tile in the console, as its notes describe under "Placing small things on a tile that is built", and kept in `boards.ts` as a side of their lot, so that each moves with its building; and a platform on an embankment (`moving.ts`).
  - **Westeros**: a tree of roads on which every lane turns left (`roads.ts`); travellers of its own shape (`WAYFARERS` in `wayfarers.ts`); dragons that fly a show (`dragons.ts`, `flight.ts`, `show.ts`), with a check that flies their round against every lot on every load (`clearance.ts`); ships (`ships.ts`); what ground is open and how tall a thing may stand before a name board (`open` and `underBoards` in `space.ts`), with every name board recorded as it is put up (`BOARDS` and `nameBoard` in `look.ts`); and from the regions' files `vault` and `doorway` (`kings-landing.ts`), `palm` and `q4` (`stormlands.ts`), `face4` and `boat` (`riverlands.ts`), and `taper` and `clipTo`, which draws a field clipped to an outline (`dragonstone.ts`). `q4` and `face4` are faces of four corners that face the way they are told.
- **The stack**, in `prototype/two-tiles`: four ramps between a boulevard and a freeway above it. A road pattern waiting for a tile.
