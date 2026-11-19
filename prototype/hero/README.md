# Wimmelstadt: the hero trial

A throwaway, like the look prototype beside it. It answers one question from the [brief](../../docs/brief.md): which generating service turns pictures of a diecast into the best hero, and what each one costs.

It sends the same pictures to several image-to-3D generators on [fal.ai](https://fal.ai) and shows the models side by side.

## The parts

| File | What it does |
| --- | --- |
| `generators.mjs` | The generators on trial: which pictures each can use, what it is sent, and its listed price. |
| `prepare.mjs` | Cuts each picture down to the car, which removes printed captions, and writes a copy with no camera or location data. |
| `run.mjs` | Shows the plan and its price. With `--go` it uploads the pictures, runs the generators and saves the models. It keeps a ledger, so no run is paid for twice. |
| `record.mjs` | Adds a model that was generated some other way to the ledger. |
| `src/viewer.ts` | The page that shows the pictures and the models together. |

## A capture

Pictures, ledgers and models live in `captures/` at the top of the repository. That folder is private and is never committed: the collection is not public, and product pictures belong to their makers.

```
captures/<name>/
  capture.json     which picture shows which view
  source/          the pictures as they came
  prepared/        the copies that are sent
  runs.json        the ledger of paid runs
  models/          one .glb for each finished run
```

`capture.json` names a picture for each view it has:

```json
{
  "name": "Lamborghini Countach LB-WORKS",
  "item": "MGT00000",
  "views": { "front-left": "source/1.jpg", "rear-right": "source/2.jpg", "left": "source/3.jpg" }
}
```

The views are `front-left`, `rear-right`, `left`, `right`, `front`, `back` and `top`. Mini GT's own product pictures give the first three. The collector's own six photographs give the square-on ones.

## Running it

```bash
npm install
npm run pictures -- <name>       # prepare the pictures
npm run trial -- <name>          # show the plan and its price; sends nothing
npm run trial -- <name> --go     # run it
npm run dev                      # the page, at http://localhost:5185
```

Other switches for `npm run trial`: `--only meshy,rodin` limits the plan, `--collect` fetches runs that are paid for and not yet saved, and `--again` repeats a run the ledger already holds.

The key is read from `FAL_KEY` in `.env.local` at the top of the repository.

## Without a key: through fal's connector

fal also offers a connector that a Claude Code session signs in to through the browser, so that no key has to be on this machine. With it the session itself uploads the prepared pictures, runs the generators and fetches the models. `record.mjs` then adds each model to the ledger, so the page shows it beside the others:

```bash
node record.mjs <name> meshy <address of the .glb> --seconds 140
```

The key path stays, because the real hero pipeline will run on the backend, where only a key works.

## What each generator is given

Read from fal.ai's model pages on 18 November 2026.

| Generator | Listed price | What it takes |
| --- | --- | --- |
| Meshy 7.1 | $1.20 with textures | One to four views from any angle. |
| Rodin 2.5 | $0.40 | Up to five views of one object, in any order. |
| Hunyuan3D 3.1 Pro | $0.375, or $0.525 with several views | A square-on front view, plus back, left, right, top and a front corner. Without a front view it runs from one picture. |
| Tripo H3.1 | $0.40 with detailed textures | One picture, or front, left, back and right square-on. |

Every generator runs as its service ships it, with textures on. The one exception is Tripo's detailed textures, because decals are what is being judged.

## The page

- The pictures the models were made from run along the top.
- Each model has a cell: its generator, price, time, triangle count and texture size.
- **spin** turns all the models together. Dragging turns them by hand.
- **city angle** looks from 38 degrees above the ground through a long lens, as the city is seen.
- **city look** draws the models as the city would: its three bands of light, the texture's baked shine flattened into a few steps, and a dark outline. A generated model looks like a photograph of a toy, and in the city that would read as a sticker driving around. This is a quick preview in the page; the real flattening belongs at the bench.
- **shape only** hides the textures.
- **turn** on a cell turns that one model a quarter, because generators disagree about which way a car faces.
