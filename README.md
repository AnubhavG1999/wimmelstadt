# Wimmelstadt

![Four miniature cities standing edge to edge on a green table with a wooden rim, each on a dark base of its own: skyscrapers round a ring of raised road at the back, a harbour between two shores of towers on the left, a white mountain and a red and white lattice tower on the right, and at the front an iron lattice tower beside a river, with a round arena below it.](app/screenshots/board.jpg)

A living miniature city for a diecast collection.

Every Hot Wheels or Mini GT its collector adds drives around the city as a recognisable character, among plain traffic. The city sits on a screen beside the desk and simply goes about its day. It is made in the spirit of a *Wimmelbilderbuch*, the picture books where every page is crowded with small things going on: there is no score and no goal, only a place that rewards looking.

**Try it:** https://anubhavg1999.github.io/wimmelstadt/ is the app as it stands on `main`. The published city has traffic alone until it is unlocked. Its heroes are made from the collector's own pictures, so they sit behind a PIN, and whoever the collector gives the PIN to can see them. The look prototype it grew out of is at https://anubhavg1999.github.io/wimmelstadt/look/.

Drag to move, right-drag across to turn and up or down to tilt, and scroll to zoom. Double-click a tile to go to it, and the table to see the whole board again. Drag the sun round the dial at the bottom right from day to night, and pick the weather from the tokens round it.

## The intent

A diecast collection mostly sits in boxes or on a shelf. Wimmelstadt gives each one a life.

- **A diecast becomes a hero.** The collector photographs the toy from six angles, or for a Mini GT simply picks its page on Mini GT's site, whose three product pictures are enough. A cloud service turns the pictures into a 3D model, which is finished at a bench: wheels that spin, lights, its true size, its decals restored, and the photographic shine flattened into the city's slightly cartoony look. Once approved, it arrives in the city on a car transporter.
- **A hero is found by its detail alone.** Nothing glows and nothing is marked. Traffic is plain, so the one car with a number on its door is somebody.
- **Heroes have lives.** They keep a routine tied to the real clock, gather at a meet in the evening, and now and then one does doughnuts under a bridge.
- **The city is made of tiles, and it is permanent.** Each tile is one district, built by hand around a real or an imagined place: Hong Kong, Delhi, Merseyside, the Alps, Route 66's desert, Westeros behind its Wall. Every tile is packed with things to recognise, and no tile is another one in different clothes. Nothing already built ever moves, because the fun is in coming back to a place you know. The city grows a tile at a time. What grows with the collection is the number of heroes.
- **It is a thing to leave on.** It runs as a web app on a phone on a stand and in a desktop browser. By day it is a bright, warm miniature. At night it turns to neon, haze and wet streets. The weather is the city's own: rain, storms, fog and snow come and go.

It is deliberately not a collection manager: no prices, no wish lists, no checklists of what is missing.

## Where it stands

| Part | State |
| --- | --- |
| The design | Agreed. See the [brief](docs/brief.md), the [glossary](CONTEXT.md) and the [decision records](docs/adr). |
| A prototype of the look | Built. It was meant as a throwaway: one small hand-built scene. Its board turned out to be the right size and shape for a tile, and became the first one. See [prototype/look](prototype/look). |
| A trial of the generators | Done. Rodin 2.5 made a good hero from Mini GT's own three pictures, at $0.40 a car. See [prototype/hero](prototype/hero). |
| Research | Done for all 23 districts, with sources. See [docs/districts/research](docs/districts/research). |
| A first attempt at the city | Built and set aside: one continuous island of 23 districts. Beside the prototype its density and its layout did not hold up. Its plans and landmark models are kept in [prototype/island](prototype/island), whose README says why. |
| A first try at tiles | Built and set aside: two larger tiles, blocked out side by side. Beside the prototype they were too thinly filled. See [prototype/two-tiles](prototype/two-tiles). |
| The city | Four tiles are built and stand together on a board: North America, Japan, Hong Kong and Europe. More are to come. See [app](app), [0009](docs/adr/0009-a-city-of-hand-built-tiles.md) and [0010](docs/adr/0010-the-tiles-stand-together-on-a-table.md). |
| Heroes | One, the black Countach from the generator trial, carried through by hand. It drives in the published city for whoever has the collector's PIN. See [0011](docs/adr/0011-the-heroes-sit-behind-a-pin.md). The pipeline that makes a hero from the phone is not built. |
| Music | Begun. A big screen on every tile shows what is playing on Spotify, through a link made with the listener's own account, and a picture of its own when nothing is. A device is linked from the Music row of the options. Steering the music is not built. |

