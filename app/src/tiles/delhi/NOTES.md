# Delhi: notes

What a later reader cannot see in the code. The tile is built, and every check on the page for tile builders was run on it on 19 November 2026. The collector has not yet called it final. He saw the plan that day and answered it: his answers are at the end.

The research is in `docs/districts/research/`: `delhi-for-the-tile.md`, and the two notes it builds on, `delhi.md` and `delhi-hauz-khas.md`.

## Where things are

| File | What is in it |
| --- | --- |
| `plan.ts` | The tile as numbers: the river, the lines the roads run along, the list of things, the ground each is given, the plots of ordinary buildings |
| `roads.ts` | The streets as they are laid, and the loops the traffic drives |
| `index.ts` | The ground, the river, Raisina Hill, the streets, the flyovers, the bridge's deck with its ramps, abutments and piers, the ordinary buildings and the water tanks on their roofs, the screen for music, the buses at the terminal. A thing without a model would be a plain box with its name: none is left. |
| `mughal.ts` | The parts every landmark is made of: a dome, a chhatri, an arch that is a dark opening, a plain opening, a row of arches, an arched way through a wall, a minaret, battlements, steps, the flag. A dome, a gate's faces and the flag may glow at night. |
| `axis.ts` | Rashtrapati Bhavan and the Jaipur Column, North and South Block, Vijay Chowk, Kartavya Path, India Gate, the canopy, the War Memorial |
| `old-delhi.ts`, `bazaar.ts`, `centre.ts`, `east.ts`, `south.ts`, `south-west.ts`, `metro.ts` | One file for each quarter and one for the Metro. Each hands over its models by the id of the thing in the plan, its signs, the lines its movers follow, and whatever else it builds. |
| `traffic.ts` | The kinds of traffic that are Delhi's own |
| `signs.ts` | What the shops say, the boards over the roads, and the screen with its own picture |
| `life.ts` | People, trees along the avenues, autos at their stands, carts, a wedding, a quiet park, a bungalow, the boards' gantries: everything placed through one helper that refuses a lane, a lot, water and a hero's place |

## How the tile lies

North is at the top of the board, as on a map. Nothing is turned except Hauz Khas (see the liberties).

- **The Yamuna** runs down the east side from the north edge to the south edge, 18 wide, with ghats on its west bank and a strip of east bank beyond it, 16 wide. The water is brown-green, not blue.
- **Old Delhi** is the north: Chandni Chowk from the Red Fort's Lahori Gate west to Fatehpuri Masjid, Jama Masjid south of it, the Red Fort between Netaji Subhash Marg and the river.
- **Connaught Place** is west of the middle, with Karol Bagh west of it.
- **The axis** runs east and west across the middle: Rashtrapati Bhavan on Raisina Hill at the west edge, the two Blocks, Vijay Chowk, Kartavya Path between its lawns and canals, and India Gate in its hexagon.
- **South of the axis and inside the Ring Road**: Sarojini Nagar, Safdarjung's Tomb, Dilli Haat, Lodhi Garden, Khan Market, the National Stadium.
- **South of the Ring Road**: R. K. Puram and the school in the west, Hauz Khas and the Qutub Minar in the middle, the Lotus Temple and Humayun's Tomb in the east.
- **The east bank**: the Signature Bridge's landing in the north, Akshardham in the middle, the Metro's station, and the Buddh circuit's corner at the south end.
- **Raisina Hill** is the tile's one piece of relief, a terrace 3 high. The Ridge is woods south of it and in the north-west corner.

The lines everything is placed from are in `plan.ts`. In short, in the tile's own coordinates (x east, z south):

| | |
| --- | --- |
| The river | x 70 to 88. The ghats are built out over its west edge, from 70 to 74.5. The east bank 88 to 104. |
| The Ring Road, south leg | z 59 from Dhaula Kuan's loop at x -82 to x 24, then down to z 74 by x 49, and the corner |
| The Ring Road, by the river | x 60.5, north to the Signature Bridge at z -100, then south down the east bank along x 96 to z -14 |
| Kartavya Path | z 6, from the turning place on Raisina Hill at x -76 to the hexagon |
| The hexagon | middle at (21, 6), its two lanes 16.5 and 21.5 from the middle, measured square to its sides. A corner points east and one west. |
| Connaught Place | middle at (-40, -38): the park 6, the Inner Circle's lane at 8.75, the blocks from 13 to 20, the Outer Circle's lane at 24.5 |
| Aurobindo Marg | x -2, from the Qutub's turning place at z 104 north to z 45.85, then north-east to the hexagon's south-west corner |
| Shanti Path, and the road on to the school | x -54, from z 44 south to z 100, then west along Kaifi Azmi Marg to where the buses turn at x -88 |
| Netaji Subhash Marg | x 19.5, from the road through Connaught Place at z -38 north to Kashmere Gate at z -104 |
| Chandni Chowk | z -95, paved, 10 wide, from x 12 west to x -52. No motor traffic. |
| The Metro | on the Ring Road's verge at height 9.5, straight on over the corner and the river at z 74, and north to its station along x 97.5 |

A storey is 3.4 high on this tile, as on Hong Kong's: Delhi is a low city, and its two and three storeys should read as that beside its domes.

## The things on the tile

Forty-four, numbered as in `THINGS` in `plan.ts`. All are built. The file each is in is in the table above, and what each is made of is said at the head of its model.

