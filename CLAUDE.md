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
- DARK MODE (sorkthropic, 2026-07-21): panels/poster print on dark
  (--panel #211c14, poster on --ink), never paper-white surfaces.
- The words "bauhaus / dessau / weimar / kandinsky" etc. must NEVER
  appear in user-visible UI text — the style stays, the words go;
  all copy is about the mission itself. (Code comments are fine.)
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

## Status after session 2 (2026-07-21)
DONE (on top of session 1):
- Time travel: sim clock drives everything; chips jump to launch /
  jupiter / saturn / shock / heliopause / now; ◀◀ ▶▶ speed ladder
  ±(day…decade)/s; ← → keys; "l" = live; HUD "now" block turns red
  while off the present. Voyager mesh+label hidden before launch;
  trail splits bright-flown / faint-ahead at the clock's moment.
- Saturn's rings, true scale (C, B, cassini gap, A), tilted to the
  real pole vector.
- Per-body visiting card (fact, radius, live distance, period,
  discovery) incl. the sun; labels declutter by priority each frame;
  honest scale bar; camera glide + two-finger pinch; sun is a
  clickable body.
- "ride the signal": camera flight earth → voyager 1 at 1 light-hour
  per 2 s (~47 s today), red zone captions, light-time counter,
  esc/click cancels, arrival focuses voyager. Planets pass in ~13 s,
  then ~30 s of true-scale emptiness — intentional.
- Shareable links: `#enter&date=1980-11-12&visit=saturn`, `#enter&ride`.

## Roadmap
Session 3: mobile pass (touch targets, timestrip on small screens),
  maybe sound, richer landing poster stats, any polish sorkthropic asks
  for after playing with it.
Session 4: README screenshots, GitHub Pages deploy (repo
  alansork/voyager-tracker already exists), link from sorkthropic-site.

## Headless testing recipe (works on this Mac)
Chrome `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader
--no-sandbox --screenshot=... --virtual-time-budget=9000` on
`index.html#enter[&date=…][&visit=…][&ride]`. Note: virtual time freezes
after load, so the ride only advances a few seconds in screenshots —
verify ride pacing with a node simulation of the zone math instead.

## Data provenance (for honesty in the UI)
All ephemeris constants fetched live from NASA/JPL Horizons API on
2026-07-20 (heliocentric, ecliptic J2000, TDB). Voyager 1 elements are
osculating at that epoch; its pre-1981 path (before the Saturn flyby
finished bending it) is NOT on this hyperbola, so the drawn trail starts
at 1981. Termination shock 94 au (crossed Dec 2004), heliopause 121.6 au
(crossed Aug 25, 2012).
