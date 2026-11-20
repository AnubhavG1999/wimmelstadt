# Blackwater Bay: notes

This file records what a later reader cannot see in the code.

**Where the tile stands.** Being built. The plan, the ground and the water with its tide, the roads and their checks, and the Dragonpit stand; the other places stand as boxes while their builders work. The ten dragons are the main session's, in `dragons.ts`.

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

## The dragons' homes

Where each of the ten rests is `HOMES` in `plan.ts`, as the dragons' show asked for it: Balerion on the crown of the Dragonpit's dome, Vhagar on a low dark rock in the bay (`VHAGAR_ROCK`), Dreamfyre in the bronze doors, and the others at lairs on the Dragonmont, each a level shelf with a dark cave behind it (`LAIR`, `lairAt`). The lairs' layout is the show's to set, from how far apart its dragons' wings need to be.

## For the engine

Nothing asked for yet.