**Old Delhi and the river**

1. The Red Fort: the Lahori Gate, the Delhi Gate with its two elephants, the river front with its marble halls
2. Jama Masjid
3. Chandni Chowk, with cycle rickshaws
4. The row of faiths on Chandni Chowk
5. Fatehpuri Masjid
6. Paranthe Wali Gali and the jalebi corner
7. Khari Baoli, the spice market
8. Kites and pigeons over the roofs
9. The kebab lane south of Jama Masjid
10. Kashmere Gate and its motor parts market
11. The Signature Bridge
12. The ghats, with boats

**The centre**

13. Connaught Place
14. The flag in its park, and Palika Bazaar's mound
15. Jantar Mantar
16. Agrasen ki Baoli
17. Gurudwara Bangla Sahib
18. Karol Bagh's car accessory street
19. Rashtrapati Bhavan and the Jaipur Column
20. North Block
21. South Block, and Vijay Chowk between the two
22. Kartavya Path: lawns, canals, ice-cream carts
23. India Gate
24. The canopy
25. The National War Memorial
26. The vintage car rally, lined up at the National Stadium
27. Bharat Mandapam and the Auto Expo
28. Akshardham
29. The statue of Hanuman at Jhandewalan

**The south**

30. Humayun's Tomb
31. Lodhi Garden
32. Khan Market
33. Safdarjung's Tomb
34. Dilli Haat
35. Sarojini Nagar market
36. The Metro: the Pink Line's viaduct, Moti Bagh station, the bridge over the Yamuna
37. Delhi Public School, R. K. Puram
38. R. K. Puram's flats, and gully cricket in the colony park
39. Hauz Khas: the tank, the madrasa, Firoz Shah's tomb, the village
40. Deer Park
41. The Qutub Minar and the Alai Darwaza
42. The Lotus Temple
43. The Buddh circuit's corner, signed Greater Noida
44. The Metro's station on the east bank

The Ring Road's flyovers at Moti Bagh and AIIMS and Dhaula Kuan's loop are a thing to find too, and are built as roads.

Small scenes that stand between them, in `life.ts`: a wedding by Aurobindo Marg, with the bride on a stage before a wall of marigolds in a tent of red and white, and the groom's procession arriving on a white mare with its band and its lamps; a quiet park beside the Lotus Temple's garden, with a class on its mats; a bungalow of Lutyens' Delhi east of Agrasen ki Baoli, with a white saloon in its drive; three buses at the terminal north of the fort; families, ice-cream carts and a balloon seller on Kartavya Path's lawns; chaat carts, sugarcane presses and auto stands; white Ambassadors on Raisina Hill and monkeys on its parapet. Every ordinary roof but a shed's carries Delhi's black water tanks. The quarters' own files stage the rest.

## How high things stand

The city's towers are roughly to one scale, about 3.2 metres to a unit. Delhi has no towers: its tall things are a bridge's pylon, a minaret and a flag. The heights in life are the research note's. "Built" is above the street, as the models reach it.

| | In life | At that scale | Built |
| --- | --- | --- | --- |
| The Signature Bridge's pylon | 154 m above the deck | 48 | 46 to the top of its glass head, 47.7 to the lamp on its rod |
| The Qutub Minar | 72.5 m | 23 | 28 |
| The flag's mast, Connaught Place | 63 m | 20 | 20 |
| Rashtrapati Bhavan's dome | 55 m above the forecourt | 17 | 18.7 above the hill, which is 3 high: 21.7 |
| Jama Masjid's minarets | 41 m, on a plinth of 10 | 16 | 18, on a plinth of 3 |
| Humayun's Tomb | 47 m | 15 | 17 |
| India Gate | 42 m | 13 | 16 |
| The statue of Hanuman | 33 m | 10 | 15.2, with the hall it stands on |
| Akshardham | 43 m | 13 | 11.3 to the dome's crown, 12.6 to its gold pot, 14.3 to the pennant's staff |
| Safdarjung's Tomb | about 28 m | 9 | 13 |
| The Lotus Temple | 34 or 40.8 m | 11 to 13 | 12.5 |
| The Red Fort's walls | 18 to 33 m | 6 to 10 | 9, the Lahori Gate about 15 and the Delhi Gate about 13 |
| Bharat Mandapam | | | 11 |
| The canopy | 22 m | 7 | 8 |

They stand in the order they do in life, and India Gate stays under the dome on Raisina Hill. The Qutub Minar, India Gate, the statue and the tombs are small landmarks and stand a little over their scale height, so that they can be recognised. A storey of an ordinary building is 3.4.

## Roads

Traffic keeps left. No road crosses another on the level, and no lane is shared.

