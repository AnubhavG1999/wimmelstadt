# The board holds nine tiles at a time

The board has nine places, three rows of three, and it stays that size however many tiles are built. Each time the page loads, nine of the tiles are dealt onto it by chance, each to a place of chance, and the rest wait in the box for another load. Whoever is looking can set the board for themselves in the picker, and a device can keep a board, which it then opens with every time. [0010](0010-the-tiles-stand-together-on-a-table.md) had every tile on the table in the order they were built, and a tenth tile would have begun rows of four.

We chose this because the whole board is drawn at once, so every tile that was added made every frame dearer: four tiles took about 9 ms a frame on the desktop, seven about 12 and nine about 17, which is about all that sixty frames a second allows, and the phone has less to spare. A board that stops at nine keeps that cost where it is while the world goes on growing. And a deal by chance means that whoever comes back finds a board they have not seen, which suits a Wimmelbuch: there is something new each time it is opened. The collector's words were "we keep the frames steady and have freshness".

## Considered Options

- **Every tile on the table, in rows of four and then of five.** That was 0010's plan. By what the first nine cost, sixteen would be likely to take about 30 ms a frame, and from far enough back to see them all, each tile is too small to read.
- **Drawing the far tiles more cheaply.** A tile is seen whole when it is seen at its smallest, so there is something to save. But every tile would need a second, simpler form of itself, built and kept up by hand.
- **Several boards to page between.** Every tile would keep a fixed place, but the city would be split into rooms, and which tile is on which board would have to be decided for everybody.
- **A fixed nine, chosen by the collector.** There would be nothing new on a second visit, and a tile that was not chosen would never be seen by anybody.

## Consequences

- A tile cannot count on being seen at every visit, nor on its neighbours: it may stand in any of the nine places, with any tile beside it. 0010 already asked that a tile know nothing of its neighbours.
- This qualifies [0006](0006-the-whole-city-from-the-first-day.md): every tile that is made is in the world from the day it is finished, but not all of the world is on the table at once. No tile is held back to be earned. Chance alone decides, and the picker overrules chance.
- What is built still never changes, as [0002](0002-the-world-only-grows.md) asks. The board is not the world: a tile in the box is as it was left, and comes back as it was.
- The heroes are put on the tiles that are on the board, as before, so no hero is out of sight because a tile is in the box. A hero has no tile of its own.
- A new board is set by loading the page afresh. The city is built once, when the page opens, and its tiles do not change places while it runs, so setting the board takes as long as opening the page does.
- A board that a device keeps is kept on that device alone, and it names its tiles: a tile that is added later stays in that device's box until it is put on the board there.
- Each tile needs a postcard, a small picture that stands for it in the picker. A tile without one is shown as bare felt with its name.
- Not built yet: fetching only the nine tiles that are dealt. Every tile's code arrives in one piece, which is the right size while nine are built and will not be when there are more.
- Not decided: whether a link can carry a board, so that one person can show theirs to another. `?tiles=` in the address does that today, for whoever knows the tiles' ids.
