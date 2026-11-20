# Delhi for the tile

This note gathers what is needed to build Delhi as one tile. It builds on [delhi.md](delhi.md) (the catalogue) and [delhi-hauz-khas.md](delhi-hauz-khas.md) (Hauz Khas), and on the seven models in `prototype/island/models/delhi-models.ts`: Hauz Khas, the Qutub Minar, India Gate, the Lotus Temple, the Red Fort, Rashtrapati Bhavan and Connaught Place. It does not repeat them. Read on 2026-11-19.

How sure each statement is:

- **[v]**: confirmed by a source listed at the end.
- **[osm]**: read from OpenStreetMap data on 2026-11-19. Good for where things are and how big their plots are, silent on what they look like.
- **[bk]**: from background knowledge, not confirmed by a source this time. Check it against a photograph before it is modelled.

Where sources disagree, both figures are given.

---

## 1. Delhi Public School, R. K. Puram

One of the four places asked for by name. Very little about what the campus looks like is published. What follows is everything public sources gave, and a plain list of what they did not.

### Where it is

- **Address** [v]: Kaifi Azmi Marg, Sector 12, R. K. Puram, New Delhi 110022. The school calls this campus its Senior Wing. Its two junior wings are elsewhere, at East of Kailash and at Vasant Vihar, and are not part of this tile.
- **Founded** [v]: 29 January 1972, the second Delhi Public School after Mathura Road.
- **The road names** [osm], as written in Devanagari in the map data: Kaifi Azmi Marg is कैफ़ी आज़मी मार्ग, and Major Somnath Marg is मेजर सोमनाथ मार्ग.
- **R. K. Puram** [v] is a colony that the CPWD built for central government staff from the late 1950s. It was complete by the 1970s, and most of its blocks are two storeys high. Higher blocks were added in the 1990s.

### The plot, from the map [osm]

Measured from OpenStreetMap, with the origin at 28.5715 N, 77.1770 E, x to the east and y to the north, in metres:

- Two walled plots meet along one side. Both are tagged as a school and lie at about 40 degrees to north, their long sides running north-west to south-east.
  - The plot named "Delhi Public School" (short name "DPS RK Puram") is the north-western one. It is about 200 m by 170 m across and covers about 1.6 ha (4 acres).
  - The plot that adjoins it on the south-east has no name. It is about 230 m by 270 m across and covers about 3.2 ha (7.8 acres). A football pitch of about 100 m by 60 m is mapped inside it.
  - Together the two come to about 12 acres. That matches the 12 acres the encyclopaedia gives for the main campus, so the second plot is probably part of the school. This is an inference and was not confirmed.
- **Mapped building names** inside the named plot: "CB block" (about 22 by 22 m) and "HB Block" (about 24 by 20 m). The other buildings are mapped only as outlines, without names or heights.
- **Kaifi Azmi Marg** runs along the south-west side of the campus and then bends east along its south side. A 2018 design study [v] also says the campus is approached from Kaifi Azmi Marg on its south-west side.
- **South of the campus** lie a cricket field of about 115 by 95 m, a basketball court, tennis courts and another pitch. Further south-east are two swimming pools, beside a mapped point for "DPS International School". A listing for DPS International [v] places that school in Sector X, "adjoining DPS Sports Complex". So the sports complex is probably this area south of the main campus. That is likely, but it is not confirmed.
- **The Ring Road** (Mahatma Gandhi Marg, four lanes, 60 km/h) runs 100 to 300 m east of the campus, from south-west to north-east.
- **The Pink Line of the Metro** runs along the Ring Road. Its nearest elevated station is Sir M. Vishweshwaraiah Moti Bagh [v], on the Ring Road about 1 km to the north. The next station south, Bhikaji Cama Place, is underground [v]. **The Moti Bagh flyover** [osm] carries the road over the junction about 600 m north of the school.
- **Neighbours** [osm]:
  - Major Som Nath Sharma Memorial Park, a walled park about 200 m to the west. It is named after a soldier, so it is a memorial: see section 8.
  - "Sangam Courtyard" and the Sangam cinema, about 350 m to the west. PVR rebuilt the old single-screen Sangam as a two-screen cinema in 2015 [v]. Whether it is open today was not confirmed.
  - DAV Public School and Auxilium school to the north-west, a government girls' senior secondary school to the north-east, and a CGHS dispensary.
  - Blocks of flats on every side.

### The campus as the school describes it [v]

The school's infrastructure page names these, without sizes, storeys or pictures that describe them:

- **Blocks**: A, B, C, CB, D, E-F, HB, HS and "Blossoms".
- **Halls and rooms**: an Assembly Ground, a Reception Area, a Senior Library and six junior libraries, an "AVH" (Audio Visual Hall, a name the school uses elsewhere), an "OAT" that the page does not expand (probably an open-air theatre, but this was not confirmed), a Music Centre, art rooms, a studio, a seminar room, laboratories, and a clinic.
- **For sport**: a swimming pool, a lawn bowls court, a fitness centre, a football ground, a cricket field, billiards, a basketball court, a squash court, table tennis, tennis and a yoga room.
- **Hostels**: a boys' hostel and a girls' hostel, for more than 400 boarders.
- **Newer additions**: an "IB Wing" and an "AI Innovation and Incubation Centre", both opened recently, the second in 2026.
- **Gates**: they are numbered. A school notice speaks of "Gate Number 3", so there are at least three.

### A design study that may not have been built [v]

In 2018 an architecture practice, AND Studio, published a proposal to rebuild the campus in four phases.

- It describes the campus as it then was: 6.1 acres, buildings at the front, a playground at the back, and a natural slope of up to 2.4 m along its length.
- It proposed reversing that order. A football field at the front, at the lowest level, administrative and multipurpose blocks facing each other across a central court, classrooms round three courtyards behind them, and an amphitheatre and a sunken court at the middle level. The facades were to be glass, exposed brick and aluminium fins.

Nothing found says whether any of it was built, and the 6.1 acres does not match the 12 acres given elsewhere. **Do not model the proposal as the school.**

### What could not be found

- **The gate.** No published photograph or text describing the main gate's shape, height, colour or material was found. Getty Images has about a hundred photographs tagged with the school, but its page could not be read, and the captions that could be seen show pupils indoors. Wikimedia Commons has no picture of the buildings.
- **What the buildings look like**: their storeys, materials and colours (brick, plaster, paint), roof shapes, and which block stands where on the plot.
- **Where the pool and the hostels stand** within the campus.
- **Whether the 2018 redevelopment was built**, in whole or in part.
- **The acreage**: 12 acres plus a 6-acre sports campus in the encyclopaedia, against 6.1 acres in the design study. The map suggests about 4 acres for the named plot and about 12 for the two plots together.
- **Whether the school's buses are yellow.** Delhi school buses are yellow by a long-standing rule [bk], but this school's fleet was not checked.

### How to model it until someone who knows it says otherwise

- Build the school as a walled plot at an angle to the grid, beside a road along its south-west side.
- The buildings are plain boxes of three or four storeys whose colour is to be decided. Leave a lawn or assembly ground between them, and the football ground on the south-east plot.
- Put a gate on Kaifi Azmi Marg with a name board in plain lettering: "Delhi Public School, R. K. Puram" and दिल्ली पब्लिक स्कूल, आर. के. पुरम. The emblem is not drawn, and the motto that goes with it is not written either.
- The shape of the gate, the colours and the arrangement of the blocks are open. They wait for a photograph, or for a description from someone who has seen them.
- A good scene: a row of school buses at the gate at going-home time, with an ice-lolly cart and parents' cars on the verge.