- **`ring-road`**, the Ring Road, is one road there and back, 913 long, with a turning loop at each end: Dhaula Kuan's loop in the west, east along the south over a flyover at Moti Bagh and another at AIIMS, north beside the river behind the Red Fort, over the Signature Bridge, and down the east bank to Akshardham's gate. A lane each way, with a verge between them where the Metro's piers stand. Each flyover is 4.4 high, with ramps 18 long. The bridge's deck is 2.4 high. The road climbs to it on either bank while it runs straight, over 14, and turns onto the bridge on the level: when it climbed round the bend its deck was twisted, and every stretch of it was drawn with a line across the road. Each approach is a bank of earth that ends in an abutment, and two piers stand in the river.
- **`long-drive`** is one road there and back, 473 long: from the Qutub Minar north up Aurobindo Marg under the AIIMS flyover, past Safdarjung's Tomb to the hexagon's south-west corner, along one side of it, west along Kartavya Path and up Raisina Hill to turn in front of Rashtrapati Bhavan's gates, back along Kartavya Path, the long way round India Gate, and back down to the Qutub. It uses the hexagon's outer lane exactly once round. Raisina Hill is a `hump` on the route.
- **`hexagon`** is the hexagon's inner lane, a loop of its own.
- **`shanti-path`** runs from below South Block under the Moti Bagh flyover to R. K. Puram and along Kaifi Azmi Marg to the school's gate, where the buses turn.
- **`connaught-place`** runs from Karol Bagh to the Outer Circle, round its north half, east and then north up Netaji Subhash Marg past Jama Masjid and the Red Fort to Kashmere Gate, and back round the south half. **`inner-circle`** is the Inner Circle.
- **`buddh`** is the circuit's corner on the east bank: a hero may drive it.
- **`chandni-chowk`** is cycle rickshaws only, east along the north half of the paved street and back west along the south half. No hero may take it. The lanes of Old Delhi carry nothing that drives.
- **The Metro** runs on its viaduct along the Ring Road's verge, over both flyovers, and on across the Yamuna to a station on the east bank.

How many vehicles each carries, reckoned as the page for tile builders says: the Ring Road 20 (a lap takes about 55 seconds, and its loops pass 0.65 a second: 26 would be the limit), the long drive 12 (limit 15), Shanti Path 7 (limit 9), Connaught Place's road 12 (limit 15), the hexagon's inner lane 5, the Inner Circle 3, Chandni Chowk 5 and the circuit 2. 66 vehicles in all. The collector's heroes drive on these roads too. On the last check there were ten of them, three on the Ring Road and four on the long drive, which then carried 16: one over the limit reckoned here, and twenty minutes of it ran clean.

**Traffic of the tile's own.** Every vehicle on the tile but the circuit's is one of ten kinds in `traffic.ts`, made with the engine's hook for it: an auto-rickshaw in green and yellow, a cycle rickshaw with its puller, a scooter with its rider, a city bus in green, red, orange or blue, a school's bus in yellow or in white, the white saloon of Lutyens' Delhi, a lorry in the colours of truck art, and the city's ordinary cars: a saloon, a small hatchback and a small van, mostly white and silver. A route's `paint` repaints every kind on it, the autos and the buses too, so no route here has one, and that is why the ordinary cars are kinds of the tile's own. None carries a maker's name or badge. Nothing in a shape moves: wheels do not turn and nobody pedals. Shanti Path carries the school's buses to the gate, the long drive the white saloons, the Ring Road the buses and the lorries.

## Places for heroes

Five on show. They are one list, `HERO_PLACES` in `plan.ts`, and the quarters' files read their places from it, so that the paint under a hero follows its place.

| Place | Where | What it is |
| --- | --- | --- |
| `auto-expo` | (41, -30), 0.3 above the ground, turning | a turntable on the forecourt of Bharat Mandapam, before the hall's open side, where two show cars turn on tables of their own |
| `vintage-rally` | (47, 31), nose to the east-south-east | a bay in the line of five vintage tourers before the National Stadium's pavilion, under the rally's banner |
| `karol-bagh` | (-80, -47.2), nose to the east | the fitting bay on Karol Bagh's car accessory street, marked in yellow |
| `khan-market` | (21.5, 38.5), nose to the east | the one bay of Khan Market's car park |
| `dhaba` | (9.2, 85), nose to the south-south-east | a bay in the dhaba's yard on Aurobindo Marg, beside the painted lorry and the string beds |

Each is open to the south-east. None is at a place of worship, a tomb or a memorial.

On the roads a hero is best seen on Kartavya Path, on the flyovers, beside the river, on the Signature Bridge, on the east bank, on Kaifi Azmi Marg in front of the school, and on the Buddh circuit's corner, which a hero may drive.

## The screen for music

One, on the roof of Connaught Place's south-east block, where its hoardings stand in life. It faces the south-east, and it is not near a place of worship, a tomb or a memorial. It is hung in `index.ts` as an ordinary sign of kind `screen`, which the engine fills with what is playing: 4.2 high and 7.5 wide, its foot 0.9 above the roof, on three posts with stays behind. That block's roof is kept clear of tanks and hoardings for it. Nothing for the music is built in this folder.

**Its own picture.** When nothing is playing, and for everyone who has not linked their music, the screen shows a picture the tile paints itself, so that picture is what most people see. The sign gets a `paint(ctx, s, w, h)` of its own, into 640 by 360 pixels. It draws the whole rectangle each time and keeps nothing between calls.

It is the tailboard of a lorry: HORN OK PLEASE in the colours of truck art, in three panels, with lotus flowers and a painted pair of eyes, and under it फिर मिलेंगे, "we'll meet again", which lorries carry too. No brand and no logo is on it. The Hindi is checked in its own script before it is painted, like every other sign. The collector was offered दिल्ली दिलवालों की round a heart as the other idea, and did not choose between them.

## Checks

All on 19 November 2026, on the built tile, alone on the board, in the order the page for tile builders gives.

