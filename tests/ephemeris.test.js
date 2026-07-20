// Tests with NO libraries to install. Run from this project folder:
//   node tests/ephemeris.test.js
//
// Every expected position below was fetched from NASA/JPL Horizons on
// 2026-07-20 (heliocentric, ecliptic J2000, in au). If our math agrees with
// NASA at these checkpoints, the tracker is showing the real sky.

const E = require("../ephemeris.js");

let passed = 0, failed = 0;
function expectClose(actual, expected, tol, label) {
  const err = Math.abs(actual - expected);
  if (err <= tol) { console.log(`✓ ${label} (off by ${err.toExponential(1)})`); passed++; }
  else {
    console.log(`✗ ${label}\n    expected: ${expected}\n    got:      ${actual}\n    tolerance: ${tol}`);
    failed++;
  }
}
function expectVec(p, exp, tol, label) {
  const err = Math.hypot(p.x - exp[0], p.y - exp[1], p.z - exp[2]);
  if (err <= tol) { console.log(`✓ ${label} (off by ${err.toExponential(1)} au)`); passed++; }
  else {
    console.log(`✗ ${label}\n    expected: ${exp}\n    got:      ${[p.x, p.y, p.z]}\n    off by ${err} au, tolerance ${tol}`);
    failed++;
  }
}

const JD = 2461241.5;   // 2026-07-20 00:00 TDB — the day the data was fetched

// --- Time -------------------------------------------------------------------
expectClose(E.jdUtcFromDate(new Date(Date.UTC(2026, 6, 20))), 2461241.5, 1e-9,
  "julian day of 2026-07-20 UTC");
expectClose(E.jdTdbFromDate(new Date(Date.UTC(2026, 6, 20))) - 2461241.5,
  69.184 / 86400, 1e-9, "TDB runs 69.184 s ahead of UTC");

// --- Planets vs NASA vectors, 2026-07-20 ------------------------------------
// JPL's 1800–2050 approximate elements are honest about their accuracy:
// inner planets land within ~0.003 au, giants within ~0.01–0.02 au.
// On screen at solar-system scale those errors are far below one pixel.
const planetChecks = {
  mercury: [[0.2818480120344146, -0.3075012043326097, -0.05098031282274793], 0.003],
  venus:   [[-0.3859167375850687, -0.6132128498238232, 0.01384221042971432], 0.003],
  earth:   [[0.4606570916408191, -0.9057426761323917, 0.00005347365075794032], 0.003],
  mars:    [[1.006559308433204, 1.063915373471167, -0.002385520092260157], 0.004],
  jupiter: [[-3.051014637962180, 4.312240903740172, 0.05034912182658530], 0.02],
  saturn:  [[9.349379628714674, 1.366146200836450, -0.3959536084233065], 0.02],
  uranus:  [[9.187354596799690, 17.14832482015646, -0.05543855358060492], 0.03],
  neptune: [[29.84919554523134, 1.150005929985279, -0.7115436555521265], 0.03],
};
for (const [name, [vec, tol]] of Object.entries(planetChecks)) {
  expectVec(E.planetPositionAu(E.PLANETS[name], JD), vec, tol, `${name} matches NASA`);
}

// --- Dwarf planets + asteroids vs NASA vectors, 2026-07-20 ------------------
// These use exact elements AT this epoch, so they should nail it.
const smallChecks = {
  ceres:    [1.027267599040661, 2.529417116506516, -0.1091685746967964],
  vesta:    [2.369782723935393, -0.09914496128145919, -0.2856215300502836],
  pallas:   [2.969020661208222, 0.03221073246601636, -0.2791252533006706],
  pluto:    [19.76825099259844, -29.44686126254917, -2.566205845964989],
  eris:     [85.11791373770248, 39.63453477101994, -17.31209731017762],
  makemake: [-45.94569728751355, -9.478793459015636, 24.07646337719761],
  haumea:   [-36.74467196875320, -23.95736825955579, 23.52226224936681],
  sedna:    [38.90042789820341, 71.18914682747599, -17.01099276589435],
};
for (const [name, vec] of Object.entries(smallChecks)) {
  expectVec(E.smallBodyPositionAu(E.SMALL_BODIES[name], JD), vec, 1e-4,
    `${name} matches NASA`);
}

