# Wimmelstadt: the brief

What the collector and Claude agreed in the design interview of 17 and 18 November 2026 (questions Q1 to Q42), with the changes the collector made on seeing the look prototype:

- Real landmarks are welcome, each in a district of its theme.
- Clean edges matter more than a high frame rate, and the focus blur is gentle.
- The city is built up to its edges at every stage, with no empty ground waiting to be filled. See [0006](adr/0006-the-whole-city-from-the-first-day.md), as [0009](adr/0009-a-city-of-hand-built-tiles.md) qualifies it.
- The weather has several kinds, and real brands stand among the invented ones.
- The project goes ahead whatever the generators turn out to deliver.
- Heroes share the city's slightly cartoony look, and are flattened into it at the bench.
- After the first generator trial: a Mini GT can be made from Mini GT's own pictures, and Rodin 2.5 makes the models. See [0007](adr/0007-a-mini-gt-can-be-made-from-mini-gts-own-pictures.md).
- A first attempt at the city, one continuous island, was built and set aside: beside the prototype its density and its layout did not hold up. The world is made of hand-built tiles instead, one district to a tile, each the size of the prototype's board and on a base of its own. See [0009](adr/0009-a-city-of-hand-built-tiles.md).
- The city is built first. The Countach from the first trial is its first hero, and more follow as they are made.
- The tiles stand together on one table, each on its own base, in the order they were built: the board. See [0010](adr/0010-the-tiles-stand-together-on-a-table.md).
- The heroes sit behind a PIN, which the collector gives to whoever may see them. See [0011](adr/0011-the-heroes-sit-behind-a-pin.md).
- Heights are roughly to one scale across the city, and looking good comes before it.
- The view is free and stays where it is left, and nothing on the screen explains the controls.

It is the starting point for building. Terms are used as [CONTEXT.md](../CONTEXT.md) defines them, and decisions that have a record in [docs/adr](adr/) are linked rather than repeated. Where this brief and a later decision record disagree, the record wins.

## What it is

- A living miniature city to watch, in the spirit of a Wimmelbilderbuch. There is no score and no goal.
- Every diecast the collector adds drives in it as a hero among plain traffic, at roughly one hero to ten traffic vehicles. A typical view holds one or two heroes among about twenty traffic vehicles.
- A hero is found by its detail alone. Nothing glows, and nothing is marked.
- There is one collector. Every record still carries its owner, so that others could be let in later.
- Others can watch. Whoever the collector gives the PIN to is a viewer: they see the heroes, and can change nothing.
- It is not a collection manager.

## Where it runs

- A web app, first of all on the collector's iPhone Duo, which stands in landscape beside the desktop as an always-on display. It is added to the Home Screen, runs full screen and keeps the screen awake. The Duo sets the performance budget.
- The same app runs in a desktop browser on Windows.
- It stays wrappable as an iPhone app. See [0001](adr/0001-web-app-first-wrappable-as-iphone-app.md).
- Screens do not have to show the same moment, and nothing is simulated while the app is closed.

## The look

- Real 3D, low-poly and lightly cel-shaded: flat bands of colour and soft outlines, on the city and the heroes alike.
- The look is slightly cartoony, and a hero belongs in it. It is recognisable by its shape, colours and decals, but drawn in the city's hand, never as a photograph: it must not look like a sticker driving around.
- An isometric camera that opens at a tilt of 38 degrees and can be tilted from 14, low across the table, to 80, almost straight down, with a gentle tilt-shift blur that makes the city read as a miniature. The blur fades as the collector zooms in, so that a close look is always sharp.
- By day, a bright, warm miniature.
- By night, neon in the vein of Blade Runner 2049, Cyberpunk 2077 and Tokyo Drift: haze, wet-look streets, signs reflected softly in vehicle paint, a little spray behind the wheels. Some traffic has underglow. Heroes never do.
- Time follows the device's clock. A dial lets the collector drag to any hour and pin it. The controls are made to look like things of brass lying on the table: the dial, a token for each kind of weather, and a few keys. They are out of sight until the screen is touched.
- Weather is the city's own and never follows the real forecast. Clear skies, cloud, rain, storms, fog and snow come and go in spells, and each changes the light: lamps and windows come on under a dark sky, streets turn wet, snow settles on roofs and lawns. The page opens under a clear sky, and the city's own weather begins when the collector gives it over, by touching the token that is lit.
- The bar for reflections and effects is that they feel right, not that they are physically accurate.
- Straight edges should be clean. Where the device has power to spare, the picture is drawn larger than the screen and scaled down, and frames are capped at about 60 a second rather than drawn as fast as possible.

