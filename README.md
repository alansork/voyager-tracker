# voyager 1 — a live tracker, at true scale

by **sorkthropic**

**live: <https://alansork.github.io/voyager-tracker/>**

The live position of Voyager 1 — the farthest machine humanity has ever
built — computed in your browser from its real NASA-tracked trajectory,
shown among all eight planets, the asteroid belt, the Kuiper belt, the
dwarf planets, and the edge of the Sun's bubble it crossed in 2012.

**Everything is at true scale.** 1 scene unit = 1 astronomical unit.
Real distances, real orbits, real radii. Nothing is compressed,
exaggerated, or "adjusted to look nicer".

The design copies the graphic language of the **Bauhaus** school
(Weimar/Dessau, 1919–1933) as it was originally practiced — only the
primary colours plus black, Kandinsky's circle/square/triangle as the
map symbols, Herbert Bayer's all-lowercase typography, asymmetric
poster composition — printed dark, then aged fifty years in a mission
file: sun-faded inks, film grain, fold creases, foxing stains and a
JPL rubber stamp. (In the app itself the copy never name-drops the
school; the interface talks only about the mission.)

## run it

Open `index.html` in a browser. No install, no internet needed —
all ephemeris data is baked in from NASA/JPL Horizons (fetched 2026-07-20).

## test it

```
node tests/ephemeris.test.js
```

32 checks compare every planet, dwarf planet, asteroid and Voyager 1
itself against positions computed by NASA's Horizons system.

## how the physics works

- **Planets** — JPL's approximate Keplerian elements (valid 1800–2050),
  solved with Kepler's equation. Accurate to well under a pixel.
- **Ceres, Vesta, Pallas, Pluto, Haumea, Makemake, Eris, Sedna** — exact
  osculating elements at epoch 2026-07-20, from JPL Horizons.
- **Voyager 1** — its real escape trajectory is a *hyperbola* (eccentricity
  3.70, perihelion January 1980, just before the Saturn flyby finished the
  job). We solve the hyperbolic Kepler equation from JPL's tracked orbital
  solution. Verified against a NASA vector 3.5 years in the future:
  drift under 0.007 au out of ~183 au.

Files: `index.html` (page + poster), `styles.css` (the bauhaus system),
`ephemeris.js` (the physics, testable in Node), `app.js` (the three.js
scene), `tests/` (NASA cross-checks), `vendor/three.min.js` (three.js r147).
