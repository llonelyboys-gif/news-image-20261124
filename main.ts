// The World in One Picture — Tuesday 24 November 2026.
// A deterministic Node 22 (stdlib-only) program that draws a 1024x1024 newspaper
// infographic of the day's real news and writes it to /output/entry.png.
// Every story below was researched from live news sources on 24 Nov 2026.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './src/png.ts';
import { drawText, measure, wrapText } from './src/font.ts';

export const W = 1024;
export const H = 1024;

// ---- colours (0xRRGGBB) ----
const PAPER = 0xf6f1e3;
const PAPER2 = 0xefe8d2;
const INK = 0x141210;
const INKSOFT = 0x3a352e;
const RED = 0xa71d22;
const BLUE = 0x1d4e89;
const TEAL = 0x0f6b5c;
const GOLD = 0xb98a1d;
const GREEN = 0x2e6b34;
const GREY = 0x8a8378;
const LIGHT = 0xffffff;
const SKY = 0xbfd6e8;
const SEA = 0x7fa8c9;
const SAND = 0xe3d3a4;
const DARK = 0x1c1a17;

// deterministic PRNG (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Canvas {
  buf: Uint8Array;
  constructor() {
    this.buf = new Uint8Array(W * H * 3);
  }
  px(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= W || y >= H) return -1;
    const i = (y * W + x) * 3;
    return (this.buf[i] << 16) | (this.buf[i + 1] << 8) | this.buf[i + 2];
  }
  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = (c >> 16) & 0xff;
    this.buf[i + 1] = (c >> 8) & 0xff;
    this.buf[i + 2] = c & 0xff;
  }
  fill(c: number): void {
    for (let i = 0; i < W * H; i++) {
      this.buf[i * 3] = (c >> 16) & 0xff;
      this.buf[i * 3 + 1] = (c >> 8) & 0xff;
      this.buf[i * 3 + 2] = c & 0xff;
    }
  }
  fillRect(x: number, y: number, w: number, h: number, c: number): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w));
    const y1 = Math.min(H, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++) {
        this.buf[i] = (c >> 16) & 0xff;
        this.buf[i + 1] = (c >> 8) & 0xff;
        this.buf[i + 2] = c & 0xff;
        i += 3;
      }
    }
  }
  rect(x: number, y: number, w: number, h: number, c: number, t = 1): void {
    this.fillRect(x, y, w, t, c);
    this.fillRect(x, y + h - t, w, t, c);
    this.fillRect(x, y, t, h, c);
    this.fillRect(x + w - t, y, t, h, c);
  }
  // Bresenham line with a square brush of side `thick`. Coordinates are rounded
  // first: fractional endpoints would never land exactly on the target and loop forever.
  line(x0: number, y0: number, x1: number, y1: number, thick: number, c: number): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    const r = Math.floor(thick / 2);
    for (;;) {
      this.fillRect(x - r, y - r, thick, thick, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  circle(cx: number, cy: number, r: number, c: number, filled = true): void {
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(r * r - y * y));
      if (filled) this.fillRect(cx - span, cy + y, span * 2 + 1, 1, c);
      else {
        this.set(cx - span, cy + y, c);
        this.set(cx + span, cy + y, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: number, t = 2): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      for (let k = 0; k < t; k++) {
        this.set(Math.round(cx + (r + k - t / 2) * Math.cos(rad)), Math.round(cy + (r + k - t / 2) * Math.sin(rad)), c);
      }
    }
  }
  poly(points: Array<[number, number]>, c: number): void {
    // even-odd scanline fill
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]), 1, c);
      }
    }
  }
  // paper grain: deterministic, subtle, only where asked (keeps text crisp)
  grain(x: number, y: number, w: number, h: number, amp: number, seed: number): void {
    const r = rng(seed);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const d = Math.floor((r() - 0.5) * 2 * amp);
        if (d === 0) continue;
        const i = (yy * W + xx) * 3;
        for (let k = 0; k < 3; k++) {
          const v = this.buf[i + k] + d;
          this.buf[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
    }
  }
  // halftone dots in a region (deterministic)
  dots(x: number, y: number, w: number, h: number, step: number, c: number, seed: number): void {
    const r = rng(seed);
    for (let yy = y + step / 2; yy < y + h; yy += step) {
      for (let xx = x + step / 2; xx < x + w; xx += step) {
        if (r() < 0.45) this.circle(Math.round(xx), Math.round(yy), 1, c);
      }
    }
  }
  text(s: string, x: number, y: number, scale: number, color: number, thick = 1, tracking = 0, serif = false): number {
    return drawText(this, s, Math.round(x), Math.round(y), { scale, color, thick, tracking, serif });
  }
  // centred text; returns width
  textC(s: string, cx: number, y: number, scale: number, color: number, thick = 1, tracking = 0): number {
    const w = measure(s, scale, tracking);
    return this.text(s, cx - w / 2, y, scale, color, thick, tracking);
  }
  // wrapped paragraph; returns y after the last line
  para(s: string, x: number, y: number, maxW: number, scale: number, color: number, thick: number, lh: number): number {
    const lines = wrapText(s, scale, maxW);
    let yy = y;
    for (const ln of lines) {
      this.text(ln, x, yy, scale, color, thick);
      yy += lh;
    }
    return yy;
  }
  // small verification label chip: coloured box + white text
  chip(label: string, x: number, y: number, scale: number): number {
    const col = label === 'CONFIRMED' ? GREEN : label === 'OFFICIAL' ? BLUE : label === 'REPORTED' ? TEAL : label === 'CLAIM' ? GOLD : RED;
    const w = measure(label, scale, 0.5) + 8;
    this.fillRect(x, y, w, Math.round(scale * 16) + 4, col);
    this.text(label, x + 4, y + 2, scale, LIGHT, 1, 0.5);
    return x + w;
  }
}

