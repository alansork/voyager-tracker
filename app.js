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

const PLANET_LIST = [
  { key: "mercury", name: "mercury", radiusKm: 2439.7,  colorHex: 0x9c9488 },
  { key: "venus",   name: "venus",   radiusKm: 6051.8,  colorHex: 0xd8b56a },
  { key: "earth",   name: "earth",   radiusKm: 6371.0,  colorHex: 0x3f6fb5 },
  { key: "mars",    name: "mars",    radiusKm: 3389.5,  colorHex: 0xc1552f },
  { key: "jupiter", name: "jupiter", radiusKm: 69911,   colorHex: 0xc8a06e },
  { key: "saturn",  name: "saturn",  radiusKm: 58232,   colorHex: 0xd8c08a },
  { key: "uranus",  name: "uranus",  radiusKm: 25362,   colorHex: 0x8fc3cf },
  { key: "neptune", name: "neptune", radiusKm: 24622,   colorHex: 0x3b5dc9 },
];

const SMALL_LIST = [
  { key: "ceres",    name: "ceres",    colorHex: 0xb8b0a2 },
  { key: "vesta",    name: "vesta",    colorHex: 0xb0a48c },
  { key: "pallas",   name: "pallas",   colorHex: 0x9aa0a8 },
  { key: "pluto",    name: "pluto",    colorHex: 0xc9b295 },
  { key: "haumea",   name: "haumea",   colorHex: 0xd8d4cc },
  { key: "makemake", name: "makemake", colorHex: 0xc49a76 },
  { key: "eris",     name: "eris",     colorHex: 0xd0d0d0 },
  { key: "sedna",    name: "sedna",    colorHex: 0xb5543a },
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
// ephemeris.js gives ecliptic x/y/z (z = north). three.js prefers y-up, so we
// map ecliptic (x, y, z) -> three (x, z, y)... but a plain swap mirrors the
// scene. Instead we keep the ecliptic frame directly and just tell the camera
// that ecliptic +z is "up". Simpler, and nothing gets mirrored.

function toVec3(p) { return new THREE.Vector3(p.x, p.y, p.z); }
camera.up.set(0, 0, 1);

// --- The Sun ----------------------------------------------------------------

const SUN_RADIUS_AU = 696000 / KM_PER_AU;
{
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS_AU, 48, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff0c0 })
  );
  scene.add(sun);

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
const bodies = [];   // { key, name, mesh, labelEl, kind, getPosition(jd) }

function addBody(opts) {
  const radiusAu = opts.radiusKm / KM_PER_AU;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radiusAu, 32, 16),
    new THREE.MeshLambertMaterial({ color: opts.colorHex })
  );
  scene.add(mesh);

  const el = document.createElement("div");
  el.className = "body-label" + (opts.kind === "voyager" ? " is-voyager" : "");
  const sym = document.createElement("i");
  sym.className = "sym " +
    (opts.kind === "planet" ? "sym-circle" :
     opts.kind === "dwarf" ? "sym-square" : "sym-triangle");
  el.appendChild(sym);
  el.appendChild(document.createTextNode(opts.name));
  labelLayer.appendChild(el);

  const body = { ...opts, radiusAu, mesh, labelEl: el };
  el.addEventListener("click", () => focusOn(body));
  bodies.push(body);
  return body;
}

for (const p of PLANET_LIST) {
  addBody({
    ...p, kind: "planet",
    getPosition: (jd) => Ephem.planetPositionAu(Ephem.PLANETS[p.key], jd),
  });
}
for (const s of SMALL_LIST) {
  const el = Ephem.SMALL_BODIES[s.key];
  addBody({
    ...s, kind: "dwarf", radiusKm: el.radiusKm,
    getPosition: (jd) => Ephem.smallBodyPositionAu(el, jd),
  });
}

// Voyager 1 itself. The probe is ~4 m across; at true scale that is 3e-11 au
// — no screen can show it. The yellow triangle label marks the exact spot.
const voyager = addBody({
  key: "voyager1", name: "voyager 1", kind: "voyager",
  radiusKm: 0.002, colorHex: COLORS.yellow,
  getPosition: (jd) => Ephem.voyager1PositionAu(jd),
});

// --- Voyager's real flown path ----------------------------------------------
// Solid yellow: the trajectory since 1981, just after the saturn flyby bent
// it onto its final escape hyperbola (the same curve NASA tracks today).
// Faint yellow: where it is headed next, out to the year 2300.

{
  const JD_1981 = 2444605.5, JD_2300 = 2561117.5;
  const past = [], future = [];
  for (let i = 0; i <= 400; i++) {
    past.push(toVec3(Ephem.voyager1PositionAu(JD_1981 + (JD_NOW0 - JD_1981) * (i / 400))));
  }
  for (let i = 0; i <= 200; i++) {
    future.push(toVec3(Ephem.voyager1PositionAu(JD_NOW0 + (JD_2300 - JD_NOW0) * (i / 200))));
  }
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(past),
    new THREE.LineBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.9 })
  ));
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(future),
    new THREE.LineBasicMaterial({ color: COLORS.yellow, transparent: true, opacity: 0.25 })
  ));
}

