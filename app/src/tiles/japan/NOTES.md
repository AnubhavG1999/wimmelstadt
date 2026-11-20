# Japan: notes

This file records what a later reader cannot see in the code.

## Where things are

- `plan.ts` is the tile as data: the water, the streets, the three long roads, the railway, where each thing stands, the routes, and the parked vehicles.
- A road's middle line, and the lanes taken from it, are drawn with the engine's `lines.ts`, which was written here.
- `terrain.ts` shapes Fuji and the hills.
- `city.ts` builds the ground and the streets, and calls the rest.
- `wangan.ts` builds the Wangan, Daikoku and Tatsumi. `shinkansen.ts` builds the viaduct and the trains. The dragon is the engine's `dragon.ts`, which was written here.
- `landmarks.ts` builds the towers, the temples and shrines, the castle and the stations.
- `scenes.ts` builds the smaller things: the scramble, the places where cars gather, the mountain's scenes, what floats on the water, and the lanterns.
- The small things used all over, which are vending machines, lanterns, lamp masts and the dekotora, are the engine's `props.ts`, which was written here.
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

## How high things stand

Added by the main session on 19 November 2026, when the tile joined the board. The city's towers are roughly to one scale, about 3.2 metres to a unit, which North America's set: see [the page for tile builders](../../../../docs/building-a-tile.md).

| | Units | In life | At that scale |
| --- | --- | --- | --- |
| Tokyo Tower | 112 | 333 m | 105 |
| Kyoto Tower, with the hotel under it | 58 | 131 m | 41 |
| Mount Fuji | 60 | 3,776 m | 1,195 |

Tokyo Tower is within a tenth of the scale. Kyoto Tower is a small landmark and stands taller than its scale height, so that it can be recognised. Fuji is a toy, as every mountain is. The heights in life are the commonly published ones.

## Liberties taken with the real place

- Fuji, the pass, the snow monkeys and the thatched farmhouses share one corner. In life the pass is Haruna's, the monkeys are Jigokudani's and the farmhouses are Shirakawa-go's, all far from Fuji. They are together because the corner is the tile's one piece of mountain.
- The castle is Matsumoto's, the black "crow castle", which is in the Alps and not in Kyoto. It is the castle whose shape reads best at this size.
- The great torii and its shrine are Itsukushima's, which is near Hiroshima and not near Kyoto. Boats do pass through the real one at high tide.
- Tokyo's sights stand side by side: the scramble, Tokyo Tower, Sensō-ji, Ueno Park and the station are each a block from the next.
- Daikoku's ramps are one sweep round the parking area and a bypass, not the real junction's stacked loops.
- Tatsumi and Daikoku are on one road here, with the Bay Bridge between them. In life the bridge is on Daikoku's other side. The real parking area is called Tatsumi No. 1; its sign here says only Tatsumi.
- Kyoto and Tokyo are 90 units apart. The Shinkansen goes on past Kyoto in life; here its line ends under the hill.
- The dragon is not a liberty with any place. The collector asked for one.
- The big screen at the scramble spans the south faces of the tower of screens and the pencil building beside it, 10 high, from 20 to 31 up, because no wall at the crossing is wide enough for it alone. Cat Cola's screen moved up above it. It shows what is playing on Spotify, and otherwise its own picture: a giant calico cat peeking over the bottom edge at the street, as Tokyo's big-screen cat does, saying にゃー ("meow"), with ただいま休憩中 ("on a break right now") in the corner like a channel's caption. Those words are plain phrases and nobody's name.

## Real names on signs

No business on a sign is real. The names on the tall signs and the screens (Kaiju Karaoke, Tornado Ramen, Dream Electric, Neon Sushi, Doughnut Galaxy, Cat Cola) are the look prototype's own inventions. The tuner's garage is 幅広ワークス, "Habahiro Works", which says "wide": a search on 19 November 2026 found no business of that name. The tofu shop is 角の豆腐店, "the tofu shop on the corner". Every other shop's sign says only what is sold there.

The real names are names of roads and places, and what a real thing says on itself:

- 湾岸線, 大黒ふ頭, 大黒PA, 辰巳, 東京: the Bayshore Route and the places it leads to, on the green signs. Daikoku's are written as the Metropolitan Expressway's own pages write them (shutoko.jp, looked at on 19 November 2026).
- ETC and 一般: the two kinds of lane at a toll gate.
- 雷門: Kaminarimon, on its lantern.
- 東京駅 and 京都駅: the two stations.
- 忠犬ハチ公: "the faithful dog Hachikō", on the plate under the statue.

## For the engine

On 19 November 2026 the main session moved three of these into the engine as they were, and this tile uses them from there: `lines.ts`, `dragon.ts` and `props.ts` are now in `app/src/engine/` under the same names. `terrain.ts` stays here, because it shapes Fuji and Kyoto's hill from this tile's own plan. Where these notes say that one of the three is in this folder, read it with that in mind.

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