// label colours for the legend
export const LABEL_COLOURS: Record<string, number> = {
  CONFIRMED: GREEN, OFFICIAL: BLUE, REPORTED: TEAL, CLAIM: GOLD, FORECAST: RED,
};

// ---- the day's stories (researched 24 Nov 2026; only events of, or first reported on, 24 Nov) ----
export interface Story {
  n: number;
  head: string;
  body: string;
  label: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED' | 'CLAIM' | 'FORECAST';
  src: string;
  place: string;
  // map pin position on the 1024 canvas (set for pinned stories)
  pin?: [number, number];
  utc?: string;
}

export const LEADS: Story[] = [
  {
    n: 1,
    head: 'HUANG IS BACK — WALL ST SOARS',
    body: 'Nvidia reinstates Jensen Huang as chief executive and Wall Street has its best day since April 2025. The shares jump 31% to $165.05, the S&P 500 rises 4.7% to 7,237 and the Nasdaq 6.5%. The rally recovers about half of a seven-session fall — but the 10-year yield does not move.',
    label: 'CONFIRMED', src: 'Antevo / Reuters', place: 'New York', utc: '21:00',
  },
  {
    n: 2,
    head: 'UKRAINE SINKS RUSSIAN WARSHIP OFF LIBYA',
    body: 'Kyiv says its naval drones sank the Russian corvette Merkury at Benghazi, carrying the Black Sea fight into the Mediterranean. President Zelenskyy praises the strike; Tripoli demands explanations from Kyiv and the UN is asked to probe the attack on the Russian warship.',
    label: 'REPORTED', src: 'AP / Middle East Eye', place: 'Benghazi, Libya', utc: '23 Nov',
  },
  {
    n: 3,
    head: '14 NATIONS BACK GENOCIDE RULING ON MYANMAR',
    body: 'Fourteen countries — led by the UK, Spain, Canada and Australia — affirm the International Court of Justice ruling that Myanmar committed genocide against the Rohingya. London also imposes new sanctions on senior military figures. The ruling sets a precedent for the case against Israel over Gaza.',
    label: 'REPORTED', src: 'Reuters / AP', place: 'The Hague', utc: '03:00',
  },
];

export const SECOND: Story[] = [
  {
    n: 4,
    head: 'GAZA STRIKES KILL THREE, INCLUDING UN AID WORKER',
    body: 'Israeli strikes kill three people in Gaza, including an employee of the UN relief agency UNRWA, health officials say. Oxfam calls the territory a “toxic land” after two years of war.',
    label: 'REPORTED', src: 'AP / Al Jazeera', place: 'Gaza',
  },
  {
    n: 5,
    head: 'US DRONE HELPS CATCH “EL CHAPO ISIDRO”',
    body: 'A US surveillance drone helps Mexican forces capture cartel leader Fausto Isidro Meza Flores in Sinaloa. Mexico says it will try him at home, despite a US extradition request.',
    label: 'CONFIRMED', src: 'AP', place: 'Sinaloa, Mexico', utc: '02:09',
  },
  {
    n: 6,
    head: 'NEPAL SHAKEN BY 5.6 QUAKE',
    body: 'A magnitude 5.6 earthquake strikes Nepal near the Chinese border, rattling Kathmandu. No major casualties are reported by nightfall.',
    label: 'CONFIRMED', src: 'USGS', place: 'Nepal',
  },
  {
    n: 7,
    head: 'NO DEAL FOR THE PACIFIC AS COP31 ENDS IN DEADLOCK',
    body: 'Pacific island leaders voice disappointment as the Antalya climate talks close without a cover text — the first such failure since 2009. More than 90 nations rejected a draft that never said “fossil fuels”.',
    label: 'REPORTED', src: 'PINA / AP', place: 'Antalya, Türkiye',
  },
];

