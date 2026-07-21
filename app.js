// app.js — the 3d scene: the real solar system at true scale, live.
//
// The one rule of this project: 1 three.js unit = 1 astronomical unit (au),
// and NOTHING is compressed or exaggerated. The Sun is its real size
// (0.00465 au across — tiny!), Earth is its real size (0.00004 au), and
// Voyager 1 sits its real 171+ au away. Because true scale makes worlds
// invisible from far away, each body also carries a small Bauhaus map
// symbol (circle / square / triangle) as its label — the symbols are the
// map, the spheres underneath are the truth you find when you zoom in.
//
// All positions come from ephemeris.js, which is tested against NASA data.

/* global THREE, Ephem */

const KM_PER_AU = Ephem.AU_KM;

// --- Bodies to show ---------------------------------------------------------
// radiusKm are the real measured radii. colorHex are flat, poster-like
// colours (bauhaus taste) that still read as the familiar worlds.
// fact/discovered/periodYears feed the visiting card shown when you fly there.

const PLANET_LIST = [
  { key: "mercury", name: "mercury", radiusKm: 2439.7,  colorHex: 0x9c9488,
    fact: "a sun-scorched ball of iron and craters; one of its days lasts two of its years.",
    discovered: "known to the ancients", periodYears: 0.241 },
  { key: "venus",   name: "venus",   radiusKm: 6051.8,  colorHex: 0xd8b56a,
    fact: "earth's twin gone wrong — hot enough to melt lead under permanent acid clouds.",
    discovered: "known to the ancients", periodYears: 0.615 },
  { key: "earth",   name: "earth",   radiusKm: 6371.0,  colorHex: 0x3f6fb5,
    fact: "the pale blue dot itself. voyager 1 photographed it from 6 billion km away in 1990.",
    discovered: "home", periodYears: 1.0 },
  { key: "mars",    name: "mars",    radiusKm: 3389.5,  colorHex: 0xc1552f,
    fact: "the rusty desert world; its volcano olympus mons is three times the height of everest.",
    discovered: "known to the ancients", periodYears: 1.881 },
  { key: "jupiter", name: "jupiter", radiusKm: 69911,   colorHex: 0xc8a06e,
    fact: "voyager 1 flew past in march 1979 and stole speed from it — the slingshot that made escape possible.",
    discovered: "known to the ancients", periodYears: 11.86 },
  { key: "saturn",  name: "saturn",  radiusKm: 58232,   colorHex: 0xd8c08a,
    fact: "voyager 1's last world, november 1980. the flyby bent its path up and out of the solar system forever.",
    discovered: "known to the ancients", periodYears: 29.46 },
  { key: "uranus",  name: "uranus",  radiusKm: 25362,   colorHex: 0x8fc3cf,
    fact: "the sideways ice giant — it rolls around its orbit tipped over at 98 degrees.",
    discovered: "1781 · william herschel", periodYears: 84.02 },
  { key: "neptune", name: "neptune", radiusKm: 24622,   colorHex: 0x3b5dc9,
    fact: "found with mathematics before telescopes: its gravity betrayed it. the windiest world known.",
    discovered: "1846 · predicted by le verrier", periodYears: 164.8 },
];

const SMALL_LIST = [
  { key: "ceres",    name: "ceres",    colorHex: 0xb8b0a2,
    fact: "the first asteroid ever found and the only dwarf planet of the inner system — a quarter of the belt's whole mass.",
    discovered: "1801 · giuseppe piazzi" },
  { key: "vesta",    name: "vesta",    colorHex: 0xb0a48c,
    fact: "the brightest asteroid in our sky, with a mountain at its south pole twice the height of everest.",
    discovered: "1807 · heinrich olbers" },
  { key: "pallas",   name: "pallas",   colorHex: 0x9aa0a8,
    fact: "a giant asteroid on a wildly tilted orbit, climbing 35 degrees out of the plane the planets share.",
    discovered: "1802 · heinrich olbers" },
  { key: "pluto",    name: "pluto",    colorHex: 0xc9b295,
    fact: "the king of the kuiper belt, with a heart-shaped nitrogen glacier and five moons.",
    discovered: "1930 · clyde tombaugh" },
  { key: "haumea",   name: "haumea",   colorHex: 0xd8d4cc,
    fact: "spins so fast (one day = 4 hours) that it has been stretched into an egg. has its own ring.",
    discovered: "2004 · sierra nevada observatory" },
  { key: "makemake", name: "makemake", colorHex: 0xc49a76,
    fact: "a bright frozen world named for the creator god of easter island.",
    discovered: "2005 · palomar observatory" },
  { key: "eris",     name: "eris",     colorHex: 0xd0d0d0,
    fact: "the world that ended pluto's planethood — almost the same size, but three times farther out.",
    discovered: "2005 · mike brown's team" },
  { key: "sedna",    name: "sedna",    colorHex: 0xb5543a,
    fact: "the far wanderer: an 11,400-year orbit that never comes closer than 76 au. nobody knows what put it there.",
    discovered: "2003 · mike brown's team" },
];

const COLORS = { red: 0xc62f1e, blue: 0x21489c, yellow: 0xe3a71b, paper: 0xede8dc };

// --- Renderer / scene / camera ---------------------------------------------
// The logarithmic depth buffer is what lets one scene hold a 0.00004 au
// Earth and a 171 au Voyager without z-fighting.

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 1e-6, 40000
);

scene.add(new THREE.AmbientLight(0xffffff, 0.18));
const sunLight = new THREE.PointLight(0xfff2d8, 1.6, 0, 2);
scene.add(sunLight);

// --- Starfield --------------------------------------------------------------
// 4000 stars on a far sphere. Decoration only — everything else is real.

