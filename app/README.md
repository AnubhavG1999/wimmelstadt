# The app

The real Wimmelstadt: a board of tiles, each a district built by hand, with traffic on its roads and the collector's heroes among it. See [0009](../docs/adr/0009-a-city-of-hand-built-tiles.md) for why the city is made of tiles and why a tile is the size it is, and [0010](../docs/adr/0010-the-tiles-stand-together-on-a-table.md) for how the tiles stand together.

![Four miniature cities standing edge to edge on a green table with a wooden rim, each on a dark base of its own](screenshots/board.jpg)

The pictures of each tile are in the [README at the top](../README.md).

## The board and its tiles

Every tile stands on a base of its own, with its name on a brass plate on each side, and the bases stand edge to edge on one table. The tiles are put on it in rows, in the order they were built, so the first ones keep the back of the table.

| Tile | Things to find | What it is | Its notes |
| --- | --- | --- | --- |
| North America | 20, the L and a helicopter | The look prototype's board, kept as it was and made North American throughout: a ring of raised expressway round Halo Tower, a flyover, a car park with two spirals, and an elevated railway. | [NOTES.md](src/tiles/north-america/NOTES.md) |
| Japan | 41 | Fuji and a pass of hairpins, Kyoto and Tokyo on the two banks of a river with a Shinkansen between them, and the Wangan with Daikoku and Tatsumi. | [NOTES.md](src/tiles/japan/NOTES.md) |
| Hong Kong | 39 | Both sides of Victoria Harbour: the Peak and Central on one shore, Tsim Sha Tsui and Kowloon on the other, with trams, ferries and a jumbo jet. | [NOTES.md](src/tiles/hong-kong/NOTES.md) |
| Europe | 29 | One river under three names, with London, Paris and Italy along it, roundabouts in place of a grid, and traffic that keeps left in London and right elsewhere. Concorde and a balloon fly over it. | [NOTES.md](src/tiles/europe/NOTES.md) |

A tile's notes list what stands on it, the liberties taken with the real place, every real name on a sign and how it was checked, and what its builder learned.

Two things are true of every tile:

- **Scale.** The towers are roughly to one scale across the whole city, about 3.2 metres to a unit: the Sears Tower's roof is 140 units up. Small landmarks are larger than that, so that they can be recognised, and mountains are toys. Every vehicle is far too large for the buildings, as a toy car is beside a toy house.
- **Nothing leaves its tile.** A tile's roads loop back inside its own edge, and no road joins two tiles. A hero is put on a tile at random each time the page loads.

## The room

The table stands in the collector's room, which is the background of everything. Its pictures are in the [README at the top](../README.md#the-room).

- **The desk.** The table, the felt in its wooden tray, rests on a long walnut desk whose top is an old map of the world, in the manner of the seventeenth century's double-hemisphere maps: the New World on the left and the Old World on the right, each in a round picture, the poles in small round pictures in the corners, a compass rose, a title ("Orbis terrarum: the world, with the places of Wimmelstadt"), Latin names for the continents and seas, and washes of colour along the coasts, on yellowed paper with creases.
- **The pins.** Every tile that says where its place is (`place` in its `TileDef`) has a pin in the map there, its name beside it, and a red thread from the pin to a brass tack on the table's wooden edge.
- **The room.** Round the desk are a floor of boards, four walls, shelves of small cars in their boxes along two walls, tall windows whose panes show the colour of the sky at the hour, a door and pictures of cars on the fourth wall, and four brass lamps with green shades on the desk, which light the map at night. On the desk lie a cup beside the ring it left, a stack of boxed cars, a pencil, a magnifying glass and a pair of dividers.
- **Scale.** It is all at the scale of the cars, one centimetre to the unit. A tile is two metres across at that scale, so the desk is long and the room is a hall.
- **The walls.** A wall that would stand between the view and the table is left off, as the front of a doll's house is, and comes back as the view turns.
- **Staying inside.** The view is kept inside the room: it never shows what is beyond the floor and the walls. It draws closer if it has to, and keeps to the places from which only the room is seen, however it is turned and tilted (`src/engine/within.ts`). The walls stand far enough from the desk that the whole board, and a fifth more, is seen inside them on a screen of the shape the page opened on; if the window changes shape so that this no longer holds, the room is built again, larger.
- **Cost.** The room is fetched after the city, as a piece of its own of about 70 kB compressed, so the city does not wait for it. It costs nothing that could be measured in a frame on the desktop, about 14 more draws, and it is left out of the mirror image that wet streets and water show. `?room=0` leaves it out.

It is in `src/engine/room`: `index.ts` builds the room, `map.ts` the map, `look.ts` how both are drawn, and `land.ts` holds the coastlines. These are Natural Earth's 1:50m land, which is in the public domain. `scripts/make-land.mjs` makes `land.ts` from the package `world-atlas`, which is not one of the app's own; the script's header says how to run it.

## Heroes