// The numbered "ALSO ON TUESDAY" list: one line each.
export const ALSO: Array<[string, string, Story['label'], string]> = [
  ['NATO vows space defence as Russia ‘may launch nuclear satellite’', 'NATO / Reuters', 'REPORTED', 'Brussels'],
  ['US sanctions ~30 Iran-linked exchange houses', 'US Treasury', 'OFFICIAL', 'Washington'],
  ['Rubio meets Qatar PM as mediation over Iran stalls', 'AP', 'REPORTED', 'Doha'],
  ['Iran lashes singer Parastoo Ahmadi 74 times', 'AP', 'REPORTED', 'Tehran'],
  ['China sentences official Ma to death for spying', 'Gold Wall Press', 'REPORTED', 'Beijing'],
  ['Russian jets enter Korea’s air-defence zone; Seoul walks back report', 'Yonhap', 'OFFICIAL', 'Seoul'],
  ['Bukele names 3 Salvadoran soldiers killed on Haiti mission', 'AP', 'OFFICIAL', 'San Salvador'],
  ['Guterres wants global AI-risk rules within a year', 'UN', 'OFFICIAL', 'New York'],
  ['US blacklists Megaspeed, firm at centre of Nvidia scandal', 'Commerce Dept', 'OFFICIAL', 'Washington'],
  ['Pentagon rebukes Canada over spending, F-35 review', 'Reuters', 'REPORTED', 'Washington'],
  ['Zelenskyy urges urgent four-way peace talks', 'AP', 'REPORTED', 'Kyiv'],
  ['Putin ‘open to Article 5-style guarantees’ for Kyiv', 'Washington Post', 'REPORTED', 'Moscow'],
  ['Russia warns Estonia ‘on verge of triggering open war’', 'TASS', 'CLAIM', 'Tallinn'],
  ['Houthis say dozens are dead in Saudi airstrikes on Yemen', 'Houthi media', 'CLAIM', 'Sanaa'],
  ['Somalia, Uganda step up fight against al-Shabaab', 'Reuters', 'REPORTED', 'Mogadishu'],
  ['Ituri fighting disrupts Ebola response in DR Congo', 'UN / OSINT', 'REPORTED', 'Ituri'],
  ['Oregon, Virginia sue SpaceX over Grok abuse images', 'Reuters', 'REPORTED', 'Salem'],
  ['Arm extends CEO Rene Haas’s tenure to 2033', 'Arm', 'OFFICIAL', 'Cambridge'],
  ['Arya smashes 181, second-highest T20 score ever', 'ESPNcricinfo', 'CONFIRMED', 'Indore'],
  ['India 720/9 but can’t take last 5 NZ wickets; Test drawn', 'IANS', 'CONFIRMED', 'Wellington'],
  ['South Africa bowl Bangladesh out for 91 on day one at Centurion', 'IANS', 'CONFIRMED', 'Centurion'],
  ['Liverpool 4–0 Man Utd; Brentford 4–0 Everton', 'IANS', 'CONFIRMED', 'Liverpool'],
  ['Verstappen wins Las Vegas GP; F1 plans V8 return', 'AP', 'CONFIRMED', 'Las Vegas'],
  ['Alcaraz wins ATP Finals; Sinner faces knee surgery', 'ATP', 'CONFIRMED', 'Turin'],
  ['Tarik Skubal agrees a record $450m contract with the Mets', 'MLB', 'REPORTED', 'New York'],
  ['Anthony Joshua v Tyson Fury is announced for 2027', 'Promoters', 'REPORTED', 'London'],
  ['Bangladesh vaccinates 50m children against typhoid', 'WHO', 'OFFICIAL', 'Dhaka'],
  ['Army hunts scores missing after Himalayan flood', 'Reuters', 'REPORTED', 'Uttarakhand'],
  ['Car bomb in Villavicencio injures more than a dozen', 'AP', 'REPORTED', 'Villavicencio'],
  ['Fiji shuts schools 5 days as El Niño drought deepens', 'Fiji Govt', 'OFFICIAL', 'Suva'],
  ['Pope Leo XIV seeks mail-in ballot for US midterms', 'The Munich Eye', 'REPORTED', 'Vatican City'],
  ['Mayon eruption stokes fears of bigger blast', 'PHIVOLCS', 'REPORTED', 'Legazpi'],
  ['EU sanctions founder of neo-Nazi group The Base', 'EU', 'OFFICIAL', 'Brussels'],
];

export const TIMELINE: Array<[string, string]> = [
  ['01:04', 'Korea ADIZ incursion'],
  ['01:06', 'Haiti dead named'],
  ['02:09', 'El Chapo Isidro caught'],
  ['02:15', 'NATO space vow'],
  ['02:37', 'China spy sentenced'],
  ['03:35', 'Dalai Lama talks'],
  ['04:04', 'ICJ ruling backed'],
];

export const NUMBERS: Array<[string, string]> = [
  ['+31%', 'NVIDIA SHARES'],
  ['+4.7%', 'S&P 500'],
  ['14', 'NATIONS BACK ICJ'],
  ['181', 'ARYA’S T20 RUNS'],
  ['720/9', 'INDIA’S TOTAL'],
  ['5.6', 'NEPAL QUAKE'],
];

export const DATE_CHECK_LEFT_OUT = 'COP31 collapse (22 Nov) · Nvidia’s 22% weekly fall (20 Nov) · Russian missiles in Poland (20 Nov) · Anthropic IPO debut (19 Nov)';
export const DATE_CHECK_NOT_YET = 'US consumer confidence (due today) · Core PCE inflation (Wed 25 Nov) · Thanksgiving (Thu 26 Nov) · 2nd Test, India v NZ (Fri 27 Nov)';