## The world

- One city, made of tiles. It is permanent: nothing already built ever changes. See [0002](adr/0002-the-world-only-grows.md) and [0009](adr/0009-a-city-of-hand-built-tiles.md).
- The city is whole at every stage: every tile is built up to its edges, with no empty ground waiting to be filled. It grows by whole tiles, when a new place or idea is added, and each arrives complete. Growth is not a reward for collecting: what grows with the collection is the number of heroes. See [0006](adr/0006-the-whole-city-from-the-first-day.md), as 0009 qualifies it.
- Twenty-two districts, each built by hand around one real or imagined place, on a tile of its own or, when it is small, on one it shares. A tile's ground and its street pattern are its own, and no tile is another in different clothes.
- The districts: North America (New York, Chicago, St. Louis, San Francisco and Seattle), which also holds the city's invented things, the Southwest, Los Angeles and the Boardwalk; Mexico, Rio and Havana; Merseyside and Scotland; Europe (London, Paris and Italy), Germany, the Alps and Monaco; Westeros; Japan, China, Hong Kong and Singapore; Delhi; Dubai and Egypt; Australia; and Iceland. Their tiles stand on the board in the order they are built.
- A tile is the size of the prototype's board, 208 units by 226, and stands on a base of its own, like a model on a table. Inside its edge its ground is whatever its place needs: a harbour, a hill, a canyon, a wall of ice.
- Every tile holds at least the prototype's density of recognisable things: landmarks, named businesses and set-piece scenes. The prototype had 17, North America has 20, Japan 41, Hong Kong 39 and Europe 29. Ordinary buildings are only what stands between them. A place that cannot fill a tile shares one with a neighbour.
- Inside a tile the roads can be as elaborate as the place deserves, and each district keeps a road worth driving, from the Stelvio Pass to Route 66. The tiles stand edge to edge on one table, and no road joins two of them: see [0010](adr/0010-the-tiles-stand-together-on-a-table.md). How a hero gets from one tile to the next is not decided.
- The table stands in the collector's room, which is the background of the city. It rests on a long desk whose top is an old map of the world, with a pin at each tile's place and a thread from the pin to the tile, and round the desk are shelves of boxed cars, tall windows and brass lamps.
- Agreed for the board, and not built yet: an opening sweep in which the tiles rise into place, weather of its own for each tile, things that cross the board such as a blimp and birds, a car transporter on a road printed on the table, and sound for each tile.
- The founding: the collector founds and names the city. Every tile is made by hand; nothing is rolled or laid out by a generator. Where the tiles stand can change while the city is being built, and when that stops is not decided.
- Dense, in the manner of Manhattan or a packed Cities: Skylines build.
- Heightened architecture keeps vehicles in view: elevated expressways that pass between and around towers, flyovers with ramps up and down, roads through buildings, streets that cut through a block under a viaduct, spiral ramps, rooftop car parks and cutaways. It stays tasteful and uncluttered. There is no toy track and there are no loops: vehicles stay on roads and obey gravity.
- The visibility rule: a hero spends most of its time where the camera can see it. In an isometric view a street disappears once the buildings in front of it are taller than the street is wide, which is what the elevated roads, the cutaways and the turntable camera are for.
- Everything is toy size. Towers are roughly to one scale with each other across the whole city, about 3.2 metres to a unit, small landmarks are larger than that so that they can be recognised, and mountains are toys. Where scale and a good look pull apart, the look wins.
- Brands are a mixture of invented and real. Most signs carry parody names, in the language of the district's theme. A few carry real names from car culture. The prototype sets those in plain lettering; whether real logos are ever drawn is not decided.
- Landmarks stand in the districts whose theme they belong to. Some are invented, and some are toy versions of famous real ones: the Sears Tower, the Twin Towers and the Statue of Liberty in America, Big Ben and the Eiffel Tower in Europe, Kyoto Tower in Japan, the Taj Mahal in Delhi, and the like. Where a landmark can carry a road or stand over one, it does, so that vehicles pass through it.

