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
  new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
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

// --- Bodies (true-scale spheres) + labels -----------------------------------

const labelLayer = document.getElementById("labels");
const bodies = [];   // { key, name, mesh, labelEl, kind, getPosition(jd), ... }

function addBody(opts) {
  let mesh = opts.mesh;
  if (!mesh) {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(opts.radiusKm / KM_PER_AU, 32, 16),
      new THREE.MeshLambertMaterial({ color: opts.colorHex })
    );
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
window.addEventListener("wheel", (e) => {
  if (ride.active) endRide(false);
  view.wantDistance *= Math.exp(e.deltaY * 0.0012);
  view.wantDistance = Math.min(view.maxDistance, Math.max(view.minDistance, view.wantDistance));
}, { passive: true });

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (ride.active) endRide(false); else backToSystem(); }
  if (e.key === "ArrowLeft") nudgeRate(-1);
  if (e.key === "ArrowRight") nudgeRate(+1);
  if (e.key.toLowerCase() === "l") setLive();
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
  card.fact.textContent = body.fact || "";
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
function hideInfoCard() { card.body = null; card.el.classList.add("hidden"); }

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

  // real positions, every frame
  for (const b of bodies) {
    b.mesh.position.copy(toVec3(b.getPosition(jd)));
    if (b.attachments) for (const a of b.attachments) a.position.copy(b.mesh.position);
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

  // #enter&ride drops you straight onto the signal
  if (/[&#]ride\b/.test(location.hash)) startRide();
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