export const SOURCES_LINE = 'Sources: AP · Reuters · AFP · Yonhap · ESPNcricinfo · IANS · US Treasury · UN · NATO · USGS · PINA · Antevo · Washington Post';

// ---- drawing sections ----
function drawUTCStrip(c: Canvas): void {
  c.fillRect(0, 0, W, 4, RED);
  c.fillRect(0, 50, W, 2, INK);
  c.text('THE DAY IN UTC', 8, 12, 0.75, RED, 1, 0.5);
  let x = 150;
  for (const [t, ev] of TIMELINE) {
    c.text(t, x, 12, 0.7, BLUE, 1);
    const evLines = wrapText(ev, 0.5, 116);
    let ey = 28;
    for (const ln of evLines.slice(0, 2)) {
      c.text(ln, x, ey, 0.5, INKSOFT, 1);
      ey += 8;
    }
    x += 122;
  }
}

function drawNumbersStrip(c: Canvas): void {
  c.fillRect(0, 92, W, 2, INK);
  c.text('THE DAY IN NUMBERS', 8, 60, 0.75, RED, 1, 0.5);
  let x = 170;
  for (const [num, lab] of NUMBERS) {
    c.text(num, x, 58, 1.05, INK, 2);
    c.text(lab, x, 76, 0.5, INKSOFT, 1);
    x += 140;
  }
}

function drawMasthead(c: Canvas): void {
  // serif masthead, big and bold
  c.textC('THE WORLD IN ONE PICTURE', W / 2, 104, 2.6, INK, 3, 1, true);
  c.fillRect(8, 162, W - 16, 2, INK);
  c.text('TUESDAY, 24 NOVEMBER 2026', 8, 168, 0.7, INK, 1, 0.5);
  c.textC('40 STORIES  ·  7 REGIONS  ·  10 FIELDS  ·  ALL FROM THIS TUESDAY', W / 2, 168, 0.7, RED, 1, 0.5);
  c.text('PRICE: ONE DAY', 1016 - measure('PRICE: ONE DAY', 0.7, 0.5), 168, 0.7, INK, 1, 0.5);
  c.fillRect(8, 184, W - 16, 2, INK);
}

// ---- lead illustrations (each drawn specially, not generic icons) ----
function drawNvidiaChart(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, 0x0e2a1a);
  c.dots(x, y, w, h, 7, 0x1d4d33, 11);
  // gridlines
  for (let i = 1; i < 4; i++) c.fillRect(x + 8, y + (h * i) / 4, w - 16, 1, 0x2a5a40);
  c.text('$125', x + 4, y + h - 12, 0.5, 0x9fd8b4, 1);
  c.text('$165', x + 4, y + 4, 0.5, 0x9fd8b4, 1);
  // line: Fri close 125.53 -> Mon close 165.05 (+31%)
  const pts: Array<[number, number]> = [
    [0.06, 0.82], [0.22, 0.78], [0.38, 0.62], [0.55, 0.30], [0.72, 0.22], [0.92, 0.18],
  ];
  for (let i = 0; i + 1 < pts.length; i++) {
    c.line(
      Math.round(x + pts[i][0] * w), Math.round(y + pts[i][1] * h),
      Math.round(x + pts[i + 1][0] * w), Math.round(y + pts[i + 1][1] * h),
      3, 0x37d67a,
    );
  }
  for (const [px, py] of pts) c.circle(Math.round(x + px * w), Math.round(y + py * h), 3, 0x37d67a);
  c.text('+31%', x + w - 78, y + 8, 1.5, 0x37d67a, 2);
  c.text('NVDA  $165.05', x + w - 108, y + 30, 0.55, LIGHT, 1);
  c.text('S&P +4.7%  ·  NASDAQ +6.5%', x + 8, y + h - 12, 0.5, 0x9fd8b4, 1);
}

function drawLibyaSea(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, SEA);
  // Libya coastline (stylised): land at the bottom
  c.poly(
    [[x, y + h], [x + w * 0.08, y + h * 0.62], [x + w * 0.3, y + h * 0.55], [x + w * 0.55, y + h * 0.66], [x + w * 0.8, y + h * 0.58], [x + w, y + h * 0.7], [x + w, y + h]],
    SAND,
  );
  c.text('MEDITERRANEAN', x + 10, y + 8, 0.55, LIGHT, 1, 0.5);
  c.text('LIBYA', x + w * 0.45, y + h - 16, 0.6, INKSOFT, 1, 0.5);
  // Benghazi pin + warship
  const bx = x + w * 0.62;
  const by = y + h * 0.52;
  c.circle(bx, by, 4, RED);
  c.ring(bx, by, 8, RED, 2);
  c.text('BENGHAZI', bx - 26, by + 12, 0.5, INK, 1);
  // warship silhouette
  const sx = x + w * 0.55;
  const sy = y + h * 0.34;
  c.poly([[sx, sy], [sx + 52, sy], [sx + 58, sy + 8], [sx + 50, sy + 8], [sx + 46, sy + 12], [sx + 4, sy + 12], [sx - 2, sy + 8]], 0x3a3f45);
  c.fillRect(sx + 18, sy - 10, 4, 10, 0x3a3f45);
  c.fillRect(sx + 30, sy - 14, 3, 14, 0x3a3f45);
  // explosion burst
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    c.line(Math.round(sx + 26), Math.round(sy - 4), Math.round(sx + 26 + Math.cos(a) * 16), Math.round(sy - 4 + Math.sin(a) * 16), 2, 0xf2a007);
  }
  c.circle(sx + 26, sy - 4, 5, 0xf2a007);
  // drone path (dashed)
  for (let i = 0; i < 10; i++) {
    const px = x + w * 0.08 + i * ((bx - x - w * 0.08) / 10);
    const py = y + h * 0.2 + Math.sin(i * 0.9) * 6;
    c.fillRect(Math.round(px), Math.round(py), 6, 2, INK);
  }
  c.text('7 NAVAL DRONES', x + 10, y + h * 0.4, 0.5, INK, 1);
}