{
  const positions = new Float32Array(4000 * 3);
  for (let i = 0; i < 4000; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(15000);
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const m = new THREE.PointsMaterial({ color: 0x777777, size: 14, sizeAttenuation: true });
  scene.add(new THREE.Points(g, m));
}

// --- Coordinate note --------------------------------------------------------
// ephemeris.js gives ecliptic x/y/z (z = north). We keep that frame directly
// and just tell the camera that ecliptic +z is "up" — nothing gets mirrored.

function toVec3(p) { return new THREE.Vector3(p.x, p.y, p.z); }
camera.up.set(0, 0, 1);

// --- Simulation time --------------------------------------------------------
// "live" follows your clock in real time. The arrow buttons (or ← →) wind
// time backwards or forwards; the chips jump straight to the mission's
// great moments. Every position in the scene reads from this one clock.

const TIME_RATES = [86400, 604800, 2592000, 31536000, 315360000]; // sim s per real s: day, week, month, year, decade
const TIME_EVENTS = {
  launch:     { ms: Date.UTC(1977, 8, 5, 12, 56), label: "launch" },
  jupiter:    { ms: Date.UTC(1979, 2, 5, 12, 5),  label: "jupiter flyby" },
  saturn:     { ms: Date.UTC(1980, 10, 12, 23, 46), label: "saturn flyby" },
  pbd:        { ms: Date.UTC(1990, 1, 14, 4, 48),  label: "the pale blue dot" },
  shock:      { ms: Date.UTC(2004, 11, 16),       label: "termination shock" },
  heliopause: { ms: Date.UTC(2012, 7, 25),        label: "heliopause crossing" },
};
const TIME_MIN_MS = Date.UTC(1900, 0, 1);    // planet formulas are valid 1800-2050;
const TIME_MAX_MS = Date.UTC(2199, 11, 31);  // we allow a wider window for the ride

const clock = {
  live: true,
  rate: 0,             // sim seconds per real second (0 = paused)
  simMs: Date.now(),
};

function setLive() { clock.live = true; clock.rate = 0; }
function jumpTo(ms) { clock.live = false; clock.rate = 0; clock.simMs = ms; }
function nudgeRate(direction) {
  // step through: -decade ... -day, paused, +day ... +decade
  const ladder = [...TIME_RATES.map((r) => -r).reverse(), 0, ...TIME_RATES];
  let i = ladder.findIndex((r) => r === (clock.live ? 0 : clock.rate));
  if (i < 0) i = ladder.indexOf(0);
  i = Math.min(ladder.length - 1, Math.max(0, i + direction));
  clock.live = false;
  clock.rate = ladder[i];
}

function advanceClock(realDtSeconds) {
  if (clock.live) { clock.simMs = Date.now(); return; }
  clock.simMs += clock.rate * realDtSeconds * 1000;
  clock.simMs = Math.min(TIME_MAX_MS, Math.max(TIME_MIN_MS, clock.simMs));
}

const RATE_LABELS = {
  86400: "1 day / s", 604800: "1 week / s", 2592000: "1 month / s",
  31536000: "1 year / s", 315360000: "10 years / s",
};
function rateLabel() {
  if (clock.live) return "live · real time";
  if (clock.rate === 0) return "paused";
  const l = RATE_LABELS[Math.abs(clock.rate)];
  return (clock.rate > 0 ? "+ " : "− ") + l;
}

// --- The Sun ----------------------------------------------------------------

const SUN_RADIUS_AU = 696000 / KM_PER_AU;
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(SUN_RADIUS_AU, 48, 24),
  new THREE.MeshBasicMaterial({ color: 0xfff0c0 })  // painted over once textures exist
);
scene.add(sunMesh);
{
  // a soft glow sprite so the (truly tiny) sun is findable from far away
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,238,190,0.9)");
  grad.addColorStop(0.25, "rgba(255,220,140,0.35)");
  grad.addColorStop(1, "rgba(255,220,140,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false,
  }));
  glow.scale.setScalar(0.35);
  scene.add(glow);
}

// --- Orbit lines ------------------------------------------------------------
// Each orbit is sampled from the same math that positions the body, so the
// line and the world always agree.

function makeOrbitLine(samplePositionAtFraction, colorHex, opacity, segments = 512) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    pts.push(toVec3(samplePositionAtFraction(i / segments)));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity });
  return new THREE.LineLoop(g, m);
}

const JD_NOW0 = Ephem.jdTdbFromDate(new Date());

for (const p of PLANET_LIST) {
  const el = Ephem.PLANETS[p.key];
  const periodDays = 365.256898 * Math.pow(el.a[0], 1.5);   // kepler's third law
  scene.add(makeOrbitLine(
    (f) => Ephem.planetPositionAu(el, JD_NOW0 + f * periodDays),
    0x8a8578, 0.5
  ));
}
for (const s of SMALL_LIST) {
  const body = Ephem.SMALL_BODIES[s.key];
  const periodDays = 360 / body.n;
  scene.add(makeOrbitLine(
    (f) => Ephem.smallBodyPositionAu(body, JD_NOW0 + f * periodDays),
    0x4a5f8a, 0.45
  ));
}

// --- Belts ------------------------------------------------------------------
// Thousands of anonymous points spread through the REAL belt regions.
// (The points are placed randomly — real asteroids are too many to list —
// but the region they fill is the true one.)

function makeBelt(innerAu, outerAu, count, thicknessFactor, colorHex, size) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = innerAu + (outerAu - innerAu) * Math.random();
    const theta = Math.random() * Math.PI * 2;
    // pile up near the mid-plane, thin out above and below
    const z = r * thicknessFactor * (Math.random() + Math.random() - 1);
    positions.set([r * Math.cos(theta), r * Math.sin(theta), z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const m = new THREE.PointsMaterial({
    color: colorHex, size, sizeAttenuation: true, transparent: true, opacity: 0.55,
  });
  return new THREE.Points(g, m);
}

const R = Ephem.REGIONS;
scene.add(makeBelt(R.asteroidBeltInnerAu, R.asteroidBeltOuterAu, 6000, 0.07, 0x8a8578, 0.02));
scene.add(makeBelt(R.kuiperBeltInnerAu, R.kuiperBeltOuterAu, 6000, 0.09, 0x5a6f9a, 0.25));

// --- The edge of the sun's bubble ------------------------------------------
// Two real landmarks voyager 1 actually crossed, drawn as plain rings.

function makeRing(radiusAu, colorHex, opacity) {
  const pts = [];
  for (let i = 0; i < 256; i++) {
    const t = (i / 256) * Math.PI * 2;
    pts.push(new THREE.Vector3(radiusAu * Math.cos(t), radiusAu * Math.sin(t), 0));
  }
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineLoop(g,
    new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity }));
}
scene.add(makeRing(R.terminationShockAu, COLORS.blue, 0.5));
scene.add(makeRing(R.heliopauseAu, COLORS.red, 0.6));

