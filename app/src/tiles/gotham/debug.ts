// Tools for looking at the tile while it is built, from the page's console.
// They are there on the development server only, under `gotham`.
//
// Pictures are taken with `wimmel.shot`, which leaves the heroes out, and are
// saved in app/screenshots under names that start with `check-`.

interface Wimmel {
  frame(now: number): void;
  shot(name: string, o: Record<string, unknown>): Promise<string>;
}

/** One panel of a sheet of pictures. */
export interface Panel {
  /** What is written under it. */
  words: string;
  /** What to do before it is taken: stand something still, set a clock. */
  before?: () => void;
  /** What `wimmel.shot` is asked for, or something that says so once `before` has been done. `frames` is how many frames pass first. */
  o: Record<string, unknown> | (() => Record<string, unknown>);
  /** The part of the picture that is kept, as shares of it. */
  part?: [number, number, number, number];
}

const wimmel = (): Wimmel => (window as unknown as { wimmel: Wimmel }).wimmel;
let now = 0;

/** Lets frames pass, a sixtieth of a second each: the pane may be hidden, and then none pass by themselves. */
export function frames(n = 4): void {
  if (now === 0) now = performance.now();
  for (let i = 0; i < n; i++) wimmel().frame((now += 1000 / 60));
}

/**
 * What to ask a picture for so that a thing at height `y` is in its middle:
 * from which side, and how steeply it looks down, both in degrees. The view
 * opens from 42 at 38.
 */
export function aim(x: number, y: number, z: number, az = 42, elev = 38): { x: number; z: number; az: number; elev: number } {
  const back = y / Math.tan((elev * Math.PI) / 180);
  return { x: x - Math.sin((az * Math.PI) / 180) * back, z: z - Math.cos((az * Math.PI) / 180) * back, az, elev };
}

/** Takes a picture, once a few frames have passed. */
export async function look(name: string, o: Record<string, unknown> = {}): Promise<string> {
  frames((o.frames as number | undefined) ?? 4);
  return wimmel().shot(`check-gotham-${name}`, { hour: 13, w: 1200, h: 800, steps: 1, ...o });
}

/** A part of a picture that was saved, drawn into a canvas. */
async function cut(ctx: CanvasRenderingContext2D, saved: string, part: [number, number, number, number], x: number, y: number, w: number, h: number): Promise<void> {
  const bmp = await createImageBitmap(await (await fetch(`./screenshots/${saved}.jpg?${Date.now()}`)).blob());
  const [fx, fy, fw, fh] = part;
  ctx.drawImage(bmp, bmp.width * fx, bmp.height * fy, bmp.width * fw, bmp.height * fh, x, y, w, h);
}

async function save(cv: HTMLCanvasElement, name: string): Promise<string> {
  const blob = await new Promise<Blob | null>((done) => cv.toBlob(done, 'image/jpeg', 0.9));
  const res = await fetch(`./__shot?name=${encodeURIComponent(`check-gotham-${name}.jpg`)}`, { method: 'POST', body: blob });
  return `${name}: ${res.status} ${cv.width}x${cv.height}`;
}

/** Takes a large picture and keeps a part of it, given as shares of the picture: for a closer look than the view allows. */
export async function close(name: string, o: Record<string, unknown> = {}, part: [number, number, number, number] = [0.25, 0.25, 0.5, 0.5]): Promise<string> {
  const big = `check-gotham-big-${name}`;
  frames((o.frames as number | undefined) ?? 4);
  await wimmel().shot(big, { hour: 13, w: 2400, h: 1600, steps: 1, ...o });
  const cv = document.createElement('canvas');
  cv.width = Math.round(2400 * part[2]);
  cv.height = Math.round(1600 * part[3]);
  await cut(cv.getContext('2d')!, big, part, 0, 0, cv.width, cv.height);
  return save(cv, name);
}

/**
 * One picture made of several, side by side with a line of words under each:
 * a thing from two sides by day and by night, or a few moments one after
 * another. Each panel is taken large and cut to the part that matters.
 */
export async function sheet(name: string, cols: number, panels: Panel[], size: [number, number] = [800, 534]): Promise<string> {
  const [W, H] = size, BAR = 36;
  const cv = document.createElement('canvas');
  cv.width = cols * W;
  cv.height = Math.ceil(panels.length / cols) * (H + BAR);
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#17161a';
  ctx.fillRect(0, 0, cv.width, cv.height);
  const big = `check-gotham-big-${name}`;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    p.before?.();
    const o = typeof p.o === 'function' ? p.o() : p.o;
    frames((o.frames as number | undefined) ?? 4);
    await wimmel().shot(big, { hour: 13, w: 2400, h: 1600, steps: 1, ...o });
    const x = (i % cols) * W, y = Math.floor(i / cols) * (H + BAR);
    await cut(ctx, big, p.part ?? [0.25, 0.25, 0.5, 0.5], x, y, W, H);
    ctx.fillStyle = '#e9dcc0';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.words, x + 14, y + H + BAR / 2 + 1);
  }
  return save(cv, name);
}

/**
 * A thing from two opposite sides, by day and by night: the four pictures a
 * landmark is judged by. `r` is how far across it is, which sets how close
 * the pictures are taken.
 */
export function fourViews(name: string, x: number, y: number, z: number, r: number, az = 42): Promise<string> {
  const zoom = Math.max(34, r * 2.6), part: [number, number, number, number] = [0.15, 0.15, 0.7, 0.7];
  const view = (side: number, hour: number, words: string): Panel => ({ words, o: { ...aim(x, y, z, side), zoom, hour, frames: 6 }, part });
  return sheet(name, 2, [
    view(az, 13, 'by day, from the opening side'), view(az + 180, 13, 'by day, from behind'),
    view(az, 22, 'by night, from the opening side'), view(az + 180, 22, 'by night, from behind'),
  ]);
}