function drawScales(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, 0x232c3d);
  c.dots(x, y, w, h, 7, 0x2f3d55, 23);
  // scales of justice
  const cx = x + w / 2;
  const top = y + 8;
  c.fillRect(cx - 2, top, 4, h - 34, GOLD);
  c.line(cx - 52, top + 10, cx + 52, top + 10, 3, GOLD);
  c.circle(cx, top + 10, 4, GOLD);
  // left pan (Myanmar) and right pan (Rohingya)
  c.line(cx - 52, top + 10, cx - 52, top + 30, 2, GOLD);
  c.line(cx + 52, top + 10, cx + 52, top + 30, 2, GOLD);
  c.poly([[cx - 66, top + 30], [cx - 38, top + 30], [cx - 52, top + 44]], GOLD);
  c.poly([[cx + 38, top + 30], [cx + 66, top + 30], [cx + 52, top + 44]], GOLD);
  c.fillRect(cx - 16, y + h - 22, 32, 4, GOLD);
  // vote count lives on the flags label, not as a floating number
  c.text('THE HAGUE', x + 8, y + 6, 0.55, 0x9db4d0, 1, 0.5);
  c.text('GENOCIDE', x + w - 62, y + 6, 0.55, 0x9db4d0, 1, 0.5);
  // 14 flags row (stylised bars)
  const flagCols = [RED, BLUE, TEAL, GREEN, GOLD, 0x7a4a8a, 0xc25e1e, 0x2a6b8a, 0x8a2a3a, 0x4a7a2a, 0x9a7a1a, 0x3a5a9a, 0xa04a6a, 0x5a8a3a];
  for (let i = 0; i < 14; i++) {
    c.fillRect(x + 8 + i * 21, y + h - 12, 16, 8, flagCols[i]);
  }
  c.text('14 NATIONS · ICJ VOTE 9–6', x + 8, y + h - 26, 0.5, LIGHT, 1);
}

function drawLead(c: Canvas, s: Story, x: number, y: number, w: number, h: number): void {
  c.rect(x, y, w, h, INK, 2);
  const ex = c.chip(s.label, x + 8, y + 8, 0.55);
  c.text(s.src.toUpperCase(), ex + 8, y + 10, 0.5, GREY, 1);
  c.text('No. ' + s.n, x + w - 44, y + 10, 0.5, RED, 1);
  const headLines = wrapText(s.head, 0.88, w - 16);
  let hy = y + 30;
  for (const ln of headLines.slice(0, 2)) {
    c.text(ln, x + 8, hy, 0.88, INK, 2);
    hy += 15;
  }
  const iy = y + 64;
  const ih = 84;
  if (s.n === 1) drawNvidiaChart(c, x + 8, iy, w - 16, ih);
  else if (s.n === 2) drawLibyaSea(c, x + 8, iy, w - 16, ih);
  else drawScales(c, x + 8, iy, w - 16, ih);
  const bodyLines = wrapText(s.body, 0.62, w - 16);
  let by = iy + ih + 8;
  for (const ln of bodyLines.slice(0, 7)) {
    c.text(ln, x + 8, by, 0.62, INKSOFT, 1);
    by += 11;
  }
}

// ---- second-row illustrations ----
function drawGaza(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, SAND);
  c.poly([[x + 8, y + 6], [x + w - 8, y + 10], [x + w - 14, y + h - 8], [x + 12, y + h - 6]], 0xd9c48a);
  c.rect(x + 8, y + 6, w - 16, h - 12, INKSOFT, 1);
  c.text('GAZA', x + 10, y + 8, 0.55, INK, 1);
  c.text('3 KILLED', x + w - 58, y + h - 14, 0.6, RED, 1);
  for (const [px, py] of [[0.35, 0.4], [0.55, 0.55], [0.7, 0.35]] as Array<[number, number]>) {
    c.circle(Math.round(x + px * w), Math.round(y + py * h), 4, RED);
    c.ring(Math.round(x + px * w), Math.round(y + py * h), 7, RED, 1);
  }
}

