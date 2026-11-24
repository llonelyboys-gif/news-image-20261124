// A single-stroke vector font, drawn from scratch for this entry.
// Glyphs live on a 12-wide grid: cap top y=0, baseline y=14, descender y=18.
// Each glyph is a list of strokes; a stroke is a list of "x,y" points.
// This is a real vector font (scaled strokes), not a bitmap font.
export interface Pen {
  line(x0: number, y0: number, x1: number, y1: number, thick: number, color: number): void;
  fillRect(x: number, y: number, w: number, h: number, color: number): void;
}

export interface Glyph {
  w: number; // advance width in grid units
  strokes: Array<Array<[number, number]>>;
}

function g(w: number, spec: string): Glyph {
  const strokes = spec
    .split(';')
    .filter((s) => s.trim().length > 0)
    .map((s) =>
      s
        .trim()
        .split(/\s+/)
        .map((p) => {
          const [x, y] = p.split(',').map(Number);
          return [x, y] as [number, number];
        }),
    );
  return { w, strokes };
}

// ---- Uppercase ----
const U: Record<string, Glyph> = {
  A: g(12, '1,14 6,0 11,14; 3.6,9 8.4,9'),
  B: g(12, '1,14 1,0 9,0 11,2 11,5 9,7 1,7; 9,7 11,9 11,12 9,14 1,14'),
  C: g(12, '11,2 9,0 3,0 1,2 1,12 3,14 9,14 11,12'),
  D: g(12, '1,14 1,0 8,0 11,3 11,11 8,14 1,14'),
  E: g(11, '10,0 1,0 1,14 10,14; 1,7 7,7'),
  F: g(11, '1,14 1,0 10,0; 1,7 8,7'),
  G: g(12, '11,2 9,0 3,0 1,2 1,12 3,14 9,14 11,12 11,8 7,8'),
  H: g(12, '1,0 1,14; 11,0 11,14; 1,7 11,7'),
  I: g(8, '4,0 4,14; 1,0 7,0; 1,14 7,14'),
  J: g(11, '4,0 10,0; 8,0 8,11 6,14 2,14'),
  K: g(12, '1,0 1,14; 10,0 1,7 11,14'),
  L: g(11, '1,0 1,14 10,14'),
  M: g(13, '1,14 1,0 6.5,9 12,0 12,14'),
  N: g(12, '1,14 1,0 11,14 11,0'),
  O: g(12, '3,0 9,0 11,2 11,12 9,14 3,14 1,12 1,2 3,0'),
  P: g(12, '1,14 1,0 9,0 11,2 11,5 9,7 1,7'),
  Q: g(12, '3,0 9,0 11,2 11,12 9,14 3,14 1,12 1,2 3,0; 8,11 12,15'),
  R: g(12, '1,14 1,0 9,0 11,2 11,5 9,7 1,7; 7,7 12,14'),
  S: g(12, '10,2 8,0 4,0 1,3 1,6 3,8 9,8 11,10 11,13 8,14 4,14 1,12'),
  T: g(12, '1,0 11,0; 6,0 6,14'),
  U: g(12, '1,0 1,11 3,14 9,14 11,11 11,0'),
  V: g(12, '1,0 6,14 11,0'),
  W: g(13, '1,0 3,14 6.5,8 10,14 12,0'),
  X: g(12, '1,0 11,14; 11,0 1,14'),
  Y: g(12, '1,0 6,7 11,0; 6,7 6,14'),
  Z: g(12, '1,0 11,0 1,14 11,14'),
};