The order of building is: this prototype, then the city, then the pipeline that turns photos into heroes, then life in the city, then music, then extras.

## The city

The city is made of tiles. A tile is one district on a board of its own, built by hand, lot by lot, until nothing in it is filler. It is the size of the look prototype's board, because that board turned out to be the right size: small enough that its landmarks stand shoulder to shoulder, with roads squeezed between them and streets passing underneath. Each tile stands on its own base, like a model on a table, with its name on a brass plate. The tiles stand together on one table, edge to edge, and that table is the board.

Four tiles are built, each to the same [page for tile builders](docs/building-a-tile.md). Each keeps notes in its own folder: what stands on it, the liberties taken with the real place, and every real name on a sign.

### North America

The first tile is the prototype's board itself. The Sears Tower, the Twin Towers, the Empire State Building, the Statue of Liberty, the Gateway Arch and the Golden Gate Bridge were on it already, with the city's invented things: Halo Tower in the park, the Gate Tower the expressway runs through, the showroom and the car park with its spirals. Its European and Asian landmarks gave way to the Chrysler Building, the Space Needle, Coit Tower, the Painted Ladies, the Transamerica Pyramid, the Flatiron Building, Marina City, a diner, an arch for Route 66 and Wrigley Field. An elevated railway, the L, runs round its east side and out to two more stations, and a helicopter keeps taking off from a rooftop.