- **Type check and build.** `npm run typecheck` passes. `vite build` builds, into a folder outside the checkout. It warns that the app's one chunk is 1,372 kB, over the 1,200 the app's settings allow: all tiles are bundled into it, and that is the app's to settle, not the tile's.
- **The console** has no error and no warning of the tile's on a fresh load. Three quarters print how many triangles each of their models has, on the development server only. The only warnings are the engine's, about heroes.
- **Roads.** `checkRoads` on every load: no road crosses another on the level, and none runs through anything built. It is given the lines of the Metro's two tracks, the boats' round and the ducks' as well. `clearOfStreets` is asked about every plot and every thing's lot.
- **Flicker.** `wimmel.fights('delhi')` comes back empty.
- **Traffic.** Twenty minutes in steps of a twentieth of a second, on the engine as merged at `15d4458`: 76 vehicles, ten of them heroes, none standing still, no lane shared. None came nearer than 9.8 to the next on its own route (two cycle rickshaws, which are short); on the long drive the least was 10.0 and on the Ring Road 13.3. The nearest two of all were 4.4 apart: one on a flyover and one passing under it.
- **Places for heroes.** With `?place=<id>` a hero stood at each of the five places in turn, at the place and the height the plan gives, read from `wimmel.board.heroes[0].pos` and never pictured. `wimmel.seen` says seen from the opening view for seven points on a car at each place: its middle, its two ends, its two sides and two corners, 1.4 above the ground. Two things of the tile's own stood in the way at first and went: a house north-east of the hexagon, and the post of a road board. One of the stadium's lamp masts stood before Khan Market's bay and was moved by its builder.
- **Sight lines, on what is built.** Not seen from the opening view, or seen in part:
  - Bangla Sahib's tank, behind Raisina Hill and North Block (see the liberties);
  - the foot of the statue of Hanuman, behind Karol Bagh's shops: the statue stands over them;
  - the Delhi Gate's barbican, behind Bharat Mandapam;
  - the south half of the Lodhi strip and Dilli Haat's court, behind the Metro's viaduct;
  - Akshardham's garden, behind the Metro's station;
  - the deep end of Agrasen ki Baoli, which faces west;
  - the fronts of the row of faiths and the Lahori Gate, which face away, as in life;
  - the far side of Connaught Place's Outer Circle, and the south half of Chandni Chowk.
  The plan's own check, `hiddenBy`, did not know the Metro's viaduct or its stations, which stand above the ground: what they hide was found only on the built tile.
- **Sides and weather.** Looked at from the south-east, the north-east, the north-west and the south-west by day, from the south-east and the north-west by night, in rain at dusk and by night, and in snow by day. Every builder looked at each of its things from two sides or more, by day and by night, and from 14 to 18 degrees.
- **Undersides.** The flyovers, the bridge's span, the Metro's viaduct and stations, every canopy and eave have theirs. A chhatri's eave and a minaret's balcony got theirs late, in `mughal.ts`.
- **Cost**, measured in one tab, one tile after the other in the same minute, in a window of 1,024 by 768 while the browser's pane was hidden, which makes the numbers rough but alike:

  | | Stands still | People | Moving | A frame at 14 h | A frame at 21 h | Drawn in a frame | Draw calls |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Delhi | 82,500 triangles | 597 | 76 | 4.3 to 5.0 ms | 4.4 to 5.3 ms | 888,000 triangles | 154 |
  | Europe | 34,600 | 438 | 99 | 4.0 to 5.3 ms | 4.3 to 5.1 ms | 780,000 | 141 |
  | Hong Kong | 44,800 | 521 | 71 | 5.6 to 6.6 ms | 5.8 to 6.3 ms (and one of 11.8) | 807,000 | 191 |

  Delhi has about twice the triangles that stand still on the built tiles, which is the most the page allows, and its frame costs what Europe's does. Its own meshes are few: two trains, two boats, the ducks, three tables that turn, the kites and the pigeons.

## Liberties taken with the real place

- **Hauz Khas is turned half round**, so that the tank lies on the side the tile is looked at from, and the madrasa is seen across the water, as from Deer Park. The village is behind it. The collector agreed.
- **The Ring Road is not a ring.** The tile has its south side and its side by the river. It ends in a loop at Dhaula Kuan, and at the Signature Bridge it turns onto the bridge.
- **The Signature Bridge stands just north of the Red Fort.** In life it is eight kilometres upstream.
- **The road down the east bank ends at Akshardham's gate.**
- **The Pink Line is on a viaduct the whole way.** In life it goes underground east of Moti Bagh. Its station on the east bank stands for Mayur Vihar.
- **Humayun's Tomb stands outside the Ring Road's corner**, by the river, at the front of the board. In life it is just inside. Where it was first planned, the Ring Road's swing to the south cut through its garden.
- **Mathura Road and Purana Qila are left out.** There was no ground east of the hexagon for them.
- **The Buddh circuit is on the east bank**, as a small oval with one banked end. It is forty kilometres away in life, and its sign says so by naming Greater Noida.
- **The statue of Hanuman stands north of Karol Bagh's shops.** The Metro that passes it in life is the Blue Line, which this tile does not have.
- **The kites fly to the south of their roofs**, towards the side the tile is looked at from, so that each is seen against the roofs and not against the sky beyond the board. Their strings run back to the flyers on the roofs. Nothing in the kite quarter is a festival's: no date is named.
- **The kebab lane's stalls face south**, to the road, and nothing stands south of them. In life the lane is hemmed in on both sides.
- **The cycle rickshaws on Chandni Chowk go round it in a loop**, up one side and back down the other. The street has been closed to motor traffic by day since 2021, and here it is closed at night as well.
- **The wedding is on a lawn in the Ridge**, south of Raisina Hill, where the big hotels' lawns are in life. It first stood by Aurobindo Marg, hard against the gate of Safdarjung's Tomb, which is no place for it.
- **The park south of the AIIMS flyover is a quiet one**, with a class at its exercises on mats: it lies beside the Lotus Temple's garden. Gully cricket is played in R. K. Puram's colony park.
- **Left out for care**, as the research note's section 8 says: the Taj Mahal, the new Parliament and the Central Vista's new blocks, the old Parliament, the mosque at the Qutub Minar's foot, Rajghat, Nizamuddin's shrine, and any parade.

