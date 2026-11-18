# The world only grows

Superseded in part by [0006](0006-the-whole-city-from-the-first-day.md): the world no longer grows with the collection. Permanence and the append-only rule stand.

The world is generated once and is then permanent. It grows by whole districts as the collection grows, and the layout of anything already built never changes, because a Wimmelbuch works by returning to a place you know and because the city is meant to record the collection's history. We rejected a fresh city on every visit and a city of fixed size.

## Consequences

- The generator is append-only: a new district attaches at the edge and must neither depend on nor alter how earlier districts were generated. Improving the generator must not change districts that already exist.
- "Never changes" covers layout and identity: streets, buildings, landmarks. How things are drawn may be improved everywhere at once.