## For the next tile

This is what building Japan taught, written for someone who has not seen this tile and is about to start one. It was written on 19 November 2026, against the engine as it stood on `main` at `99cdf34`. What the engine itself lacks is in "For the engine" above and is not repeated here.

### Worth doing again

- **Write the tile as data before drawing any of it.** One file, `plan.ts`, holds the water's outline, the streets as middle lines, the routes, and where each thing stands, and nothing in it draws. Every model takes its place and its size from there. When a street had to move three units late on, the routes, the ground and the tower beside it moved with it.
- **Decide who owns each lane before laying a road.** Routes may not cross, so the pattern has to be settled on paper. What worked here, for traffic that keeps left: one loop round each block, anticlockwise, in the lanes next to the block, turning left only; the lanes left over on the outside of a group of blocks as one long clockwise loop; and a road that goes there and back as one route with a turning loop at each end. For traffic that keeps right, mirror it. No junction then needs anyone to wait.
- **Draw the plan flat first.** A short script that drew `plan.ts` as rectangles and lines on a canvas was the quickest way to see the whole layout, and to move things about, before anything was built in three dimensions.
- **Block out with boxes that carry their names.** A list of lots, each a plain box with its name on a board that faces the first view, lets the collector judge where things are and how full the tile is. Delete each box as its model is built.
- **Tell the collector where you think it is thin.** With the blockout I named three weak places myself. The answer was to mend them as I saw fit, which saved a round of questions.
- **Build many small scenes, not only the landmarks.** The page asks for 20 things. Japan has 41. The last fifteen are small scenes (a tofu shop, monkeys in a hot pool, tyre marks, festival stalls). They took about a third of the time, and they are what fills the ground between the landmarks without ordinary buildings. Aim for 30 to 40.
- **Give the collector's own interest a place on every tile.** Here that is car culture: when I put the tile to him, the one thing he asked to have added was "something car culture related". Ask early what he wants to see by name, and put it where the first view shows it.
- **Reuse the island's models.** Kyoto Tower and the pagoda came across from `island-prototype` with small changes.
- **Make a few things move.** A Ferris wheel, boats, a dragon and a turntable each cost a mesh or two in `k.group` and a few lines in `k.each`. A boat is a `train` with a `car` of its own shape on a path just under the water.
- **Commit at every stage, with a message that says what now stands.** A long session is summarised part-way through and loses detail. The plan as data, the notes and the commits are what the work was picked up from.

### What cost time, and the way past it

1. **Buildings on the sidewalks.** `street` lays a sidewalk on each side, 3 units wide unless `sidewalk` says otherwise. My blockout put the fronts of buildings at the kerb, 5 units from a street's middle, so they swallowed the sidewalk, the people on it and the lamps. It did not show from far off, and the collector approved the blockout. Putting it right meant moving every lot, shrinking two landmarks and moving a street. The front of a building belongs at half the carriageway plus the sidewalk from the street's middle: 8 units for a street of two lanes. Give `lampsAlong` about 1.3 more than half the carriageway, and scatter people between the kerb and the fronts.
2. **Things inside each other.** A platform inside a station's roof, a bridge on dry land, a viaduct's end over a street, a tree where a bridge lands. Each came from a number typed into a model that did not come from the plan, and each showed only in a close picture from the far side. Take sizes from the plan, and look at every landmark from two opposite sides before going on.
3. **Traffic that looked fine and was not.** See "How many vehicles a road can carry" below.
4. **Pictures that missed.** `x` and `z` in `wimmel.shot` are a point on the ground. Something 20 units up is not in the middle of that picture. From the south-east (`az: 42`), aim at about (x - 0.86 h, z - 0.95 h) for a thing at height h, and half that for the middle of a tower. And `zoom` stops at 34: I passed 2 to 7 believing it was a magnification and got 34 every time. 34 suits a shopfront or a crossing, 60 to 90 a landmark, 120 a quarter.
5. **What hides what.** The view looks down at about 38 degrees, so a thing h units high hides the ground for about 1.3 h behind it. From the first view, the south-east, my car carrier hides its own ramp and the cars waiting to board. Put low things towards the south-east and tall ones towards the north-west, and check each set piece at `az: 42` before settling where it goes.
6. **The dice.** `k.rand` is one run of numbers. Add or remove one call and everything scattered after it moves: trees, people, and which trees are in blossom. Once the collector has seen the tile, scatter anything new from numbers of your own (a few lines in `scenes.ts`, `scatter`, do it here), so that nothing else changes.
7. **A page that is not what the files say.** After an edit the running page can hold a mix of old and new, and the console shows errors that mean nothing. Load the page afresh before trusting a picture or a check. When the browser pane is hidden, going to an address can fail; `location.href = '...'` from the console works.
8. **Long commands.** A long piece of code pasted into a shell command was mangled. Write the code to a file with the editor, and use a short script to put it in place.