**Old Delhi**, in `old-delhi.ts`:

- The Lahori Gate is 5 from the north end of the fort's west wall and not in its middle: that is where Chandni Chowk meets the wall.
- The fort's river front is a terrace 6.4 high with the marble halls on it, so that the lawns inside stay in view. In life the fort's whole ground is at that level.
- The Diwan-i-Am and the drum house stand west of the Rang Mahal, off the Lahori Gate's axis. The Hira Mahal is left out, and so are the small turrets on Jama Masjid's hall.
- The row of faiths is five equal plots in the order the street has them from the fort: Lal Mandir, Gauri Shankar, the Baptist church, Sis Ganj, Sunehri Masjid. Wikipedia's page on Chandni Chowk and Delhi Heritage Walks' route both give that order. Which side of the street each stands on was not found: all five stand on its south side, with their fronts to it.
- Not confirmed by any source found: the colours of the Gauri Shankar temple and of the church, Kashmere Gate's detail, and that the Delhi Gate's two elephants face each other.
- Bharat Mandapam hides the Delhi Gate's barbican from the opening view. The gate, its towers and both elephants are seen.

**The centre**, in `centre.ts`:

- Connaught Place is one ring of six blocks, which stands for both circles. Palika Bazaar's mound is in the park in the middle; in life it has a park of its own to the south.
- Jantar Mantar: the Samrat Yantra's slope is about 40 degrees, not 28.6. The Ram Yantra's two drums are on the west side, not at the south end. The Jai Prakash bowls stand above the ground.
- Agrasen ki Baoli is turned a quarter, so that the mosque beside the way in comes to the west end. Its deep end faces west, away from the opening view: from there the steps, the top two tiers of the north wall, the mosque and the well are seen.
- Bangla Sahib: the arcade is on the tank's north side only, and is a wall of arches and not an open verandah. In life it runs round three sides. The pennant on the Nishan Sahib is plain.
- **Bangla Sahib stands in the shadow of Raisina Hill.** From the opening view North Block hides the tank's middle and its south walk. The hall, the dome, the mast and the arcade on the north are seen, and all of it is seen from the north and the west. Only moving its lot would show the rest, and there is no ground for it between the road to Karol Bagh and the hill.
- The statue of Hanuman: the way in, a monster's open mouth in life, is a plain arch, and the chest that opens is not shown. The statue is turned to face the opening view. Which way the real one faces was not confirmed, and of its look the sources found confirm only the saffron colour, the arms at the chest and a decorated crown.

**The south**, in `south.ts`:

- Humayun's Tomb is about twice as tall for its width as in life. Its plinth is 1.5 times the body's width, not twice. The garden has twelve plots, not thirty-six, and only the west gate.
- Safdarjung's Tomb: the south pavilion and the mosque beside the gate are left out, and the east channel is short.
- Lodhi Garden: the mosque stands against the Bara Gumbad's east side (north-west of it in life) and still faces east. The guest hall is left out. The Sheesh Gumbad is south-east of the Bara Gumbad; in life it is 75 m north.
- The Lotus Temple is about 1.4 times as tall for its width as in life. The three leaves of each of its nine sides stand on one line from the middle, after an encyclopaedia's "the petals rise in threes from nine arches": no drawing was found. The outline of the pools is the builder's own.
- The Qutub Minar: the Alai Darwaza is due east of the tower, so that it does not cover the tower's foot; in life it is south-east. The Iron Pillar stands on the lawn. Twelve flutes to a storey, not twenty-four.
- Khan Market's car park holds the hero's bay and a scooter, and no other car: none fits beside the bay.
- The Metro's viaduct hides the south half of the Lodhi strip and Dilli Haat's court from the opening view. Both are seen from the other sides.

**The south-west**, in `south-west.ts`:

- The school: only the gate and the main block's look are from the collector's picture. The rest of the campus is invented and pressed together: the assembly court behind the gate, the football ground, the pool, the bus bay. The gate's canopy is large beside the block, so that its lettering can be read. Pupils wear white and bottle green, which are the school's colours by an encyclopaedia: its exact uniform was not found.
- Hauz Khas, turned half round: the tomb's entrance and its railed court face north. A third doorway in a red frame, with steps to the water, is added on the tomb's east face, so that the opening view has a door in red stone. In life the sides towards the tank have openings and no such door. Nobody stands on the monuments or their steps.
- The dhaba's lorry is the builder's own shape, 8.6 long.