---

## 2. What an iconic Delhi still lacks

The catalogue and the island had Old Delhi's big three (the Red Fort, Jama Masjid and Chandni Chowk), the axis from Rashtrapati Bhavan to India Gate, Connaught Place, Humayun's Tomb, Purana Qila, Akshardham, the Lotus Temple, Hauz Khas, Deer Park, the Qutub Minar and the Taj Mahal. The gaps:

- **Old Delhi's life**:
  - Chandni Chowk as it is since 2021: red sandstone paving, closed to motor traffic by day [v].
  - Its row of places of worship of every faith [v].
  - Paranthe Wali Gali, the jalebi corner and Ghantewala, which reopened in 2024 [v].
  - Karim's lane [v], the Khari Baoli spice market [v], and Lal Kuan's kite shops with kites over the roofs on 15 August [v].
  - Overhead wires and cycle rickshaws [bk].
- **The river**: the Yamuna is in the catalogue, but nothing stands on it. The Signature Bridge is the city's tallest structure [v] and a natural back-of-board landmark.
- **The centre**:
  - Gurudwara Bangla Sahib [v], Agrasen ki Baoli [v] and Jantar Mantar's instruments [v].
  - The Hanuman Mandir at Connaught Place [v].
  - The Connaught Place flag, 90 by 60 ft on a 207 ft pole [v], and the mound of Palika Bazaar [v].
  - The National War Memorial beside India Gate [v], and the canopy east of India Gate, which has held a statue since 2022 [v].
- **South Delhi**:
  - Lodhi Garden's tombs [bk], Khan Market [bk], Safdarjung's Tomb [bk], Dilli Haat [bk] and Sarojini Nagar's stalls [bk].
  - The Ring Road with its flyovers, and the Metro on its viaduct.
  - R. K. Puram and the school.
- **What everyone who grew up there knows** [bk]: gully cricket in a colony park, the chaat cart, the sugarcane juice press, the baraat with its brass band and its row of lamp-bearers, auto stands, the paan shop, monkeys on Raisina Hill, and pigeons flown from roofs in Old Delhi.
- **Cars**, for the collector: Karol Bagh's accessory street, Kashmere Gate's parts market [v], the Auto Expo at Bharat Mandapam [v], the Statesman Vintage and Classic Car Rally from India Gate [v], white Ambassadors in Lutyens' Delhi [v/bk], and the first Maruti 800 [v].
- **Leave out**:
  - The Taj Mahal. It is 230 km away, the tile is full without it, and it is a tomb.
  - The new Parliament and the Central Vista government blocks (see section 8).

---

## 3. Forty-eight things for the tile

Heights at the city's scale of 3.2 m to a unit are given in the "units" column of section 4. Marked **[named]** are the four the collector named. "Model exists" means a model is in `delhi-models.ts`, in `prototype/island/models`.

### A. Old Delhi (north)

1. **The Red Fort** (model exists). A long octagon of red sandstone walls, 18 m high on the river side and 33 m on the city side [v]. It has two great gates, each behind a barbican [v]: the Lahori Gate on the west, which faces Chandni Chowk, and the Delhi Gate on the south, with a life-size stone elephant on each side [v]. The Delhi Gate faces the opening view, so its elephants are worth the triangles. Inside: the white marble Diwan-i-Khas and the small three-domed white Moti Masjid [v]. The fort was red and white in its day [v]. A flag flies over the Lahori Gate [bk].
2. **Jama Masjid**. A mosque on a plinth about 10 m above the street [v]. It faces west [v], so its back wall is on the west and its biggest gate, three storeys high, is on the east, towards the Red Fort [v]. Two minarets 41 m high of red sandstone with vertical white marble stripes stand at the north-east and south-east corners [v]. Three marble domes with gold finials are on the west side [v], striped in black [bk]. The red courtyard is about 99 m square, with a marble tank in the middle [v]. Broad flights of steps lead to the gates on three sides [v].
3. **Chandni Chowk**. A straight avenue about 1.3 km long from the Lahori Gate west to Fatehpuri Masjid [v]. Since 2021 it has been paved in red sandstone and granite and closed to motor traffic by day [v]. Along it: a median with bollards and planters [bk], shopfronts of two and three storeys under a tangle of wires [bk], and cycle rickshaws and handcarts. The clock tower that gave its centre the name Ghantaghar is gone; the name remains [v].
4. **The row of faiths on Chandni Chowk** [v]. From the east end: the Digambar Jain Lal Mandir in red stone, the Gauri Shankar temple, Gurdwara Sis Ganj Sahib, the Sunehri Masjid, and the Central Baptist Church. The order along the street, and which stand on which side, need a map check [bk]. Count them as one thing: a street where every faith stands side by side. Draw each plainly (see section 8).
5. **Fatehpuri Masjid**, at the west end of Chandni Chowk [v]. A red sandstone mosque with a single dome that closes the avenue's view [bk].
6. **Paranthe Wali Gali** [v]. A lane only a few metres wide, off Chandni Chowk. Its shops have open fronts, with flat iron pans and stacks of steel tiffins [bk]. The best-known shop is Pt. Gaya Prasad Shiv Charan [v] (see section 7).
7. **The jalebi corner in Dariba Kalan** [v]. A small shop at a corner with a wide shallow pan of oil, orange coils of jalebi and a crowd. Old Famous Jalebi Wala is the one in the encyclopaedia.
8. **Ghantewala** [v]. A sweet shop on Chandni Chowk, open since 1790 by its own account. It closed in 2015 and reopened in 2024 under the family's seventh and eighth generations. A narrow front with trays of sweets behind glass, and a bell (the "ghanta" in its name) can hang over the door.
9. **Karim's** [v], in Gali Kababian off the south side of Jama Masjid. A narrow lane of kebab grills under bare bulbs. Lay it out as a lane scene with smoke rising from the grills.
10. **Khari Baoli** [v], at the west end beyond Fatehpuri. A spice and dry-fruit market: jute sacks stacked on the pavement, porters with loads on their heads, and handcarts. It is a scene of colours: red chilli, yellow turmeric and brown sacks.
11. **Kites over Old Delhi** [v]. On 15 August the roofs of the walled city fill with people flying fighter kites (patang). Lal Kuan has the oldest kite market [v]. A dozen kites on strings from the roofs, the shop in Lal Kuan with kites hung like bunting, and one kite caught in the wires.
12. **Pigeons from a roof** [bk]. A bamboo cage on a roof in Old Delhi and a flock wheeling over it, flown by a man with a long pole. A moving thing that costs little.
13. **A lane of Old Delhi with a cycle rickshaw stand** [bk]. Rickshaws with hoods of red, blue or green oilcloth, the pullers resting on their seats, and an e-rickshaw or two.
14. **Kashmere Gate's motor parts market** [v]. Among the largest for car parts in the city. Narrow shops of tyres stacked in columns, bumpers and silencers hung outside, and a mechanic's ramp on the street.
15. **The Yamuna** with ghats [bk]. A broad brown-green river along the east edge, with sandbanks and stepped ghats with a few small boats. Not blue.
16. **The Signature Bridge** [v]. A cable-stayed bridge at Wazirabad, north of the walled city. Its single steel pylon leans, bends at the top into the shape of a bow, and holds a glass viewing box. The pylon is 154 m above the deck in most sources (151, 165 and 175 m are also given). The tallest thing on the tile: back of the board, north-east.

