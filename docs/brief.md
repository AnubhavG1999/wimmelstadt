# Wimmelstadt: the brief

What the collector and Claude agreed in the design interview of 17 and 18 November 2026 (questions Q1 to Q42), with two changes the collector made on seeing the look prototype: real landmarks are welcome, and clean edges matter more than a high frame rate. It is the starting point for building. Terms are used as [CONTEXT.md](../CONTEXT.md) defines them, and decisions that have a record in [docs/adr](adr/) are linked rather than repeated. Where this brief and a later decision record disagree, the record wins.

## What it is

- A living miniature city to watch, in the spirit of a Wimmelbilderbuch. There is no score and no goal.
- Every diecast the collector adds drives in it as a hero among plain traffic, at roughly one hero to ten traffic vehicles. A typical view holds one or two heroes among about twenty traffic vehicles.
- A hero is found by its detail alone. Nothing glows, and nothing is marked.
- There is one collector. Every record still carries its owner, so that others could be let in later.
- It is not a collection manager.

## Where it runs

- A web app, first of all on the collector's iPhone Duo, which stands in landscape beside the desktop as an always-on display. It is added to the Home Screen, runs full screen and keeps the screen awake. The Duo sets the performance budget.
- The same app runs in a desktop browser on Windows.
- It stays wrappable as an iPhone app. See [0001](adr/0001-web-app-first-wrappable-as-iphone-app.md).
- Screens do not have to show the same moment, and nothing is simulated while the app is closed.

## The look

- Real 3D, low-poly and lightly cel-shaded: flat bands of colour and soft outlines, on the city and the heroes alike.
- An isometric camera at a fixed tilt, with a tilt-shift blur that makes the city read as a miniature.
- By day, a bright, warm miniature.
- By night, neon in the vein of Blade Runner 2049, Cyberpunk 2077 and Tokyo Drift: haze, wet-look streets, signs reflected softly in vehicle paint, a little spray behind the wheels. Some traffic has underglow. Heroes never do.
- Time follows the device's clock. A dial lets the collector drag to any hour and pin it.
- Weather is the city's own and never follows the real forecast. Rain comes now and then, mostly at night.
- The bar for reflections and effects is that they feel right, not that they are physically accurate.
- Straight edges should be clean. Where the device has power to spare, the picture is drawn larger than the screen and scaled down, and frames are capped at about 60 a second rather than drawn as fast as possible.

## The world

- One continuous city. It is permanent and only grows. See [0002](adr/0002-the-world-only-grows.md).
- The founding: the collector rolls the first layout as often as they like, then founds and names the city. About four districts exist at the founding.
- Growth: roughly one more district per ten heroes that have arrived. The collector picks each new district from three teasers. Resting or parting never takes a district away.
- Dense from the first day, in the manner of Manhattan or a packed Cities: Skylines build.
- Heightened architecture keeps vehicles in view: elevated expressways that pass between and around towers, a road through a building, spiral ramps, rooftop car parks and cutaways. It stays tasteful. There is no toy track and there are no loops: vehicles stay on roads and obey gravity.
- The visibility rule: a hero spends most of its time where the camera can see it. In an isometric view a street disappears once the buildings in front of it are taller than the street is wide, which is what the elevated roads, the cutaways and the turntable camera are for.
- Everything is toy size.
- Every brand in the city is invented: parody names on signs in a mix of English and Japanese.
- Landmarks are scattered through the districts. Some are invented, and some are toy versions of famous real ones: the Sears Tower, the Twin Towers, the Statue of Liberty, the Gateway Arch, the Taj Mahal and the like. Where a landmark can carry a road or stand over one, it does, so that vehicles pass through it.

## Vehicles and life

- Driving is believable, not accurate: lanes, gaps, signals and merging, no crashes, and jams that dissolve by themselves.
- Traffic is plain toy cars without decals.
- Every hero has a routine tied to the real clock, with a morning rush and a night out, and a temperament: show-off, cruiser, sleeper or workhorse. The temperament is guessed from the capture and can be changed on the card.
- A meet gathers parked heroes from 9 to 11 at night.
- One or two antics are under way somewhere at any moment, only where they can be seen and never in the way of traffic: doughnuts under a bridge, a drift down the spiral ramp, a burnout at the lights, a midnight drag race along the harbour.
- A party trick is made by hand for one special diecast.
- A new hero arrives by car transporter at the harbour.
- People are model-railway figures.
- Vignettes are staged all over the city: still, looping or tied to the calendar. Each has a small reaction when tapped. They are delivered in batches, one with each district, and there should be as many as can be made.

## Camera and touch

- Three modes: explore, drift and follow. The camera turns freely like a turntable at its fixed tilt, and zooms.
- Drift leans gently towards whatever is happening. When the collector leaves the screen alone, drift takes over at a calmer frame rate.
- Taps: a hero opens its card, a vignette sets off its reaction, traffic honks or flashes its headlights, and anything else does nothing.
- The roster takes the camera straight to any hero.

## Making a hero

See [0003](adr/0003-heroes-are-generated-from-photos.md).