## Vehicles and life

- Driving is believable, not accurate: lanes, gaps, signals and merging, no crashes, and jams that dissolve by themselves.
- Traffic is plain toy cars without decals.
- Every hero has a routine tied to the real clock, with a morning rush and a night out, and a temperament: show-off, cruiser, sleeper or workhorse. The temperament is guessed from the capture and can be changed on the card.
- A meet gathers parked heroes from 9 to 11 at night.
- One or two antics are under way somewhere at any moment, only where they can be seen and never in the way of traffic: doughnuts under a bridge, a drift down the spiral ramp, a burnout at the lights, a midnight drag race along the harbour.
- A party trick is made by hand for one special diecast.
- A new hero arrives by car transporter. Where it comes in is not decided. Japan has a car carrier at a pier and Hong Kong a car ferry, and either could bring one.
- People are model-railway figures.
- Vignettes are staged all over the city: still, looping or tied to the calendar. Each has a small reaction when tapped. They are delivered in batches, and there should be as many as can be made.

## Camera and touch

- Three modes: explore, drift and follow. The camera turns freely like a turntable, tilts between 14 and 80 degrees, and zooms. It opens at a tilt of 38, and Escape brings it back there.
- The view stays wherever it is left, over one tile or across several. Double-clicking a tile goes to it, and double-clicking the table goes back to the whole board. A plate at the top left names the tile under the view.
- Drift leans gently towards whatever is happening. When the collector leaves the screen alone, drift takes over at a calmer frame rate.
- Taps: a hero opens its card, a vignette sets off its reaction, traffic honks or flashes its headlights, and anything else does nothing.
- The roster takes the camera straight to any hero.

## Making a hero

See [0003](adr/0003-heroes-are-generated-from-photos.md) and [0007](adr/0007-a-mini-gt-can-be-made-from-mini-gts-own-pictures.md).

1. **Capture.** The collector photographs the loose diecast through the phone's camera, with a stencil over the live view for each shot: front, back, left and right square-on, the top, and one front three-quarter. A photo of the card is optional. The app checks each shot (sharp, inside the stencil, plain background) and asks for a retake if needed. The collector lights the diecast in a diorama set with diffused light. The prototype fixes the final list of shots.
   A Mini GT can be captured instead from the three pictures on its page on Mini GT's site: a front three-quarter from the left, a rear three-quarter from the right and the left side. They are cropped to the car, with the captions and badges printed on them removed.
2. **Generation.** A cloud image-to-3D service turns the capture into a model: Rodin 2.5, reached through fal.ai, won the first trial. The capture is kept as the master copy.
3. **Finishing, at the bench.**
   - Wheels are replaced by spinning discs that carry the wheel face cut from the side photo. Letting the generator split the wheels off is the alternative to try.
   - Headlights and tail lights are marked, and the hero's true length is set.
   - Restore from photo paints the photographed surface back onto the model, a whole side at once or with a brush. This is what keeps decals faithful.
   - A smoothing brush takes out dents, and glass can be tinted.
   - Flattening comes last. The light, shine and shadows baked into the texture, by the studio or by the generator, are taken out, and its colours are reduced to flat areas with crisp decal edges, so that the hero takes the city's own light and outlines.
   - The bench proposes the photo alignment and the wheel and light positions, and the collector corrects them. Claude handles the odd case in a working session.
   - There is no free-hand painting, no sculpting and no chat assistant in the bench.
   - The bench is part of the same web app: comfortable with a mouse at the desk, usable on the phone for a quick approval.
4. **Approval and arrival.** Nothing enters the world until the collector approves it.

Rules around this:

- A twin reuses its sibling's model and needs no capture. Only diecasts that are alike in every visible detail are twins: the same casting in another colour or with other decals is captured separately and is a different hero.
- Any hero can be sent back to the bench or regenerated later. Its old self keeps driving until the new one is approved.
- A diecast added by mistake can be deleted outright. That is a correction, not a parting.
- The backend refuses more than fifty generations a day, and the prepaid balance at the generating service is the hard ceiling.

## The collection

- A diecast must have been in the collector's hands. One that was seen but not bought does not get in. Mini GT's pictures would make a hero of a car the collector does not own; whether such cars may get in is not decided.
- A parted diecast keeps its hero, and its card says when it left the shelf.
- Any hero can be rested from the roster and brought back.
- Tags: brand, casting, line, year, series and colour. They are typed by the collector or read off the photo of the card by a vision model, and the collector confirms them.
- Line is one tag in collectors' usage, so a Super Treasure Hunt's line is Super Treasure Hunt and not mainline. The collector can add lines.
- A Hot Wheels diecast can be linked to its casting's page on the Hot Wheels fan wiki. A Mini GT diecast carries its MGT number. See [0005](adr/0005-no-imported-catalogue.md).
- The card shows what is recorded about a diecast. Price is not recorded.

## Music

- The collector listens through Spotify on their phone, with a Premium account. The sound comes from Spotify itself. Wimmelstadt shows what is playing and steers it.
- In the city: a big screen downtown shows the cover and the title, the night's neon takes its colours from the album cover, a marquee carries the artist's name, and a blimp tows the track title.
- A small widget in the corner offers play, pause, skip and the collector's playlists.
- Built so far: the big screens show what is playing, with the cover, the title and the artist, and their own pictures when nothing is: each tile has one screen, and paints for it a picture of its place. The link is made in the browser alone, with the listener's own account, from the Music row of the options, and only reads. The collector tried it against Spotify on 19 November 2026, and the screen showed what was playing. Not built yet: the neon taking its colours from the cover, the marquee, the blimp and the widget.

## Behind it

- Backend: the Supabase project Wimmelstadt, in the organisation Diecast City, on the free plan. See [0004](adr/0004-a-personal-backend-the-city-never-waits-for.md).
- The heroes are seen with a PIN, which is all a viewer needs: see [0011](adr/0011-the-heroes-sit-behind-a-pin.md). The collector's own sign-in, which adding a diecast from the phone will need, is not built. A one-time code sent by email was the plan for it.
- The city runs from files cached on the device. Only adding, finishing and editing need the backend.
- One action exports everything.
- The code lives in a public GitHub repository and the app is served by GitHub Pages. The collection itself sits behind the PIN.
- Keys and tokens live in `.env.local` on the development machine or in the backend's own secrets, never in the repository.
- Technology to start with, to be changed if it does not feel good: TypeScript, Vite, three.js driving the city directly on WebGL 2, and React only for the thin interface around it (card, roster, widget, bench).

## Order of building

0. **Prototype**, to be thrown away. It has three jobs: prove the look by day and by night in one small hand-built scene; last an hour on the Duo's stand; and carry one real diecast through two or three generators, the photo alignment and spinning wheels. The first job is done, and on seeing it the collector decided that the project goes ahead whatever the other two find. They now decide how the city is tuned for the Duo and how a hero is made, not whether the city is built. The generator trial is done too; the Duo hour, the wheels and the photo alignment are not.
1. **The city.** The collector moved this ahead of the pipeline once the trial had shown that heroes can be made. A first attempt, one continuous island, was built and set aside. The city is built tile by tile instead, each to its full detail before the next. North America is first, and it is the prototype's board itself: what on it was North American or invented stays, and the rest is replaced. With the tiles come traffic, the clock, the weather, explore and drift. The black Countach from the first trial is carried through by hand as the first hero, and fourteen more follow from Mini GT's own pictures, each with a party trick of its own. Seven tiles are built and stand together on the board: North America, Japan, Hong Kong, Europe, Delhi, Urbana-Champaign and Westeros. Round the tiles the app has its board, its controls and the heroes behind their PIN, and what is agreed for the board comes next.
2. **The hero pipeline.** Backend, capture, generation, bench, roster and card, and with them the rest of the collection: 30 to 50 diecasts to begin with. For a Mini GT that means picking its page on Mini GT's site. **First light** is the day the Duo shows the city with at least ten heroes in it, and it is the definition of version one.
3. **Life.** Routines, the meet, antics, people, the first vignettes, and follow.
4. **Music.**
5. **Extras.** Further districts, party tricks, city sounds, and the iPhone shell if it is still wanted.