**The river and the east**, in `east.ts`:

- The Signature Bridge's pylon stands by the east bank and leans back to the east, away from the river span, as in life. It has eight pairs of stays and three pairs of back-stays, where the real bridge has fifteen and four. The model reaches beyond its lot: the mast's head leans to x 95, and the block the back-stays come down to stands beyond the east turn.
- The ghats are built out over the river's edge, from x 70 to 74.5. The bank itself is the Ring Road's sidewalk. The plan's lot says where they are built.
- Akshardham faces east, as in life, so its steps and its porch face the board's edge and the opening view sees its south flank. The lot is longer from north to south, so the mandir is broader than it is deep. Nobody stands on its plinth, nothing is on its lake and it carries no board. The red and white pennant on its dome is the builder's addition. There is no colonnade on the east side, which is the board's edge.
- Bharat Mandapam: the hall's south side is cut open up to its crown, because a lower lintel hid the show from where the tile is looked at. Two show cars turn inside, not three. The plaza's statue and the halls beside it are left out. The lamps of its forecourt are low, so that none stands before the hall's opening or the hero's table.
- The National Stadium is its pavilion and one curved end of a stand, with the blue hockey pitch. The rally's line runs south in echelon, each tourer a little further west, and the hero's bay is wider on its south side, so that its neighbour hides none of it. The tourers are 5.6 long, smaller than the tile's cars: the forecourt is 8 wide. The stand steps down at its west end, so that Khan Market's bay is seen over it.
- The Buddh circuit's banking is the builder's own and not the real circuit's.

## Real names on signs, and the Hindi on them

Each is checked as it is written, and entered here with what confirmed it. A shop's board says what is sold and not whose shop it is, in Hindi above and English below. All checks were made by web searches on 19 November 2026.

**Hindi words for trades**, on the shop boards in `signs.ts`, on the boards of Old Delhi's street life in `bazaar.ts` and on the parts market's at Kashmere Gate in `old-delhi.ts`:

| On the board | Meaning | What confirmed the spelling |
| --- | --- | --- |
| मिठाई | sweets | Hindi Wikipedia's list of Indian sweets, भारतीय मिठाइयों की सूची |
| चाट | chaat | Hindi Wikipedia's page on papri chaat, पापड़ी |
| चाय | tea | Hindi Wikipedia's category of Indian food, which lists मसाला चाय |
| मसाले | spices | Hindi Wikipedia's list of Indian spices, भारतीय मसालों की सूची |
| जलेबी | jalebi | the same list of sweets |
| पंचर | puncture repair | two listings of puncture shops under that word: पंचर बनाने की दुकान, पंचर दुकान (explurger.com) |
| टायर | tyres | the title of Hindi Wikipedia's page on the tyre, टायर |
| ऑटो पार्ट्स | auto parts | Hindi Wikipedia's pages on the TVS group, on Kongu Nadu and on cargo, which all write the two loan words so |
| ढाबा | dhaba | the title of Hindi Wikipedia's page on the roadside eating place, ढाबा |
| बैटरी | batteries | Hindi Wikipedia's page on the electric cell, विद्युत कोष, which writes लेड-एसिड बैटरी. The board has the singular, as a shop's board does. |
| पतंग | kites | the title of Hindi Wikipedia's page on the kite, पतंग |
| परांठे | parathas | a piece in Patrika on the lane, which it writes परांठे वाली गली |
| लस्सी | lassi | the title of Hindi Wikipedia's page on the drink, लस्सी |
| सूखे मेवे | dry fruit | Hindi Wikipedia's page on dry fruit, which is titled सूखे मेवे |
| कबाब | kebabs | Hindi Wikipedia's page on the spice कबाबचीनी, which writes the dish's name so, and English Wikipedia's page on the kebab, which gives the Hindi as कबाब |

**Names of places**, on the green boards over the roads in `signs.ts`. Names of places are safe on road and Metro boards:

| On the board | What confirmed the spelling |
| --- | --- |
| चांदनी चौक, कश्मीरी गेट | the Hindi pages of a Metro route finder (yometro.com) for the stations of those names, which also write लाल किला and जामा मस्जिद |
| कर्तव्य पथ, इंडिया गेट, कनॉट प्लेस | a report in Hindi by DNA India on Kartavya Path opening to the public |
| मोती बाग, धौला कुआँ, एम्स | the titles of Hindi Wikipedia's pages for the three places. Its page on Moti Bagh also says that Shanti Path crosses the Ring Road there, which is how this tile has it. |
| रिंग रोड, करोल बाग | Hindi Wikipedia's page on Dhaula Kuan writes करोल बाग, and its page on the Pink Line calls that line the रिंग रोड line. |

**On the screen**: HORN OK PLEASE is what lorries all over India carry on their tailboards, and फिर मिलेंगे ("we'll meet again") is, by The Patriot's piece "Messages on the highway", a very common message on lorries in Hindi. Neither is anybody's name. A food festival in Delhi trades as Horn OK Please: the screen has nothing of its lettering or its look.

**The Metro's two stations**, on lit boards on their walls and over their platforms, in `metro.ts`:

| On the board | What confirmed it |
| --- | --- |
| सर एम. विश्वेश्वरैया मोती बाग, SIR M. VISHWESHWARAIAH MOTI BAGH | Wikipedia's page for the station: an elevated station of the Pink Line with side platforms, opened on 6 August 2018. The Hindi is the title of Hindi Wikipedia's page for it. The name is as the operator lists it: no picture of the station's own board was found, and sources spell the engineer's name in more than one way. |
| मयूर विहार-I, MAYUR VIHAR-I | Wikipedia's page for the station: an elevated station of the Pink Line with side platforms, opened on 31 December 2018. The Hindi is as a Metro route finder's Hindi pages write it. |

**A bazaar and a bakery**, the two real names of places that trade:

| On the board | Where | What confirmed it |
| --- | --- | --- |
| दिल्ली हाट, DILLI HAAT | both faces of the bazaar's gate, in `south.ts` | Delhi Tourism's own page for Dilli Haat INA, a fair held there in January 2026, and the tourism corporation's auction of its stalls for July to September 2026. The Hindi is the title of Hindi Wikipedia's page for it. |
| WENGER'S | the inner front of Connaught Place's west block, in `centre.ts`: plain dark lettering on cream | Outlook Traveller Eats, 14 August 2026, "Wenger's: 100 years of Delhi's original sweet spot", which places the bakery in Block A of the Inner Circle, trading under the family's third generation |

**Boards in English only.** Connaught Place's shops and hoardings say what is sold and not whose shop it is, in English, as most of its boards do: OPTICIANS, JEWELLERS, CAFE, TAILORS, CHEMIST, TRAVEL AGENTS, EMPORIUM, COFFEE, CAMERAS, HANDLOOMS, STATIONERS, SPORTS GOODS, LUGGAGE; SHOES, BOOKS, SAREES, WATCHES, SUITINGS SHIRTINGS, ICE CREAM; MARKET over Palika's doorway. Karol Bagh: CAR ACCESSORIES, ALLOY WHEELS, SEAT COVERS, CAR AUDIO, LED LIGHTS. Khan Market: BOOKS, CAFE, KEBABS, FLOWERS. Dilli Haat's stalls: POTTERY, RUGS, MOMOS. Sarojini Nagar: SHOES, BAGS, JEANS. None is anybody's name.

No place of worship carries a board, and neither does a tomb or a memorial.

**The school, the colony and the park**, in `south-west.ts`:

| On the board | Where | What confirmed it |
| --- | --- | --- |
| DELHI PUBLIC SCHOOL, R. K. PURAM | the dark plaque on the granite wall beside the school's gate, in English as on the real one, with no emblem | the collector's picture of the gate, and the research note's verified address |
| D. P. S. and R. K. PURAM | white capitals along the gate's curved canopy, with a gap where the emblem is in life. They are built of flat strokes and are not a sign: a sign is an upright rectangle, and the canopy's front is curved. | the collector's picture of the gate |
| आर.के. पुरम, R. K. PURAM SECTOR 12 | the colony's board by the park | The school's address is in Sector 12 (the research note). The Hindi is as the title of Hindi Wikipedia's page for the Metro station of that name writes it. |
| डियर पार्क, DEER PARK | the park's board, white on green | Hindi Wikipedia's page on the Hauz Khas complex writes the park's name so |

The village's boards say CAFE, BOUTIQUE and GALLERY in a painter's hand, in English only, as the village's do. The lorry at the dhaba carries HORN OK PLEASE, painted by the file. The buses say SCHOOL BUS and the cart ICE LOLLY.

**The hall, the show, the stadium and the circuit's town**, in `east.ts`:

| On the board | Where | What confirmed it |
| --- | --- | --- |
| भारत मंडपम, BHARAT MANDAPAM | the hall's crown, cream letters on its dark red stone | its Wikipedia page, and a photograph on Wikimedia Commons with the name lettered on its front. The Hindi is the title of Hindi Wikipedia's page for it. |
| AUTO EXPO | the crown over the hall's opening, black on yellow | the research note: the show is held at Bharat Mandapam. It is the show's own name, in plain letters. |
| MAJOR DHYAN CHAND NATIONAL STADIUM | the pavilion's parapet | the Sports Authority of India's page, Wikipedia, and photographs of its lettered front |
| ग्रेटर नोएडा, GREATER NOIDA | the board over the circuit's straight, white on green as the tile's road boards are | Hindi Wikipedia's page for the town, which is titled so and lists the circuit among its sights |

VINTAGE CAR RALLY, on the banner, is what it is and nobody's name.

## Since `main` was merged

`main` was merged in on 19 November 2026 at `f8e38c9` (the merge is `2ec85bb`), while the quarters were being built. What it brought, and what the tile did with it:

- **The tile's place in the world.** The `TileDef` has `place: { lon: 77.2, lat: 28.6 }`, for its pin in the map the table stands on.
- **`wimmel.fights('delhi')`** lists surfaces that lie in one plane, and has to come back empty. It found three kinds in what stood then, all mended: the verge under the flyovers lay on the two streets that pass under them, the pavilions of the two Blocks ended flush with their eaves, and the streets that meet the hexagon ran on across its inner kerb.
- **The view tilts up and down.** The tile is looked at from low angles as well as from above, so whatever is seen from below needs its underside: the flyovers, the Metro's viaduct, the bridge's deck, every canopy. See "Checks".
- **Traffic of a tile's own shape**: see "Roads".
- **The screen for music** works, and shows the tile's own picture when nothing is playing. It is hung.