// --- Painted worlds ---------------------------------------------------------
// A file:// page cannot feed photo files into webgl, so every world is
// painted here in code, from real reference: jupiter's band colours and the
// great red spot, mars' dark basalt plains and polar caps, neptune's storm,
// pluto's heart. Each gets a stable seed so it always prints the same.

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// horizontal wind streaks give banded worlds their turbulence
function paintStreaks(g, W, H, n, rnd, light = 0.05, dark = 0.05) {
  for (let i = 0; i < n; i++) {
    const y = rnd() * H, len = (0.05 + rnd() * 0.25) * W, x = rnd() * W;
    const h = 1 + rnd() * 3;
    g.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${light})` : `rgba(0,0,0,${dark})`;
    g.fillRect(x, y, len, h);
    g.fillRect(x - W, y, len, h);   // wrap the seam
  }
}

function paintBands(g, W, H, stops) {
  const grad = g.createLinearGradient(0, 0, 0, H);
  for (const [p, col] of stops) grad.addColorStop(p, col);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
}

// an irregular filled patch — continent, lava plain, ice cap edge
function paintBlob(g, cx, cy, r, color, rnd, squish = 0.75, alpha = 1) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = color; g.beginPath();
  const pts = 10;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = r * (0.55 + rnd() * 0.6);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * squish;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath(); g.fill(); g.restore();
}

const PLANET_PAINTERS = {
  sun(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#ffcf70"], [0.5, "#ffdd8d"], [1, "#ffcf70"]]);
    for (let i = 0; i < 1600; i++) {           // granulation cells
      g.fillStyle = rnd() < 0.5
        ? `rgba(255,166,42,${0.04 + rnd() * 0.07})`
        : `rgba(255,240,190,${0.04 + rnd() * 0.07})`;
      g.beginPath();
      g.arc(rnd() * W, rnd() * H, 1 + rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 3; i++) {              // a small sunspot group
      const x = W * (0.3 + rnd() * 0.4), y = H * (0.35 + rnd() * 0.3), r = 3 + rnd() * 5;
      g.fillStyle = "rgba(190,110,30,0.8)";
      g.beginPath(); g.arc(x, y, r * 1.8, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#7a3f0c";
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  },

  mercury(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#9a938a"], [0.5, "#8f8880"], [1, "#847d75"]]);
    for (let i = 0; i < 170; i++) {            // craters: dark floor, lit rim
      const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * 9;
      g.fillStyle = `rgba(80,74,66,${0.25 + rnd() * 0.3})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(190,184,175,0.45)"; g.lineWidth = 1;
      g.beginPath(); g.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
    }
  },

  venus(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#e8d6ac"], [0.5, "#ddc089"], [1, "#e2cfa2"]]);
    for (let i = 0; i < 150; i++) {            // sulphuric cloud chevrons
      const y = rnd() * H;
      g.strokeStyle = rnd() < 0.6
        ? "rgba(246,232,196,0.12)" : "rgba(170,140,80,0.10)";
      g.lineWidth = 2 + rnd() * 5;
      g.beginPath();
      const x0 = rnd() * W, len = W * (0.1 + rnd() * 0.2);
      const bow = (y / H - 0.5) * 60;          // v-shape opens from the equator
      g.moveTo(x0, y);
      g.quadraticCurveTo(x0 + len / 2, y + bow, x0 + len, y);
      g.stroke();
    }
  },

  earth(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#33608f"], [0.5, "#1c4a80"], [1, "#33608f"]]);
    const land = [                              // rough real places
      [0.545, 0.50, 0.085, "#7a7a45"],          // africa
      [0.62, 0.28, 0.15, "#6d7040"],            // eurasia
      [0.22, 0.30, 0.10, "#657043"],            // north america
      [0.30, 0.63, 0.062, "#57713e"],           // south america
      [0.845, 0.645, 0.048, "#8a7847"],         // australia
    ];
    for (const [fx, fy, fr, col] of land) {
      paintBlob(g, fx * W, fy * H, fr * W, col, rnd, 0.8);
      paintBlob(g, fx * W, fy * H, fr * W * 0.5, "#6a6238", rnd, 0.8, 0.5);
    }
    paintBlob(g, 0.36 * W, 0.14 * H, 0.035 * W, "#dfe6ea", rnd, 0.7);  // greenland
    g.fillStyle = "#e8edf1";                     // polar ice
    g.fillRect(0, 0, W, H * 0.035); g.fillRect(0, H * 0.945, W, H * 0.055);
    for (let i = 0; i < 26; i++) {
      paintBlob(g, rnd() * W, H * (rnd() < 0.5 ? 0.045 : 0.94), 9 + rnd() * 12, "#e8edf1", rnd, 0.5);
    }
    g.fillStyle = "rgba(255,255,255,0.55)";      // clouds
    for (let i = 0; i < 110; i++) {
      g.save();
      g.translate(rnd() * W, rnd() * H);
      g.rotate((rnd() - 0.5) * 0.5);
      g.globalAlpha = 0.10 + rnd() * 0.16;
      g.beginPath();
      g.ellipse(0, 0, W * (0.02 + rnd() * 0.075), 2 + rnd() * 6, 0, 0, Math.PI * 2);
      g.fill(); g.restore();
    }
  },

  mars(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#c88a68"], [0.25, "#b5552f"],
      [0.55, "#a34a28"], [0.8, "#93401f"], [1, "#b07a58"]]);
    const dark = [                               // basalt plains
      [0.56, 0.40, 0.075], [0.44, 0.30, 0.06], [0.70, 0.55, 0.05],
      [0.18, 0.45, 0.055], [0.86, 0.35, 0.045], [0.32, 0.52, 0.04],
    ];
    for (const [fx, fy, fr] of dark)
      paintBlob(g, fx * W, fy * H, fr * W, "#5c2c17", rnd, 0.7, 0.5);
    for (let i = 0; i < 60; i++) {               // small craters
      g.fillStyle = `rgba(70,32,16,${0.1 + rnd() * 0.15})`;
      g.beginPath(); g.arc(rnd() * W, rnd() * H, 1 + rnd() * 4, 0, Math.PI * 2); g.fill();
    }
    paintStreaks(g, W, H, 130, rnd, 0.04, 0.03);  // dust
    g.fillStyle = "#f2ede6";                      // polar caps
    g.fillRect(0, 0, W, H * 0.03);
    paintBlob(g, W * 0.5, H * 0.035, W * 0.05, "#f2ede6", rnd, 0.35);
    g.fillRect(0, H * 0.96, W, H * 0.04);
    paintBlob(g, W * 0.5, H * 0.96, W * 0.07, "#f2ede6", rnd, 0.35);
  },

  jupiter(g, W, H, rnd) {
    paintBands(g, W, H, [
      [0, "#c8ab8a"], [0.07, "#b3906c"], [0.14, "#e8dcc6"], [0.20, "#a97c55"],
      [0.26, "#ecdfc6"], [0.33, "#c08a5f"], [0.40, "#eadbba"], [0.46, "#b28763"],
      [0.53, "#e6d6b6"], [0.60, "#a87a55"], [0.68, "#dcc9a8"], [0.76, "#c39a72"],
      [0.85, "#cbae88"], [1, "#b29273"],
    ]);
    paintStreaks(g, W, H, 700, rnd, 0.06, 0.05);
    const sx = W * 0.63, sy = H * 0.66;          // the great red spot
    g.fillStyle = "#d9c4a0";
    g.beginPath(); g.ellipse(sx, sy, W * 0.048, H * 0.036, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#b5482e";
    g.beginPath(); g.ellipse(sx, sy, W * 0.036, H * 0.026, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#c96a4a";
    g.beginPath(); g.ellipse(sx, sy, W * 0.022, H * 0.015, 0, 0, Math.PI * 2); g.fill();
  },

  saturn(g, W, H, rnd) {
    paintBands(g, W, H, [
      [0, "#b89d6f"], [0.12, "#cbb183"], [0.24, "#dcc697"], [0.36, "#d2bb8c"],
      [0.48, "#e6d2a8"], [0.60, "#d6bf90"], [0.74, "#c8ae7f"], [0.88, "#bAA176"], [1, "#b09872"],
    ]);
    paintStreaks(g, W, H, 320, rnd, 0.035, 0.03);
  },

  uranus(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#84bcc8"], [0.45, "#a2d5dc"], [0.6, "#a6d8de"], [1, "#8cc2cc"]]);
    paintStreaks(g, W, H, 50, rnd, 0.03, 0.015);
  },

  neptune(g, W, H, rnd) {
    paintBands(g, W, H, [
      [0, "#27409c"], [0.3, "#3558cc"], [0.5, "#2c50c0"], [0.7, "#3a5fd0"], [1, "#233a92"],
    ]);
    paintStreaks(g, W, H, 220, rnd, 0.05, 0.06);
    g.fillStyle = "#182c74";                     // the great dark spot
    g.beginPath(); g.ellipse(W * 0.4, H * 0.62, W * 0.045, H * 0.028, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(240,248,255,0.6)";       // methane cirrus alongside
    for (let i = 0; i < 5; i++) {
      g.fillRect(W * (0.34 + rnd() * 0.14), H * (0.53 + rnd() * 0.05), W * (0.02 + rnd() * 0.05), 1.5);
    }
  },

  pluto(g, W, H, rnd) {
    paintBands(g, W, H, [[0, "#cdb79b"], [0.5, "#c9b295"], [1, "#bfa78a"]]);
    for (let i = 0; i < 7; i++)                  // the dark equatorial maculae
      paintBlob(g, W * (0.08 + i * 0.06 + rnd() * 0.02), H * (0.5 + (rnd() - 0.5) * 0.14),
        W * (0.03 + rnd() * 0.025), "#6f4c35", rnd, 0.8, 0.75);
    const hx = W * 0.62, hy = H * 0.55, hr = W * 0.055;   // tombaugh regio
    g.fillStyle = "#efe4d0";
    g.beginPath(); g.arc(hx - hr * 0.52, hy - hr * 0.3, hr * 0.62, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(hx + hr * 0.52, hy - hr * 0.3, hr * 0.62, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(hx - hr * 1.1, hy - hr * 0.05); g.lineTo(hx + hr * 1.1, hy - hr * 0.05);
    g.lineTo(hx, hy + hr * 1.15); g.closePath(); g.fill();
  },
};

function makePlanetTexture(key) {
  const painter = PLANET_PAINTERS[key];
  if (!painter) return null;
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  let seed = 0;
  for (const ch of key) seed = seed * 31 + ch.charCodeAt(0);
  painter(c.getContext("2d"), c.width, c.height, mulberry(seed));
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// sidereal rotation, hours (negative = retrograde), driven by the sim clock
const SPIN_HOURS = {
  mercury: 1407.6, venus: -5832.5, earth: 23.934, mars: 24.623,
  jupiter: 9.925, saturn: 10.656, uranus: -17.24, neptune: 16.11, pluto: -153.29,
};
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _spinQ = new THREE.Quaternion();

// the sun's mesh was built before the painters existed — print it now
sunMesh.material = new THREE.MeshBasicMaterial({ map: makePlanetTexture("sun") });

// --- Bodies (true-scale spheres) + labels -----------------------------------

const labelLayer = document.getElementById("labels");
const bodies = [];   // { key, name, mesh, labelEl, kind, getPosition(jd), ... }

function addBody(opts) {
  let mesh = opts.mesh;
  if (!mesh) {
    const geo = new THREE.SphereGeometry(opts.radiusKm / KM_PER_AU, 48, 24);
    const tex = makePlanetTexture(opts.key);
    if (tex) geo.rotateX(Math.PI / 2);   // painted worlds: poles to ecliptic north
    mesh = new THREE.Mesh(geo,
      tex ? new THREE.MeshLambertMaterial({ map: tex })
          : new THREE.MeshLambertMaterial({ color: opts.colorHex }));
    scene.add(mesh);
  }

  const el = document.createElement("div");
  el.className = "body-label" + (opts.kind === "voyager" ? " is-voyager" : "");
  const sym = document.createElement("i");
  sym.className = "sym " +
    ({ planet: "sym-circle", dwarf: "sym-square",
       voyager: "sym-triangle", sun: "sym-sun" }[opts.kind]);
  el.appendChild(sym);
  el.appendChild(document.createTextNode(opts.name));
  labelLayer.appendChild(el);

  const body = { ...opts, radiusAu: opts.radiusKm / KM_PER_AU, mesh, labelEl: el };
  el.addEventListener("click", () => focusOn(body));
  bodies.push(body);
  return body;
}

// the sun first — its sphere already exists
const sunBody = addBody({
  key: "sun", name: "sun", kind: "sun", mesh: sunMesh,
  radiusKm: 696000, priority: 90,
  fact: "a middle-aged yellow dwarf holding 99.86% of the solar system's mass. everything on this map answers to it.",
  discovered: "always known", periodYears: null,
  getPosition: () => ({ x: 0, y: 0, z: 0 }),
});

for (const p of PLANET_LIST) {
  addBody({
    ...p, kind: "planet", priority: 50 + p.radiusKm / 10000,
    getPosition: (jd) => Ephem.planetPositionAu(Ephem.PLANETS[p.key], jd),
  });
}
for (const s of SMALL_LIST) {
  const el = Ephem.SMALL_BODIES[s.key];
  addBody({
    ...s, kind: "dwarf", radiusKm: el.radiusKm, priority: 20,
    periodYears: 360 / el.n / 365.25,
    getPosition: (jd) => Ephem.smallBodyPositionAu(el, jd),
  });
}

// Voyager 1 itself. The probe is ~4 m across; at true scale that is 3e-11 au
// — no screen can show it. The yellow triangle label marks the exact spot.
const voyager = addBody({
  key: "voyager1", name: "voyager 1", kind: "voyager",
  radiusKm: 0.002, colorHex: COLORS.yellow, priority: 100,
  fact: "825 kg of 1977 engineering, still phoning home on 23 watts — about the power of a fridge bulb. the farthest human-made object, and getting farther every second.",
  discovered: "launched 1977-09-05 · cape canaveral", periodYears: null,
  getPosition: (jd) => Ephem.voyager1PositionAu(jd),
});
const LAUNCH_JD = Ephem.jdTdbFromDate(new Date(TIME_EVENTS.launch.ms));

// --- Saturn's rings, true scale ---------------------------------------------
// Inner edge of the C ring 74,500 km, outer edge of the A ring 136,780 km,
// with the Cassini division drawn as the real gap it is. The ring plane is
// tilted exactly like Saturn's: its pole points at ecliptic (0.086, 0.462, 0.883).

{
  const inner = 74500 / KM_PER_AU, outer = 136780 / KM_PER_AU;
  const geo = new THREE.RingGeometry(inner, outer, 128, 1);
  // re-aim the texture coordinates so u runs from inner edge to outer edge
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  // paint the bands: C dim, B bright, cassini division dark, A medium
  const c = document.createElement("canvas");
  c.width = 512; c.height = 1;
  const ctx = c.getContext("2d");
  const bands = [   // [start km, end km, alpha]
    [74500, 92000, 0.35], [92000, 117580, 0.85],
    [117580, 122170, 0.10], [122170, 136780, 0.60],
  ];
  for (const [r0, r1, alpha] of bands) {
    ctx.fillStyle = `rgba(216, 192, 138, ${alpha})`;
    const x0 = (r0 - 74500) / (136780 - 74500) * 512;
    const x1 = (r1 - 74500) / (136780 - 74500) * 512;
    ctx.fillRect(x0, 0, x1 - x0, 1);
  }
  const mat = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(c), transparent: true,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const rings = new THREE.Mesh(geo, mat);
  const pole = new THREE.Vector3(0.0855, 0.4625, 0.8825).normalize();
  rings.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pole);
  const saturnBody = bodies.find((b) => b.key === "saturn");
  saturnBody.attachments = [rings];
  saturnBody.tiltQ = rings.quaternion.clone();   // the planet spins in the ring plane
  scene.add(rings);
}

// --- Voyager's real flown path ----------------------------------------------
// One line holds the whole story, sampled from the same NASA-tracked
// tables the position comes from: dense through the flyby years, sparser
// through the quiet decades, on to the year 2300. The bright part shows
// what has been flown by the current moment on the clock; the faint part
// is the road ahead.

const trail = { jds: [], line: null, faint: null };
{
  const JD_TABLE_START = Ephem.VOYAGER1_EARLY.startJd;      // 1977-09-06
  const JD_CRUISE = 2444606.5;                              // 1981-01-02
  const JD_2300 = 2561117.5;
  for (let jd = JD_TABLE_START; jd < JD_CRUISE; jd += 2) trail.jds.push(jd);
  for (let jd = JD_CRUISE; jd < Ephem.VOYAGER1_TABLE_END_JD; jd += 20) trail.jds.push(jd);
  for (let jd = Ephem.VOYAGER1_TABLE_END_JD; jd <= JD_2300; jd += 100) trail.jds.push(jd);

  const pts = trail.jds.map((jd) => toVec3(Ephem.voyager1PositionAu(jd)));
  const flownGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const aheadGeo = new THREE.BufferGeometry().setFromPoints(pts);
  trail.line = new THREE.Line(flownGeo,
    new THREE.LineBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.9 }));
  trail.faint = new THREE.Line(aheadGeo,
    new THREE.LineBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.18 }));
  scene.add(trail.faint);
  scene.add(trail.line);
}