function drawDrone(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, 0xdfe8ee);
  // desert road
  c.poly([[x, y + h], [x + w * 0.4, y + h * 0.4], [x + w * 0.6, y + h * 0.4], [x + w, y + h]], 0xc9a86a);
  // quadcopter drone
  const dx = x + w * 0.5;
  const dy = y + h * 0.42;
  c.line(dx - 26, dy - 12, dx + 26, dy + 12, 2, INK);
  c.line(dx + 26, dy - 12, dx - 26, dy + 12, 2, INK);
  c.fillRect(dx - 8, dy - 5, 16, 10, INK);
  for (const [rx, ry] of [[-28, -14], [28, -14], [-28, 14], [28, 14]] as Array<[number, number]>) {
    c.line(dx + rx - 10, dy + ry, dx + rx + 10, dy + ry, 2, INKSOFT);
  }
  // handcuffs
  c.ring(x + w * 0.18, y + h - 14, 7, INK, 2);
  c.ring(x + w * 0.36, y + h - 14, 7, INK, 2);
  c.line(x + w * 0.18 + 7, y + h - 14, x + w * 0.36 - 7, y + h - 14, 2, INK);
  c.text('SINALOA', x + 8, y + 6, 0.55, INKSOFT, 1);
}

function drawQuake(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, 0xefe6cf);
  // mountains
  c.poly([[x, y + h], [x + w * 0.25, y + h * 0.25], [x + w * 0.5, y + h]], 0x8a94a6);
  c.poly([[x + w * 0.3, y + h], [x + w * 0.6, y + h * 0.15], [x + w * 0.95, y + h]], 0x6b7688);
  c.poly([[x + w * 0.22, y + h * 0.3], [x + w * 0.25, y + h * 0.25], [x + w * 0.28, y + h * 0.3]], LIGHT);
  // seismograph trace
  let px = x + 6;
  let py = y + h * 0.72;
  const r = rng(7);
  for (let i = 0; i < 40; i++) {
    const nx = px + (w - 12) / 40;
    const ny = y + h * 0.72 + (r() - 0.5) * (i > 18 && i < 26 ? 34 : 8);
    c.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), 1, RED);
    px = nx; py = ny;
  }
  c.text('5.6', x + w - 52, y + 6, 1.2, RED, 2);
  c.text('NEPAL', x + 8, y + 6, 0.55, INKSOFT, 1);
}

function drawCop(c: Canvas, x: number, y: number, w: number, h: number): void {
  c.fillRect(x, y, w, h, 0xdfe9e4);
  // globe with a crack
  const cx = x + w * 0.5;
  const cy = y + h * 0.52;
  c.circle(cx, cy, 20, TEAL);
  c.line(cx - 18, cy - 6, cx + 14, cy - 2, 1, 0x9fd0c4);
  c.line(cx - 12, cy + 8, cx + 16, cy + 10, 1, 0x9fd0c4);
  // crack
  c.line(cx - 4, cy - 20, cx + 2, cy - 8, 2, INK);
  c.line(cx + 2, cy - 8, cx - 3, cy + 2, 2, INK);
  c.line(cx - 3, cy + 2, cx + 4, cy + 12, 2, INK);
  c.line(cx + 4, cy + 12, cx, cy + 20, 2, INK);
  // NO DEAL stamp
  c.text('NO DEAL', x + 8, y + 4, 0.7, RED, 1, 0.5);
  c.text('90+ NATIONS', x + w - 78, y + h - 14, 0.5, INKSOFT, 1);
}

function drawSecond(c: Canvas, s: Story, x: number, y: number, w: number, h: number): void {
  c.rect(x, y, w, h, INK, 1);
  const ex = c.chip(s.label, x + 6, y + 6, 0.5);
  c.text(s.src.toUpperCase(), ex + 6, y + 8, 0.45, GREY, 1);
  const headLines = wrapText(s.head, 0.78, w - 12);
  let hy = y + 24;
  for (const ln of headLines.slice(0, 2)) {
    c.text(ln, x + 6, hy, 0.78, INK, 2);
    hy += 13;
  }
  const iy = y + 52;
  const ih = 40;
  if (s.n === 4) drawGaza(c, x + 6, iy, w - 12, ih);
  else if (s.n === 5) drawDrone(c, x + 6, iy, w - 12, ih);
  else if (s.n === 6) drawQuake(c, x + 6, iy, w - 12, ih);
  else drawCop(c, x + 6, iy, w - 12, ih);
  const bodyLines = wrapText(s.body, 0.55, w - 12);
  let by = iy + ih + 6;
  for (const ln of bodyLines.slice(0, 5)) {
    c.text(ln, x + 6, by, 0.55, INKSOFT, 1);
    by += 10;
  }
}

