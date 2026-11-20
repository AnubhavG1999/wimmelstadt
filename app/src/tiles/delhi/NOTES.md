# Delhi: notes

What a later reader cannot see in the code. The tile is being built. The collector saw the plan on 19 November 2026 and answered it the same day: his answers are at the end.

The research is in `docs/districts/research/`: `delhi-for-the-tile.md`, and the two notes it builds on, `delhi.md` and `delhi-hauz-khas.md`.

## Where things are

| File | What is in it |
| --- | --- |
| `plan.ts` | The tile as numbers: the river, the lines the roads run along, the list of things, the ground each is given, the plots of ordinary buildings |
| `roads.ts` | The streets as they are laid, and the loops the traffic drives |
| `index.ts` | The ground, the river, Raisina Hill, the streets, the flyovers, the bridge's deck, the Metro's viaduct, the ordinary buildings, and a plain box with its name for every thing that has no model yet |

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
| The river | x 70 to 88. Ghats 67.5 to 70. The east bank 88 to 104. |
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

Forty-four, numbered as in `THINGS` in `plan.ts`. None has its model yet: each is a box with its name.

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

Small scenes to stand between them: a baraat, a chaat cart, a sugarcane press, an auto stand, white Ambassadors on Raisina Hill, monkeys on its parapets, a dhaba with a painted truck, a puncture stand, the queue at a CNG station, a red Maruti 800 on a plinth.

## How high things will stand

The city's towers are roughly to one scale, about 3.2 metres to a unit. Delhi has no towers: its tall things are a bridge's pylon, a minaret and a flag. The heights in life are the research note's.

| | In life | At that scale | Planned |
| --- | --- | --- | --- |
| The Signature Bridge's pylon | 154 m above the deck | 48 | 46 |
| The Qutub Minar | 72.5 m | 23 | 28 |
| The flag's mast, Connaught Place | 63 m | 20 | 20 |
| Rashtrapati Bhavan's dome | 55 m above the forecourt | 17 | 19, on a hill of 3 |
| Jama Masjid's minarets | 41 m, on a plinth of 10 | 16 | 18 above the street |
| Humayun's Tomb | 47 m | 15 | 17 |
| India Gate | 42 m | 13 | 16 |
| The statue of Hanuman | 33 m | 10 | 15 |
| Akshardham | 43 m | 13 | 14 |
| Safdarjung's Tomb | about 28 m | 9 | 13 |
| The Lotus Temple | 34 or 40.8 m | 11 to 13 | 12.5 |
| The Red Fort's walls | 18 to 33 m | 6 to 10 | 9, its gates 13 and 15 |
| The canopy | 22 m | 7 | 8 |

They stand in the order they do in life, and India Gate stays under the dome on Raisina Hill. The Qutub Minar, India Gate, the statue and the tombs are small landmarks and stand a little over their scale height, so that they can be recognised.

## Roads

Traffic keeps left. No road crosses another on the level, and no lane is shared.

- **`ring-road`**, the Ring Road, is one road there and back, 913 long, with a turning loop at each end: Dhaula Kuan's loop in the west, east along the south over a flyover at Moti Bagh and another at AIIMS, north beside the river behind the Red Fort, over the Signature Bridge, and down the east bank to Akshardham's gate. A lane each way, with a verge between them where the Metro's piers stand. Each flyover is 4.4 high, with ramps 18 long.
- **`long-drive`** is one road there and back, 473 long: from the Qutub Minar north up Aurobindo Marg under the AIIMS flyover, past Safdarjung's Tomb to the hexagon's south-west corner, along one side of it, west along Kartavya Path and up Raisina Hill to turn in front of Rashtrapati Bhavan's gates, back along Kartavya Path, the long way round India Gate, and back down to the Qutub. It uses the hexagon's outer lane exactly once round. Raisina Hill is a `hump` on the route.
- **`hexagon`** is the hexagon's inner lane, a loop of its own.
- **`shanti-path`** runs from below South Block under the Moti Bagh flyover to R. K. Puram and along Kaifi Azmi Marg to the school's gate, where the buses turn.
- **`connaught-place`** runs from Karol Bagh to the Outer Circle, round its north half, east and then north up Netaji Subhash Marg past Jama Masjid and the Red Fort to Kashmere Gate, and back round the south half. **`inner-circle`** is the Inner Circle.
- **`buddh`** is the circuit's corner on the east bank: a hero may drive it.
- **Chandni Chowk and the lanes of Old Delhi** carry no motor traffic: cycle rickshaws and autos go on lines of their own.
- **The Metro** runs on its viaduct along the Ring Road's verge, over both flyovers, and on across the Yamuna to a station on the east bank.