// --- Year marks along the flown road ----------------------------------------
// Little yellow stamps every five years turn the trail into a route map:
// you can see the ship slow down as the sun's grip fades astern.

const trailTicks = [];
for (let year = 1980; year <= 2025; year += 5) {
  const jd = Ephem.jdTdbFromDate(new Date(Date.UTC(year, 0, 1)));
  const el = document.createElement("div");
  el.className = "trail-tick";
  el.textContent = year;
  labelLayer.appendChild(el);
  trailTicks.push({ jd, pos: toVec3(Ephem.voyager1PositionAu(jd)), el });
}

// show only the flown part of the bright line: binary-search the clock's
// moment in the sample list and cut the draw there
function updateTrail(jd) {
  let lo = 0, hi = trail.jds.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (trail.jds[mid] <= jd) lo = mid; else hi = mid - 1;
  }
  trail.line.geometry.setDrawRange(0, Math.max(0, lo + 1));
}

// --- Camera -----------------------------------------------------------------
// Orbit-the-anchor controls with a gentle glide: drag = look around,
// scroll or pinch = travel, click a label = fly to that body, esc = back.

const view = {
  target: sunBody,
  azimuth: 4.2, polar: 1.0,
  distance: 430, wantDistance: 430,     // wantDistance eases toward distance
  anchor: new THREE.Vector3(),          // eases toward the target's position
  minDistance: 2e-4, maxDistance: 3000,
};

