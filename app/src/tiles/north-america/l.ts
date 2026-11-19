// The L: Chicago's elevated railway. A loop round the block of Marina City,
// and two branches that leave it at its western corners. One follows the edge
// of the boulevard to the park. The other runs on above the street to the
// south, past the park and under the expressway twice, as far as the car park.
//
// Where a branch meets the loop the tracks make a triangle, as they do at the
// corners of the real Loop. A train from a branch runs once round the loop and
// goes back the way it came, and at each triangle trains wait for each other.

import * as THREE from 'three';
import { Path, buildPath, joined, stretch } from '../../engine/paths';
import { station, track, train, trestle, type Bent } from '../../engine/rail';
import type { Build } from '../../engine/tile';
import { H_STREETS, L_LINE, V_STREETS } from './plan';

/** `piers` is where the expressway's piers stand, so that the L's columns keep clear of them. */
export function buildL(k: Build, piers: { x: number; z: number }[]): void {
  const { west: W, east: E, north: N, south: S, y, r } = L_LINE;
  const loop = buildPath([L_LINE.ring], true);

  // --- the pieces of track besides the loop, each as a line of points ---
  const at = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  const line = (x0: number, z0: number, x1: number, z1: number): THREE.Vector3[] => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5);
    return Array.from({ length: n + 1 }, (_, i) => at(x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n));
  };
  /** A quarter turn round (cx, cz), from one bearing to another. */
  const turn = (cx: number, cz: number, a0: number, a1: number): THREE.Vector3[] =>
    Array.from({ length: 23 }, (_, i) => at(cx + Math.cos(a0 + ((a1 - a0) * i) / 22) * r, cz + Math.sin(a0 + ((a1 - a0) * i) / 22) * r));

  // The park branch: its line, the straight piece that carries a train from it
  // onto the loop's north side, and the curve that brings a train back to it
  // off the loop's west side.
  const parkLine = line(L_LINE.parkEnd, N, W - r, N);
  const parkIn = line(W - r, N, W + r, N);
  const parkOut = turn(W - r, N + r, 0, -Math.PI / 2);
  // The Midway branch: its line, the curve from it onto the loop's west side,
  // and the straight piece back to it off the loop's south side.
  const midwayLine = line(L_LINE.midwayEnd, S, W - r, S);
  const midwayIn = turn(W - r, S - r, Math.PI / 2, 0);
  const midwayOut = line(W + r, S, W - r, S);

  // --- steel and rails ---
  const bent = (x: number, z: number): Bent => {
    const v = V_STREETS.find((s) => Math.abs(x - s.x) < s.carr), h = H_STREETS.find((s) => Math.abs(z - s.z) < s.carr);
    // never in the middle of a junction
    if (v && h) return null;
    // Under the expressway the loop runs above one lane, so its columns stand to
    // one side of it, on the line between the lanes, where the expressway's piers are.
    if (Math.abs(x - W) < 0.8 && z > N && z < S) {
      return piers.some((p) => Math.hypot(p.x - (x - 2.25), p.z - z) < 2.4) ? null : { arm: -2.25 };
    }
    // above a street its columns stand on the line between the lanes, and nowhere else
    if (v) return Math.abs(x - v.x) < 0.6 ? 'T' : null;
    if (h) return Math.abs(z - h.z) < 0.6 ? 'T' : null;
    // and above a sidewalk they stand where they like
    return 'T';
  };
  trestle(k, loop, { every: 8, bent });
  track(k, loop);
  const parkTrack = new Path(parkLine, false), midwayTrack = new Path(midwayLine, false);
  for (const p of [parkTrack, midwayTrack]) {
    trestle(k, p, { every: 8, bent });
    track(k, p);
  }
  // the short pieces of each triangle hang between the lines they join
  for (const pts of [parkIn, parkOut, midwayIn, midwayOut]) {
    const p = new Path(pts, false);
    trestle(k, p, { bent: () => null });
    track(k, p);
  }
  // a buffer at the end of each branch, with a red lamp on it
  for (const [x, z] of [[L_LINE.parkEnd, N], [L_LINE.midwayEnd, S]]) {
    k.b.box(x - 0.9, y - 0.75, z - 1.5, x - 0.3, y + 1.3, z + 1.5, 0x5b4a42);
    k.b.box(x - 0.3, y + 0.5, z - 1.1, x - 0.1, y + 1.1, z + 1.1, 0xd8432b);
    k.glows.push({ x: x - 0.6, y: y + 1.5, z, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ff4a3a' });
  }

  // --- stations ---
  // A train of two cars stands with its middle this far from the end of a line.
  const STAND = 8.45;
  // Addison is the station at the ballpark, as in life. State/Lake is the one nearest Marina City.
  const addison = station(k, loop, loop.closest(64, S), { length: 17, side: -1, name: 'addison' });
  const stateLake = station(k, loop, loop.closest(E, 16), { length: 17, side: 1, name: 'state-lake' });
  // Forest Park is where the park branch ends, on the park's side of the track.
  station(k, parkTrack, STAND, { length: 17, side: 1, name: 'forest-park' });
  // Roosevelt is half way along the other branch, by the park, and Midway is the end of it.
  const roosevelt = station(k, midwayTrack, 0 - L_LINE.midwayEnd, { length: 17, side: -1, name: 'roosevelt' });
  station(k, midwayTrack, STAND, { length: 17, side: 1, name: 'midway' });

  // --- the three lines ---
  const lap = (d: number): number => ((d % loop.length) + loop.length) % loop.length;
  // where the loop's western corners begin and end, as distances along it
  const cornerN0 = loop.closest(W, N + r), cornerN1 = loop.closest(W + r, N);
  const cornerS0 = loop.closest(W + r, S), cornerS1 = loop.closest(W, S - r);
  // The loop is four pieces of track, and no two trains are ever on one piece.
  // A piece that a branch joins begins well before the join, so that a train
  // waiting for it stands clear of the other track.
  const CLEAR = 8.5, curve = (Math.PI / 2) * r;
  const north = lap(cornerN1 - CLEAR), east = lap(loop.closest(E - r, N) + curve / 2);
  const south = lap(loop.closest(E, S - r) + curve / 2), west = lap(cornerS1 - CLEAR);

  // The loop line goes round and round.
  train(k, loop, {
    cars: 2, speed: 13, stops: [addison, stateLake], from: loop.closest(E, 4), stripe: 0x7a4a2a,
    blocks: [{ name: 'north', from: north, to: east }, { name: 'east', from: east, to: south }, { name: 'south', from: south, to: west }, { name: 'west', from: west, to: north }],
  });

  // The park line: out of Forest Park, straight on to the loop, once round it, and back.
  {
    const run = joined([parkLine, parkIn, stretch(loop, cornerN1, cornerN0), parkOut, [...parkLine].reverse()], true);
    const [, link, round, out] = run.starts;
    const on = (d: number): number => round + lap(d - cornerN1);
    train(k, run.path, {
      cars: 2, speed: 13, from: STAND + 4.05, ends: [0], stripe: 0x2f5fa8,
      stops: [run.path.length - STAND, on(stateLake), on(addison)],
      blocks: [
        { name: 'park', from: out, to: link + 2 * r - CLEAR },
        { name: 'north', from: link + 2 * r - CLEAR, to: on(east) },
        { name: 'east', from: on(east), to: on(south) },
        { name: 'south', from: on(south), to: on(west) },
        { name: 'west', from: on(west), to: out },
      ],
    });
  }

  // The Midway line: out of Midway, past Roosevelt, up the loop's west side, once round it, and back.
  {
    const run = joined([midwayLine, midwayIn, stretch(loop, cornerS1, cornerS0), midwayOut, [...midwayLine].reverse()], true);
    const [, curveIn, round, out, back] = run.starts;
    const on = (d: number): number => round + lap(d - cornerS1);
    const lineLength = W - r - L_LINE.midwayEnd;
    train(k, run.path, {
      cars: 2, speed: 13, from: STAND + 4.05, ends: [0], stripe: 0xe8792b,
      stops: [run.path.length - STAND, roosevelt, on(stateLake), on(addison), back + lineLength - roosevelt],
      blocks: [
        { name: 'midway', from: out, to: curveIn + curve - CLEAR },
        { name: 'west', from: curveIn + curve - CLEAR, to: on(north) },
        { name: 'north', from: on(north), to: on(east) },
        { name: 'east', from: on(east), to: on(south) },
        { name: 'south', from: on(south), to: out },
      ],
    });
  }
}