| | |
| --- | --- |
| ![A city of skyscrapers round a ring of raised road and a tall slim tower, with a green ballpark in front, a harbour city's towers at the lower left and a white mountain at the right](app/screenshots/north-america.jpg) | ![The same view at night: windows lit, a ring of pink light round the slim tower, the ballpark under floodlights, and beams of light crossing the sky from the harbour city](app/screenshots/north-america-night.jpg) |
| North America, with Hong Kong in front of it and Japan beside it. | Half past nine in the evening. |
| ![A ballpark with full stands and a red sign that reads Wrigley Field, an elevated railway on stilts behind it, and round the bottom the corners of three other tiles: a rocky hill, a golden temple on a pond and a rounded glass tower](app/screenshots/ballpark.jpg) | ![A black tower of bundled tubes in front, a stone tower that steps back to a mast, a steel arch, a red suspension bridge and a car park with two spiral ramps](app/screenshots/west.jpg) |
| Wrigley Field, the L, the diner and Marina City, where the four tiles meet: Hong Kong's Lion Rock, Japan's Kinkaku-ji and Europe's Gherkin. | From the north-west: the Sears Tower, the Empire State Building, the Gateway Arch, the Golden Gate Bridge and the car park. |

See its [notes](app/src/tiles/north-america/NOTES.md).

### Japan

Mount Fuji fills one corner, with a pass of five hairpins climbing it. Below it Kyoto stands on one bank of a river and Tokyo on the other, with a Shinkansen between them. Kyoto has its five-storey pagoda, Fushimi Inari's tunnel of gates, Kyoto Tower, a castle in its moat, Kinkaku-ji on its pond, and a great torii standing in the water. Tokyo has Tokyo Tower, Tokyo Station, Shibuya's scramble under a tower of screens, Sensō-ji, and Ueno Park under cherry blossom. For a collector of diecasts there is the Wangan with its Bay Bridge, Daikoku and Tatsumi parking areas, a tuner's garage, and a tofu shop at the foot of the pass. A dragon flies over all of it. It has 41 things to find.

| | |
| --- | --- |
| ![A tile with a white mountain and a winding road at the back, a red and white lattice tower, a railway viaduct, pagodas, a red gate standing in blue water and a white cable-stayed bridge over a bay](app/screenshots/japan.jpg) | ![The same tile at night: neon in pink and green, the lattice tower lit orange, lamps along the winding road and the bridge](app/screenshots/japan-night.jpg) |
| Japan. | At night. |
| ![A white mountain with a road of hairpins and cars on it, two pagodas, a white tower with a red ring, a green dragon in the air and a railway viaduct](app/screenshots/japan-pass.jpg) | ![At night: the legs of an orange lattice tower, buildings hung with neon signs in Japanese, a brick station with a bullet train at its platform, and a Ferris wheel](app/screenshots/japan-tokyo-night.jpg) |
| Fuji and its pass, the pagoda, Kyoto Tower, the dragon and the Shinkansen. | Tokyo at night: Tokyo Tower, Shibuya, the station and the Ferris wheel. |

See its [notes](app/src/tiles/japan/NOTES.md).

### Hong Kong

Both sides of Victoria Harbour, as seen from Kowloon. On the Island stand the Peak, with its tram and a road of hairpins, and Central's towers from Two IFC to the Bank of China. Trams run along the shore to Happy Valley's racecourse, where the horses run. The Star Ferry crosses to Tsim Sha Tsui: the Clock Tower, the Peninsula, and Nathan Road under its neon. Behind them are ICC, Lion Rock, Mong Kok's street of signs and Choi Hung's rainbow flats, and a jumbo jet goes round on the old approach to Kai Tak. It has 39 things to find.

| | |
| --- | --- |
| ![A tile with a harbour down its middle: on the left a green hill with a winding road and a cluster of glass towers, on the right a very tall blue tower among flats, with boats on the water between](app/screenshots/hong-kong.jpg) | ![The same tile at night: lit towers, neon signs over the streets, beams of light from the rooftops and the harbour dark blue](app/screenshots/hong-kong-night.jpg) |
| Hong Kong. | At night, with a Symphony of Lights. |
| ![A green hill with a road winding up it past small houses, glass towers with white braces, a white aeroplane in the air, a Ferris wheel and ferry piers on blue water](app/screenshots/hong-kong-central.jpg) | ![At night: a street of buildings outlined in neon, a brick clock tower by the water, a stadium shaped like an upturned pyramid and a block of flats in the colours of the rainbow](app/screenshots/hong-kong-kowloon-night.jpg) |
| The Peak, Central and the harbour. | Kowloon at night. |

See its [notes](app/src/tiles/hong-kong/NOTES.md).

### Europe

One river runs through it under three names. London stands on its first bend: the Houses of Parliament and Big Ben, Tower Bridge, the Tower, the London Eye, St Paul's, Buckingham Palace with its guard marching, Piccadilly Circus, the Gherkin, and Ace Cafe with a line of cars outside. Paris is on the second: the Eiffel Tower in open ironwork, the Arc de Triomphe in its star, the Louvre and its pyramid, Notre-Dame on its island, Sacré-Cœur on Montmartre and the Moulin Rouge. Beyond them is Italy: the Leaning Tower of Pisa, the Colosseum, Florence's cathedral, the Ponte Vecchio, a canal of Venice, and for a collector of diecasts Lingotto with the test track on its roof and the gates of Maranello and Sant'Agata. London keeps left, and Paris and Italy keep right. Concorde flies a round over all of it, and a balloon drifts over the left bank. It has 29 things to find.

| | |
| --- | --- |
| ![A tile with a river winding through it: an iron lattice tower and a round arena in front, a clock tower, a big wheel and a rounded glass tower behind, and a long white building with a track on its roof at the left](app/screenshots/europe.jpg) | ![The same tile at night: the lattice tower lit gold, the arena's arches glowing, the big wheel and the clock tower lit, and a bay bridge on the next tile behind](app/screenshots/europe-night.jpg) |
| Europe. | At night. |
| ![A clock tower beside a long Gothic building on a river, a big wheel, a domed cathedral, a castle with four turrets, a bridge with two towers, a rounded glass tower, a curved front of bright screens and a blue and gold balloon](app/screenshots/europe-london.jpg) | ![An iron lattice tower over a lawn, a round arena, a leaning white tower beside a cathedral, a triumphal arch, a cathedral on an island in the river and a red-domed cathedral](app/screenshots/europe-paris.jpg) |
| London: Parliament and Big Ben, the Eye, St Paul's, the Tower, Tower Bridge, the Gherkin, Piccadilly Circus and Ace Cafe. | Paris and Italy: the Eiffel Tower, the Colosseum, Pisa, the Arc de Triomphe, Notre-Dame and Florence's cathedral. |

![A long white factory with a banked test track on its roof and cars on it, a piazza with a fountain, the leaning tower beside its cathedral and baptistery, the round arena and the feet of the lattice tower](app/screenshots/europe-italy.jpg)

Lingotto, with the test track on its roof, above Pisa and the Colosseum.

See its [notes](app/src/tiles/europe/NOTES.md).

### The board

| | |
| --- | --- |
| ![The whole board at night, four lit tiles on a dark table, with beams of light rising from one of them](app/screenshots/board-night.jpg) | ![The whole board under snow, with flakes falling and every roof white](app/screenshots/board-snow.jpg) |
| The board at night. | Snow. |

The tiles stand on the board in the order they were built: North America at the back, Japan and Hong Kong at its sides, and Europe at the front. [0010](docs/adr/0010-the-tiles-stand-together-on-a-table.md) says why the tiles are joined like this. How a hero will get from one tile to the next is not decided yet: for now each hero is put on a tile at random whenever the page loads.

Two other forms of the city were built first and set aside. One was a continuous island with a coast, rivers and mountains. It was too large to build by hand, so the ground between its landmarks was filled with ordinary buildings made by rule, and it looked empty where the prototype looks full. Its plans and landmark models are kept in [prototype/island](prototype/island). The other was a pair of larger tiles joined by an avenue, which thinned out in the same way. It is kept in [prototype/two-tiles](prototype/two-tiles). [0009](docs/adr/0009-a-city-of-hand-built-tiles.md) records both.

### The room

The table stands in the collector's room, which is the background of everything. It rests on a long walnut desk whose top is an old map of the world, drawn as the double-hemisphere maps of the seventeenth century were: the New World in a round picture on the left and the Old World in one on the right, the two poles in the corners, a compass rose, Latin names for the continents and seas, and washes of colour along the coasts, on yellowed paper with creases. Each tile has a pin in the map at its place, with its name beside it and a red thread from the pin to a brass tack on the table's edge. Round the desk are a floor of boards, shelves of small cars in their boxes, tall windows that show the colour of the sky at the hour, and four brass lamps with green shades that light the map at night.

It is all at the scale of the cars, so the desk is long and the room is a hall. A wall that would stand between the view and the table is left off, as the front of a doll's house is, and comes back as the view turns. The view is kept inside the room: however it is turned, tilted or drawn back, it shows nothing beyond the floor and the walls. The coastlines are Natural Earth's 1:50m land, which is in the public domain.

| | |
| --- | --- |
| ![The board of four miniature cities seen from low across a long walnut desk, whose top is an old map of the world with red threads running over it; behind it a wall of shelves full of boxed toy cars, and brass lamps with green shades on the desk](app/screenshots/room.jpg) | ![The same view at night: the lamps light the map, the city glows in the middle of the desk, and the shelves behind are in shadow](app/screenshots/room-night.jpg) |
| The room by day. | At night, under the lamps. |

![Close on an old map on yellowed paper: Africa, Europe and Asia in washes of colour, pins at Europe, Hong Kong and Japan with their names beside them, and red threads running off towards the table](app/screenshots/map.jpg)

The Old World on the map, with the pins of Europe, Hong Kong and Japan.

## The look prototype

These pictures come from the look prototype: the same board before it became North America, which is why Big Ben and the Taj Mahal are in them. The heroes in them are stand-ins drawn by hand.

| | |
| --- | --- |
| ![The city at night, with lit windows and neon](prototype/look/screenshots/night.jpg) | ![The city at dusk under a pink sky](prototype/look/screenshots/dusk.jpg) |
| Half past nine in the evening. | Dusk, from the south-west. |
| ![A white racing car with stripes and the number 27 on an elevated road, above a street that runs under it](prototype/look/screenshots/hero-day.jpg) | ![A teal coupe on a slim viaduct at night, with a striped racing car on a road above it](prototype/look/screenshots/hero-night.jpg) |
| A hero among plain traffic. | A hero on the flyover at night, and another on the expressway above. |
| ![Tall towers, a steel arch across a boulevard and a red suspension bridge behind it](prototype/look/screenshots/america.jpg) | ![Big Ben, the Eiffel Tower and the Leaning Tower of Pisa among houses with pitched roofs](prototype/look/screenshots/europe.jpg) |
| America: the Sears Tower, the Twin Towers, the Empire State Building, the Gateway Arch, the Golden Gate and the Statue of Liberty. | Europe: Big Ben, the Eiffel Tower and the Leaning Tower of Pisa. |
| ![A white and red tower, a pagoda, a red gate over a street and the Taj Mahal, lit at night](prototype/look/screenshots/asia-night.jpg) | ![A boulevard seen along its length, with two ramps coming down from a viaduct](prototype/look/screenshots/flyover.jpg) |
| Asia at night: Kyoto Tower, a pagoda behind its torii, and the Taj Mahal. | The flyover comes down between Asia and Europe. |
| ![The city under a grey sky, with rain falling and wet streets](prototype/look/screenshots/rain.jpg) | ![Snow lying on roofs, a pagoda and the Taj Mahal, with flakes falling](prototype/look/screenshots/snow.jpg) |
| Rain. | Snow. |
| ![The city in fog, its far side fading away](prototype/look/screenshots/fog.jpg) | ![A car park with two spiral ramps at night](prototype/look/screenshots/car-park-night.jpg) |
| Fog. | The car park and its spiral ramps. |

Famous landmarks stand in the city as toy versions of themselves, each on the tile of its own place. Most brands on the signs are invented. A few are real names from car culture, set in plain lettering.

## What is in this repository

| Path | What it is |
| --- | --- |
| [docs/brief.md](docs/brief.md) | The agreed design, in full. Start here. |
| [CONTEXT.md](CONTEXT.md) | The glossary: what a diecast, a hero, a casting, a tile, the board and the rest mean here. |
| [docs/adr](docs/adr) | Eleven short records of decisions that would be hard to undo, each with its reason. |
| [docs/building-a-tile.md](docs/building-a-tile.md) | The page for whoever builds a tile: what a tile is, the kit, the checks, and what the earlier tiles taught their builders. |
| [docs/districts/research](docs/districts/research) | The research notes behind each of the 23 districts: what stands where, what it looks like, and what was and was not checked. |
| [app](app) | The real app, built with three.js: an engine, and a folder for each tile. So far four tiles. |
| [app/src/engine/room](app/src/engine/room) | The collector's room round the table: the desk, the map on it with a pin for each tile, and the room the desk stands in. |
| [app/src/music](app/src/music) | The link to Spotify, which puts what is playing on the big screens of the city. |
| [supabase](supabase) | The backend's database, as the changes that made it: the heroes, the store for their models, and who may see them. |
| [prototype/look](prototype/look) | The look prototype. Its README says what to judge and what is faked. |
| [prototype/two-tiles](prototype/two-tiles) | The first try at tiles, set aside. Its README says why, and what is worth taking from it. |
| [prototype/island](prototype/island) | What is kept of the island, the city's first form: its plans for 23 districts and its landmark models, for tile builders to read and copy from. Nothing in it is built. |
| [prototype/hero](prototype/hero) | The generator trial: prepares a diecast's pictures, runs them through image-to-3D services and shows the models side by side. The pictures and models themselves stay private. |

## Run it

```bash
cd app
npm install
npm run dev
```

Then open http://localhost:5187. The look prototype runs the same way from `prototype/look`, on port 5183.

## A note on names

This is a personal hobby project. Hot Wheels, Mini GT, Tarmac Works, TINY, Goodyear, Tomica, Advan, Michelin and Pirelli are trademarks of their owners. Their names appear here and on a few signs in the city as a nod from a fan, in plain lettering and without their logos. This project is not affiliated with or endorsed by any of them.

The same goes for the places. Real buildings, clubs, circuits and businesses are named as a visitor would name them, without logos or crests, and each is drawn as a toy in the project's own hand. Westeros is the world of George R. R. Martin's *A Song of Ice and Fire*. It appears here as a fan's homage after the books' descriptions, not for sale, and with no connection to the author, his publishers or the makers of the television series.