// ---- world map "WHERE IT HAPPENED" ----
const CONTINENTS: Array<Array<[number, number]>> = [
  // North America
  [[-168, 66], [-140, 70], [-120, 72], [-95, 80], [-80, 73], [-60, 60], [-55, 47], [-70, 42], [-75, 35], [-80, 26], [-90, 21], [-97, 16], [-105, 20], [-115, 28], [-125, 40], [-125, 49], [-140, 60], [-165, 60]],
  // South America
  [[-80, 9], [-60, 8], [-50, 0], [-35, -8], [-40, -20], [-48, -28], [-58, -35], [-65, -45], [-70, -52], [-73, -37], [-70, -20], [-80, -5]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 48], [0, 50], [5, 53], [8, 57], [10, 59], [18, 56], [21, 55], [24, 59], [28, 60], [30, 70], [25, 71], [18, 69], [12, 65], [5, 60], [5, 58], [-5, 50], [-10, 44]],
  // Africa
  [[-17, 15], [-10, 30], [0, 36], [10, 37], [20, 32], [32, 31], [35, 28], [40, 15], [48, 11], [51, 10], [44, 0], [40, -10], [36, -18], [32, -26], [26, -34], [18, -35], [14, -25], [12, -6], [9, 4], [-8, 4], [-13, 8]],
  // Asia
  [[30, 70], [45, 68], [60, 69], [75, 72], [90, 75], [110, 77], [130, 72], [160, 70], [178, 65], [170, 60], [158, 52], [142, 45], [135, 43], [127, 40], [122, 32], [120, 25], [108, 18], [105, 8], [100, 8], [95, 16], [90, 22], [80, 8], [76, 10], [72, 20], [66, 25], [60, 25], [56, 27], [50, 29], [48, 30], [42, 15], [38, 20], [35, 28], [30, 36]],
  // Australia
  [[113, -22], [114, -30], [115, -35], [124, -33], [130, -32], [137, -35], [140, -38], [147, -39], [150, -37], [153, -27], [146, -19], [142, -11], [136, -12], [132, -11], [126, -14], [122, -17], [114, -22]],
];

export interface Pin { n: number; lon: number; lat: number; label: string; }
const PINS: Pin[] = [
  { n: 1, lon: -74, lat: 41, label: 'NEW YORK — Nvidia +31%, Wall St best day since Apr 2025' },
  { n: 2, lon: 20, lat: 32, label: 'BENGHAZI — Ukraine drones sink Russian warship Merkury' },
  { n: 3, lon: 4, lat: 52, label: 'THE HAGUE — 14 nations back ICJ genocide ruling on Myanmar' },
  { n: 4, lon: 34, lat: 31, label: 'GAZA — Strikes kill 3, incl. UNRWA worker' },
  { n: 5, lon: -107, lat: 25, label: 'SINALOA — US drone helps catch “El Chapo Isidro”' },
  { n: 6, lon: 84, lat: 28, label: 'NEPAL — 5.6 quake near the China border' },
  { n: 7, lon: 30, lat: 37, label: 'ANTALYA — COP31 ends with no deal for the Pacific' },
  { n: 8, lon: 127, lat: 37, label: 'SEOUL — Russian jets enter air-defence zone' },
  { n: 9, lon: 116, lat: 40, label: 'BEIJING — Official sentenced to death for spying' },
  { n: 10, lon: -72, lat: 19, label: 'HAITI — Bukele names 3 Salvadoran soldiers killed' },
  { n: 11, lon: 178, lat: -18, label: 'FIJI — Schools shut 5 days as El Niño drought deepens' },
  { n: 12, lon: -73, lat: 4, label: 'VILLAVICENCIO — Car bomb injures 12+' },
];

function drawMap(c: Canvas): void {
  const mx = 8;
  const my = 606;
  const mw = 620;
  const mh = 138;
  c.rect(mx, my - 22, mw, mh + 22, INK, 1);
  c.text('WHERE IT HAPPENED', mx + 8, my - 18, 0.75, RED, 1, 0.5);
  c.text('12 PLACES, ONE TUESDAY', mx + 190, my - 18, 0.6, GREY, 1);
  const px = (lon: number) => mx + ((lon + 180) / 360) * mw;
  const py = (lat: number) => my + ((75 - lat) / 135) * mh;
  c.fillRect(mx + 1, my + 1, mw - 2, mh - 2, 0x9dbfd6);
  // graticule
  for (let lon = -150; lon <= 150; lon += 30) c.line(Math.round(px(lon)), my + 1, Math.round(px(lon)), my + mh - 1, 1, 0x8ab0cc);
  for (let lat = -45; lat <= 60; lat += 30) c.line(mx + 1, Math.round(py(lat)), mx + mw - 1, Math.round(py(lat)), 1, 0x8ab0cc);
  for (const cont of CONTINENTS) {
    c.poly(cont.map(([lo, la]) => [Math.round(px(lo)), Math.round(py(la))] as [number, number]), SAND);
  }
  for (const p of PINS) {
    const x = Math.round(px(p.lon));
    const y = Math.round(py(p.lat));
    c.circle(x, y, 8, RED);
    c.ring(x, y, 8, LIGHT, 1);
    c.text(String(p.n), x - (p.n < 10 ? 2 : 4), y - 4, 0.55, LIGHT, 1);
  }
  // legend
  let ly = my - 18;
  c.text('ON THE MAP', 648, ly, 0.7, RED, 1, 0.5);
  ly += 16;
  for (const p of PINS) {
    c.circle(656, ly + 4, 6, RED);
    c.text(String(p.n), 654 - (p.n < 10 ? 0 : 2), ly, 0.5, LIGHT, 1);
    const lines = wrapText(p.label, 0.52, 340);
    let yy = ly;
    for (const ln of lines.slice(0, 2)) {
      c.text(ln, 668, yy, 0.52, INKSOFT, 1);
      yy += 9;
    }
    ly = yy + 3;
  }
}

