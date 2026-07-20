// ephemeris.js — where everything in the solar system is, right now.
// All positions are computed offline from real NASA/JPL data. No internet needed.
//
// How it works, in plain language:
//   Every planet, dwarf planet and asteroid rides an ellipse around the Sun.
//   An ellipse is fully described by six numbers (the "orbital elements"), and
//   if you know where a body was at one reference moment (its "epoch") you can
//   compute where it is at ANY moment by solving one famous equation
//   (Kepler's equation). That is what this file does.
//
//   Voyager 1 is the special guest: it is moving so fast that the Sun can
//   never pull it back. Its path is not an ellipse but a HYPERBOLA — an open
//   curve that leaves the solar system forever. The same six-number trick
//   works, just with the hyperbolic version of Kepler's equation.
//
//   Data sources (all fetched from NASA/JPL Horizons on 2026-07-20):
//   - Planets: JPL's "approximate planetary elements" valid 1800–2050.
//   - Dwarf planets + big asteroids: exact osculating elements, epoch 2026-07-20.
//   - Voyager 1: exact osculating hyperbolic elements, epoch 2026-07-20
//     (solution "Voyager_1_ST+refit2022_m" — the real tracked trajectory).
//   The tests in tests/ephemeris.test.js check every body against NASA's own
//   computed positions, so nothing here is a guess.

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;              // one astronomical unit, in km
const LIGHT_SEC_PER_AU = 499.00478384;  // light needs this many seconds per au
const DAY_S = 86400;

// --- Time helpers -----------------------------------------------------------

// Julian Day number (UTC) from a JavaScript Date.
// JS dates count milliseconds from 1970-01-01 00:00 UTC, which is JD 2440587.5.
function jdUtcFromDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Astronomers use TDB ("dynamical time"), currently 69.184 s ahead of UTC
// (37 leap seconds + a fixed 32.184 s offset). Nothing out here moves fast
// enough for that to matter visually, but we do it right anyway.
function jdTdbFromDate(date) {
  return jdUtcFromDate(date) + 69.184 / 86400;
}

// --- The eight planets ------------------------------------------------------
// JPL's approximate Keplerian elements, valid 1800–2050.
// Each entry is [value at J2000, change per century]:
// a = orbit size (au), e = how squashed the ellipse is, I = tilt (deg),
// L = mean longitude (deg), longPeri = where the orbit's closest point aims,
// longNode = where the orbit crosses the ecliptic plane.

const PLANETS = {
  mercury: {
    a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906],
    I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175],
    longPeri: [77.45779628, 0.16047689], longNode: [48.33076593, -0.12534081],
  },
  venus: {
    a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107],
    I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729],
    longPeri: [131.60246718, 0.00268329], longNode: [76.67984255, -0.27769418],
  },
  earth: {
    a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392],
    I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981],
    longPeri: [102.93768193, 0.32327364], longNode: [0, 0],
  },
  mars: {
    a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882],
    I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499],
    longPeri: [-23.94362959, 0.44441088], longNode: [49.55953891, -0.29257343],
  },
  jupiter: {
    a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253],
    I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775],
    longPeri: [14.72847983, 0.21252668], longNode: [100.47390909, 0.20469106],
  },
  saturn: {
    a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991],
    I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201],
    longPeri: [92.59887831, -0.41897216], longNode: [113.66242448, -0.28867794],
  },
  uranus: {
    a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397],
    I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785],
    longPeri: [170.95427630, 0.40805281], longNode: [74.01692503, 0.04240589],
  },
  neptune: {
    a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105],
    I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325],
    longPeri: [44.96476227, -0.32241464], longNode: [131.78422574, -0.00508664],
  },
};