### B. The centre: Connaught Place and Lutyens' Delhi

17. **Connaught Place** (model exists). Two-storey white colonnades in concentric rings, the Inner and Middle Circles and the Outer Circle (officially Indira Chowk) [v], with radial roads [v] and a round central park.
18. **The flag over Connaught Place** [v]. The national flag, 90 by 60 ft, on a 207 ft (63 m) pole in the central park since 2014. A thin grey mast with a great flag: one of the tallest things on the tile, and it reads from anywhere. Draw the flag correctly: saffron on top, white with a navy blue wheel of 24 spokes in the middle, green below [bk, the standard flag]. Never torn, never on the ground, and never on a vehicle or a shop sign.
19. **Palika Bazaar** [v]. An underground market built in the late 1970s under the park at the Inner Circle. From above it is a low green mound with entrances and air vents [bk].
20. **Rajiv Chowk station** [v], under Connaught Place. Yellow Line and Blue Line. Above ground it is only entrance kiosks with the Metro's sign.
21. **Shops of Connaught Place on its colonnades**: Wenger's bakery, in its hundredth year in 2026 [v], the Indian Coffee House on the second floor of Mohan Singh Place [v], and Kake Da Hotel on the Outer Circle [v]. Plain boards, section 7.
22. **Hanuman Mandir, Connaught Place** [v, that it is near Connaught Place]. An old temple of the god Hanuman, with a red-orange spire [bk] and flower stalls at its gate [bk].
23. **Jantar Mantar** [v]. An eighteenth-century observatory of rust-red plastered masonry [bk]. The great Samrat Yantra is a right-angled triangle with a staircase up its slope, flanked by curved quadrants [bk]. The other instruments are hollow drums and bowls [bk]. Instruments only (section 8).
24. **Agrasen ki Baoli** [v]. A stepwell on Hailey Road, 60 m long and 15 m wide, with 108 steps going down between walls of three tiers of arched niches. A long grey stone slot in the ground: a striking shape from above, and cheap to build. A small three-sided mosque stands at its west end [v].
25. **Gurudwara Bangla Sahib** [v]. On Baba Kharak Singh Marg, west of Connaught Place. A white building [bk] under a golden onion dome, with a tall flagpole (the Nishan Sahib, saffron) [v, the flagpole; bk, the colour], and a large square tank, the sarovar, 225 by 235 ft with a walkway round it [v]. People with covered heads walk round the tank. See section 8.
26. **Rashtrapati Bhavan** [named] (model exists). It closes the west end of the axis on Raisina Hill. Its copper-green dome stands 55 m above the forecourt, twice the height of the building [v]. In the forecourt stands the Jaipur Column [model exists; bk, details].
27. **North Block, South Block and Vijay Chowk** [bk]. Two long matching secretariat buildings of cream and red sandstone, one on each side of the axis below Rashtrapati Bhavan. Each has a tower with a dome and colonnades. Vijay Chowk is the open square at their foot, with fountains. Show the buildings and leave the offices in them unnamed.
28. **Kartavya Path** [v, the name since 2022]. The ceremonial avenue, about 2.5 km from Vijay Chowk to India Gate. It has lawns on both sides, long narrow canals with small bridges, red-sandstone walks, lamp-posts of cream and red stone, and rows of trees [bk]. On a summer evening: families on the lawns, ice-cream carts and balloon sellers [bk].
29. **India Gate** [named] (model exists). A war memorial arch of buff sandstone on a low red base, 42 m high, with a 9.1 m main arch and a shallow bowl on top [v]. The main arch opens east and west along the axis [bk]. It stands in the C-Hexagon, about 625 m across [v].
30. **The canopy east of India Gate** [v]. A 22 m stone cupola on four columns, about 150 m east of the arch. Since September 2022 it has held a statue of Subhas Chandra Bose. A dark figure under a pale canopy. See section 8 on how plainly to show it.
31. **The National War Memorial** [v]. In the C-Hexagon beside India Gate, about 40 acres, in four concentric rings: an outer ring of trees, a ring of granite walls with a tablet for each soldier who died, a covered gallery with bronze murals, and an inner ring with a tall obelisk and an eternal flame at its foot. The Amar Jawan Jyoti flame was moved here from India Gate in 2022 [v]. The obelisk's height was not found. Very good from above, since it is all rings: section 8.
32. **The National Stadium forecourt and the vintage car rally** [v]. The Statesman Vintage and Classic Car Rally has run in Delhi since 1964. Its 59th edition was flagged off on 8 February 2026, with over a hundred cars, among them a 1936 Rolls-Royce and a 1906 Renault [v]. It was to start from the National Stadium near India Gate, though one report says it began at Statesman House [v]. A line of old cars on the forecourt is a place for heroes.
33. **Purana Qila** [bk]. A sixteenth-century fort of rough red and buff stone, about 1 km east of India Gate [catalogue]. Its long walls have three great gates. The Bara Darwaza is a tall gate between two round bastions, with small domed pavilions on top. There is a moat or lake on its west side.
34. **Bharat Mandapam and the Auto Expo** [v]. The rebuilt exhibition centre at Pragati Maidan, east of India Gate. It was the main venue of the Auto Expo, as part of the Bharat Mobility Global Expo, in January 2025. Its building has an oval, shell-like form [bk]. A hall open on one side with cars on turntables makes a natural place for heroes.
35. **Karol Bagh's car accessory street** [v]. Known for alloy wheels, music systems, seat covers, LED lights, and modification work. Naiwala street is named as a centre of the trade in parts. Shops with wheels hung across their fronts, a car on a ramp being fitted, and a worker kneeling at a wheel. It lies west of Connaught Place [bk]. A place for heroes.
36. **Akshardham** [v]. On the east bank of the Yamuna. A mandir 43 m high, 96 m wide and 109 m long, of pink Rajasthani sandstone and white Carrara marble, with nine domes. It stands on a plinth carved with 148 life-size elephants, and is surrounded by a lake, Narayan Sarovar, with 108 water spouts. A colonnade round it is in many photographs [bk]. See section 8.

### C. South Delhi

37. **Khan Market** [bk]. A U-shaped market of two-storey blocks, with flats over the shops, round a car park. Bookshops, cafés, and cars parked nose-in. Khan Chacha's kebab counter is here by the catalogue, but its status was not checked.
38. **Lodhi Garden** [bk]. A park of lawns and old trees with fifteenth- and sixteenth-century tombs. The Bara Gumbad is a big square tomb of grey stone with one dome. The Sheesh Gumbad is a matching square tomb with traces of blue tiles. Sikandar Lodi's tomb is octagonal, inside a walled garden [v, its name and place]. Morning walkers and joggers, and dogs on leads.
39. **Humayun's Tomb** [v]. A tomb 47 m high in a walled charbagh of about 30 acres, cut into four by water channels and paths.
    - The tomb is red sandstone banded with white marble, on a broad arcaded plinth about 8 m high and 91 m wide.
    - On top: a white marble double dome on a high drum, with a 6 m brass finial, and small chhatris round it.
    - Its west gate is the one in use, and it is about 16 m high.
    - Near the river, south-east of Purana Qila.