How many vehicles each carries, reckoned as the page for tile builders says: the Ring Road 16 (a lap takes about 55 seconds, and its loops pass 0.65 a second: 26 would be the limit), the long drive 10 (limit 15), Shanti Path 6 (limit 9), Connaught Place's road 10 (limit 15). 51 vehicles in all so far.

## Places for heroes

Five on show, each open to the south-east: the turntable in the Auto Expo's hall at Bharat Mandapam (`auto-expo`), the line of the vintage car rally at the National Stadium (`vintage-rally`), the fitting bay on Karol Bagh's accessory street (`karol-bagh`), a bay in Khan Market's car park (`khan-market`), and the dhaba on Aurobindo Marg (`dhaba`). None is at a place of worship, a tomb or a memorial.

On the roads a hero is best seen on Kartavya Path, on the flyovers, beside the river, on the Signature Bridge, on the east bank, on Kaifi Azmi Marg in front of the school, and on the Buddh circuit's corner.

## The screen for music

One, on the roof of Connaught Place's south-east block, where its hoardings stand in life. It faces the south-east, and it is not near a place of worship, a tomb or a memorial. It is hung as an ordinary sign of kind `screen`, which the engine fills with what is playing. North America's gate tower has one: see `SIGNS` in its `plan.ts`. Nothing for the music is built in this folder.

**Its own picture.** When nothing is playing, and for everyone who has not linked their music, the screen shows a picture the tile paints itself, so that picture is what most people see. The sign gets a `paint(ctx, s, w, h)` of its own, into 640 by 360 pixels. It draws the whole rectangle each time and keeps nothing between calls.

Planned: the tailboard of a lorry. HORN OK PLEASE in the colours of truck art, in three panels, with lotus flowers and a painted pair of eyes, and under it फिर मिलेंगे, "we'll meet again", which lorries carry too. No brand and no logo is on it. The Hindi is checked in its own script before it is painted, like every other sign. The collector was offered दिल्ली दिलवालों की round a heart as the other idea, and did not choose between them.

## Checks

On the blockout, 19 November 2026:

- **Roads.** `checkRoads` on every load: no road crosses another on the level, and none runs through anything built. `clearOfStreets` is asked about every plot and every thing's box.
- **Traffic.** Twenty minutes in steps of a twentieth of a second: 51 vehicles, none standing still, no vehicle nearer than 13.1 to the next on its own route, no lane shared. The nearest two at one height were 4.99 apart, in the two lanes of the road through Connaught Place. The nearest two of all were 4.4 apart: one on the AIIMS flyover and one passing under it.
- **Sight lines.** `hiddenBy` on the plan, for 73 points: every place for a hero, the middle of every road worth watching, and the foot or the middle of every landmark. 65 are seen from the opening view. Not seen: the far side of Connaught Place's Outer Circle, behind its own blocks; the south half of Chandni Chowk behind its own south side, and a stretch of the north half behind the row of faiths; the foot of Jama Masjid's south steps behind the kebab lane; the foot of the statue of Hanuman behind Karol Bagh's shops; and the south edge of Bangla Sahib's tank behind Raisina Hill.

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
- **Left out for care**, as the research note's section 8 says: the Taj Mahal, the new Parliament and the Central Vista's new blocks, the old Parliament, the mosque at the Qutub Minar's foot, Rajghat, Nizamuddin's shrine, and any parade.

## Real names on signs, and the Hindi on them

Each is checked as it is written, and entered here with what confirmed it. A shop's board says what is sold and not whose shop it is, in Hindi above and English below. All checks were made by web searches on 19 November 2026.

**Hindi words for trades**, on the shop boards in `signs.ts`:

| On the board | Meaning | What confirmed the spelling |
| --- | --- | --- |
| मिठाई | sweets | Hindi Wikipedia's list of Indian sweets, भारतीय मिठाइयों की सूची |
| चाट | chaat | Hindi Wikipedia's page on papri chaat, पापड़ी |
| चाय | tea | Hindi Wikipedia's category of Indian food, which lists मसाला चाय |
| मसाले | spices | Hindi Wikipedia's list of Indian spices, भारतीय मसालों की सूची |
| जलेबी | jalebi | the same list of sweets |
| पंचर | puncture repair | two listings of puncture shops under that word: पंचर बनाने की दुकान, पंचर दुकान (explurger.com) |
| टायर, ऑटो पार्ट्स | tyres, auto parts | the usual spelling of the two loan words. Not confirmed by a source read in full: to be looked at again before the tile is final. |
| पतंग | kites | the ordinary Hindi word. Not confirmed by a source: to be looked at again. |

**Names of places**, on the green boards over the roads in `signs.ts`. Names of places are safe on road and Metro boards:

| On the board | What confirmed the spelling |
| --- | --- |
| चांदनी चौक, कश्मीरी गेट | the Hindi pages of a Metro route finder (yometro.com) for the stations of those names, which also write लाल किला and जामा मस्जिद |
| कर्तव्य पथ, इंडिया गेट, कनॉट प्लेस | a report in Hindi by DNA India on Kartavya Path opening to the public |
| मोती बाग, धौला कुआँ, एम्स | the titles of Hindi Wikipedia's pages for the three places. Its page on Moti Bagh also says that Shanti Path crosses the Ring Road there, which is how this tile has it. |
| रिंग रोड, करोल बाग | Hindi Wikipedia's page on Dhaula Kuan writes रिंग मार्ग and करोल बाग. रिंग रोड is what boards say. To be looked at again. |

**On the screen**: HORN OK PLEASE is what lorries all over India carry on their tailboards, and फिर मिलेंगे ("we'll meet again") is, by The Patriot's piece "Messages on the highway", a very common message on lorries in Hindi. Neither is anybody's name. A food festival in Delhi trades as Horn OK Please: the screen has nothing of its lettering or its look.

**Still to be entered**: every real name the quarters' files hang, as each file is taken in.

## When `main` is merged

The main session is changing the engine while this tile is built, and says when to merge. What that merge brings, and what the tile then owes:

- **The tile's place in the world.** The `TileDef` gets `place: { lon: 77.2, lat: 28.6 }`, for its pin in the map the table stands on.
- **`wimmel.fights('delhi')`** lists surfaces that lie in one plane. The tile must pass it.
- **The view tilts up and down.** The tile is looked at from low angles as well as from above, so whatever is seen from below needs its underside: the flyovers, the Metro's viaduct, the bridge's deck, every canopy.
- **Road markings are cleared wherever two streets overlap**, not only where they cross.
- **The screen for music** works from then on, and shows the tile's own picture when nothing is playing.

## What the collector said

To the plan, on 19 November 2026:

- **The school.** "The main gate for DPs rkp is a green arch supported on two pillars with a gate in between the green arch has DPS RK PURAM on it, The main blocks are Gray and about 2-3 storeys each, yes sounds good, busses are a mixture of yellow and white". So: a green arch on two pillars, lettered DPS RK PURAM, grey blocks of two and three storeys, the assembly ground, the pool, the football ground and the bus bay all shown, and buses in yellow and in white.
- **The school's gate, in a picture** he sent the same day. It shows a broad, shallow arched canopy in teal-green over the whole driveway, with white capitals along its curved front: D. P. S., a gap where the school's emblem is, and R. K. PURAM. It stands on slatted pillars. Under it is a steel-grey gate of four leaves with diagonal bars. To one side a wall faced in grey granite carries a dark plaque, DELHI PUBLIC SCHOOL over R. K. PURAM, with hedges and potted palms before it. The block behind is grey-beige concrete with a teal band at every floor and pale lattice screens over its upper windows. The emblem is not drawn.
- **The Buddh circuit.** "east bank south end sounds good".
- **Old Delhi.** "Kites for sure, and i leave the rest upto you".
- **What is missing.** "I think we have a lot will tweak after".
- **Hauz Khas turned half round.** "Sure".
- **The statue of Hanuman.** "Sounds good".