// --- Voyager 1 --------------------------------------------------------------
// At the epoch itself, our hyperbola must reproduce NASA's vector almost
// exactly. 3.5 years later (2030-01-01) the pure two-body curve is allowed
// a whisker of drift — NASA's full model includes every planet's tug.
expectVec(E.voyager1PositionAu(JD),
  [-32.07573721857640, -136.2507291254591, 98.58069188984737], 1e-4,
  "voyager 1 today matches NASA");
expectVec(E.voyager1PositionAu(2462502.5),
  [-33.57649182634321, -146.1607341464897, 105.7372921535743], 0.01,
  "voyager 1 on 2030-01-01 matches NASA (two-body drift < 0.01 au)");

// Distance from the Sun today: ~171.2 au. Speed ~16.9 km/s.
const status = E.voyager1Status(new Date(Date.UTC(2026, 6, 20)));
expectClose(status.fromSunAu, 171.15, 0.1, "voyager 1 is ~171 au from the sun");
expectClose(status.speedKmS, 16.9, 0.1, "voyager 1 cruises at ~16.9 km/s");
expectClose(status.lightHoursFromEarth, 23.7, 0.15,
  "radio from voyager 1 takes ~23.7 hours to reach earth");
expectClose(status.missionYears, 48.87, 0.02, "voyager 1 has flown ~48.9 years");

// --- Voyager 1's early years (the tracked table) ----------------------------
// NASA vectors at the two famous flyby moments. The table holds daily
// positions, so reading between the days is allowed a small interpolation
// error — worst during the frantic hours nearest a giant planet.
expectVec(E.voyager1PositionAu(2443938.0),
  [-3.221858726477680, 4.196412799203282, 0.05480964676862330], 0.01,
  "voyager 1 at the jupiter flyby (1979-03-05) matches NASA");
expectVec(E.voyager1PositionAu(2444556.490277778),
  [-9.501704474678858, -0.3647007351541715, 0.3828826020013893], 0.01,
  "voyager 1 at the saturn flyby (1980-11-12) matches NASA");

// The quiet decades are tracked too: NASA vectors mid-cruise.
expectVec(E.voyager1PositionAu(2449718.5),
  [-18.07506082727154, -44.68140890027095, 32.41661612421763], 2e-4,
  "voyager 1 on 1995-01-01 matches NASA");
expectVec(E.voyager1PositionAu(2453005.5),
  [-22.17438323640828, -71.11699241827927, 51.52125397877035], 2e-4,
  "voyager 1 on 2004-01-01 matches NASA");

// The cruise table and the hyperbola must agree where they hand over
// (2026-07-15), or the trail would show a kink that never happened.
{
  const a = E.voyager1PositionAu(E.VOYAGER1_TABLE_END_JD);
  const b = E.voyager1HyperbolicPositionAu(E.VOYAGER1_TABLE_END_JD);
  expectVec(a, [b.x, b.y, b.z], 1e-3, "cruise table and hyperbola agree at the 2026 handover");
}

// Before the table begins (launch era) we clamp to its first entry
// instead of inventing positions.
{
  const first = E.voyager1EarlyPositionAu(E.VOYAGER1_EARLY.startJd);
  const before = E.voyager1PositionAu(E.VOYAGER1_EARLY.startJd - 500);
  expectVec(before, [first.x, first.y, first.z], 1e-12,
    "before 1977-09-06 the position clamps to the first tracked point");
}

// Early-era speed comes from the table itself: right after launch Voyager
// was still deep in the Sun's grip, moving far faster than today.
expectClose(E.voyager1SpeedKmS(2443400.5), 35, 8,
  "shortly after launch voyager 1 moved ~30-40 km/s");

// A body on a closed orbit must come back: Pluto after one full period.
const p0 = E.smallBodyPositionAu(E.SMALL_BODIES.pluto, JD);
const p1 = E.smallBodyPositionAu(E.SMALL_BODIES.pluto, JD + 360 / E.SMALL_BODIES.pluto.n);
expectVec(p1, [p0.x, p0.y, p0.z], 1e-6, "pluto returns after one 248-year lap");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