40. **Safdarjung's Tomb** [bk]. The last of the great garden tombs. A buff and red tomb with a white-and-buff bulbous dome, on a high plinth, in a walled garden with a gatehouse. Smaller and steeper than Humayun's.
41. **Dilli Haat, INA** [v, its place]. An open-air crafts bazaar of small brick-and-stone stalls under tiled or thatched roofs, with food stalls from each state [bk]. Across Aurobindo Marg from the INA market [bk].
42. **Sarojini Nagar market** [v, its place]. A market of clothes stalls packed into narrow lanes, with racks of clothes, awnings and crowds [bk].
43. **The Ring Road's flyovers with the Metro viaduct over them** [v, the Pink Line runs along the Ring Road with elevated stations]. Concrete flyovers carry the Ring Road over its junctions. Moti Bagh, AIIMS and Dhaula Kuan are the names Delhi knows [bk, apart from Moti Bagh, which is in the map data]. Alongside runs the Metro on single piers [bk]. This is the road worth driving (section 5).
44. **Delhi Public School, R. K. Puram** [named]. See section 1. On the Ring Road's south-west corner, with R. K. Puram's two-storey blocks round it.
45. **Gully cricket in a colony park** [bk]. A worn brown pitch in a green park among R. K. Puram's blocks. Brick or stick stumps, eight boys, one batting, a fielder in the bushes and the ball in the air. Put it beside the school.
46. **Hauz Khas** [named] (model exists). The tank, Firoz Shah's tomb and the L of the madrasa, Deer Park and the village, as in [delhi-hauz-khas.md](delhi-hauz-khas.md).
47. **The Qutub Minar** (model exists). It stands 72.5 m. Its base is 14.3 m across and its top 2.7 m. It has five storeys, the lower three of red and buff sandstone with fluted shafts, the top two partly white marble. A balcony on corbels rings each storey [v]. Show it on lawns, with the Alai Darwaza, a red gateway with a white dome [bk], beside it. See section 8 about the mosque at its foot.
48. **The Lotus Temple** (model exists). A Bahá'í House of Worship. Its 27 white marble-clad petals stand in three rings of nine, over nine doorways, with nine pools round them [v]. It is 34 m high in most popular sources and 40.8 m in the encyclopaedia [v]: the two disagree. Its diameter is 70 m.

**Small scenes to scatter between them**, each counted only if built as a scene:

- a chaat cart with steel pots, golgappe in a glass case and a ring of people eating from leaf bowls;
- a sugarcane juice press with a wheel that turns;
- a paan shop the size of a cupboard;
- a chai stall with a kettle on a stove and glasses;
- a baraat at night: the groom on a white mare, a brass band in red and gold uniforms, men carrying lamps on their heads in a line either side, and dancing in front [bk];
- an auto-rickshaw stand;
- the white Ambassador (section 6);
- monkeys on the parapets of Raisina Hill [bk];
- a dhaba with charpoys on the Ring Road.

Choosing the 40 that are built from these 48 and the scenes is for the builder and the collector. The ones that matter most are listed at the end of section 4.

---

## 4. The layout

### Where things are in the real city

Distances from the centre of Connaught Place, read from OpenStreetMap, in kilometres east (E) and north (N). West and south are negative.

| Place | E | N |
| --- | ---: | ---: |
| Signature Bridge | 1.3 | 8.2 |
| Kashmere Gate ISBT | 1.1 | 4.1 |
| Fatehpuri Masjid | 0.3 | 2.7 |
| Red Fort | 2.1 | 2.7 |
| Jama Masjid | 1.3 | 2.1 |
| Lal Kuan | 0.6 | 1.7 |
| Connaught Place | 0 | 0 |
| Jantar Mantar | -0.3 | -0.5 |
| Bangla Sahib | -1.0 | -0.4 |
| Agrasen ki Baoli | 0.5 | -0.6 |
| Bharat Mandapam | 2.4 | -1.6 |
| Rashtrapati Bhavan | -1.9 | -1.9 |
| India Gate | 1.0 | -2.1 |
| Akshardham (east bank) | 5.7 | -2.1 |
| Purana Qila | 2.4 | -2.5 |
| Khan Market | 0.6 | -3.6 |
| Lodhi Garden | 0.2 | -3.9 |
| Humayun's Tomb | 3.1 | -4.3 |
| Nizamuddin Dargah | 2.2 | -4.5 |
| Safdarjung's Tomb | -0.6 | -4.7 |
| Sarojini Nagar | -2.3 | -6.1 |
| Dilli Haat INA | -1.0 | -6.4 |
| **DPS R. K. Puram** | **-4.2** | **-6.6** |
| Hauz Khas | -2.5 | -8.7 |
| Lotus Temple | 3.8 | -8.7 |
| Qutub Minar | -3.3 | -11.9 |

The Yamuna runs north to south about 3 to 4 km east of Connaught Place at the Red Fort's latitude [bk]. In short:

- Old Delhi is 2 to 3 km north of Connaught Place.
- The axis runs east and west 2 km south of it, 3 km long.
- South Delhi spreads 4 to 12 km south, with the school in its west and the Lotus Temple in its east.
- The whole spans about 10 km east to west and 20 km north to south. Squeezing it into 208 by 226 means about 1 unit to 50 m across and 1 unit to 90 m from north to south. That is not one scale, and it does not need to be: keep the order, not the distances.

### Heights side by side

At 3.2 m to a unit:

| Thing | Height in life | At scale (units) | Suggested |
| --- | --- | ---: | --- |
| Signature Bridge pylon | 154 m above the deck (sources 151 to 175) | 48 | 45 to 48 |
| Qutub Minar | 72.5 m | 23 | 26 to 30 (a landmark may be taller) |
| Flag mast, Connaught Place | 63 m (207 ft) | 20 | 20 |
| Rashtrapati Bhavan dome | 55 m above the forecourt | 17 | 17 to 20 |
| Humayun's Tomb | 47 m | 15 | 15 to 18 |
| Akshardham | 43 m | 13 | 13 to 16 |
| India Gate | 42 m | 13 | 16 to 20 |
| Jama Masjid minarets | 41 m, on a 10 m plinth | 13 | 15 to 18 |
| Lotus Temple | 34 or 40.8 m (sources differ) | 11 to 13 | 12 to 14 |
| Red Fort walls | 18 to 33 m | 6 to 10 | 8 to 10 |
| R. K. Puram blocks | about 2 storeys | | 2 storeys |

Keep this order: the bridge, then the Minar, then the flag, the dome of Rashtrapati Bhavan, Humayun's Tomb, India Gate and the minarets. In life India Gate is lower than the dome on Raisina Hill. The hill itself adds height [bk], so keep India Gate under the dome.

### The board

North at the top, x from -104 (west) to 104 (east), z from -113 (north) to 113 (south).

