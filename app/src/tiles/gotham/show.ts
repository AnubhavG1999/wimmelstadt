// What moves on Gotham besides the traffic: its air, the cast at their
// haunts, the machines, the animals, and the stories a director plays.
//
// The cast rest at posts of their own between stories, where the opening view
// sees them: Batman crouched on a gargoyle of Wayne Tower, Gordon by the
// Signal's lamp on the police roof, the Joker on Ace Chemicals' catwalk, the
// Penguin on the Lounge's roof, and so on round the tile. A story calls its
// cast to its stage: each gets there in its own way, on a line, through the
// air, under an umbrella or on foot, plays its part, and goes home again. A
// director chooses what plays, several stories at once, so that no figure is
// ever in two, no two share a stage, and each gets its turn: the longer since
// a story last began, the more it is owed. Nobody is hurt: a fight stops at
// the clash and a chase ends in an escape or a net.
//
// Written by the tile's main session. The figures, the machines, the animals
// and the air are builders' files; this file sets them going and directs
// them. Each is set going on its own, so that one that fails does not take the
// others with it. The stories themselves are in stories.ts, and what they are
// written with in stage.ts.

import type { Build } from '../../engine/tile';
import { buildAir, type Air } from './air';
import { buildBeasts, type Beasts } from './beasts';
import { buildCast, type Cast, type Figure, type Look } from './figures';
import { buildMachines, type Machines } from './machines';
import type { Place } from './models';
import { REGIONS } from './regions';
import { Solid } from './solid';
import { Lines, Rings, at, atEase, hidden, legBetween, still, S, type Id, type Leg, type Rest, type Spot, type State, type StoryDef, type Way, type World } from './stage';
import { buildStories } from './stories';
import { buildBoats } from './traffic';

export interface Show { air: Air | null; cast: Cast | null; machines: Machines | null; beasts: Beasts | null }

/** Sets one part going, and says in the console if it fails. */
function tried<T>(what: string, fn: () => T): T | null {
  try {
    return fn();
  } catch (e) {
    console.error(`Gotham: ${what} failed.`, e);
    return null;
  }
}

/** One of the cast as the show holds it. */
interface Actor {
  id: Id;
  look: Look;
  fig: Figure | null;
  /** Where it rests between stories, or null if it is away until a story brings it. */
  post: Spot | null;
  /** The story it is in now. */
  busy: string | null;
  now: State;
  way: Way;
  rest: Rest;
}

/** How many stories play at once. */
const AT_ONCE = 4;

interface Running {
  def: StoryDef;
  t: number;
  tin: number;
  tout: number;
  legsIn: Map<Id, Leg>;
  legsOut: Map<Id, Leg>;
  fromSpot: Map<Id, Spot>;
  done: Set<string>;
}

const AWAY: Spot = at(0, -30, 0, S);

