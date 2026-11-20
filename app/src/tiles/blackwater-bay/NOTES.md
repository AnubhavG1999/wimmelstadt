# Blackwater Bay: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Being built. Built and judged: the plan, the ground and the water with its tide, the roads and their travellers, the Dragonpit, King's Landing's walls, houses and Red Keep, Driftmark, High Tide and the Dragonmont, and the ten dragons fly. Still being built: Dragonstone, the north and south shores, and the ships.

## Choices made while the collector slept

He went to bed on 20 November 2026 trusting the tile to go on ("trust you have this handled"). Where a choice was his to make, the safer one was taken and built on. Each is one setting, or a small piece of work, to turn the other way.

- **The tide's round.** 150 seconds: low water for 60, rising for 30, high water for 30, falling for 30 (`TIDE` in `tide.ts`). At high water the sea stands a little over the causeway's road. The travellers and the heroes on the causeway ford it rather than stopping: the routes are loops and nothing on them waits.
- **The hero on the sands stays dry.** The place for a hero beside the causeway is a bar of sand that the tide leaves dry, so that at high water the car stands on an island of its own rather than in the sea (`SANDBAR` in `plan.ts`). The other way is to let it stand in the shallows.
- **Few travellers.** Eighteen on six roads: drovers with flocks and cattle, litters, strings of mules and barrows, and no carts. The tile reads as a place of dragons first. More are one number per road in `roads.ts`.
- **The winks at toy cars.** The Dragonpit's forecourt is the meet before the bronze doors, one of the forty vaults stands open as a garage, and the sands are a beach at low water. Each is a place for a hero, and nothing more is made of them.
- **The south road runs on to Massey's Hook**, the whole length of the south shore through the kingswood, for the drovers.
- **"GIVE WAY TO DRAGONS"** stands once, on a board at the top of the climb to the Dragonpit, by order of the Dragonkeepers.

## Sources and rights

The books only: Fire & Blood above all, with The World of Ice and Fire and A Song of Ice and Fire, as the research notes read them: [house-of-the-dragon.md](../../../../docs/districts/research/house-of-the-dragon.md) and [the-great-dragons.md](../../../../docs/districts/research/the-great-dragons.md).

Nothing comes from the television series: not its dragons, its Dragonpit, its castles, its lettering or its map. No character is portrayed, nobody rides a dragon, and nothing shows a battle or a death. A house's arms are only their colours on a banner. Place names from the books go on plain boards.

## The ground

- **The water** is the engine's, at -0.9, and the islands and the shores stand over it on low walls.
- **The tide** is the tile's own (`tide.ts`): a second surface of water over the sands between Driftmark and High Tide, whose middle rises from under the sands to a little over the causeway's road, and whose edge slopes down to below the bay's water eight units out, so that it swells out of the bay rather than standing in a wall. Its normals are level everywhere, as the bay's are, or the light draws a line where the slope meets the level. `blackwater.tide(share)` in the console stands it still for pictures, and `blackwater.tide(null)` lets it go.
- **The causeway** stands on a low dyke of stone across the sands (`DYKE` in `plan.ts`, built in `high-tide.ts`), its top just under the road and its kerbs no higher than the road, so that the road does not float over the sand and the tide covers both. Marker posts show the way across at high water.
- **The sands** lie at -0.35 (`SANDS_Y`): over the bay, under the tide.

## The dragons

The show is `dragons.ts`, written by the main session on the engine's dragons (`engine/dragons/`); ask it for a change rather than editing there. It builds last, over everything else, and on the development server it checks itself on every load: the console says how near each dragon comes to what is built (never under 6) and where each fire goes.

- **Homes** (`HOMES` in `plan.ts`) are spread over the whole tile, because dragons this size need room to come and go. Half-spans run from 13 (Sheepstealer) to 44 (Balerion), and seven lairs on a cone 50 high put a wing through a neighbour at nearly every take-off. Balerion lies on the Dragonpit's crown and Dreamfyre in its doors, Caraxes on the Red Keep's great tower, Vhagar on her rock in the bay (`VHAGAR_ROCK`), and Meleys across High Tide. On the Dragonmont, Meraxes keeps a ledge under the summit, Vermithor and Silverwing lie side by side on the south face, Sheepstealer is on the west face and the Cannibal on the north. Each lair there is a level shelf with a cave behind it (`LAIR`, `lairAt`), and the caves may meet inside the mountain.
- **What the homes ask of what is built.** The Red Keep's great tower ends flat at 30 behind a low iron rim, and Maegor's Holdfast flat inside battlements that stop at 27, for Caraxes's tail. High Tide keeps a roofline at 16 along z 80 for Meleys. The show lays tails over the lot tops of `rk-tower`, `rk-holdfast`, `red-keep` and `high-tide`, so those roofs stay close to their lots' tops. No mast stands over 14, and nothing tall within 16 of Vhagar's rock.
- **Ledges.** The Dragonmont's dragons drop off their ledges with their wings drawn in and open them once they are clear, and come home the same way, as a falcon does on a cliff (the kit's cue `tuck`).
- **Moments**, all from the books:
  - Balerion's three slow laps over the city, then his black fire straight up.
  - Dreamfyre twice round the dome.
  - Vermithor and Silverwing across the bay and round the Dragonpit.
  - Sheepstealer taking a sheep from the flock by the Wendwater (`FLOCK[0]`, which nothing else stands on).
  - Caraxes along the Rush and home to his tower, where he shrieks with his wings spread.
  - The race, which Meleys wins.
  - Meleys low over the Velaryon fleet.
  - The Cannibal's hunt over the bay.
  - Vhagar round the bay.
  - Meraxes far to the west.
  - Rarely, the three of the Conquest round King's Landing, one behind another.
- **The director** chooses what plays next. At most three dragons are in the air, and no two moments share a piece of sky. It opens with Balerion's laps and Meleys over the fleet, so the first view has dragons in the air.
- **At home** each dragon looks about in its own way, watches whoever flies near, and yawns or roars now and then. Balerion, Vhagar and Caraxes sometimes rise, spread their wings and roar, but never while another flies near.
- **Fire** goes only straight up or out over open water. At night it lights the water under it only when it flies low over it.
- **Checked by hand**, as the main session's record shows rather than the code: every pair of dragons, mesh against mesh, through every moment. The nearest is Vermithor passing Silverwing on her ledge at about 1, with his wings drawn in. For pictures, `bay.play(id)`, `bay.at(id, key, t)` and `bay.where(key)` in the console.

## For the engine

- **Arrow loops** (given, on this branch): window kind 7 draws a narrow slit, dark by day and warm at night. Kind 4's small square panes are pale glass by day, and on a castle's wall they read as an office block. `LOOPS` and `LOOPS_CLOSE` in `look.ts` use it.
- **The gable's open ends** (asked, not done): `gable` in `shapes.ts` stops its end triangles short of the roof by rise × over / run, so a slit shows under the roof at each gable end, and its slopes have no underside, so a low view under the eaves looks through them. `houses.ts` and `driftmark.ts` close both with a `pitched` of their own. Mending `gable` itself would change every tile's roofs, so it is left to the main session.