// ---- ALSO ON TUESDAY ----
function drawAlso(c: Canvas): void {
  const y0 = 756;
  c.fillRect(8, y0 - 6, W - 16, 2, INK);
  c.text('ALSO ON TUESDAY', 8, y0, 0.8, RED, 1, 0.5);
  c.text('33 MORE STORIES · EVERY ONE FIRST REPORTED TODAY', 200, y0 + 2, 0.6, GREY, 1);
  const colW = 336;
  const colX = [8, 352, 688];
  for (let col = 0; col < 3; col++) {
    const items = ALSO.slice(col * 11, col * 11 + 11);
    let y = y0 + 18;
    for (let i = 0; i < items.length; i++) {
      const [head, src, label] = items[i];
      const n = 8 + col * 11 + i;
      // the item number is drawn in its verification-label colour (see footer legend)
      c.text(String(n), colX[col], y, 0.55, LABEL_COLOURS[label], 1);
      // two rows: headline (up to 2 lines, room reserved for the source) + source right-aligned
      const lines = wrapText(head, 0.52, colW - 24 - 92);
      const shown = lines.slice(0, 2);
      let yy = y;
      for (let li = 0; li < shown.length; li++) {
        c.text(shown[li], colX[col] + 20, yy, 0.52, INK, 1);
        if (li === shown.length - 1) {
          const srcTxt = '— ' + src;
          c.text(srcTxt, colX[col] + colW - 4 - measure(srcTxt, 0.45), yy, 0.45, GREY, 1);
        }
        yy += 9;
      }
      if (shown.length === 1) {
        c.text(label, colX[col] + 20, yy, 0.45, GREY, 1);
      }
      y += 18;
    }
  }
}

// ---- footer: DATE CHECK + legend + sources ----
function drawFooter(c: Canvas): void {
  const y0 = 962;
  c.fillRect(8, y0 - 4, W - 16, 2, INK);
  // DATE CHECK box
  c.rect(8, y0 + 2, 640, 56, RED, 2);
  c.text('DATE CHECK', 16, y0 + 8, 0.7, RED, 1, 0.5);
  c.text('LEFT OUT ON PURPOSE — FIRST REPORTED BEFORE TUESDAY:', 16, y0 + 22, 0.5, INKSOFT, 1);
  const l1 = wrapText(DATE_CHECK_LEFT_OUT, 0.5, 620);
  c.text(l1[0] ?? '', 16, y0 + 32, 0.5, INK, 1);
  c.text('NOT YET — AFTER THIS PICTURE WAS DRAWN:', 16, y0 + 42, 0.5, INKSOFT, 1);
  const l2 = wrapText(DATE_CHECK_NOT_YET, 0.5, 620);
  c.text(l2[0] ?? '', 16, y0 + 52, 0.5, INK, 1);
  // legend + sources, right side
  let ry = y0 + 4;
  c.text('HOW WE KNOW IT:', 664, ry, 0.55, INK, 1, 0.5);
  ry += 12;
  let lx = 664;
  for (const [lab, col] of Object.entries(LABEL_COLOURS)) {
    const w = measure(lab, 0.5, 0.5) + 8;
    c.fillRect(lx, ry, w, 12, col);
    c.text(lab, lx + 4, ry + 1, 0.5, LIGHT, 1, 0.5);
    lx += w + 6;
  }
  ry += 16;
  const srcLines = wrapText(SOURCES_LINE, 0.5, 344);
  for (const ln of srcLines) {
    c.text(ln, 664, ry, 0.5, INKSOFT, 1);
    ry += 9;
  }
}

export function render(): Canvas {
  const c = new Canvas();
  c.fill(PAPER);
  // faint paper texture on the whole sheet (deterministic)
  c.grain(0, 0, W, H, 3, 42);
  drawUTCStrip(c);
  drawNumbersStrip(c);
  drawMasthead(c);
  const leadXs = [8, 344, 680];
  for (let i = 0; i < 3; i++) drawLead(c, LEADS[i], leadXs[i], 188, 328, 234);
  const secondXs = [8, 264, 520, 776];
  for (let i = 0; i < 4; i++) drawSecond(c, SECOND[i], secondXs[i], 428, 248, 150);
  drawMap(c);
  drawAlso(c);
  drawFooter(c);
  // thin frame
  c.rect(2, 2, W - 4, H - 4, INK, 1);
  return c;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePNG(W, H, render().buf);
writeFileSync(join(outDir, 'entry.png'), png);
console.log('wrote', join(outDir, 'entry.png'), png.length, 'bytes');
