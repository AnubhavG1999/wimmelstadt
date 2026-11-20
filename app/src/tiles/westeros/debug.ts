// Tools for looking at the tile while it is built, from the page's console.
// They are there on the development server only, under `westeros`.
//
// Pictures are taken with `wimmel.shot`, which leaves the heroes out, and are
// saved in app/screenshots under names that start with `check-`.

interface Wimmel {
  frame(now: number): void;
  shot(name: string, o: Record<string, unknown>): Promise<string>;
}

const wimmel = (): Wimmel => (window as unknown as { wimmel: Wimmel }).wimmel;
let now = 0;

/** Lets frames pass, a sixtieth of a second each: the pane may be hidden, and then none pass by themselves. */
export function frames(n = 4): void {
  if (now === 0) now = performance.now();
  for (let i = 0; i < n; i++) wimmel().frame((now += 1000 / 60));
}

/** Where to aim a picture so that a thing at height `y` is in its middle, from a side and at a tilt. */
export function aim(x: number, y: number, z: number, az = 42, elev = 0.6632): { x: number; z: number; az: number } {
  return { x: x - (Math.sin((az * Math.PI) / 180) * y) / Math.tan(elev), z: z - (Math.cos((az * Math.PI) / 180) * y) / Math.tan(elev), az };
}

/** Takes a picture, once a few frames have passed. */
export async function look(name: string, o: Record<string, unknown> = {}): Promise<string> {
  frames((o.frames as number | undefined) ?? 4);
  return wimmel().shot(`check-westeros-${name}`, { hour: 13, w: 1200, h: 800, steps: 1, ...o });
}

/** Takes a large picture and keeps a part of it, given as shares of the picture: for a closer look than the view allows. */
export async function close(name: string, o: Record<string, unknown> = {}, part: [number, number, number, number] = [0.25, 0.25, 0.5, 0.5]): Promise<string> {
  const big = `check-westeros-big-${name}`;
  frames((o.frames as number | undefined) ?? 4);
  await wimmel().shot(big, { hour: 13, w: 2400, h: 1600, steps: 1, ...o });
  const bmp = await createImageBitmap(await (await fetch(`./screenshots/${big}.jpg?${Date.now()}`)).blob());
  const [fx, fy, fw, fh] = part;
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * fw);
  cv.height = Math.round(bmp.height * fh);
  cv.getContext('2d')!.drawImage(bmp, bmp.width * fx, bmp.height * fy, cv.width, cv.height, 0, 0, cv.width, cv.height);
  const blob = await new Promise<Blob | null>((done) => cv.toBlob(done, 'image/jpeg', 0.92));
  const res = await fetch(`./__shot?name=${encodeURIComponent(`check-westeros-${name}.jpg`)}`, { method: 'POST', body: blob });
  return `${name}: ${res.status} ${cv.width}x${cv.height}`;
}