function focusOn(body) {
  view.target = body;
  view.wantDistance = Math.max(body.radiusAu * 6, 0.001);
  if (body.kind === "voyager") view.wantDistance = 8;   // see it against the void
  if (body.kind === "sun") view.wantDistance = 430;     // the whole map
  showInfoCard(body);
}

function backToSystem() {
  view.target = sunBody;
  view.wantDistance = 430;
  hideInfoCard();
}

// pointers: one = rotate, two = pinch zoom
const pointers = new Map();
let pinchStartDist = 0, pinchStartView = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (ride.active) endRide(false);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
    pinchStartView = view.wantDistance;
  }
});
window.addEventListener("pointerup", (e) => { pointers.delete(e.pointerId); });
window.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); });
window.addEventListener("pointermove", (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 2) {
    p.x = e.clientX; p.y = e.clientY;
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d > 0 && pinchStartDist > 0) {
      view.wantDistance = Math.min(view.maxDistance,
        Math.max(view.minDistance, pinchStartView * pinchStartDist / d));
    }
    return;
  }
  view.azimuth -= (e.clientX - p.x) * 0.005;
  view.polar = Math.min(Math.PI - 0.05, Math.max(0.05, view.polar - (e.clientY - p.y) * 0.005));
  p.x = e.clientX; p.y = e.clientY;
});
function clampDistance(d) {
  return Math.min(view.maxDistance, Math.max(view.minDistance, d));
}

