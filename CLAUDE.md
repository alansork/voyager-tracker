# CLAUDE.md — voyager-tracker

Working notes for Claude. Read this first each session.

## The vision (agreed with sorkthropic, 2026-07-20)
A live Voyager 1 tracker: real NASA trajectory, whole solar system +
asteroid belt + Kuiper belt + famous dwarf planets, **everything at true
scale — real distances, no compression, ever**. Design: 1920s Bauhaus,
done the way the school originally did it (primary colours + black on
paper, Kandinsky circle/square/triangle symbols, Bayer lowercase type,
asymmetric poster layout). Rich, not minimalistic. Planned as a ~4-session
build; commit small working steps (crash-safe, like bum-closet).

## Hard rules
- 1 three.js unit = 1 au. True scale for every distance AND every radius.
- Every position must trace back to the NASA/JPL data in `ephemeris.js`
  and be covered by `tests/ephemeris.test.js`. Run tests after any physics
  change: `node tests/ephemeris.test.js`.
- Bauhaus palette only in UI: --paper #ede8dc, --ink #16130e,
  --red #c62f1e, --blue #21489c, --yellow #e3a71b. All text lowercase.
- Symbols: planet = red circle, dwarf planet = blue square,
  voyager 1 = yellow triangle (Kandinsky's form lesson).

## Status after session 1 (2026-07-20)
DONE:
- `ephemeris.js`: planets (JPL 1800–2050 elements), 8 small bodies
  (osculating elements epoch 2026-07-20), Voyager 1 hyperbolic orbit
  (JPL solution Voyager_1_ST+refit2022_m), light-time/speed/status.
  25/25 tests pass against NASA Horizons check vectors.
- `index.html` + `styles.css`: Bauhaus poster landing (red sun circle,
  black trajectory bar, yellow voyager triangle, blue square), HUD data
  strip, legend, frame.
- `app.js`: true-scale three.js scene — starfield, sun + glow, orbit
  lines for all 16 bodies, asteroid/Kuiper belts (point clouds in the
  real regions), termination-shock + heliopause rings, true-radius
  spheres, HTML labels with Kandinsky symbols, click-to-visit camera,
  drag/scroll controls, live HUD. Verified headless (Chrome +
  swiftshader): landing poster and scene both render, HUD numbers live,
  no console errors. `#enter` in the URL skips the poster.

## Roadmap
Session 2: interactive polish (labels overlap near the sun when zoomed
  out — declutter by distance; camera feel; mobile). Add a guided "journey"
  — camera flight Earth → Voyager at true scale to feel the distance.
  Saturn needs rings. Add time controls (see the flyby years).
Session 3: richer Bauhaus HUD (info card per body when visited: real
  facts, discovery, radii), label decluttering by distance, Voyager
  mission timeline strip (launch → Jupiter 1979 → Saturn 1980 →
  termination shock 2004 → heliopause 2012 → today), maybe sound.
Session 4: polish, mobile, README screenshots, create GitHub repo
  alansork/voyager-tracker + GitHub Pages deploy, link from
  sorkthropic-site.

## Data provenance (for honesty in the UI)
All ephemeris constants fetched live from NASA/JPL Horizons API on
2026-07-20 (heliocentric, ecliptic J2000, TDB). Voyager 1 elements are
osculating at that epoch; its pre-1981 path (before the Saturn flyby
finished bending it) is NOT on this hyperbola, so the drawn trail starts
at 1981. Termination shock 94 au (crossed Dec 2004), heliopause 121.6 au
(crossed Aug 25, 2012).
