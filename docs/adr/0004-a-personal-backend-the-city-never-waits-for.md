# A personal backend that the city never waits for

Adding a diecast from the phone needs a sign-in, a database, file storage and a server-side job that calls the generating service and holds its key, so Wimmelstadt has a backend: a Supabase project of its own (Wimmelstadt), in its own organisation (Diecast City), on the free plan. It is kept out of the collector's business organisation so that a hobby never lands on the company's bill, and in exchange it accepts the free plan's limits: a project pauses after a week without activity and file storage stops at 1 GB. The city therefore runs from files cached on the device, and only adding, finishing and editing need the backend awake.

## Considered Options

- **Another project in the business organisation.** It would never pause, but it costs about $10 a month and mixes hobby and company billing.
- **No backend, with heroes prepared at the desk and shipped inside the app.** Simplest to run, but the collector wanted to add a diecast on their own, from the phone.
- **Another provider.** None offered enough to outweigh tooling the collector already knows.

## Consequences

- A paused or unreachable backend must never produce an empty city.
- Every record carries its owner, although there is one collector today, so that others can be let in later without reshaping the data.
- One action exports everything: captures, models and records.
- Storage is the limit to watch. Captures and models have to fit under the plan's cap, or the plan has to change.