## What the prototype has to answer

Answered:

- **Which generating service makes the best hero.** Rodin 2.5, at $0.40 and under three minutes a car. Of the four tried, it alone kept the lettering clean. See the first trial under the facts below.
- **Whether a maker's own pictures are enough.** Mini GT's three pictures per car made a good hero. See [0007](adr/0007-a-mini-gt-can-be-made-from-mini-gts-own-pictures.md).

- **How well a model survives being cut down.** The Countach went from 500,000 triangles and 28 MB to 12,000 triangles, a 1,024-pixel texture and 1.5 MB, and at the sizes the city shows it still reads as itself. See the first hero under the facts below.

Still open:

- How a generated model is flattened into the city's look, and whether it then still reads as the diecast it stands for. The first hero drove on the island prototype in the trial's city look; the collector has yet to judge it.
- How many heroes of that size the Duo can hold.
- The final list of shots, for diecasts that are photographed.
- Whether wheels are better replaced by discs or split off by the generator.
- How well photos can be lined up with a generated model. This is the hardest engineering in the pipeline.
- Whether the look holds on the Duo for an hour: frame rate, heat, battery, and the screen staying awake.

## Deliberately left out

- Prices, wish lists and checklists of missing releases.
- Sign-up, billing and moderation. Sharing goes no further than the PIN.
- A built-in list of every release.
- Free-hand painting, sculpting and a chat assistant at the bench.
- Crashes, and any marker that points a hero out.
- Growth as a reward: districts that unlock as the collection grows.
- A city laid out by a generator, a layout rolled before the founding, and ordinary buildings made by rule to fill ground.
- One continuous island, with a coast, rivers that cross several districts and seams where one district runs into the next. It was built and set aside: see [0009](adr/0009-a-city-of-hand-built-tiles.md).
- Tiles larger than the prototype's board, and a Downtown tile for the city's invented things. Two tiles of 280 units were blocked out side by side and set aside: see 0009.
- Lock Screen and StandBy widgets, which only an iPhone app could provide.

## Facts found along the way

Checked in November 2026. Check again before relying on them.