export function buildShow(k: Build): Show {
  const air = tried('the air', () => buildAir(k));
  const cast = tried('the cast', () => buildCast(k));
  const machines = tried('the machines', () => buildMachines(k));
  const beasts = tried('the animals', () => buildBeasts(k));
  tried('the boats', () => buildBoats(k));
  const solid = new Solid(k.b);
  const lines = new Lines(k, 64), glints = new Lines(k, 96, true), rings = new Rings(k);

  let night = 0;
  const W: World = {
    solid,
    posts: {},
    place(file, name, or) {
      const p: Place | undefined = REGIONS[file]?.PLACES?.[name];
      return p ? at(p.x, p.y, p.z, p.h) : or;
    },
    air, machines, beasts, lines, glints, rings,
    night: () => night,
  };

  const made = tried('the stories', () => buildStories(k, W));
  const defs = made?.stories ?? [];

  // the cast, each at its post
  const actors = new Map<Id, Actor>();
  for (const m of made?.roster ?? []) {
    W.posts[m.id] = m.post;
    const fig = cast ? tried(`the figure of ${m.id}`, () => cast.add(m.look)) : null;
    actors.set(m.id, { id: m.id, look: m.look, fig, post: m.post, busy: null, now: m.post ? still(m.post) : hidden(AWAY), way: m.way, rest: m.rest ?? atEase });
  }
  const show = (a: Actor, s: State): void => {
    a.now = s;
    // a line it hangs from is drawn from its raised hand to where the line is made fast
    if (s.line && s.shown) lines.line([s.x, s.y + a.look.height * 0.98, s.z], s.line, 0.07, 0x15161a);
    const f = a.fig;
    if (!f) return;
    f.at(s.x, s.y, s.z, s.h);
    f.lie(s.pitch, s.roll);
    f.pose(s.pose);
    f.hold(s.hold, s.spin);
    f.cape(s.cape, s.spread);
    f.glow(s.glow);
    f.size(s.size);
    f.shown(s.shown);
  };
  for (const a of actors.values()) show(a, a.now);

  const running: Running[] = [];
  const lastStart = new Map<string, number>();
  const holding = new Set<string>();
  let clock = 0, nextPick = 2, frame = 0, held = false;

  const start = (def: StoryDef): void => {
    const r: Running = { def, t: 0, tin: 0, tout: 0, legsIn: new Map(), legsOut: new Map(), fromSpot: new Map(), done: new Set() };
    for (const id of def.cast) {
      const a = actors.get(id);
      if (!a) continue;
      a.busy = def.id;
      const mark = def.marks[id], here = at(a.now.x, a.now.y, a.now.z, a.now.h);
      const to = !mark || mark === 'post' ? (a.post ?? here) : mark;
      r.fromSpot.set(id, to);
      // a figure that is away appears at its mark: the story's body shows it when it should
      const leg = a.post && a.now.shown ? legBetween(solid, a.way, here, to, true) : { dur: 0, at: () => hidden(to) };
      r.legsIn.set(id, leg);
      r.tin = Math.max(r.tin, leg.dur);
    }
    // where the body leaves each, and the way home from there
    const last = new Map<Id, State>();
    def.play(def.body, { put: (id, s) => last.set(id, s), from: (id) => r.fromSpot.get(id) ?? AWAY });
    for (const id of def.cast) {
      const a = actors.get(id);
      if (!a) continue;
      const end = last.get(id), post = a.post;
      if (!post) { r.legsOut.set(id, { dur: 0, at: () => hidden(AWAY) }); continue; }
      if (!end) { r.legsOut.set(id, { dur: 0, at: () => still(post) }); continue; }
      const leg = end.shown ? legBetween(solid, a.way, at(end.x, end.y, end.z, end.h), post) : { dur: 0.1, at: () => still(post) };
      r.legsOut.set(id, leg);
      r.tout = Math.max(r.tout, leg.dur);
    }
    def.holds.forEach((h) => holding.add(h));
    lastStart.set(def.id, clock);
    running.push(r);
  };

  const finish = (r: Running): void => {
    tried(`the end of ${r.def.id}`, () => r.def.end?.());
    for (const id of r.def.cast) {
      const a = actors.get(id);
      if (!a) continue;
      a.busy = null;
      show(a, a.post ? a.rest(clock, a.post) : hidden(AWAY));
    }
    r.def.holds.forEach((h) => holding.delete(h));
    running.splice(running.indexOf(r), 1);
  };

  const free = (def: StoryDef): boolean => def.cast.every((id) => !actors.get(id)?.busy) && def.holds.every((h) => !holding.has(h)) && (def.may?.(W) ?? true);

  const pick = (): void => {
    if (running.length >= AT_ONCE) return;
    let best: StoryDef | null = null, bestScore = -1;
    for (const def of defs) {
      if (running.some((r) => r.def === def) || !free(def)) continue;
      // each waits its turn: the longer since it last began, the more it is owed
      const score = (clock - (lastStart.get(def.id) ?? -400)) * def.weight;
      if (score > bestScore) { bestScore = score; best = def; }
    }
    if (best) start(best);
  };

  // the opening: what the first view should have going
  for (const id of made?.opening ?? []) { const d = defs.find((x) => x.id === id); if (d && free(d)) start(d); }

  k.each((dt, _time, dark) => {
    night = dark;
    if (dt <= 0) return;
    clock += dt;
    frame++;
    lines.begin();
    glints.begin();
    if (!held) {
      nextPick -= dt;
      if (nextPick <= 0) { pick(); nextPick = 2.5; }
    }
    for (const r of [...running]) {
      r.t += dt;
      const tb = r.t - r.tin;
      if (tb < 0) {
        for (const [id, leg] of r.legsIn) {
          const a = actors.get(id);
          if (!a) continue;
          if (r.t <= leg.dur) show(a, leg.at(r.t));
          else { const m = r.fromSpot.get(id) ?? AWAY; show(a, a.post && a.now.shown ? still(m) : hidden(m)); }
        }
      } else if (tb <= r.def.body) {
        tried(`the story ${r.def.id}`, () => {
          r.def.play(tb, { put: (id, s) => { const a = actors.get(id); if (a) show(a, s); }, from: (id) => r.fromSpot.get(id) ?? AWAY });
          r.def.props?.(tb, true, (key, fn) => { if (!r.done.has(key)) { r.done.add(key); fn(); } });
        });
      } else {
        const tl = tb - r.def.body;
        for (const [id, leg] of r.legsOut) { const a = actors.get(id); if (a) show(a, leg.at(Math.min(tl, leg.dur))); }
        if (tl >= r.tout) finish(r);
      }
    }
    // the cast at rest, each in its own way: a few at a frame, and whoever hangs from a line every frame
    let n = 0;
    for (const a of actors.values()) {
      n++;
      if (a.busy || !a.post || (frame + n) % 3) continue;
      show(a, a.rest(clock + n * 1.7, a.post));
    }
    tried('what the stories keep going', () => made?.always?.(dt, clock));
    lines.end();
    glints.end();
    cast?.commit();
    beasts?.commit();
  });

  if (import.meta.env.DEV) {
    const report = tried('the check of the show', () => checkShow(defs, W, actors)) ?? [];
    console.info(`Gotham: ${defs.length} stories: ${defs.map((d) => `${d.id} ${d.body} s`).join(', ')}. ${actors.size} of the cast.`);
    if (report.length) console.warn(`Gotham: the show's check:\n  ${report.join('\n  ')}`);
    else console.info("Gotham: the show's check: no figure stands in anything built, in the air or under the ground, none passes through another, and every way to a stage and home clears what is built.");
    (window as unknown as { gothamShow: object }).gothamShow = {
      air, cast, machines, beasts, solid,
      play: (id: string) => { const d = defs.find((x) => x.id === id); if (d && free(d)) start(d); return d ? d.name : 'no such story'; },
      /** What is playing, and how far into its body each is (negative while its cast is still on the way). */
      running: () => running.map((r) => `${r.def.id} ${(r.t - r.tin).toFixed(1)}`),
      at: (id: string) => { const r = running.find((x) => x.def.id === id); return r ? r.t - r.tin : null; },
      stories: () => defs.map((d) => d.id),
      /** Ends whatever is playing and plays one story alone, for looking at it; `resume()` lets the director choose again. */
      only: (id: string) => { for (const r of [...running]) finish(r); const d = defs.find((x) => x.id === id); if (d) start(d); held = true; return d ? `${d.name}: its cast take ${running[0]?.tin.toFixed(1) ?? 0} s to arrive` : 'no such story'; },
      /** Ends whatever is playing and lets nothing begin: everyone at home. */
      hold: () => { for (const r of [...running]) finish(r); held = true; },
      resume: () => { held = false; nextPick = 0.5; },
      /** Where one of the cast is now. */
      where: (id: string) => { const a = actors.get(id); return a ? { x: +a.now.x.toFixed(2), y: +a.now.y.toFixed(2), z: +a.now.z.toFixed(2), shown: a.now.shown, busy: a.busy } : null; },
      who: () => [...actors.keys()],
      check: () => checkShow(defs, W, actors),
    };
  }
  return { air, cast, machines, beasts };
}