// passive: false + preventDefault matters: a mac trackpad pinch arrives as a
// ctrl+wheel event, and without it the browser zooms the page, not the scene
window.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (ride.active) endRide(false);
  const sensitivity = e.ctrlKey ? 0.01 : 0.0012;   // pinch deltas are small
  view.wantDistance = clampDistance(view.wantDistance * Math.exp(e.deltaY * sensitivity));
}, { passive: false });

// safari (mac + ios) reports trackpad pinches as gesture events instead
let gestureStartDistance = 0;
window.addEventListener("gesturestart", (e) => {
  e.preventDefault();
  gestureStartDistance = view.wantDistance;
});
window.addEventListener("gesturechange", (e) => {
  e.preventDefault();
  if (e.scale > 0) view.wantDistance = clampDistance(gestureStartDistance / e.scale);
});
window.addEventListener("gestureend", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!recordPanel.classList.contains("hidden")) toggleRecord(false);
    else if (ride.active) endRide(false);
    else backToSystem();
  }
  if (e.key === "ArrowLeft") nudgeRate(-1);
  if (e.key === "ArrowRight") nudgeRate(+1);
  if (e.key.toLowerCase() === "l") setLive();
  if (e.key.toLowerCase() === "g")
    toggleRecord(recordPanel.classList.contains("hidden"));
});

// --- Time strip wiring ------------------------------------------------------

document.getElementById("time-slower").addEventListener("click", () => nudgeRate(-1));
document.getElementById("time-faster").addEventListener("click", () => nudgeRate(+1));
document.getElementById("time-mode").addEventListener("click", setLive);
for (const chip of document.querySelectorAll(".chip")) {
  chip.addEventListener("click", () => {
    const ev = chip.dataset.event;
    if (ev === "live") setLive();
    else jumpTo(TIME_EVENTS[ev].ms);
  });
}

// --- Ride the signal: earth → voyager 1 at (scaled) radio speed -------------
// A command really does leave earth by radio and arrive at voyager ~23 hours
// later. Here you fly with it: one light-hour every two seconds, straight
// line, true scale. Nearly all of the ride is empty black — that is the honest
// part. A caption names the region you are crossing; esc or a click bails out.

const RIDE_SECONDS_PER_LIGHT_HOUR = 2;
const RIDE_ZONES = [   // [outer edge in au from the sun, caption]
  [2.0,      "leaving the rocky worlds"],
  [3.4,      "the asteroid belt"],
  [5.6,      "crossing jupiter's orbit"],
  [10.1,     "crossing saturn's orbit"],
  [19.9,     "crossing uranus' orbit"],
  [30.5,     "crossing neptune's orbit"],
  [39.5,     "the kuiper belt"],
  [42.5,     "1990 · the pale blue dot was taken near here"],
  [50,       "the kuiper belt"],
  [94,       "the scattered dark — hours of nothing"],
  [121.6,    "past the termination shock"],
  [Infinity, "interstellar space"],
];

const ride = {
  active: false, t: 0, duration: 1, lightHours: 0,
  from: new THREE.Vector3(), to: new THREE.Vector3(),
  btn: document.getElementById("ride-btn"),
  captionEl: document.getElementById("ride-caption"),
  zoneEl: document.getElementById("ride-zone"),
  counterEl: document.getElementById("ride-counter"),
};

function startRide() {
  // the ride follows the sim clock's sky; before launch there is no voyager
  if (Ephem.jdTdbFromDate(new Date(clock.simMs)) < LAUNCH_JD) setLive();
  const jd = Ephem.jdTdbFromDate(new Date(clock.simMs));
  ride.from.copy(toVec3(Ephem.planetPositionAu(Ephem.PLANETS.earth, jd)));
  ride.to.copy(toVec3(Ephem.voyager1PositionAu(jd)));
  ride.lightHours = ride.from.distanceTo(ride.to) * Ephem.AU_KM / 299792.458 / 3600;
  ride.duration = Math.max(10, ride.lightHours * RIDE_SECONDS_PER_LIGHT_HOUR);
  ride.t = 0;
  ride.active = true;
  hideInfoCard();
  ride.btn.style.display = "none";
  ride.captionEl.classList.remove("hidden");
}

function endRide(arrived) {
  ride.active = false;
  ride.btn.style.display = "";
  ride.captionEl.classList.add("hidden");
  // hand the orbit camera a matching pose so there is no jump
  const camHeight = Math.min(2, 0.05 + camera.position.distanceTo(ride.from) * 0.1);
  view.polar = 0.15;
  if (arrived) {
    focusOn(voyager);
    view.anchor.copy(ride.to);
    view.distance = camHeight;
  } else {
    view.target = sunBody;
    view.anchor.copy(camera.position);
    view.distance = camHeight;
    view.wantDistance = 430;
    hideInfoCard();
  }
}

// place the camera for this frame of the ride; returns the caption pieces
function updateRide(realDt) {
  ride.t += realDt;
  const u = Math.min(1, ride.t / ride.duration);
  const p = u * u * (3 - 2 * u);            // smooth start and landing
  const P = ride.from.clone().lerp(ride.to, p);
  const fromEarthAu = P.distanceTo(ride.from);
  const h = Math.min(2, 0.05 + fromEarthAu * 0.1);   // drift gently above the road
  camera.position.set(P.x, P.y, P.z + h);
  camera.lookAt(ride.to);

  const rSunAu = P.length();
  ride.zoneEl.textContent = RIDE_ZONES.find(([edge]) => rSunAu < edge)[1];
  const lightMin = Math.round(p * ride.lightHours * 60);
  ride.counterEl.textContent =
    `${Math.floor(lightMin / 60)} h ${String(lightMin % 60).padStart(2, "0")} min of light` +
    ` · ${fmt(fromEarthAu, 1)} au from earth`;

  if (u >= 1) endRide(true);
  return h;
}