```
z -113 ────────────────────────────────────────────────── north
       Kashmere Gate parts   Lal Kuan kites        Signature Bridge (48) ~~~~
       Khari Baoli  Fatehpuri ── CHANDNI CHOWK ── Red Fort (10)    ~~ YAMUNA ~~
                    Karim's lane   Jama Masjid (18)  Delhi Gate+elephants  ~~~~
z  -50  RING ROAD (north side, at grade)                                 ~~~~
       Karol Bagh       Bangla Sahib   CONNAUGHT PLACE + flag (20)   Ring Road
       (cars)           Jantar Mantar   Hanuman Mandir   Baoli        along river
z  -10                                                        Bharat Mandapam
       Rashtrapati  Vijay Chowk ═══ KARTAVYA PATH ═══ INDIA GATE ══ canopy  ~~~~ Akshardham
       Bhavan (20)  N/S Block            hexagon + War Memorial  Purana Qila ~~~ (east bank)
z  +30                      Khan Market    Lodhi Garden        Humayun's Tomb (17) ~~
       RING ROAD            Safdarjung's Tomb                                 ~~
       west side      Sarojini   Dilli Haat        ── RING ROAD south, flyovers ──
z  +65       DPS R. K. PURAM ═ Moti Bagh / AIIMS flyovers ═ Metro viaduct
       woods  cricket park, R. K. Puram blocks
z  +90 Qutub   Hauz Khas tank, madrasa, village            Lotus Temple (14)
       Minar (28)   Deer Park
z +113 ────────────────────────────────────────────────── south
```

How this answers the view from the south-south-east:

- **Tall things at the back.** The Signature Bridge (48) stands in the north-east corner, across the river, where its 60-odd units of hidden ground fall on water and the board's edge. The Red Fort, Jama Masjid and Connaught Place's flag stand in the northern half.
- **The axis lies across the view.** Kartavya Path runs east and west, so the whole avenue is seen side-on, from Rashtrapati Bhavan at the west end to India Gate at the east. What hides the avenue is anything tall on its south side: keep the lawns and canals south of it, and put Khan Market and Lodhi Garden, which are low, beyond them.
- **Fronts that face the view.**
  - The Red Fort's **Delhi Gate** faces south, and the opening view sees it with its elephants.
  - Jama Masjid's **great east gate** faces the Red Fort and is seen from the south-east.
  - India Gate's main arch opens east and west, so the view sees its south face with its smaller side arch [bk], and the east face at an angle. Turn nothing: that is how it stands.
- **The Qutub Minar is the trouble.** It is the second tallest thing, and in life it is the southernmost. At 28 units high it hides about 36 units of ground to its north-north-west. Put it in the south-west corner and give the ground behind it to what really lies north of it: the woods of Mehrauli and the Ridge [bk]. The school, Hauz Khas and the cricket park then stand to its north-east, out of its shadow. Check this with `hiddenBy` before anything else is placed.
- **The school stands at the front**, on the south-west of the Ring Road, as it does in life. It is low (two to four storeys), so nothing behind it is lost, and the opening view sees it well.
- **Humayun's Tomb** (17) is in the south-east, near the river. What it hides to the north-north-west is Lodhi Garden's edge and the canopy's surroundings. Keep the War Memorial's rings out of that wedge.
- **The Lotus Temple** stands in the south-east corner, low enough not to hide much. Its outline is read best from the side, which is how the view sees it.

The things to place first, because everything else moves round them: the river, the Ring Road, Kartavya Path, Chandni Chowk, the Qutub Minar's corner and the school.

---

## 5. Roads and what moves

### Roads worth driving

1. **Kartavya Path**, from Vijay Chowk to India Gate and round its hexagon. A wide avenue with a median of lawn, canals beside it, and the arch at the end. It is the road worth watching on this tile, and seen side-on in the opening view. Heroes look best on it.
2. **The Ring Road**, Mahatma Gandhi Marg. A loop of four lanes each way [osm: lanes=4 on each carriageway; bk, that it is divided] round the old and new city. In life it runs along the river on the east, past the Red Fort and ISBT Kashmere Gate on the north, down the west, and along the south past Moti Bagh and AIIMS [bk].
   - **Its pattern is flyovers**: in life most crossings are carried over by flyovers [bk], so the Ring Road is at grade with a short flyover at each crossing, and the Metro on a viaduct beside it in the south-west.
   - This differs from North America's continuous raised ring, which must not be repeated. It also fits the engine, since two roads never cross on the level.
3. **The circles of Connaught Place.** Concentric rings with radials. Europe has roundabouts and a star, which no other tile is to repeat. Connaught Place is concentric circles round a park, which is a different thing. Keep India Gate's hexagon and Connaught Place's rings, and do not add other roundabouts.
4. **A lane of Old Delhi.** Chandni Chowk itself is closed to motor traffic by day [v], so it carries no cars. Cycle rickshaws, handcarts and people walking go on fixed lines of their own, as Hong Kong's trams do. A narrower lane south of it, towards Jama Masjid, can carry a slow route of autos and scooters.
5. **The Signature Bridge**, crossing the river to the east bank and back: a road along water with the pylon overhead. A good place to see a hero.

**Traffic keeps left** [bk, Indian rule of the road].

### What traffic looks like [bk unless marked]

- Mostly small white and silver hatchbacks and saloons, and white app cabs.
- **Auto-rickshaws** in green with a yellow roof, running on CNG. From 1 January 2027 new three-wheelers must be electric, by the catalogue [v].
- E-rickshaws in every colour.
- Scooters and motorcycles everywhere.
- **Buses**: DTC's electric buses of 12 m, and the 9 m DEVI electric buses, reported as orange, and as green and orange [v]. Older CNG buses are in green or red, and the cluster buses in orange.
- **Trucks with painted backs** ("Horn OK Please", flowers and eyes): they are allowed into the city mostly at night by a long-standing rule [bk]. Put them on the Ring Road after dark.
- **White Ambassadors** on the roads of Lutyens' Delhi [bk]. The car was made from 1957 to 2014 [v], and the official white one is the picture of the government car.

The engine has no vehicles of a tile's own shape in its traffic. So autos, cycle rickshaws and DTC buses are built as `train`s on lanes of their own, as Hong Kong did with its trams and buses. Note that for the engine.

### The Metro

- The trains are stainless steel, 3.2 m wide, with a stripe in the colour of their line along the body [v]. The line through Connaught Place is the Yellow Line; the one by the school, the Pink Line.
- On the tile, one viaduct is enough. Run it along the Ring Road in the south-west, past the school and over the flyovers, with an elevated station like Moti Bagh's. The line can end at both ends and shuttle back, which `rail.ts` can do.
- A station is a box on two rows of piers, with a curved roof of sheet metal over the platforms, stairs down to the pavement, and the Metro's name board [bk]. Check the shape against a photograph of an elevated Pink Line station.
- Trains of four, six or eight cars.

### The river

Small boats at the ghats [bk]. No ferries.

---

## 6. For a collector of toy cars

- **The Buddh International Circuit** [v]. At Jaypee Sports City, Greater Noida, about 40 to 50 km south-east of the centre [bk, the distance].
  - It is 5.125 km long, with 16 turns. Its best-known feature is a long banked multi-apex right-hander at turns 10, 11 and 12. It climbs about 14 m through the first three corners.
  - It held the Indian Grand Prix in Formula One from 2011 to 2013, and MotoGP once, in 2023. MotoGP is not on the 2026 calendar.
  - In 2026 it hosts the Indian Racing League and the F4 Indian Championship. The Adani Group is reported to be buying its owners' parent company.
  - It is too far away for the tile. Either leave it out, or put the banked turn as a short raised loop in a corner with a sign saying "Greater Noida", as the Taj was to say "Agra". That is a question for the collector.