- **Generators.** Open image-to-3D models need 24 GB of graphics memory or more, and the development machine has 8 GB. fal.ai hosts the four candidate families under one account: Hunyuan3D 3.1 Pro (a front view is required, up to eight views are accepted, about $0.68 a model with several views and full materials), Tripo H3.1 multiview (two to four views), Meshy 7.1 multi-image (one to four) and Rodin 2.5 (up to five). Known failures: wheels fused to the body, solid glass, decals that drift, and gloss read as dents.
- **The first trial.** On 18 November 2026, Mini GT's three pictures of the black Countach LB-WORKS (MGT01081), each about 650 pixels across once cropped, went to four generators on fal.ai. Rodin 2.5 ($0.40, 160 seconds) kept the shape, the gold wheels and the lettering clean and legible, in a model of 500,000 triangles with a 2,048-pixel texture: 28 MB. Meshy 7.1 ($1.20, 147 seconds, 29,000 triangles) mirrored the lettering. Hunyuan3D 3.1 Pro and Tripo H3.1, sent only the front three-quarter, garbled it on the sides they had not seen. fal.ai can be reached without a key through its connector for Claude Code, which signs in through the browser; the backend will need a key.
- **The first hero.** On 19 November 2026 the Countach's model from the trial was cut down by a script, `app/scripts/hero.ts`, which was written for the island prototype, and put on the island prototype's ring road among traffic. Simplifying in the usual way stopped at 154,000 triangles, because the generator cuts the model's colour picture into thousands of small pieces and a simplifier will not join triangles across their edges. Allowing it to cross them reached 12,000, and 8,000 looked no worse at the city's sizes. Asking the generator for a lighter model in the first place has not been tried.
- **The island prototype.** The first form of the real app. Its plans and the models that tiles reuse are kept in `prototype/island`. It was 1.36 million square units of land, 23 districts and some 280 landmarks, 23 of them in their real shape. The look prototype's board is 47,000 square units and holds about 17 landmarks, one to about 2,800 square units. Delhi on the island had one to about 14,000, and the ground between was filled with ordinary buildings made by rule. Every district was researched before it was planned. The notes, with their sources and with what was and was not checked, are in `docs/districts/research` and carry over to the tiles.
- **The two-tile blockout.** The first try at tiles, kept in `prototype/two-tiles`: North America and Downtown at 280 units a side, 78,000 square units each against the board's 47,000, with an avenue between them. Its stack, four ramps between a boulevard and the freeway above it, is a road pattern for a later tile.
- **The first hero on a tile.** On 19 November 2026 the same Countach took the place of a stand-in hero on North America's expressway. `app/scripts/hero.ts` prepares a hero now.
- **Model size.** Generated models need simplifying and compressing before a phone can hold many of them. Textures of about 1024 pixels are the starting point, and memory in iOS Safari is the risk to watch.
- **iPhone.** By secondary sources, a Home Screen web app can keep the screen awake since iOS 18.4. A web app cannot provide Lock Screen or StandBy widgets. A native app would need a Mac to build and Apple's paid developer programme to stay installed for more than a week.
- **Spotify.** A personal app in development mode needs its owner to have Premium and allows five named listeners. Reading and steering playback, the collector's playlists and search are available. Playing sound inside the page on an iPhone is reported as unreliable, and beat-level analysis is no longer offered to new apps.
- **Catalogue sources.** Neither Mattel nor Mini GT publishes a catalogue. hobbyDB offers one by arrangement for a four-figure setup fee. The Hot Wheels fan wiki answers searches through its public interface at `https://hotwheels.fandom.com/api.php`; its text is under CC BY-SA and its images are not reusable. No comparable wiki was found for Mini GT.
- **Backend limits.** Guides to Supabase's free plan list 1 GB of file storage and a pause after seven days without activity, which has to be lifted by hand.
- **The first hero in the published city.** On 19 November 2026 the Countach's model, 1.5 MB, was sent to the backend, and the app showed it once the collector had entered the PIN. A device keeps what it is given, so the city starts with its heroes when the backend is asleep.
- **Four tiles on the board.** On 19 November 2026, with North America, Japan, Hong Kong and Europe on the board, a frame took about 9 ms on the desktop: 790,000 triangles in some 350 draws, with 305 vehicles moving and 1,600 people standing about. The Duo has not been measured.
- **Seven tiles on the board.** On the same day, with Delhi, Urbana-Champaign and Westeros added, a frame took about 12 ms on the desktop: 1.7 million triangles drawn in some 550 draws, with 433 vehicles and travellers moving and 3,500 people standing about.
- **Heights.** Measured on the same day, the towers of all four tiles were within about a tenth of one scale, 3.2 metres to a unit, without anybody having set out to keep to it: the Sears Tower's roof is 140 units up and 442 m in life, Tokyo Tower 112 and 333 m, ICC 145 and 484 m, the Eiffel Tower 110 and 330 m.
- **The room and the tilt.** On 19 November 2026 the table, which had stood in empty space, was given the collector's room: a long desk whose top is an old map of the world, with a pin and a thread for each tile's place, and round it a floor, walls, shelves of boxed cars, windows and lamps. The map's coastlines are Natural Earth's, which are in the public domain. The room is fetched after the city, about 70 kB compressed, and costs about 14 more draws, which could not be measured in a frame on the desktop. On the same day the view, which had looked down at a fixed 38 degrees, was made to tilt from 14 to 80, and it is kept inside the room, so that nothing beyond the walls is ever seen.