A hero is made from a capture's generated model, which is far too heavy to drive around: the first one came as 500,000 triangles and 28 MB.

```bash
node scripts/hero.ts countach-lb-works-black rodin-1 --name "Lamborghini Countach LB-WORKS"
```

This cuts the model to 12,000 triangles and a 1,024-pixel picture, about 1.5 MB, and writes it as `hero/hero.glb` in its capture's folder with a small `hero.json` beside it. Captures are private and are not in this repository, so neither are heroes. A hero is drawn in the city's own hand: flat bands of light, the photographed shine ironed out of its colours, and a dark outline. Each has a party trick of its own, in `src/heroes`.

A party trick is told how its hero is doing on every frame: its speed, how much clear road is ahead of it and behind it, how tight the next bend is and which way it goes, how far the road runs straight on before that, how wet the road is, whether it is night, and how far round its road it is. It answers with how fast it wants to go. It can show flame at the exhaust, yellow or blue, as a burst or as a long jet; smoke at the exhaust and from the rear tyres; a smoke screen; mist behind it on a wet road; jets of vapour from its bonnet; sparks from under it; a flash of its lamps; its hazard lamps; the glow of its brake discs; and a glow on the road under it. The tile's own figures can take its picture as it passes, with a flash for each, and a trick is told how many of them stand near. It can leave black marks on the road with its tyres, which fade in under a minute, and draw ribbons through the air from the corners of its tail. It can lift or dip its nose, lean or turn right over, swing its tail out in a slide, weave within its lane and leave the road altogether. Where a hero's exhaust or its lamps are not where most cars have them, its trick says where they are. `src/engine/tricks.ts` has the whole of it. A trick cannot make a hero run into anything: the engine still slows it for bends and for whoever is ahead.

Where the heroes come from depends on where the app runs:

- **On the collector's desk,** the development server hands the page every hero it finds among the captures, and there is no lock.
- **Everywhere else,** the heroes are in the backend, behind a PIN. The options have a row, Heroes, that opens a card for it. A device that has been unlocked keeps the heroes, so from then on the city starts with them even when the backend is asleep or out of reach, and it asks every half hour whether one has been added. Changing the PIN locks every device again. See [0011](../docs/adr/0011-the-heroes-sit-behind-a-pin.md).

A hero goes from the desk to the backend with one command, which sends its model and its record:

```bash
npm run send-hero -- countach-lb-works-black
```

Add `--dry` to see what would be sent. The command reads `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` from `.env.local` at the top of the repository. With them it asks Supabase for the project's secret key each time it runs, and it neither prints nor saves it.

## Music

A sign of kind `screen` shows what is playing on Spotify: the cover, "NOW PLAYING", the title and the artist. Until something plays, when nothing does, and for everyone who has not linked an account, it shows a picture of its own, which the tile paints. A paused track stays for a minute and is then taken off. Every tile has one screen: North America's is an advertisement for its own Rocket Cola, on the gate tower; Japan's a giant cat on its break, over the crossing at Shibuya; Hong Kong's yum cha in neon, on Nathan Road; and Europe's KEEP CALM AND DRIVE ON, at Piccadilly Circus.

The link is made in the browser alone, with the listener's own Spotify account, by the Authorization Code flow with PKCE. There is no secret anywhere, the tokens are kept on the device, and nothing is sent anywhere but to Spotify. It only reads what is playing. When the app has a client id, the options card has a row, Music, that says Connect, and Spotify once the device is linked; selecting it again ends the link on that device.

The app's id at Spotify stands in `src/music/config.ts`, where it is public by design, or a build can be given one as `VITE_SPOTIFY_CLIENT_ID`. Without one the row does not show and nothing is fetched. The id is that of an app made at developer.spotify.com by whoever runs the city. That app must list as redirect addresses the published address and `http://127.0.0.1:<port>/` for the development server, since Spotify does not take `localhost`: the development server listens at 127.0.0.1, and a page opened at `localhost` moves itself there when the link is made. While the app is in development mode, only the accounts its owner names can make the link.

`src/music` holds the link (`spotify.ts`), its id (`config.ts`), what carries a track to the screens (`screens.ts`), and the stand-in that `?music=stand-in` plays on the development server (`stand-in.ts`).

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5187.

| To | Do this |
| --- | --- |
| Move the view | Drag, or use the arrow keys. |
| Turn it | Right-drag (or drag with Shift held) across, drag with two fingers, press Q and E, or Shift with the left and right arrows. |
| Tilt it | Right-drag (or drag with Shift held) up or down, move two fingers side by side up or down together, press Page Up and Page Down or Shift with the up and down arrows, or scroll with Shift held. The view tilts from 14 degrees, low across the table, to 80, almost straight down, and opens at 38. |
| Zoom | Scroll or pinch. |
| Go to a tile, or back to the whole board | Double-click the tile, or the table. Escape also goes back to the board, and to the tilt the view opens with. |
| Set the hour | Drag the sun round the dial. Touch the middle of the dial to follow the clock again. |
| Set the weather | Touch a token. The sky is clear when the page opens. The same token again gives the weather to the city, which then changes it by itself. |
| Ride along with a hero | The key with the car on it, or F. |
| Watch a day go by in 80 seconds | The key with two arrows, or T. |
| Change the depth of field, turn the view by itself, see how it performs, unlock the heroes | The key with three dots. |

