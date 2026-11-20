# The island

> **Set aside on 19 November 2026.** This is what is kept of the city's first form: one continuous island of 23 districts, with a coast, rivers and mountains. Nothing here is built or run. The city is made of tiles now, and they are in [the app](../../app). See [0008](../../docs/adr/0008-an-island-of-hand-planned-districts.md) for the island and [0009](../../docs/adr/0009-a-city-of-hand-built-tiles.md) for what replaced it.

## Why it was set aside

The island was 1.36 million square units of land. It was too large to build by hand, so the ground between its landmarks was filled with ordinary buildings made by rule, and beside the look prototype it looked empty where the prototype looks full: Delhi had one landmark to about 14,000 square units, where the prototype's board has one to about 2,800.

## What is kept, and why

The island was an app of its own, and lived on a branch that is no longer in the repository. Two things from it are still of use to whoever builds a tile, and they are kept here to be read and copied from.

| | |
| --- | --- |
| [plan/districts.ts](plan/districts.ts) | Every district the island had: its theme, its ground, the road worth driving there, its quarters, and whether traffic keeps left. |
| [plan/landmarks.ts](plan/landmarks.ts) | What was to stand in each district, about 280 landmarks in all. It is a list to choose from: a tile holds the 30 or 40 that make the place, not all of them. |
| [models/landmark-models.ts](models/landmark-models.ts) | Landmarks in their real shape: a torii and the Taj Mahal, besides the American and European ones. Kyoto Tower and the pagoda from here stand on Japan now, and Big Ben and the Leaning Tower of Pisa on Europe. |
| [models/delhi-models.ts](models/delhi-models.ts) | Hauz Khas, the Qutub Minar, India Gate, the Lotus Temple, the Red Fort, Rashtrapati Bhavan and Connaught Place. |
| [models/downtown-models.ts](models/downtown-models.ts) | The look prototype's own buildings as the island had them, and the Golden Gate Bridge at a length of its own. |

The files do not compile where they stand: they import from the island's app, which is gone, and from an engine that has changed shape since. A model is written around (0, 0) and takes `{ b, glows, lights }`, which a tile's `Build` is. So it works inside `placed` once it has been copied into a tile's folder and its imports point at `app/src/engine`. The page for tile builders says more under ["What to reuse"](../../docs/building-a-tile.md#what-to-reuse).

The research behind every district carries over as it is, in [docs/districts/research](../../docs/districts/research).