// Solve Kepler's equation M = E - e*sin(E) for E (Newton's method).
// "M" says how far around the orbit the body WOULD be if it moved evenly;
// "E" corrects for the fact that orbits speed up near the Sun.
function solveKepler(M, e) {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

// Turn a position in the orbit's own plane (xp, yp) into ecliptic x/y/z,
// using the three orientation angles (argument of perihelion, node, tilt).
function orbitPlaneToEcliptic(xp, yp, periRad, nodeRad, incRad) {
  const cw = Math.cos(periRad), sw = Math.sin(periRad);
  const cn = Math.cos(nodeRad), sn = Math.sin(nodeRad);
  const ci = Math.cos(incRad), si = Math.sin(incRad);
  return {
    x: (cw * cn - sw * sn * ci) * xp + (-sw * cn - cw * sn * ci) * yp,
    y: (cw * sn + sw * cn * ci) * xp + (-sw * sn + cw * cn * ci) * yp,
    z: sw * si * xp + cw * si * yp,
  };
}

// Heliocentric position (au, ecliptic J2000 frame) of a planet at a TDB Julian Day.
function planetPositionAu(planet, jdTdb) {
  const T = (jdTdb - 2451545.0) / 36525;      // centuries since J2000
  const el = (k) => planet[k][0] + planet[k][1] * T;
  const a = el("a"), e = el("e");
  const I = el("I") * DEG, node = el("longNode") * DEG;
  const peri = el("longPeri") * DEG - node;   // argument of perihelion
  const M = (((el("L") - el("longPeri")) % 360 + 360) % 360) * DEG;
  const E = solveKepler(M, e);
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return orbitPlaneToEcliptic(xp, yp, peri, node, I);
}

// --- Dwarf planets and big asteroids ----------------------------------------
// Exact osculating elements from JPL Horizons, epoch JD 2461241.5 TDB
// (= 2026-07-20). Propagated with Kepler's equation. Good for many decades
// either side of today — these worlds feel almost no perturbation.
//   e = eccentricity, i = tilt (deg), node/peri = orientation (deg),
//   M0 = mean anomaly at epoch (deg), n = motion (deg/day), a = size (au).
//   radiusKm = real physical radius, for true-scale rendering later.

const SMALL_BODIES = {
  ceres: {
    title: "ceres · dwarf planet · asteroid belt",
    e: 0.07970868781743484, i: 10.58792748545683, node: 80.24878378826615,
    peri: 73.27175969832236, M0: 283.2295780347555, n: 0.2142936663164159,
    a: 2.765645378573465, radiusKm: 469.7,
  },
  vesta: {
    title: "vesta · giant asteroid",
    e: 0.09021683118197342, i: 7.143892587035024, node: 103.7006195113651,
    peri: 151.4587725763618, M0: 92.33578095412199, n: 0.2716247961985877,
    a: 2.361328670867128, radiusKm: 262.7,
  },
  pallas: {
    title: "pallas · giant asteroid",
    e: 0.2306994080086323, i: 34.93324172833240, node: 172.8866937521966,
    peri: 310.9767543901822, M0: 263.0087102522342, n: 0.2138479403041320,
    a: 2.769487024967592, radiusKm: 256,
  },
  pluto: {
    title: "pluto · dwarf planet · kuiper belt",
    e: 0.2477829768872761, i: 17.17532455238676, node: 110.3357774979511,
    peri: 113.0711443645276, M0: 54.08415750702919, n: 0.003994082619215153,
    a: 39.34214374773806, radiusKm: 1188.3,
  },
  haumea: {
    title: "haumea · dwarf planet · kuiper belt",
    e: 0.1942206502795658, i: 28.20846424698963, node: 121.7871142590511,
    peri: 240.6398970318655, M0: 223.4043719176111, n: 0.003486825969103982,
    a: 43.07075995760617, radiusKm: 780,
  },
  makemake: {
    title: "makemake · dwarf planet · kuiper belt",
    e: 0.1586427670468959, i: 29.02665571590226, node: 79.30173079311983,
    peri: 297.0759694482232, M0: 170.0878883198600, n: 0.003202863592416321,
    a: 45.58029035728121, radiusKm: 715,
  },
  eris: {
    title: "eris · dwarf planet · scattered disc",
    e: 0.4384382177855736, i: 43.93641056510325, node: 36.00063555493038,
    peri: 150.8123715991314, M0: 211.8266893686718, n: 0.001760688956430578,
    a: 67.92259800846253, radiusKm: 1163,
  },
  sedna: {
    title: "sedna · the far wanderer",
    e: 0.8595026343117808, i: 11.92521047011796, node: 144.5088771585811,
    peri: 311.1157255120953, M0: 358.5921605917899, n: 0.00007806474878424457,
    a: 542.2081879394335, radiusKm: 500,
  },
};
const SMALL_BODY_EPOCH_JD = 2461241.5;   // 2026-07-20 00:00 TDB

// Heliocentric position (au) of a small body at a TDB Julian Day.
function smallBodyPositionAu(body, jdTdb) {
  const M = ((body.M0 + body.n * (jdTdb - SMALL_BODY_EPOCH_JD)) % 360 + 360) % 360;
  const E = solveKepler(M * DEG, body.e);
  const xp = body.a * (Math.cos(E) - body.e);
  const yp = body.a * Math.sqrt(1 - body.e * body.e) * Math.sin(E);
  return orbitPlaneToEcliptic(xp, yp, body.peri * DEG, body.node * DEG, body.i * DEG);
}

// --- Voyager 1 --------------------------------------------------------------
// The real tracked trajectory, as a hyperbolic orbit around the Sun.
// Osculating elements from JPL Horizons at epoch 2026-07-20 (JD 2461241.5 TDB).
// Perihelion was JD 2444233.33 — 1980, the year of the Saturn flyby that
// slingshotted Voyager 1 out of the solar system for good.
//
// Out at 170+ au the Sun's remaining pull is so feeble that this pure
// two-body hyperbola stays within ~0.001 au of NASA's full model for decades
// (the tests prove it against a NASA vector 3.5 years ahead).

const VOYAGER1 = {
  title: "voyager 1 · interstellar space",
  e: 3.702005227079221,          // > 1 means: never coming back
  a: -3.215655070434805,         // negative for a hyperbola
  i: 35.77000842546852,          // climbing 35.8° out of the planets' plane
  node: 178.9096752472843,
  peri: 338.2172858857368,
  tpJd: 2444233.330496212933,    // perihelion: 1980-01-24, before Saturn flyby
  n: 0.1709227562086710,         // "mean motion", degrees per day
  launched: Date.UTC(1977, 8, 5, 12, 56, 0),  // 1977-09-05, from Cape Canaveral
};

// Solve the HYPERBOLIC Kepler equation M = e*sinh(H) - H for H.
function solveKeplerHyperbolic(M, e) {
  let H = Math.asinh(M / e);                 // good first guess
  for (let i = 0; i < 30; i++) {
    const f = e * Math.sinh(H) - H - M;
    H = H - f / (e * Math.cosh(H) - 1);
    if (Math.abs(f) < 1e-13) break;
  }
  return H;
}

// Voyager 1's heliocentric position (au, ecliptic J2000) at a TDB Julian Day.
function voyager1PositionAu(jdTdb) {
  const M = VOYAGER1.n * (jdTdb - VOYAGER1.tpJd) * DEG;
  const H = solveKeplerHyperbolic(M, VOYAGER1.e);
  const a = VOYAGER1.a, e = VOYAGER1.e;
  const xp = a * (Math.cosh(H) - e);                      // note: cosh, not cos
  const yp = -a * Math.sqrt(e * e - 1) * Math.sinh(H);
  return orbitPlaneToEcliptic(
    xp, yp, VOYAGER1.peri * DEG, VOYAGER1.node * DEG, VOYAGER1.i * DEG
  );
}

// Voyager 1's speed (km/s) — from the vis-viva equation, the energy law of
// orbits: v² = GM_sun * (2/r - 1/a).
const GM_SUN_AU3_DAY2 = 2.9591220828559093e-4;   // Sun's gravity, au³/day²
function voyager1SpeedKmS(jdTdb) {
  const p = voyager1PositionAu(jdTdb);
  const r = Math.hypot(p.x, p.y, p.z);
  const v2 = GM_SUN_AU3_DAY2 * (2 / r - 1 / VOYAGER1.a);  // (au/day)²
  return Math.sqrt(v2) * AU_KM / DAY_S;
}

// --- Readouts the app shows -------------------------------------------------

function distanceAu(p, q) {
  return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
}

// Everything about Voyager 1 at one moment, ready for display.
function voyager1Status(date) {
  const jd = jdTdbFromDate(date);
  const v = voyager1PositionAu(jd);
  const e = planetPositionAu(PLANETS.earth, jd);
  const fromSunAu = Math.hypot(v.x, v.y, v.z);
  const fromEarthAu = distanceAu(v, e);
  const lightSeconds = fromEarthAu * LIGHT_SEC_PER_AU;
  return {
    positionAu: v,
    fromSunAu,
    fromSunKm: fromSunAu * AU_KM,
    fromEarthAu,
    lightHoursFromEarth: lightSeconds / 3600,   // radio takes this long, one way
    speedKmS: voyager1SpeedKmS(jd),
    missionYears: (date.getTime() - VOYAGER1.launched) / (365.25 * DAY_S * 1000),
  };
}

// --- Real landmark distances (au), for drawing the belts and boundaries -----
const REGIONS = {
  asteroidBeltInnerAu: 2.06,   // where the main belt begins
  asteroidBeltOuterAu: 3.27,   // ...and fades out
  kuiperBeltInnerAu: 30,       // just past Neptune
  kuiperBeltOuterAu: 50,
  terminationShockAu: 94,      // Voyager 1 crossed it in Dec 2004
  heliopauseAu: 121.6,         // Voyager 1 left the Sun's bubble, Aug 2012
};

// --- Exports (browser global + Node for tests) ------------------------------

const Ephem = {
  DEG, AU_KM, LIGHT_SEC_PER_AU,
  jdUtcFromDate, jdTdbFromDate,
  PLANETS, planetPositionAu,
  SMALL_BODIES, SMALL_BODY_EPOCH_JD, smallBodyPositionAu,
  VOYAGER1, voyager1PositionAu, voyager1SpeedKmS, voyager1Status,
  solveKepler, solveKeplerHyperbolic,
  distanceAu, REGIONS,
};

if (typeof module !== "undefined" && module.exports) module.exports = Ephem;
if (typeof globalThis !== "undefined") globalThis.Ephem = Ephem;