### What I would do differently from the start

- Work out the ground inside each block's sidewalks straight after the streets (`BLOCKS` in `plan.ts` here), and place every lot from it. The blockout is then already right.
- Budget the traffic before choosing the counts, and run the check below at the blockout, not at the end.
- Write a short check that no two things in the plan overlap and none stands in a street. I did not, and it would have caught four of my faults.
- Take the pictures from four sides, by day and by night, after each landmark, not in one sweep at the end.
- Keep the list of things and the liberties in `NOTES.md` as I go. Rewriting it at the end from memory is slower.

### The order of work I recommend

1. Read the page, the sample tile, North America's `plan.ts`, the research note and the island's lists.
2. Put the tile to the collector: the things, the ground, the roads, where heroes will be seen, a map in text.
3. `plan.ts`: the water, the streets, the blocks inside the sidewalks, the long roads, the routes. Draw it flat.
4. The ground, the streets, the long roads and the traffic. Run the traffic check. Show a picture.
5. Boxes with names where things will stand, and the few ordinary buildings. Show the collector the first view, the night, and one other side, and say where it is thin.
6. The landmarks, largest first, each looked at from two sides by day and by night before the next.
7. The small scenes, the signs, the people, the lamps and lanterns, what moves.
8. The checks, in this order: `npm run typecheck`, the console (warnings as well as errors), traffic, heroes, rain and snow, cost, `npm run build`.
9. Merge `main` into the branch and run the traffic check and the cost again: both can change with the engine.
10. The notes. Then pictures to the collector, and tune until he says it is final.

### How many vehicles a road can carry

This is the number that mattered most, and nothing told me it existed.

- A vehicle is about 7 units long. It keeps 2.4 + 0.55 × its speed between itself and the one ahead. So at speed v a lane passes v / (9.4 + 0.55 v) vehicles a second.
- A bend is driven at 2.2 × its radius, and never slower than 5.5. A block's corner of radius 3.5 is driven at 7.7, which passes 0.57 vehicles a second.
- Each vehicle drives at between 0.86 and 1.16 of the speed its road allows, and a queue moves at the pace of its slowest. So take 0.86 of a stretch's speed: a stretch given a speed of 8 passes about 0.5 a second.
- What arrives is the count divided by the time one lap takes.
- Keep what arrives under three quarters of what the slowest stretch passes. Above that a queue forms that never clears. It backs up into a faster stretch, vehicles arriving there cannot stop in time, and they drive through each other.

Two cases from this tile. Tokyo's outer loop is 448 units at a speed of 16, so a lap takes about 30 seconds, and it has one corner of radius 3.5. Thirteen vehicles (0.43 a second) are fine. Sixteen (0.53) would be at that corner's limit, so I went back to thirteen without waiting to see them fail. The Wangan is about 530 units and a lap takes about 30 seconds. With slow stretches at speeds of 8 to 10 and 18 vehicles it failed: this one I saw. With those stretches at 11 to 12 and 15 vehicles it holds. My first choice of 16 had passed the check and was at the very edge without my knowing: I learned it only when I added two.

### The checks, as run in the page's console

All at `?tiles=<id>&drift=0`.

**Traffic.** The page says to let time pass in small steps. Use a twentieth of a second: at half a second a quick vehicle moves more than two lengths in a step. And measure two things, not one. How near any two vehicles come is not enough by itself, because the two lanes of one road pass each other at twice the lane's offset (4.6 units on my pass) and that is as it should be. So also measure how near one vehicle comes to the next along its own route.