// --- Camera controls --------------------------------------------------------
// Simple orbit-the-target controls, written by hand (drag = look around,
// scroll = travel closer/farther, click a label = fly to that body).

const view = {
  target: null,              // the body we're anchored to (null = the sun)
  offset: new THREE.Vector3(),     // where the target currently is
  azimuth: 4.2, polar: 1.0,        // camera direction, radians
  distance: 430,                    // au from the target — start seeing it all
  minDistance: 2e-4, maxDistance: 3000,
};

function focusOn(body) {
  view.target = body;
  // arrive at a distance where the world fills a good part of the view
  view.distance = Math.max(body.radiusAu * 6, 0.001);
  if (body.kind === "voyager") view.distance = 8;   // see it against the void
}

let dragging = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener("pointerup", () => { dragging = false; });
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  view.azimuth -= (e.clientX - lastX) * 0.005;
  view.polar = Math.min(Math.PI - 0.05, Math.max(0.05, view.polar - (e.clientY - lastY) * 0.005));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener("wheel", (e) => {
  view.distance *= Math.exp(e.deltaY * 0.0012);
  view.distance = Math.min(view.maxDistance, Math.max(view.minDistance, view.distance));
}, { passive: true });
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { view.target = null; view.distance = 430; }
});

// --- HUD --------------------------------------------------------------------

const fmt = (n, d = 1) => n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
const hud = {
  time: document.getElementById("hud-time-value"),
  sun: document.getElementById("hud-sun-value"),
  earth: document.getElementById("hud-earth-value"),
  light: document.getElementById("hud-light-value"),
  speed: document.getElementById("hud-speed-value"),
};

function updateHud(date) {
  const s = Ephem.voyager1Status(date);
  hud.time.textContent = date.toISOString().replace("T", " ").slice(0, 19) + " utc";
  hud.sun.textContent = `${fmt(s.fromSunAu, 4)} au · ${fmt(s.fromSunKm / 1e9, 3)} bn km`;
  hud.earth.textContent = `${fmt(s.fromEarthAu, 4)} au`;
  const h = Math.floor(s.lightHoursFromEarth);
  const min = Math.round((s.lightHoursFromEarth - h) * 60);
  hud.light.textContent = `${h} h ${min} min`;
  hud.speed.textContent = `${fmt(s.speedKmS, 3)} km/s · year ${fmt(s.missionYears, 1)}`;

  // the landing poster shows the same live truth
  const posterAu = document.getElementById("poster-au");
  if (posterAu) {
    posterAu.textContent = `${fmt(s.fromSunAu, 2)} au`;
    document.getElementById("poster-light").textContent = `${h} h ${min} min`;
  }
}

// --- Labels follow their bodies on screen -----------------------------------

const projected = new THREE.Vector3();
function updateLabels() {
  for (const b of bodies) {
    projected.copy(b.mesh.position).project(camera);
    const visible = projected.z < 1 &&
      projected.x > -1.05 && projected.x < 1.05 &&
      projected.y > -1.05 && projected.y < 1.05;
    b.labelEl.style.display = visible ? "flex" : "none";
    if (!visible) continue;
    b.labelEl.style.left = ((projected.x + 1) / 2 * window.innerWidth) + "px";
    b.labelEl.style.top = ((1 - projected.y) / 2 * window.innerHeight) + "px";
  }
}

// --- Main loop --------------------------------------------------------------

let lastHudUpdate = 0;

function animate(t) {
  requestAnimationFrame(animate);
  const now = new Date();
  const jd = Ephem.jdTdbFromDate(now);

  // real positions, every frame
  for (const b of bodies) b.mesh.position.copy(toVec3(b.getPosition(jd)));

  // camera: orbit around the chosen anchor
  const anchor = view.target ? view.target.mesh.position : new THREE.Vector3();
  view.offset.set(
    Math.sin(view.polar) * Math.cos(view.azimuth),
    Math.sin(view.polar) * Math.sin(view.azimuth),
    Math.cos(view.polar)
  ).multiplyScalar(view.distance);
  camera.position.copy(anchor).add(view.offset);
  camera.lookAt(anchor);

  if (t - lastHudUpdate > 250) { updateHud(now); lastHudUpdate = t; }
  updateLabels();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

// --- Landing veil -----------------------------------------------------------

document.getElementById("enterBtn").addEventListener("click", () => {
  document.getElementById("landing").classList.add("hidden");
});

// opening the page with #enter skips the poster (nice for sharing links
// straight to the scene)
if (location.hash === "#enter") {
  document.getElementById("landing").classList.add("hidden");
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