- **The Statesman Vintage and Classic Car Rally** [v]. Every winter, starting near India Gate: see item 32. A line of pre-war Rolls-Royces, Bentleys, Mercedes and a 1966 Mustang on show is exactly a place for heroes.
- **The Auto Expo** [v]. At Bharat Mandapam, Pragati Maidan, in January 2025. It had been held at the India Expo Mart in Greater Noida in earlier years [bk]. A hall with turntables: item 34.
- **The cars Delhi is known for**:
  - The Hindustan Ambassador [v], a rebadged Morris Oxford III built 1957 to 2014. White with a beacon on the roof for officials [bk], and black with a yellow roof as a taxi [bk].
  - The Premier Padmini [v], the Ambassador's rival, with a waiting list of nearly five years in the early 1980s. It was a taxi above all in Mumbai [bk].
  - The Maruti 800 [v]. The first one was handed over on 14 December 1983. Maruti later bought it back, restored it and put it on show at its headquarters in Delhi. Show a red 800 on a plinth or in a showroom window. Do not copy its number plate onto the toy: it is the plate of a private person.
- **Where cars are sold, mended and shown**:
  - Karol Bagh for accessories and modification [v].
  - Kashmere Gate for parts [v].
  - Mayapuri in West Delhi for used and refurbished parts [v]. It is also known for scrap yards [bk].
  - Car meets and showrooms along the main roads [bk].
- **Smaller things a Delhi driver knows** [bk]:
  - a puncture-repair stand by the road, with a tyre on a post as its sign;
  - a car wash with a man and a bucket by a parked line of cars;
  - the CNG queue at a filling station;
  - a parking attendant with a whistle in Connaught Place;
  - the speed and noise of the Ring Road at night.

---

## 7. Signs and names

### Languages and scripts [v]

The Delhi Official Language Act, passed in 2000 and in force from 2003, makes Hindi the first official language and Punjabi and Urdu the second. It asks that official signboards carry Urdu and Punjabi too. A 2024 memorandum of the Delhi government sets the order on boards as Hindi, English, Punjabi, Urdu, with letters of the same size, and a 2026 circular calls it binding. Reports say most boards still show only Hindi and English.

So:

- road names: Hindi and English, with Punjabi and Urdu below on boards in New Delhi;
- shops: Hindi and English, often only English in Connaught Place and South Delhi;
- Urdu: around Jama Masjid;
- Gurmukhi: at gurdwaras.

**Examples, to be checked by a reader of each script before they go on a sign**:

| Meaning | Devanagari (Hindi) | Gurmukhi (Punjabi) | Nastaliq (Urdu) |
| --- | --- | --- | --- |
| Delhi | दिल्ली | ਦਿੱਲੀ | دہلی |
| Chandni Chowk | चाँदनी चौक | ਚਾਂਦਨੀ ਚੌਕ | چاندنی چوک |
| Red Fort (Lal Qila) | लाल क़िला | ਲਾਲ ਕਿਲ੍ਹਾ | لال قلعہ |
| Jama Masjid | जामा मस्जिद | ਜਾਮਾ ਮਸਜਿਦ | جامع مسجد |
| India Gate | इंडिया गेट | ਇੰਡੀਆ ਗੇਟ | انڈیا گیٹ |
| Kartavya Path | कर्तव्य पथ | ਕਰਤੱਵਯ ਪਥ | کرتویہ پتھ |
| Connaught Place | कनॉट प्लेस | ਕਨਾਟ ਪਲੇਸ | کناٹ پلیس |
| Hauz Khas | हौज़ ख़ास | ਹੌਜ਼ ਖ਼ਾਸ | حوض خاص |
| Kaifi Azmi Marg | कैफ़ी आज़मी मार्ग [osm] | | |
| Metro | मेट्रो | ਮੈਟਰੋ | میٹرو |