// ---- Lowercase (x-height top y=5, baseline y=14, descender y=18) ----
const L: Record<string, Glyph> = {
  a: g(11, '10,5 10,14; 10,9 8,5 3,5 1,7 1,11 3,14 7,14 10,11'),
  b: g(11, '1,0 1,14; 1,9 4,5 8,5 10,7 10,11 8,14 4,14 1,11'),
  c: g(10, '10,7 8,5 4,5 1,7 1,11 4,14 8,14 10,12'),
  d: g(11, '11,0 11,14; 11,9 8,5 4,5 2,7 2,11 4,14 8,14 11,11'),
  e: g(11, '10,11 8,14 4,14 1,11 1,8 3,5 7,5 10,7 10,9 1,9'),
  f: g(8, '7,0 7,2 4,2 3,4 3,14; 1,6 7,6'),
  g: g(11, '10,5 10,13 8,18 3,18 1,16; 10,9 8,5 4,5 1,7 1,11 4,14 8,14 10,11'),
  h: g(11, '1,0 1,14; 1,9 4,5 8,5 10,7 10,14'),
  i: g(5, '2.5,5 2.5,14; 2.5,1 2.5,2.5'),
  j: g(6, '4,5 4,15 3,18 1,18; 4,1 4,2.5'),
  k: g(11, '1,0 1,14; 10,5 1,9 11,14'),
  l: g(5, '2.5,0 2.5,14'),
  m: g(13, '1,14 1,5 4,5 6,8 6,14; 6,8 8,5 11,5 11,14'),
  n: g(11, '1,14 1,5 4,5 8,5 10,7 10,14'),
  o: g(11, '3,5 7,5 10,7 10,11 7,14 3,14 1,11 1,7 3,5'),
  p: g(11, '1,5 1,18; 1,9 4,5 8,5 10,7 10,11 8,14 4,14 1,11'),
  q: g(11, '11,5 11,18; 11,9 8,5 4,5 2,7 2,11 4,14 8,14 11,11'),
  r: g(9, '1,5 1,14; 1,9 4,5 8,5 10,7'),
  s: g(10, '9,7 7,5 3,5 1,7 1,9 3,11 8,11 9,13 9,14 7,14 3,14 1,13'),
  t: g(8, '5,0 5,14; 1,5 8,5; 3,14 7,14'),
  u: g(11, '1,5 1,11 3,14 7,14 9,11 9,5; 11,5 11,14'),
  v: g(11, '1,5 5,14 10,5'),
  w: g(13, '1,5 3,14 6,9 9,14 12,5'),
  x: g(11, '1,5 10,14; 10,5 1,14'),
  y: g(11, '1,5 5,14 10,5; 5,14 5,18 3,18 1,16'),
  z: g(10, '1,5 10,5 1,14 10,14'),
};

// ---- Digits ----
const D: Record<string, Glyph> = {
  '0': g(12, '3,0 9,0 11,2 11,12 9,14 3,14 1,12 1,2 3,0'),
  '1': g(8, '4,0 4,14; 1,3 4,0; 1,14 7,14'),
  '2': g(12, '1,3 2,0 9,0 11,2 11,6 9,8 1,14 11,14'),
  '3': g(12, '1,2 3,0 8,0 11,2 11,5 9,7 6,7; 9,7 11,9 11,12 9,14 3,14 1,12'),
  '4': g(12, '8,0 8,14; 1,9 10,9; 9,0 1,9'),
  '5': g(12, '11,0 1,0 1,7 8,7 11,9 11,12 9,14 3,14 1,12'),
  '6': g(12, '10,2 8,0 3,0 1,3 1,10 3,14 8,14 10,12 10,9 8,7 3,7 1,9'),
  '7': g(12, '1,0 11,0 6,14'),
  '8': g(12, '3,0 9,0 11,2 11,6 9,8 3,8 1,6 1,2 3,0; 1,8 1,12 3,14 9,14 11,12 11,8 9,8'),
  '9': g(12, '1,12 1,4 3,0 8,0 10,2 10,7 8,9 3,9 1,7; 10,2 10,12 8,14 3,14 1,12'),
};