// ---------------------------------------------------------------------------
// The show's check
// ---------------------------------------------------------------------------

/**
 * Plays every story through offline, every tenth of a second, from the posts,
 * and each figure's way to its mark and home again, and says where a figure
 * stands inside something built or under the ground, where one that is not
 * aloft stands in the air or has sunk into what it stands on, and where two
 * come nearer than their bodies allow. It goes by the triangles that are
 * drawn, through `Solid`.
 */
function checkShow(defs: StoryDef[], W: World, actors: Map<Id, Actor>): string[] {
  const faults: string[] = [], solid = W.solid;
  const look = (id: Id, s: State, what: string, seen: Set<string>): void => {
    if (!s.shown) return;
    const tall = (actors.get(id)?.look.height ?? 2.6) * s.size;
    const say = (key: string, text: string): void => { if (!seen.has(key)) { seen.add(key); faults.push(`${what}: ${id} ${text} (${s.x.toFixed(1)}, ${s.y.toFixed(1)}, ${s.z.toFixed(1)})`); } };
    // a body laid level is as long as it is tall: ask at its middle
    const mid = s.y + tall * 0.5 * Math.cos(s.pitch);
    if (solid.inside(s.x, mid, s.z)) say(`${id}-in`, 'is inside something built');
    const over = solid.over(s.x, s.y, s.z);
    if (!s.aloft && over > 0.45) say(`${id}-air`, `stands ${over.toFixed(1)} in the air`);
    if (over < -0.35) say(`${id}-sunk`, `is ${(-over).toFixed(1)} into what is under it`);
  };
  for (const def of defs) {
    const from = new Map<Id, Spot>(), seen = new Set<string>();
    for (const id of def.cast) {
      const m = def.marks[id], a = actors.get(id);
      const to = !m || m === 'post' ? (a?.post ?? AWAY) : m;
      from.set(id, to);
      // the way there from its post
      if (a?.post) {
        const leg = legBetween(solid, a.way, a.post, to, true);
        for (let t = 0; t <= leg.dur; t += 0.1) look(id, leg.at(t), `${def.id}, on the way`, seen);
      }
    }
    const last = new Map<Id, State>();
    for (let tb = 0; tb <= def.body; tb += 0.1) {
      const states = new Map<Id, State>();
      def.play(tb, { put: (id, s) => { states.set(id, s); last.set(id, s); }, from: (id) => from.get(id) ?? AWAY });
      const shown = [...states.entries()].filter(([, s]) => s.shown);
      for (const [id, s] of shown) look(id, s, `${def.id} at ${tb.toFixed(1)} s`, seen);
      for (let i = 0; i < shown.length; i++) {
        for (let j = i + 1; j < shown.length; j++) {
          const [a, sa] = shown[i], [b, sb] = shown[j];
          const d = Math.hypot(sa.x - sb.x, sa.z - sb.z);
          if (d < 0.7 && Math.abs(sa.y - sb.y) < 2 && !sa.close && !sb.close && !seen.has(`${a}-${b}`)) { seen.add(`${a}-${b}`); faults.push(`${def.id} at ${tb.toFixed(1)} s: ${a} and ${b} come within ${d.toFixed(2)}`); }
        }
      }
    }
    // and the way home from where the body leaves it
    for (const id of def.cast) {
      const a = actors.get(id), end = last.get(id);
      if (!a?.post || !end || !end.shown) continue;
      const leg = legBetween(solid, a.way, at(end.x, end.y, end.z, end.h), a.post);
      for (let t = 0; t <= leg.dur; t += 0.1) look(id, leg.at(t), `${def.id}, on the way home`, seen);
    }
  }
  return faults;
}