`main` was merged in again the same evening at `15d4458` (the merge is `2682915`): a mend to how traffic takes turns where two routes share a lane. No route of Delhi shares a lane with another, and `vehicles.shared()` comes back empty.

## How it was built

The plan first, as numbers in `plan.ts`, with the roads and the traffic on it and a plain box with its name for each of the 44 things: the collector answered that. Then the axis, by the session that kept the plan. Then seven files at once, one for each quarter and one for the Metro, each by a builder of its own with one common brief (`tile-delhi-builders-brief.md` in the sessions' shared notes). The Metro and Old Delhi's street life were built by Opus, the five monument files by Fable. No builder committed. The session that kept the plan looked at each file from two sides by day and by night, mended what the builders asked for in the files that were not theirs, and committed it.

What that way of working cost, and what would have saved it:

- **Two builders staged the same scene**, and the session that kept the plan staged it a third time: gully cricket. The brief gave each thing to one file, but not the small scenes between them.
- **Things at the edge of two lots met**: a lamp mast before another quarter's place for a hero, a tree before another's yard, a tent hard against a tomb's gate. Each builder checked its own lot. Only the one who keeps the plan can ask `wimmel.seen` about all five places at once, and has to, after every file.
- **The places for heroes were typed into four files** before they were one list in the plan. They should be in `plan.ts` before the first builder starts.
- **Every save by one builder reloads the page for all**, and a check that takes a minute is cut off. The long ones, traffic above all, wait until the builders are done.

## For the engine

Nothing in the engine was changed in this branch. What the tile worked round:

- **A deck that climbs round a bend** is drawn with a line across the road at every stretch, because its stretches are twisted. `roadDeck` could say so. Delhi's bridge climbs on the straight and turns on the level.
- **A deck that ends on a bend does not end square**, and where another deck goes on from there the two overlap by a sliver, which `wimmel.fights` finds. A unit of straight road at the end mends it.
- **A route's `paint` repaints every kind on the route**, a tile's own kinds too. A route that mixes the engine's plain cars with kinds of its own cannot give the plain ones a palette. Delhi made its ordinary cars kinds of its own.
- **The glass of a window is blue by day whatever the wall**, so a building of stone with the engine's windows reads as an office. Rashtrapati Bhavan's windows are built as openings of shade. A surface that is `interior` glows in its own colour at night, so a lamp-lit window is a dark warm colour with `lit` between 2 and 3, and a floodlit wall is its own colour with `lit` of 0.3 to 0.5.
- **`cyl` takes `faces` and ignores it**, so a disc has no underside unless one is built.
- **A sign is an upright rectangle.** The lettering on the school's curved canopy had to be built of strokes.
- **`hiddenBy` knows only what stands on the ground.** A viaduct or a station on piers hides as much and is not in its solids.
- **`positions()` does not say which kind a vehicle is**, so a picture of one kind has to be hunted for.
- **All tiles are in one chunk**, and with this one it is over the size the app's settings warn at.
- **How many heroes a route takes** is the engine's choice. A route that is reckoned for twelve of the tile's own vehicles carried sixteen with four heroes on it.

## For the next tile

- **Ask the sight lines again of what is built**, not only of the plan. A hill hides what is north-north-west of it for more than its own height: Bangla Sahib went into that shadow on the plan and could not come out of it.
- **Give every sign a small `size`**: the tile's signs share one sheet, and a tile with 120 of them fills it.
- **Check a Hindi word by reading a page written in Hindi**, not by a search's summary of pages in English. Hindi Wikipedia's titles and its own search settled most of this tile's words in three fetches.
- **A place for a hero needs the whole car on its own ground**, 7.8 by 3.1 with room to spare, and nothing taller than a person in the strip between it and where the tile is looked at from. A tree is not counted by `wimmel.seen` and hides as well as a wall.
- **A turntable's top is the hero's height.** The Auto Expo's place is at 0.3 because its table is.
- **What costs is not triangles that stand still.** This tile has twice Europe's and its frame costs the same. Its own meshes are few, and its water is one river and four small tanks.

## What the collector said

To the plan, on 19 November 2026:

- **The school.** "The main gate for DPs rkp is a green arch supported on two pillars with a gate in between the green arch has DPS RK PURAM on it, The main blocks are Gray and about 2-3 storeys each, yes sounds good, busses are a mixture of yellow and white". So: a green arch on two pillars, lettered DPS RK PURAM, grey blocks of two and three storeys, the assembly ground, the pool, the football ground and the bus bay all shown, and buses in yellow and in white.
- **The school's gate, in a picture** he sent the same day. It shows a broad, shallow arched canopy in teal-green over the whole driveway, with white capitals along its curved front: D. P. S., a gap where the school's emblem is, and R. K. PURAM. It stands on slatted pillars. Under it is a steel-grey gate of four leaves with diagonal bars. To one side a wall faced in grey granite carries a dark plaque, DELHI PUBLIC SCHOOL over R. K. PURAM, with hedges and potted palms before it. The block behind is grey-beige concrete with a teal band at every floor and pale lattice screens over its upper windows. The emblem is not drawn.
- **The Buddh circuit.** "east bank south end sounds good".
- **Old Delhi.** "Kites for sure, and i leave the rest upto you".
- **What is missing.** "I think we have a lot will tweak after".
- **Hauz Khas turned half round.** "Sure".
- **The statue of Hanuman.** "Sounds good".
