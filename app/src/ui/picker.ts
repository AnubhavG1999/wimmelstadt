// The picker: which tiles stand on the board, and where. More tiles are built
// than the board has places, and every load deals nine of them by chance. The
// picker lets whoever is looking choose for themselves. It shows the table from
// above with its places, a postcard of a tile on each, and beside the table the
// box with the postcards of the tiles that are not on it. A postcard is dragged
// onto another, or two are picked one after the other, and the two tiles change
// places, so the board is always full. Nothing happens to the city until Done.

/** A tile as the picker shows it: its name, and the address of its postcard's picture if it has one. */
export interface PickerTile { id: string; name: string; picture: string | null }

export interface PickerHandlers {
  /** The board as it was set: its tiles place by place, whether this device is to keep it, and whether the table has to be set out again for it. */
  done(board: string[], keep: boolean, changed: boolean): void;
  /** Called whenever the picker is touched, so that the page keeps its controls in sight. */
  touched(): void;
}

export interface Picker {
  /** Opens the picker on the tiles that stand on the table, place by place, and says whether this device keeps that board. */
  open(board: string[], kept: boolean): void;
  close(): void;
  isOpen(): boolean;
}

const DIE = '<rect x="4.5" y="4.5" width="15" height="15" rx="3.2"/><circle cx="9" cy="9" r="1.15" class="pip"/><circle cx="15" cy="9" r="1.15" class="pip"/><circle cx="12" cy="12" r="1.15" class="pip"/><circle cx="9" cy="15" r="1.15" class="pip"/><circle cx="15" cy="15" r="1.15" class="pip"/>';
const TACK = '<path d="M9 4.5h6l-1 4.6 3.2 3.4H6.8L10 9.1zM12 12.5v7"/>';
const HINT = 'Drag a tile onto another to swap them, or tap one and then the other.';
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/** A list in a new order of chance. */
function shuffled<T>(list: T[]): T[] {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Builds the picker inside `root`, for these tiles and a board of so many
 * places, and reports what is done with it. Where `still` is set, for whoever
 * has asked their device for less motion, no postcard flies: one that changes
 * its place fades in where it now lies.
 */
export function buildPicker(root: HTMLElement, tiles: PickerTile[], places: number, on: PickerHandlers, still = false): Picker {
  const cols = Math.ceil(Math.sqrt(places));
  root.innerHTML = `
<div class="picker-shade" hidden></div>
<div class="picker" role="dialog" aria-modal="true" aria-label="The board" tabindex="-1" hidden>
  <div class="picker-head">
    <div class="options-title">The board</div>
    <p class="picker-hint" role="status"></p>
  </div>
  <div class="picker-table" style="--cols:${cols}">${Array.from({ length: places }, (_, i) => `<div class="slot" data-i="${i}"></div>`).join('')}</div>
  <div class="picker-side">
    <div class="options-title">In the box</div>
    <div class="picker-box"></div>
    <p class="picker-none">Every tile is on the board.</p>
  </div>
  <div class="picker-foot">
    <p class="picker-note"></p>
    <button type="button" class="picker-btn picker-shuffle" title="Deal the board afresh, by chance"><svg viewBox="0 0 24 24" aria-hidden="true">${DIE}</svg><span>Shuffle</span></button>
    <button type="button" class="picker-btn picker-keep" aria-pressed="false" aria-label="Keep this board" title="Open with this board every time on this device"><svg viewBox="0 0 24 24" aria-hidden="true">${TACK}</svg><span class="long">Keep this board</span><span class="short">Keep</span></button>
    <button type="button" class="picker-btn picker-cancel">Cancel</button>
    <button type="button" class="picker-btn picker-done">Done</button>
  </div>
</div>
<div class="picker-air" aria-hidden="true"></div>
<div class="picker-setting" role="status" hidden><span class="plate">Setting the board…</span></div>`;

  const $ = <T extends Element>(sel: string): T => root.querySelector(sel) as T;
  const panel = $<HTMLElement>('.picker'), shade = $<HTMLElement>('.picker-shade'), air = $<HTMLElement>('.picker-air'), setting = $<HTMLElement>('.picker-setting');
  const slots = [...root.querySelectorAll<HTMLElement>('.slot')], boxEl = $<HTMLElement>('.picker-box'), none = $<HTMLElement>('.picker-none');
  const hint = $<HTMLElement>('.picker-hint'), note = $<HTMLElement>('.picker-note'), foot = $<HTMLElement>('.picker-foot');
  const keepKey = $<HTMLButtonElement>('.picker-keep');
  const ids = tiles.map((t) => t.id);
  const nameOf = new Map(tiles.map((t) => [t.id, t.name]));

  // one postcard for each tile, made once and moved between the places and the box
  const postcards = new Map<string, HTMLButtonElement>();
  for (const t of tiles) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = t.picture ? 'postcard' : 'postcard plain';
    el.dataset.id = t.id;
    if (t.picture) {
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      img.addEventListener('load', () => img.classList.add('ready'));
      el.append(img);
    }
    const name = document.createElement('span');
    name.textContent = t.name;
    // how long the name is, for the page to set it as large as still fits the postcard
    name.style.setProperty('--len', String(Math.max(8, t.name.length)));
    el.append(name);
    postcards.set(t.id, el);
  }
  /** The pictures are fetched when the picker is first opened, and not before: most who look at the city never open it. */
  let pictured = false;
  const picture = (): void => {
    if (pictured) return;
    pictured = true;
    for (const t of tiles) {
      const img = postcards.get(t.id)!.querySelector('img');
      if (img && t.picture) img.src = t.picture;
    }
  };

  /** The board place by place and the tiles in the box; the tiles that stand on the table now; and the board the picker was opened on. */
  let board: string[] = [], box: string[] = [], standing: string[] = [], first: string[] = [];
  let keep = false, kept = false;
  /** The tile that was picked first of two. */
  let picked: string | null = null;

  const same = (a: string[], b: string[]): boolean => a.length === b.length && a.every((id, i) => id === b[i]);
  /** Whether the table has to be set out again for this board. */
  const differs = (): boolean => !same(board, standing);
  /** Whether anything has been done in the picker since it was opened. */
  const edited = (): boolean => !same(board, first) || keep !== kept;
  const where = (id: string): { on: 'board' | 'box'; i: number } => {
    const i = board.indexOf(id);
    return i >= 0 ? { on: 'board', i } : { on: 'box', i: box.indexOf(id) };
  };
  const bothBoxed = (a: string, b: string): boolean => where(a).on === 'box' && where(b).on === 'box';
  /** Two tiles change places. Two that are both in the box have no places to change. */
  const swap = (a: string, b: string): void => {
    if (a === b || bothBoxed(a, b)) return;
    const wa = where(a), wb = where(b);
    (wa.on === 'board' ? board : box)[wa.i] = b;
    (wb.on === 'board' ? board : box)[wb.i] = a;
  };

  /** Puts every postcard where the board and the box say it is, and says how things stand. No postcard that is in its place already is touched. */
  const lay = (): void => {
    board.forEach((id, i) => {
      const el = postcards.get(id);
      if (el && el.parentElement !== slots[i]) slots[i].append(el);
    });
    box.forEach((id, i) => {
      const el = postcards.get(id);
      if (el && boxEl.children[i] !== el) boxEl.insertBefore(el, boxEl.children[i] ?? null);
    });
    none.hidden = box.length > 0;
    for (const [id, el] of postcards) {
      const w = where(id);
      el.classList.toggle('picked', id === picked);
      el.setAttribute('aria-pressed', String(id === picked));
      el.setAttribute('aria-label', w.on === 'board' ? `${nameOf.get(id)}, place ${w.i + 1} on the board` : `${nameOf.get(id)}, in the box`);
    }
    keepKey.setAttribute('aria-pressed', String(keep));
    note.textContent = keep ? 'This device opens with this board every time.' : `Every visit deals ${COUNT[places] ?? places} tiles by chance.`;
    hint.textContent = picked ? `${nameOf.get(picked)} is picked. Now pick the tile it changes places with.` : HINT;
  };

  // --- postcards in the air -----------------------------------------------------
  // A postcard that changes its place flies there. What flies is a copy of it
  // that lies over the whole page, so that nothing it passes can cut it off,
  // while the postcard itself waits out of sight in its new place.
  const flights = new Map<HTMLElement, { ghost: HTMLElement; anim: Animation }>();
  const copy = (el: HTMLElement, at: DOMRect): HTMLElement => {
    const g = el.cloneNode(true) as HTMLElement;
    g.className = el.classList.contains('plain') ? 'postcard plain ghost' : 'postcard ghost';
    g.tabIndex = -1;
    g.removeAttribute('aria-pressed');
    g.removeAttribute('aria-label');
    Object.assign(g.style, { left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` });
    air.append(g);
    return g;
  };
  const land = (el: HTMLElement): void => {
    const f = flights.get(el);
    if (!f) return;
    flights.delete(el);
    f.anim.onfinish = f.anim.oncancel = null;
    f.anim.cancel();
    f.ghost.remove();
    el.classList.remove('away');
  };
  const fly = (el: HTMLElement, from: DOMRect, to: DOMRect, delay: number): void => {
    const ghost = copy(el, to);
    el.classList.add('away');
    const anim = ghost.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` }, { transform: 'none' }],
      { duration: 300, delay, fill: 'backwards', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
    const flight = { ghost, anim };
    flights.set(el, flight);
    const down = (): void => {
      if (flights.get(el) === flight) land(el);
    };
    anim.onfinish = anim.oncancel = down;
    // a page that is out of sight draws nothing and is told of no landing: the postcard is put down all the same
    setTimeout(down, 300 + delay + 150);
  };
  /**
   * Makes a change, and lets every postcard fly from where it was to where it
   * now belongs. `letGo` is one that was dragged, and where it was let go of.
   * `dealt` lets them set off one after the other, as cards are dealt.
   */
  const glide = (change: () => void, letGo?: { el: HTMLElement; rect: DOMRect }, dealt = false): void => {
    if (still) {
      const spot = (id: string): string => `${where(id).on} ${where(id).i}`;
      const was = new Map([...postcards.keys()].map((id) => [id, spot(id)]));
      change();
      lay();
      for (const [id, el] of postcards) {
        if (was.get(id) !== spot(id)) el.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      }
      return;
    }
    // a postcard that is in the air already is where its copy is
    const was = new Map<HTMLElement, DOMRect>();
    for (const el of postcards.values()) was.set(el, (flights.get(el)?.ghost ?? el).getBoundingClientRect());
    if (letGo) was.set(letGo.el, letGo.rect);
    for (const el of postcards.values()) land(el);
    change();
    lay();
    let n = 0;
    for (const [el, a] of was) {
      const b = el.getBoundingClientRect();
      if (a.width === 0 || b.width === 0) continue;
      if (Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1 && Math.abs(a.width - b.width) < 1) continue;
      fly(el, a, b, dealt ? n++ * 22 : 0);
    }
  };

  // --- a tile is picked, or its postcard is dragged onto another --------------------
  /** A tile is picked: the first of two is marked, and the second changes places with it. */
  const pick = (id: string): void => {
    const before = picked;
    if (before === null || before === id) {
      picked = before === id ? null : id;
      lay();
    } else if (bothBoxed(before, id)) {
      // two in the box have no places to change: the second is the one that is picked now
      picked = id;
      lay();
    } else {
      picked = null;
      glide(() => swap(before, id));
    }
  };

  /** The postcard a hand is on: where the hand came down, how far it has moved since, and, once the postcard is lifted, where it lay and the copy of it that follows the hand. */
  let drag: { id: string; el: HTMLElement; pointer: number; x: number; y: number; dx: number; dy: number; home: DOMRect | null; ghost: HTMLElement | null } | null = null;
  /** When a touch was last dealt with, so that the click a browser sends after it is not taken for a second one. */
  let dealtWith = -1e9;
  let over: HTMLElement | null = null;
  const light = (el: HTMLElement | null): void => {
    if (over === el) return;
    over?.classList.remove('over');
    over = el;
    over?.classList.add('over');
  };
  /** The tile a point on the screen is over, if the one that is dragged could change places with it, and what to light up for it: its place on the board, or its postcard in the box. */
  const under = (x: number, y: number, self: string): { id: string; el: HTMLElement } | null => {
    const at = document.elementFromPoint(x, y);
    if (!at || !panel.contains(at)) return null;
    const slot = at.closest<HTMLElement>('.slot');
    const id = at.closest<HTMLElement>('.postcard')?.dataset.id ?? (slot ? board[Number(slot.dataset.i)] : undefined);
    if (!id || id === self || bothBoxed(id, self)) return null;
    const w = where(id);
    return { id, el: w.on === 'board' ? slots[w.i] : postcards.get(id)! };
  };
  /** Ends a drag: the postcard flies to the place of the tile it was let go over, or back to its own. */
  const drop = (onto: string | null): void => {
    const d = drag;
    drag = null;
    light(null);
    if (!d || !d.ghost || !d.home) return;
    dealtWith = performance.now();
    // where the copy is, without the tilt it is carried with
    const rect = new DOMRect(d.home.left + d.dx, d.home.top + d.dy, d.home.width, d.home.height);
    d.ghost.remove();
    d.el.classList.remove('lifted');
    glide(() => { if (onto) swap(d.id, onto); }, { el: d.el, rect });
  };
  for (const [id, el] of postcards) {
    el.addEventListener('pointerdown', (e) => {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id, el, pointer: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, home: null, ghost: null };
      try {
        // the postcard keeps hearing of the hand wherever it goes
        el.setPointerCapture(e.pointerId);
      } catch {
        // a hand that cannot be held on to: the postcard follows it for as long as it stays over it
      }
      on.touched();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== id || drag.pointer !== e.pointerId) return;
      const dx = (drag.dx = e.clientX - drag.x), dy = (drag.dy = e.clientY - drag.y);
      if (!drag.ghost) {
        if (Math.hypot(dx, dy) < 7) return;
        // the postcard is lifted: a copy of it follows the hand, and the postcard itself marks the place it came from
        land(el);
        drag.home = el.getBoundingClientRect();
        drag.ghost = copy(el, drag.home);
        void drag.ghost.offsetWidth;
        drag.ghost.classList.add('carried');
        el.classList.add('lifted');
        picked = null;
        lay();
      }
      drag.ghost.style.translate = `${dx}px ${dy}px`;
      light(under(e.clientX, e.clientY, id)?.el ?? null);
      on.touched();
    });
    el.addEventListener('pointerup', (e) => {
      if (!drag || drag.id !== id || drag.pointer !== e.pointerId) return;
      if (drag.ghost) {
        drop(under(e.clientX, e.clientY, id)?.id ?? null);
        return;
      }
      drag = null;
      dealtWith = performance.now();
      pick(id);
    });
    const lost = (e: PointerEvent): void => {
      if (drag && drag.id === id && drag.pointer === e.pointerId) drop(null);
    };
    el.addEventListener('pointercancel', lost);
    el.addEventListener('lostpointercapture', lost);
    // a postcard is a button: whatever presses it without touching it, a key for one, picks its tile too
    el.addEventListener('click', () => {
      if (performance.now() - dealtWith < 400) return;
      on.touched();
      pick(id);
    });
  }

  // --- the picker as a whole --------------------------------------------------------
  let opener: Element | null = null;
  const show = (open: boolean): void => {
    if (open === !panel.hidden) return;
    panel.hidden = shade.hidden = !open;
    if (open) {
      opener = document.activeElement;
      panel.focus({ preventScroll: true });
    } else if (opener instanceof HTMLElement) {
      opener.focus({ preventScroll: true });
    }
  };
  const close = (): void => {
    if (drag) drop(null);
    for (const el of postcards.values()) land(el);
    picked = null;
    show(false);
  };

  $<HTMLButtonElement>('.picker-shuffle').addEventListener('click', () => {
    on.touched();
    picked = null;
    glide(() => {
      board = shuffled(ids).slice(0, places);
      box = ids.filter((id) => !board.includes(id));
    }, undefined, true);
  });
  keepKey.addEventListener('click', () => {
    on.touched();
    keep = !keep;
    lay();
  });
  $<HTMLButtonElement>('.picker-cancel').addEventListener('click', () => {
    on.touched();
    close();
  });
  $<HTMLButtonElement>('.picker-done').addEventListener('click', () => {
    on.touched();
    const again = differs(), now = board.slice(), keeping = keep;
    close();
    if (!again && keeping === kept) return;
    if (!again) {
      on.done(now, keeping, false);
      return;
    }
    // the city is set out again from the start, which takes a moment: say so first
    setting.hidden = false;
    setTimeout(() => on.done(now, keeping, true), 80);
  });
  // a touch beside the picker closes it, unless that would throw away what was done in it
  shade.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    on.touched();
    if (!edited()) {
      close();
      return;
    }
    panel.focus({ preventScroll: true });
    foot.classList.remove('nudge');
    void foot.offsetWidth;
    foot.classList.add('nudge');
  });
  panel.addEventListener('pointerdown', () => on.touched());
  panel.addEventListener('keydown', (e) => {
    // the keys are the picker's alone while it is open: the ones that turn the map and set the hour are not meant
    e.stopPropagation();
    on.touched();
    if (e.key === 'Escape') {
      close();
      return;
    }
    const at = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (e.key === 'Tab') {
      // and the tab key stays in the picker
      const stops = [...panel.querySelectorAll<HTMLElement>('button')].filter((b) => b.offsetParent !== null);
      const firstStop = stops[0], lastStop = stops[stops.length - 1];
      if (!firstStop) return;
      if (e.shiftKey && (at === firstStop || at === panel)) {
        e.preventDefault();
        lastStop.focus();
      } else if (!e.shiftKey && at === lastStop) {
        e.preventDefault();
        firstStop.focus();
      }
      return;
    }
    // the arrow keys step from place to place on the board
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols } as Record<string, number>)[e.key];
    const from = at?.dataset.id ? where(at.dataset.id) : null;
    if (step === undefined || !from || from.on !== 'board') return;
    const to = from.i + step;
    if (to < 0 || to >= board.length || (Math.abs(step) === 1 && Math.floor(to / cols) !== Math.floor(from.i / cols))) return;
    e.preventDefault();
    postcards.get(board[to])?.focus();
  });

  return {
    isOpen: () => !panel.hidden,
    close,
    open(now, isKept) {
      if (!panel.hidden) return;
      standing = now.slice();
      // the tiles on the table, and where one of them cannot be picked here, another in its place
      board = now.filter((id, i) => ids.includes(id) && now.indexOf(id) === i).slice(0, places);
      for (const id of ids) if (board.length < places && !board.includes(id)) board.push(id);
      box = ids.filter((id) => !board.includes(id));
      first = board.slice();
      keep = kept = isKept;
      picked = null;
      setting.hidden = true;
      picture();
      lay();
      show(true);
    },
  };
}