ride.btn.addEventListener("click", startRide);

// --- HUD --------------------------------------------------------------------

const fmt = (n, d = 1) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
const hud = {
  timeBlock: document.getElementById("hud-time"),
  time: document.getElementById("hud-time-value"),
  timeLabel: document.querySelector("#hud-time .hud-label"),
  sun: document.getElementById("hud-sun-value"),
  earth: document.getElementById("hud-earth-value"),
  light: document.getElementById("hud-light-value"),
  speed: document.getElementById("hud-speed-value"),
  mode: document.getElementById("time-mode"),
};

function updateHud(date) {
  const s = Ephem.voyager1Status(date);
  hud.time.textContent = date.toISOString().replace("T", " ").slice(0, 16) + " utc";
  hud.timeLabel.textContent = clock.live ? "now" : "time travel";
  hud.timeBlock.classList.toggle("time-travel", !clock.live);
  hud.mode.classList.toggle("time-travel", !clock.live);
  hud.mode.textContent = rateLabel();
  hud.sun.textContent = `${fmt(s.fromSunAu, 4)} au · ${fmt(s.fromSunKm / 1e9, 3)} bn km`;
  hud.earth.textContent = `${fmt(s.fromEarthAu, 4)} au`;
  const h = Math.floor(s.lightHoursFromEarth);
  const min = Math.round((s.lightHoursFromEarth - h) * 60);
  hud.light.textContent = s.lightHoursFromEarth >= 1 ? `${h} h ${min} min`
    : `${fmt(s.lightHoursFromEarth * 60, 1)} min`;
  hud.speed.textContent = `${fmt(s.speedKmS, 3)} km/s · year ${fmt(s.missionYears, 1)}`;

  // the landing poster shows the same live truth
  const posterAu = document.getElementById("poster-au");
  if (posterAu) {
    posterAu.textContent = `${fmt(s.fromSunAu, 2)} au`;
    document.getElementById("poster-light").textContent = `${h} h ${min} min`;
  }

  // info card distance updates live too
  if (card.body) {
    const p = card.body.getPosition(Ephem.jdTdbFromDate(date));
    const rAu = Math.hypot(p.x, p.y, p.z);
    card.dist.textContent = card.body.kind === "sun" ? "—"
      : rAu >= 0.6 ? `${fmt(rAu, 3)} au`
      : `${fmt(rAu * KM_PER_AU / 1e6, 1)} mn km`;
  }
}

// --- Info card ---------------------------------------------------------------

// while voyager's card is open, its fact line slowly cycles the good stories
const VOYAGER_FACTS = [
  "825 kg of 1977 engineering, still phoning home on 23 watts — about the power of a fridge bulb.",
  "its computers hold 69 kb of memory in total. this web page weighs more.",
  "a command radioed today arrives after nearly a full day — driving it takes patience measured in weeks.",
  "powered by decaying plutonium. the warmth fades ~4 watts a year; the last instrument falls silent around 2030.",
  "on 1990-02-14 it turned its camera home one final time: the pale blue dot, earth in a sunbeam.",
  "it borrowed speed from jupiter to escape the sun — jupiter slowed down, immeasurably, in exchange.",
  "in about 40,000 years it drifts within 1.6 light-years of the star gliese 445.",
  "it carries the golden record — press g to read what humanity sent along.",
];
let factIndex = 0, factTimer = null;
function stopFactCycle() { if (factTimer) { clearInterval(factTimer); factTimer = null; } }
function startFactCycle(el) {
  stopFactCycle();
  factTimer = setInterval(() => {
    factIndex = (factIndex + 1) % VOYAGER_FACTS.length;
    el.textContent = VOYAGER_FACTS[factIndex];
  }, 8000);
}

const card = {
  el: document.getElementById("infocard"),
  kind: document.getElementById("infocard-kind"),
  name: document.getElementById("infocard-name"),
  fact: document.getElementById("infocard-fact"),
  radius: document.getElementById("infocard-radius"),
  dist: document.getElementById("infocard-dist"),
  period: document.getElementById("infocard-period"),
  periodRow: document.getElementById("infocard-period-row"),
  disc: document.getElementById("infocard-disc"),
  body: null,
};
document.getElementById("infocard-close").addEventListener("click", backToSystem);

const KIND_NAMES = {
  sun: "the star", planet: "planet", dwarf: "dwarf planet / giant asteroid",
  voyager: "spacecraft · interstellar",
};

function showInfoCard(body) {
  card.body = body;
  card.kind.textContent = KIND_NAMES[body.kind];
  card.name.textContent = body.name;
  if (body.kind === "voyager") {
    card.fact.textContent = VOYAGER_FACTS[factIndex];
    startFactCycle(card.fact);
  } else {
    stopFactCycle();
    card.fact.textContent = body.fact || "";
  }
  card.radius.textContent = body.kind === "voyager" ? "~4 m across"
    : `${fmt(body.radiusKm, 0)} km`;
  if (body.periodYears) {
    card.periodRow.style.display = "";
    card.period.textContent = body.periodYears < 2
      ? `${fmt(body.periodYears * 365.25, 0)} days`
      : `${fmt(body.periodYears, 1)} years`;
  } else {
    card.periodRow.style.display = "none";
  }
  card.disc.textContent = body.discovered || "—";
  card.el.classList.remove("hidden");
}
function hideInfoCard() { card.body = null; card.el.classList.add("hidden"); stopFactCycle(); }

// --- The golden record panel ------------------------------------------------

const recordPanel = document.getElementById("record-panel");
function toggleRecord(open) {
  recordPanel.classList.toggle("hidden", !open);
}
document.getElementById("record-btn").addEventListener("click", () => toggleRecord(true));
document.getElementById("record-close").addEventListener("click", () => toggleRecord(false));

// --- Labels: follow the bodies, and never pile on top of each other ---------
// When the view is wide, dozens of labels would collide near the sun. Each
// frame we place the important ones first (voyager, then the big worlds)
// and hide any label whose box would overlap one already placed.

const projected = new THREE.Vector3();
const placedRects = [];