The view stays wherever it is left. It may roam over the whole desk, not only the board, but it stays inside the room: it cannot be drawn back, turned or tilted far enough to show what is beyond the walls. The plate at the top left names the tile under it, or the city when the whole board is in view.

The address bar takes options:

| Option | What it does |
| --- | --- |
| `?tiles=japan,hong-kong` | puts only those tiles on the board, in that order. A tile named twice stands there twice, and `sample` is the sample tile, which is hidden otherwise. |
| `?hour=21.5` | sets the hour. |
| `?weather=rain` | sets the weather the page opens with: `clear`, `cloudy`, `rain`, `storm`, `fog` or `snow`, or `auto` for the city's own. Without it the sky is clear. |
| `?drift=0` | stops the view turning by itself. |
| `?x=..&z=..&az=..&zoom=..` | starts with a view of its own. |
| `?elev=24` | starts the view at a tilt, in degrees. |
| `?room=0` | leaves the room out, so that the table stands on a plain backdrop. |
| `?music=stand-in` | plays four invented songs in turn, twenty seconds each, on the screens, for working on them without an account. On the development server only. |
| `?place=<id>` | puts the heroes on one route or one place on show, by its id. |
| `?heroes=collection` | asks for the heroes from the backend, behind the PIN, as a built copy does. `desk` and `none` are the other two. |
| `?heroes=collection&backend=stand-in` | uses a stand-in for the backend, on the development server only, for trying the lock. Its PIN is 1234 and opens nothing else. See `vite.config.ts`. |

## Working on it

| Folder | What it holds |
| --- | --- |
| `src/engine` | Everything a tile is built with and everything that runs it: the builder for shapes, ground, roads, rails, buildings, signs, traffic and heroes, the look, the camera, and the board and its table. It knows no tile. |
| `src/tiles/<id>` | One tile: its plan as data, its landmarks, and its notes. A tile is found by its folder. `sample` uses every piece of the kit once. |
| `src/engine/room` | The collector's room round the table: the desk, the map on it, and the room the desk stands in. |
| `src/music` | The link to Spotify, and what is playing on its way to the screens. |
| `src/heroes` | The party tricks, one for each hero, by the name of its capture. |
| `src/collection` | Where the heroes come from: the desk, or the backend behind its PIN, and the copy a device keeps. |
| `src/ui` | The controls: the dial, the weather tokens, the keys, the plates and the card for the PIN. |
| `src/main.ts` | The page: it puts the tiles on the board, lights them by the hour and the weather, and draws them. |
| `scripts` | `hero.ts` makes a hero from a generated model, `send-hero.ts` sends one to the backend, and `make-land.mjs` makes the map's coastlines. |

Whoever builds a tile starts with [the page for tile builders](../docs/building-a-tile.md).

From the browser's console, `wimmel.shot('name', { hour: 21.5, weather: 'rain', x: 68, z: 74, az: 42, zoom: 92 })` draws one picture of a view and saves it in `screenshots/`. A picture is taken at the tilt the view opens with, 38 degrees, whatever the view is doing: `elev: 20` takes it at another, and `plan: true` from straight above.

The same handle, `wimmel`, has more:

- `wimmel.fights()` lists every pair of flat surfaces that lie in one plane and overlap, which flicker as the view moves, and `wimmel.fights('<id>')` looks at one tile. On the development server only. See [the page for tile builders](../docs/building-a-tile.md).
- `wimmel.room` is the room, once it has arrived.
- `wimmel.music` is the link to Spotify: how it stands, and what is playing.

**Pictures and heroes.** A picture is public unless it shows a hero. So `wimmel.shot` leaves the heroes out. Ask for `heroes: true` and they are in the picture, and it is saved in the first hero's capture instead, under `captures/<capture>/screenshots/`, which is private.

### What it is not yet

- No road joins two tiles, and a hero does not travel from one to the next.
- Vehicles follow fixed loops. They do not choose a way or turn at a junction, and where two loops share a lane they merge. Real driving comes with the road network.
- There is no roster, no card and no bench. The one hero was carried through by hand.
- Nothing has a name on screen but the tile in view and the places on the map.
- The screens show what is playing, and nothing else of the plan for music is built: the night's neon taking its colours from the cover, a marquee with the artist's name, a blimp towing the title, and a widget to steer the music. The link is off until the app at Spotify is made.
- How it runs on the phone has not been measured. On the desktop, four tiles take about 9 ms a frame.