1. **Capture.** The collector photographs the loose diecast through the phone's camera, with a stencil over the live view for each shot: front, back, left and right square-on, the top, and one front three-quarter. A photo of the card is optional. The app checks each shot (sharp, inside the stencil, plain background) and asks for a retake if needed. The collector lights the diecast in a diorama set with diffused light. The prototype fixes the final list of shots.
2. **Generation.** A cloud image-to-3D service turns the capture into a model. The capture is kept as the master copy.
3. **Finishing, at the bench.**
   - Wheels are replaced by spinning discs that carry the wheel face cut from the side photo. Letting the generator split the wheels off is the alternative to try.
   - Headlights and tail lights are marked, and the hero's true length is set.
   - Restore from photo paints the photographed surface back onto the model, a whole side at once or with a brush. This is what keeps decals faithful.
   - A smoothing brush takes out dents, and glass can be tinted.
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

- A diecast must have been in the collector's hands, because a hero needs a capture. One that was seen but not bought does not get in.
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

## Behind it

- Backend: the Supabase project Wimmelstadt, in the organisation Diecast City, on the free plan. See [0004](adr/0004-a-personal-backend-the-city-never-waits-for.md).
- Sign-in is a one-time code sent by email, and the collector's is the only account.
- The city runs from files cached on the device. Only adding, finishing and editing need the backend.
- One action exports everything.
- The code lives in a public GitHub repository and the app is served by GitHub Pages. The collection itself sits behind the sign-in.
- Keys and tokens live in `.env.local` on the development machine or in the backend's own secrets, never in the repository.
- Technology to start with, to be changed if it does not feel good: TypeScript, Vite, three.js driving the city directly on WebGL 2, and React only for the thin interface around it (card, roster, widget, bench).

## Order of building

0. **Prototype**, to be thrown away. It has three jobs: prove the look by day and by night in one small hand-built scene; last an hour on the Duo's stand; and carry one real diecast through two or three generators, the photo alignment and spinning wheels. It ends with a go or no-go from the collector.
1. **The hero pipeline.** Backend, capture, generation, bench, roster and card. The collector captures the backlog of 30 to 50 diecasts meanwhile.
2. **The city.** The founding, a dense downtown with elevated roads, traffic, the clock, explore and drift. **First light** is the day the Duo shows that city with at least ten heroes in it, and it is the definition of version one.
3. **Life.** Routines, the meet, antics, people, the first vignettes, and follow.
4. **Music.**
5. **Growth and extras.** More districts, the teaser choice, party tricks, city sounds, and the iPhone shell if it is still wanted.

## What the prototype has to answer

- Which generating service makes the best hero, and what each one costs.
- The final list of shots in a capture.
- Whether wheels are better replaced by discs or split off by the generator.
- How well photos can be lined up with a generated model. This is the hardest engineering in the pipeline.
- Whether the look holds on the Duo for an hour: frame rate, heat, battery, and the screen staying awake.

## Deliberately left out

- Prices, wish lists and checklists of missing releases.
- Sign-up, sharing, billing and moderation.
- A built-in list of every release.
- Free-hand painting, sculpting and a chat assistant at the bench.
- Crashes, and any marker that points a hero out.
- Real brands on the city's signs and buildings.
- Lock Screen and StandBy widgets, which only an iPhone app could provide.

## Facts found along the way

Checked in November 2026. Check again before relying on them.

- **Generators.** Open image-to-3D models need 24 GB of graphics memory or more, and the development machine has 8 GB. fal.ai hosts the four candidate families under one account: Hunyuan3D 3.1 Pro (a front view is required, up to eight views are accepted, about $0.68 a model with several views and full materials), Tripo H3.1 multiview (two to four views), Meshy 7.1 multi-image (one to four) and Rodin 2.5 (up to five). Known failures: wheels fused to the body, solid glass, decals that drift, and gloss read as dents.
- **Model size.** Generated models need simplifying and compressing before a phone can hold many of them. Textures of about 1024 pixels are the starting point, and memory in iOS Safari is the risk to watch.
- **iPhone.** By secondary sources, a Home Screen web app can keep the screen awake since iOS 18.4. A web app cannot provide Lock Screen or StandBy widgets. A native app would need a Mac to build and Apple's paid developer programme to stay installed for more than a week.
- **Spotify.** A personal app in development mode needs its owner to have Premium and allows five named listeners. Reading and steering playback, the collector's playlists and search are available. Playing sound inside the page on an iPhone is reported as unreliable, and beat-level analysis is no longer offered to new apps.
- **Catalogue sources.** Neither Mattel nor Mini GT publishes a catalogue. hobbyDB offers one by arrangement for a four-figure setup fee. The Hot Wheels fan wiki answers searches through its public interface at `https://hotwheels.fandom.com/api.php`; its text is under CC BY-SA and its images are not reusable. No comparable wiki was found for Mini GT.
- **Backend limits.** Guides to Supabase's free plan list 1 GB of file storage and a pause after seven days without activity, which has to be lifted by hand.