// ---- Punctuation ----
const P: Record<string, Glyph> = {
  ' ': g(6, ''),
  '.': g(5, '2,13 2,14'),
  ',': g(5, '2,13 2,15 1,17'),
  ':': g(5, '2,4 2,5; 2,11 2,12'),
  ';': g(5, '2,4 2,5; 2,11 2,13 1,16'),
  '!': g(5, '2.5,0 2.5,10; 2.5,13 2.5,14'),
  '?': g(11, '2,3 2,1 4,0 8,0 10,2 10,5 8,7 6,8 6,10; 6,13 6,14'),
  "'": g(4, '2,0 1,4'),
  '‘': g(4, '2,0 1,4'),
  '’': g(4, '2,0 1,4'),
  '"': g(8, '2,0 1,4; 6,0 5,4'),
  '“': g(8, '2,0 1,4; 6,0 5,4'),
  '”': g(8, '2,0 1,4; 6,0 5,4'),
  '-': g(11, '1,8 10,8'),
  '–': g(11, '1,8 10,8'),
  '—': g(12, '0,8 12,8'),
  '(': g(7, '6,0 3,2 2,7 3,12 6,14'),
  ')': g(7, '1,0 4,2 5,7 4,12 1,14'),
  '/': g(10, '8,0 2,14'),
  '%': g(12, '10,0 2,14; 2,2 2,4 4,4 4,2 2,2; 8,10 8,12 10,12 10,10 8,10'),
  '$': g(12, '6,0 6,14; 10,3 8,0 4,0 1,3 1,6 3,8 9,8 11,10 11,13 8,14 4,14 2,13'),
  '&': g(12, '9,0 7,0 5,2 5,5 8,7 11,9 11,12 9,14 6,14 4,12 4,9 6,7'),
  '+': g(11, '5.5,3 5.5,12; 1,7.5 10,7.5'),
  '=': g(11, '1,5 10,5; 1,10 10,10'),
  '×': g(11, '2,3 9,11; 9,3 2,11'),
  '·': g(5, '2,7 2,8'),
  '•': g(6, '1,6 4,6 4,9 1,9 1,6'),
  '@': g(12, '9,2 5,1 2,4 2,10 5,13 9,12 11,9 11,5 8,5 6,6 6,10 8,12'),
  '#': g(12, '4,0 3,14; 8,0 7,14; 1,5 11,4; 1,10 11,9'),
  '*': g(11, '5.5,2 5.5,12; 1.5,5 9.5,9; 9.5,5 1.5,9'),
  _: g(11, '1,14 10,14'),
  '>': g(10, '2,3 8,7 2,11'),
  '<': g(10, '8,3 2,7 8,11'),
  '^': g(10, '1,7 5,2 9,7'),
  '|': g(4, '2,0 2,14'),
};

export const GLYPHS: Record<string, Glyph> = { ...U, ...L, ...D, ...P };

export interface TextOpts {
  scale: number; // pixels per grid unit
  color: number;
  thick: number; // stroke thickness in px
  tracking?: number; // extra px between glyphs
  serif?: boolean; // add small serif ticks at vertical stroke ends (masthead)
  allCaps?: boolean;
}

export function glyphFor(ch: string): Glyph {
  return GLYPHS[ch] ?? GLYPHS['?'];
}

export function measure(text: string, scale: number, tracking = 0): number {
  let w = 0;
  for (const ch of text) w += glyphFor(ch).w * scale + tracking;
  return w - tracking;
}

/** Draw text with its cap top at (x, y). Returns the x position after the text. */
export function drawText(pen: Pen, text: string, x: number, y: number, o: TextOpts): number {
  let cx = x;
  const s = o.scale;
  const t = o.thick;
  for (const ch of text) {
    const gl = glyphFor(ch);
    for (const stroke of gl.strokes) {
      for (let i = 0; i + 1 < stroke.length; i++) {
        const [ax, ay] = stroke[i];
        const [bx, by] = stroke[i + 1];
        pen.line(
          Math.round(cx + ax * s),
          Math.round(y + ay * s),
          Math.round(cx + bx * s),
          Math.round(y + by * s),
          t,
          o.color,
        );
      }
      if (o.serif) {
        // small horizontal ticks at the ends of near-vertical strokes
        for (const [px, py] of [stroke[0], stroke[stroke.length - 1]]) {
          const tick = Math.max(1, Math.round(s * 0.9));
          pen.fillRect(
            Math.round(cx + px * s) - tick,
            Math.round(y + py * s) - Math.floor(t / 2),
            tick * 2 + t,
            t,
            o.color,
          );
        }
      }
    }
    cx += gl.w * s + (o.tracking ?? 0);
  }
  return cx;
}

/** Wrap text into lines that fit maxWidth (px). Returns lines. */
export function wrapText(text: string, scale: number, maxWidth: number, tracking = 0): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (measure(trial, scale, tracking) <= maxWidth || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