function updateLabels(simJd) {
  placedRects.length = 0;
  const order = [...bodies].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const b of order) {
    if (b.kind === "voyager" && simJd < LAUNCH_JD) {   // not launched yet
      b.labelEl.style.display = "none";
      continue;
    }
    projected.copy(b.mesh.position).project(camera);
    const onScreen = projected.z < 1 &&
      projected.x > -1.05 && projected.x < 1.05 &&
      projected.y > -1.05 && projected.y < 1.05;
    if (!onScreen) { b.labelEl.style.display = "none"; continue; }

    const x = (projected.x + 1) / 2 * window.innerWidth;
    const y = (1 - projected.y) / 2 * window.innerHeight;
    const w = 26 + b.name.length * 8, h = 18;    // label box, roughly
    const rect = { x0: x, y0: y - h / 2, x1: x + w, y1: y + h / 2 };
    const collides = placedRects.some((r) =>
      rect.x0 < r.x1 && rect.x1 > r.x0 && rect.y0 < r.y1 && rect.y1 > r.y0);
    if (collides) { b.labelEl.style.display = "none"; continue; }

    placedRects.push(rect);
    b.labelEl.style.display = "flex";
    b.labelEl.style.left = x + "px";
    b.labelEl.style.top = y + "px";
  }

  // year stamps come last: they only appear where there is room, and only
  // on the part of the road already flown at the clock's moment
  for (const tick of trailTicks) {
    if (tick.jd > simJd) { tick.el.style.display = "none"; continue; }
    projected.copy(tick.pos).project(camera);
    const onScreen = projected.z < 1 &&
      projected.x > -1.02 && projected.x < 1.02 &&
      projected.y > -1.02 && projected.y < 1.02;
    if (!onScreen) { tick.el.style.display = "none"; continue; }
    const x = (projected.x + 1) / 2 * window.innerWidth;
    const y = (1 - projected.y) / 2 * window.innerHeight;
    const rect = { x0: x - 20, y0: y - 9, x1: x + 20, y1: y + 9 };
    const collides = placedRects.some((r) =>
      rect.x0 < r.x1 && rect.x1 > r.x0 && rect.y0 < r.y1 && rect.y1 > r.y0);
    if (collides) { tick.el.style.display = "none"; continue; }
    placedRects.push(rect);
    tick.el.style.display = "block";
    tick.el.style.left = x + "px";
    tick.el.style.top = y + "px";
  }
}

// --- Scale bar: honest pixels ------------------------------------------------
// How wide is the screen in au at the anchor's distance? Pick a round
// number that fits, and draw it at its exact pixel width.

const NICE_STEPS = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02,
  0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
const scalebar = {
  line: document.getElementById("scalebar-line"),
  text: document.getElementById("scalebar-text"),
};

function updateScalebar(distance) {
  const vfov = camera.fov * Math.PI / 180;
  const worldWidth = 2 * distance * Math.tan(vfov / 2) * camera.aspect;
  const target = worldWidth / 4;                  // aim for ~quarter screen
  const step = NICE_STEPS.reduce((best, s) =>
    Math.abs(s - target) < Math.abs(best - target) ? s : best, NICE_STEPS[0]);
  const px = step / worldWidth * window.innerWidth;
  scalebar.line.style.width = px + "px";
  scalebar.text.textContent = step >= 0.01
    ? `${step} au`
    : `${fmt(step * KM_PER_AU / 1e6, step * KM_PER_AU >= 1e6 ? 1 : 2)} mn km`;
}

// --- Main loop --------------------------------------------------------------

let lastHudUpdate = 0, lastFrameT = 0;

function animate(t) {
  requestAnimationFrame(animate);
  const realDt = Math.min(0.1, (t - lastFrameT) / 1000 || 0);
  lastFrameT = t;

  advanceClock(realDt);
  const simDate = new Date(clock.simMs);
  const jd = Ephem.jdTdbFromDate(simDate);

  // real positions, every frame — and real day lengths on the painted worlds
  for (const b of bodies) {
    b.mesh.position.copy(toVec3(b.getPosition(jd)));
    if (b.attachments) for (const a of b.attachments) a.position.copy(b.mesh.position);
    const spinHours = SPIN_HOURS[b.key];
    if (spinHours) {
      const angle = (clock.simMs / 3600000 / spinHours) * Math.PI * 2 % (Math.PI * 2);
      if (b.tiltQ) b.mesh.quaternion.copy(b.tiltQ).multiply(_spinQ.setFromAxisAngle(Z_AXIS, angle));
      else b.mesh.rotation.z = angle;
    }
  }
  voyager.mesh.visible = jd >= LAUNCH_JD;
  updateTrail(jd);

  // camera: mid-ride the signal drives it; otherwise glide around the anchor
  let scaleDistance = view.distance;
  if (ride.active) {
    scaleDistance = updateRide(realDt);
  } else {
    const ease = 1 - Math.exp(-realDt * 5);
    view.anchor.lerp(view.target.mesh.position, ease);
    view.distance += (view.wantDistance - view.distance) * ease;
    const offset = new THREE.Vector3(
      Math.sin(view.polar) * Math.cos(view.azimuth),
      Math.sin(view.polar) * Math.sin(view.azimuth),
      Math.cos(view.polar)
    ).multiplyScalar(view.distance);
    camera.position.copy(view.anchor).add(offset);
    camera.lookAt(view.anchor);
  }

  if (t - lastHudUpdate > 250) { updateHud(simDate); lastHudUpdate = t; }
  updateLabels(jd);
  updateScalebar(scaleDistance);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// --- Landing veil -----------------------------------------------------------

document.getElementById("enterBtn").addEventListener("click", () => {
  document.getElementById("landing").classList.add("hidden");
});

// opening the page with #enter skips the poster (nice for sharing links
// straight to the scene); add &date=1979-03-05 to share a moment in time,
// and &visit=saturn to arrive already looking at a world
if (location.hash.startsWith("#enter")) {
  document.getElementById("landing").classList.add("hidden");
}
{
  const m = location.hash.match(/date=(\d{4}-\d{2}-\d{2})/);
  if (m) jumpTo(Date.parse(m[1] + "T12:00:00Z"));

  const v = location.hash.match(/visit=([a-z0-9 ]+)/);
  const wanted = v && bodies.find((b) => b.key === v[1] || b.name === v[1]);
  if (wanted) {
    focusOn(wanted);
    // start the camera already at the destination — no cross-system glide
    view.anchor.copy(toVec3(wanted.getPosition(Ephem.jdTdbFromDate(new Date(clock.simMs)))));
    view.distance = view.wantDistance;
  }

  // #enter&ride drops you straight onto the signal;
  // #enter&record opens the golden record
  if (/[&#]ride\b/.test(location.hash)) startRide();
  if (/[&#]record\b/.test(location.hash)) toggleRecord(true);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