```js
const v = wimmel.board.tiles[0].vehicles, dt = 0.05;
let nearest = 1e9, stuck = 0;
const still = new Map(), follow = new Map();
for (let step = 0; step < 24000; step++) {            // twenty minutes
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

`nearest` under 3, any `follow` under about 8, or `stuck` over a few seconds is a fault. Here `nearest` was 4.3, the smallest `follow` was 11, and `stuck` was 0. When it fails, the same loop with the place and the speeds of the pair logged shows where: mine was the foot of a ramp that led into a slow stretch.

**Heroes, without looking at one.** Heroes are private, so I checked where they stand and not what they look like. Each place is opened in a frame of its own. Take the ids from the tile's routes and its `heroSpots`: `vehicles.places()` lists them too, but leaves out a place a hero is standing on at that moment.

```js
for (const id of ['garage', 'wangan' /* and the rest */]) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:500px;opacity:0.01;pointer-events:none';
  f.src = `/?tiles=<id>&drift=0&place=${id}`;
  document.body.appendChild(f);
  await new Promise((r) => (f.onload = r));
  let w;
  for (let i = 0; i < 60 && !(w = f.contentWindow.wimmel)?.board?.heroes?.length; i++) await new Promise((r) => setTimeout(r, 250));
  w.advance(6);
  console.log(id, w.board.heroes.length, w.board.heroes[0].pos);
  f.remove();
}
```

Each place should report one hero, standing where the plan says or somewhere along its route. Whether a place can be seen is a matter of what stands in front of it, which a picture without the hero shows.

**Cost.** Measure both tiles in the same minute, at the same size and the same hour. The numbers move with the size of the pane and with the engine: the same tile gave 2.8 ms at one size and 5.2 ms an hour later at another, with a merge of `main` in between. Open each tile alone in a frame as above, with `/?tiles=<id>&drift=0`, then for 14 and for 21 call `w.setHour(hour)`, wait a second and a half, and take `await w.bench()` three times and `w.info()`. `w.info().city` gives the tile's own counts: the triangles that stand still, the signs, the lights, the trees, the people, and the vehicles moving and parked. A tile with water is drawn twice at every hour, for the mirror image, so its calls and triangles are double a dry tile's by day. Compare at night as well, when both are drawn twice.

**Pictures.** For each stage: `wimmel.shot('check-<id>-day', { hour: 14 })`, the same at `hour: 21`, then `az: 132`, `222` and `312` for the other three sides, then `weather: 'rain'` at `hour: 19` and `weather: 'snow'` at `hour: 11`. `az: 42` has the camera in the south-east, 132 in the north-east, 222 in the north-west and 312 in the south-west.

**Flicker.** No picture shows it, so I went by heights. The engine lays a sidewalk at 0.015, a carriageway at 0.03, the patch over a junction at 0.045 and the bars of a crossing at 0.055, and `area` lays at 0.02 unless told otherwise. So a square can lie over a sidewalk as it is, a driveway across a sidewalk goes at 0.025, and paint on a junction at 0.07. For walls: a board or a screen is a dark box 0.1 proud of the wall with the sign 0.03 in front of that.

### What the page for new tiles leaves out or has wrong

- It does not say that `street` lays sidewalks, or that a lot must begin behind them. This cost me more than anything else.
- "Small steps" for the traffic check needs a number, and the check needs the second measure and the rule about how many vehicles a road can carry.
- `zoom` is the height of the picture in units, as it says, but it does not say that it stops at 34, or that `x` and `z` are a point on the ground.
- "Compare `bench()` with North America's on the same machine" needs "at the same size and hour, one straight after the other", and a word that a tile with water is drawn twice.
- It asks that a hero can be seen at each place, and says pictures with heroes go only to the capture's folder, but not how to check a place without looking at a hero. Positions do it.
- The kit's table leaves out `flat` in `ground.ts`, which lays a lawn with holes in it for a moat or a pond (`area` cannot), and `Smoke` in `effects.ts`, which makes steam as well as exhaust.
- It does not give the heights the engine lays its street at, which a tile needs for every driveway, square and painted line.
- It does not say that `k.rand` is one run of numbers.
- After merging `main`, run the checks again. One merge here changed the draw calls and gave the tile a table to stand on.

### Small things in the kit that are easy to get wrong

- `box` builds four walls and a top unless `faces` says otherwise. `obox` always builds four walls and a top, and `faces: 'B'` adds a bottom to them: it does not leave the rest out.
- `cyl` measures its radius to its corners. A four-sided one that is to be w wide needs a radius of w × 0.707 and `phase: Math.PI / 4`. With a number of sides that divides by four and no `phase`, a flat face looks due south and another due east, which is where to hang a sign on a drum.
- A hole in `ground` must not touch the edge of the board: bring water that runs to the edge in by 0.2.
- Water lies 0.9 below the ground. A hull goes down to -1.2 or lower. A `train` adds 0.12 to its path's height.
- A sign shows from one side, and `maxW` makes it lower as well as narrower. Hang two for a board that is read from both sides. A sign with `paint` and `size` draws its own picture, which is how a screen or a road sign is made. Only neon signs can be `vertical`. A building in a style marked `neon` needs something in its `billboard` pool.
- For a mesh of the tile's own: `k.mat.city()` for shapes made with a `GeoBuilder`, so that their windows and lit surfaces glow at night, and `k.mat.prop({ vertexColors: false, color })` for plain three.js shapes. Both take a colour for each copy of a shape drawn many times. Turn `frustumCulled` off on those.
- A hero's place on a turntable is given `turn`, and the engine turns the hero. The tile turns the disc itself, the other way round in three.js's terms: `rotation.y -= turn * dt`.