Trades for invented shops (the safest signs, since a trade is nobody's shop), in Devanagari:

- मिठाई (sweets), चाट (chaat), चाय (tea), पान (paan), पराँठे (parathas), जलेबी (jalebi), गन्ने का रस (sugarcane juice);
- पतंग (kites), मसाले (spices), बैंड (band);
- टायर (tyres), पंक्चर (puncture repair), ऑटो पार्ट्स (auto parts), कार एक्सेसरीज़ (car accessories), सर्विस सेंटर (service centre).

The engine has a `DEVANAGARI` font. It has nothing for Gurmukhi or Urdu, and Nastaliq is written right to left, joined, with letters that change shape. A tile that wants Urdu or Punjabi on a board must name its own font and check that the letters join. If that is too much, Hindi and English alone are true to most of Delhi's boards today.

### Real names that could go on a board

Plain lettering on a plain board, never a logo. "Open" means a source of 2024 or later shows it trading. Check each in the script it will be written in before use: the spellings in Devanagari below are what a board would normally say, not read off the shop's own board.

| Name, as lettered in English | Where | Open today? | Note |
| --- | --- | --- | --- |
| Ghantewala | Chandni Chowk | Yes, reopened 2024 [v] (August or November; sources differ) | घंटेवाला |
| Karim's | Gali Kababian, Jama Masjid | Listed as trading [v], no 2026 news | करीम्स |
| Natraj Dahi Bhalle Wala | Chandni Chowk | Listed as trading [v] | नटराज दही भल्ले वाला |
| Pt. Gaya Prasad Shiv Charan | Paranthe Wali Gali | Listed as trading [v]; a second outlet exists | |
| Old Famous Jalebi Wala | Dariba Kalan corner | Named in the encyclopaedia [v]; 2026 status not checked | |
| Wenger's | A Block, Connaught Place | Yes, centenary article August 2026 [v] | |
| Indian Coffee House | Mohan Singh Place, Connaught Place | Yes, January 2026 [v] | |
| Kake Da Hotel | Outer Circle, Connaught Place | Listed with hours [v], undated | |
| United Coffee House | Connaught Place | Not confirmed | Leave off until checked |
| Haldiram's (the original) | Chandni Chowk | Not checked | A large company with a strong logo. Better left as a trade sign. |
| Moti Mahal | Daryaganj | Not checked | |
| Khan Chacha | Khan Market | Not checked | |
| Regal | Connaught Place | **Closed March 2017** [v] | Do not put it up as a working cinema |
| Sangam | R. K. Puram | Rebuilt and reopened by PVR in 2015 [v]; status today not checked | Near the school |

Place names (Chandni Chowk, Karol Bagh, Kashmere Gate, Rajiv Chowk, Kartavya Path) are safe on road and Metro boards.

**Renames to get right** [v, from the catalogue]:

- Rajpath is **Kartavya Path** since 2022.
- The Amar Jawan Jyoti flame is at the **National War Memorial**, not under India Gate, since January 2022.
- Rajiv Chowk is the official name of Connaught Place's Metro station and of the place itself.
- The Moti Bagh Metro station's full name is **Sir M. Vishweshwaraiah Moti Bagh**.

---

## 8. Care

Every place of worship, tomb and memorial on the list, how to show it, and what must not be done near it. The rule on every one of them: nothing drives over it, nothing is parked on it, no hero is put on show at it, no joke is set in it, and no figure climbs it. Places for heroes keep away from all of them.

| # | Place | What it is | How to show it | What not to do |
| --- | --- | --- | --- | --- |
| 1 | Red Fort | Monument; the national flag is raised there on 15 August | Calm, flag over the Lahori Gate | No security scene, no soldiers with guns, nothing of the car bomb of November 2025 [catalogue] |
| 2 | Jama Masjid | Active mosque | Plainly, steps and gates, a few visitors walking | No figures praying, no cars in the courtyard, nothing on the domes or minarets |
| 4 | Lal Mandir, Gauri Shankar temple, Sis Ganj gurdwara, Sunehri Masjid, Central Baptist Church | Active places of worship side by side | All drawn with the same care and the same plainness, none bigger or brighter than its real size | No food sign touching a gate. No meat, alcohol or tobacco signs next to the temples, gurdwara or mosque. |
| 5 | Fatehpuri Masjid | Active mosque | Plainly, closing the avenue | As for Jama Masjid |
| 22 | Hanuman Mandir | Active temple | A spire and flower stalls | No monkeys-as-Hanuman joke |
| 24 | Agrasen ki Baoli | Protected monument, with a small mosque at one end | Empty steps, a few visitors | No figures falling in, no water joke |
| 25 | Gurudwara Bangla Sahib | Active gurdwara | Golden dome, the flag, the tank, people with covered heads walking slowly round it | No tobacco anywhere near, no cars inside, no one bathing as a joke, no shoes inside |
| 26–27 | Rashtrapati Bhavan, North and South Block | Seat of the head of state | Architecture only | No guards with guns, no parade of weapons, no names of offices or office-holders |
| 29 | India Gate | War memorial (names of the dead are carved on it) | Plainly, lit at night | Nothing on top of it, no hero on show under it, no balloons tied to it |
| 30 | The canopy and statue | Memorial statue | A dark figure under the canopy, no caption | No words, slogans or flags added |
| 31 | National War Memorial and its flame | War memorial | Rings and obelisk, a small flame | Nothing moving through it, no hero near it |
| 33 | Purana Qila | Protected monument | Walls and gate | No climbing figures |
| 36 | Akshardham | Active Hindu temple | From outside only, the plinth of elephants, the lake | No camera-in-hand tourists as a gag (photography is not allowed inside [bk]); nothing on the lake |
| 38 | Lodhi Garden's tombs | Tombs | Among lawns, walkers on the paths | No picnic on a tomb, no figures on the domes |
| 39 | Humayun's Tomb | Tomb, World Heritage Site [bk] | Garden and tomb in full | Nothing in the water channels, no car in the garden |
| 40 | Safdarjung's Tomb | Tomb | Garden and tomb | As above |
| 46 | Firoz Shah's tomb, Hauz Khas | Tomb | As in the Hauz Khas note | As in the Hauz Khas note |
| 47 | Qutub Minar and its complex | Monument | The tower and the Alai Darwaza on lawns | See below for the mosque |
| 48 | Lotus Temple | Active Bahá'í House of Worship, a place of silence | Petals and pools, people walking quietly | No noise, no crowd scene, nothing in the pools |
| 1 (§1) | Major Som Nath Sharma Memorial Park | Memorial park near the school | A walled park with trees | No cricket in it: put the cricket in another park |
| — | The national flag (Connaught Place, Red Fort) | National symbol | Correct colours and wheel, flying | Never torn, upside down, on the ground, on a vehicle or as a shop's decoration |

**Leave out altogether, as political or contested**:

- **The new Parliament building and the Central Vista redevelopment**, with its new offices and its renamed buildings (Kartavya Bhavan, Seva Teerth). It is in political argument. Leave the axis as the avenue, the two Blocks, Rashtrapati Bhavan and India Gate.
- **The mosque at the foot of the Qutub Minar** (Quwwat-ul-Islam). It was built from the material of 27 temples [v], and its history is argued over in courts and in politics. Show the tower, the Alai Darwaza and the lawns. Leave the mosque's ruins out, or as low unnamed walls.
- **Sunehri Bagh mosque** at the roundabout of that name near Udyog Bhawan [bk], whose removal was proposed and disputed. Not to be confused with the Sunehri Masjid on Chandni Chowk. Leave it out.
- **Jantar Mantar's road**, which is Delhi's place for protests [bk]. Show the instruments in their garden, and no crowds with banners.
- **Rajghat and the other samadhis by the river** [bk]: cremation memorials of national leaders. They are best left off rather than shrunk into a corner.
- **Nizamuddin Dargah** [bk]: an active Sufi shrine in narrow lanes, very crowded. It is better left off than drawn small.
- **The Republic Day parade** [catalogue]. Its tableaux carry state messages and its columns carry weapons. If a ceremony is wanted, the Beating Retreat at Vijay Chowk, with its camel-mounted band [bk], is gentler, but it is still military. Ask before building either.
- **Anything about riots, partitions, attacks, protests or disputes over places of worship**, and any number or date that points at one.
- **Cows as a joke.** A cow resting by a road is true to the city [bk], but it is never the punchline.
- **Hoax threats to schools.** The city's schools have had them [bk], and none of it belongs on the board.

---

## 9. Sources

All read on 2026-11-19.

**The school**

- Delhi Public School, R. K. Puram, encyclopaedia entry: https://en.wikipedia.org/wiki/Delhi_Public_School,_R._K._Puram
- The school's own site, home page and footer addresses: https://www.dpsrkp.net/
- The school's infrastructure page: https://dpsrkp.net/infrastructure-2/
- The school's history page: https://dpsrkp.net/history/
- CBSE affiliation record: https://saras.cbse.gov.in/saras/AffiliatedList/AfflicationDetails/2730017 (seen in search results only)
- AND Studio's redevelopment proposal (2018): https://worldarchitecture.org/architecture-news/ehmcn/dps-r-k-puram-facelift-by-and-studio.html
- DPS International listing, "adjoining DPS Sports Complex": https://www.cretaclass.com/en-in/school/dpsinternational (seen in search results only)
- R. K. Puram: https://en.wikipedia.org/wiki/R._K._Puram
- OpenStreetMap, through the Overpass API (https://overpass-api.de/) and Nominatim (https://nominatim.openstreetmap.org/): school plots, pitches, pools, roads, gates and neighbours near 28.5715 N, 77.1770 E, and the places in the table in section 4.
- Sangam cinema reopening (2015): https://www.business-standard.com/article/news-ians/capital-s-sangam-cinema-reopens-in-swish-revamped-form-115032700392_1.html
- Sir M. Vishweshwaraiah Moti Bagh metro station: https://en.wikipedia.org/wiki/Sir_M._Vishweshwaraiah_Moti_Bagh_metro_station

**Landmarks**

- Jama Masjid: https://en.wikipedia.org/wiki/Jama_Masjid,_Delhi
- Humayun's Tomb: https://en.wikipedia.org/wiki/Humayun%27s_Tomb
- Lotus Temple: https://en.wikipedia.org/wiki/Lotus_Temple
- Akshardham: https://en.wikipedia.org/wiki/Swaminarayan_Akshardham_(Delhi)
- India Gate: https://en.wikipedia.org/wiki/India_Gate
- Red Fort: https://en.wikipedia.org/wiki/Red_Fort
- Chandni Chowk: https://en.wikipedia.org/wiki/Chandni_Chowk
- Qutb Minar: https://en.wikipedia.org/wiki/Qutb_Minar
- Connaught Place: https://en.wikipedia.org/wiki/Connaught_Place,_New_Delhi
- Gurudwara Bangla Sahib: https://en.wikipedia.org/wiki/Gurudwara_Bangla_Sahib
- National War Memorial: https://en.wikipedia.org/wiki/National_War_Memorial_(India)
- Agrasen ki Baoli: https://en.wikipedia.org/wiki/Agrasen_ki_Baoli
- Rashtrapati Bhavan's central dome, official site: https://rashtrapatibhavan.gov.in/rbtour/central-dome (seen in search results)
- Signature Bridge: https://en.wikipedia.org/wiki/Signature_Bridge, https://housing.com/news/signature-bridge-wazirabad-delhi, https://structurae.net/en/structures/signature-bridge (heights compared through search results)

**Life, food and shops**

- Ghantewala: https://en.wikipedia.org/wiki/Ghantewala and https://www.outlooktraveller.com/experiences/food-and-drink/iconic-ghantewala-sweet-shop-makes-a-comeback-nearly-a-decade-after-closure
- Karim's, Natraj and Gaya Prasad Shiv Charan: https://www.eazydiner.com/delhi-ncr/karims-jama-masjid-110017, https://chalbanjare.com/delhi/things-to-do/best-places-to-eat-in-old-delhi, https://oteats.outlooktraveller.com/features/top-5-places-to-eat-at-dawatpur-asias-largest-food-court-in-delhi
- Wenger's centenary: https://oteats.outlooktraveller.com/whats-new/wengers-100-years-of-delhis-original-sweet-spot
- Indian Coffee House: https://thepatriot.in/?p=80882
- Kake Da Hotel: https://www.timeout.com/delhi/things-to-do/connaught-place and https://www.delhitourism.gov.in/dt/food_tour/kake-da-hotel.html
- Kites and Lal Kuan: https://www.thequint.com/amp/story/photos/kite-market-old-delhi-lal-kuan-independence-day-15th-august, https://theprint.in/feature/kites-are-the-spirit-of-freedom-no-law-can-stop-us-flying-them-people-of-old-delhi/98777, https://thepatriot.in/?p=55484
- Regal's closing: https://www.business-standard.com/article/news-ani/end-of-an-era-regal-cinema-had-its-final-curtain-call-117033100101_1.html

**Signs**

- Signage order and the Act: https://www.deccanherald.com/india/delhi/delhis-signages-to-display-information-in-hindi-english-punjabi-urdu-for-linguistic-diversity-3324406 and https://www.indiacode.nic.in/handle/123456789/13667

**Moving things**

- DEVI buses: https://www.autocarpro.in/news/delhi-government-introduces-devi-electric-bus-fleet-for-improved-connectivity-126223 and https://theprint.in/ground-reports/delhis-devi-buses-can-revolutionise-neighbourhood-mobility-fix-frequency-first/2941380/
- Metro rolling stock and line colours: https://www.railway-technology.com/projects/delhi-metro/ and https://theprint.in/india/delhi-aerocity-tughlakabad-corridor-colour-code-to-be-changed-from-silver-to-golden-dmrc/1943955

**Cars**

- Buddh International Circuit: https://en.wikipedia.org/wiki/Buddh_International_Circuit
- MotoGP's status: https://www.autocarindia.com/motor-sports-news/india-motogp-race-dropped-from-2026-calendar-436335 and https://www.autocarindia.com/motor-sports-news/up-government-signs-mou-for-motogp-india-return-439088
- The Statesman rally: https://www.thestatesman.com/statesman-vintage-car-rally/the-statesman-vintage-and-classic-car-rally-to-be-held-in-delhi-on-february-8-1503544184.html and https://www.thestatesman.com/statesman-vintage-car-rally/delhi-lg-vk-saxena-inaugurates-59th-statesman-vintage-and-classic-car-rally-featuring-rare-and-iconic-cars-1503553703.html
- Hindustan Ambassador and Premier Padmini: https://en.wikipedia.org/wiki/Hindustan_Ambassador
- The first Maruti 800: https://businesstoday.in/latest/trends/story/down-memory-lane-first-maruti-800-model-restored-completely-displayed-at-maruti-suzuki-hq-see-here-345554-2022-08-25 and https://zeebiz.com/automobile/news-first-maruti-800-sold-in-india-gets-lease-of-life-at-maruti-service-centre-86363
- Auto Expo 2025 venues: https://www.autocarpro.in/news/auto-expo-2025-a-detailed-guide-to-tickets-timings-events-and-more-124414 and https://telanganatoday.com/all-you-need-to-know-about-the-2025-bharat-mobility-global-expo
- Parts markets: https://business.mapsofindia.com/car-accessories/, https://www.billclap.com/blog/top-wholesale-markets-for-automobile-parts-in-delhi, https://www.motorindiaonline.in/delhi-bazaar-on-an-upswing-thanks-to-enterprising-wholesalers/

Some search results quoted mirror copies of encyclopaedia pages. One mirror carried text addressed to an AI, which was ignored. Nothing in this note rests on a mirror alone.

### Verified

- The school's address, its founding date, its named blocks and facilities, its hostels, its numbered gates and its junior wings.
- The school's two walled plots, the pitches and pools to its south, its neighbours, Kaifi Azmi Marg on its south-west, the Ring Road to its east, and Moti Bagh's elevated Pink Line station and flyover to its north (from map data).
- The 2018 redevelopment proposal and what it said of the old campus.
- Heights:
  - India Gate 42 m;
  - the Qutub Minar 72.5 m;
  - Jama Masjid's minarets 41 m and its plinth about 10 m;
  - Humayun's Tomb 47 m;
  - Akshardham 43 m;
  - Rashtrapati Bhavan's dome 55 m above the forecourt;
  - the flag mast 207 ft;
  - the Red Fort's walls 18 to 33 m;
  - the Signature Bridge pylon about 154 m (sources differ);
  - the Lotus Temple 34 or 40.8 m (sources differ).
- Chandni Chowk's 2021 redevelopment, its places of worship and its shops.
- The flag over Connaught Place, the canopy statue, and the move of the flame to the War Memorial.
- Agrasen ki Baoli's size, Bangla Sahib's tank, and the language law and signage order.
- The DEVI buses, the Metro's steel trains with line stripes, and Ghantewala's reopening.
- The Statesman rally of February 2026, the Auto Expo at Bharat Mandapam in 2025, and the Buddh circuit's length, turns, banking and status.
- The Ambassador's years, and the first Maruti 800's restoration.

### Not verified

- **The school's gate, its buildings' look, storeys and colours, the positions of its blocks, whether the 2018 plan was built, the acreage, and whether its buses are yellow.**
- The look of North and South Block, Purana Qila, Safdarjung's Tomb, Lodhi Garden's tombs, Khan Market, Dilli Haat, Sarojini Nagar, Jantar Mantar's instruments, Bharat Mandapam's shape and Hanuman Mandir.
- The shape of elevated Metro stations and their viaducts.
- Bus liveries other than DEVI's; the night rule for trucks; the colours of the Ambassador as a government car and as a taxi.
- Where exactly the faiths stand along Chandni Chowk, and which side each is on.
- Whether United Coffee House, Haldiram's, Moti Mahal, Khan Chacha, Old Famous Jalebi Wala and Sangam are open today.
- The distance to the Buddh circuit; the obelisk's height at the War Memorial.
- Every word in Gurmukhi and Urdu in section 7, which needs a reader of each script.
