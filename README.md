# The Fourth Satellite

A one-page, hands-on explainer of how your phone finds the blue dot on its map. Nobody up in space is
tracking you: your phone times messages from satellites that don’t know it exists. And because the phone’s
own clock is wrong, it needs **one more satellite than you’d expect**, four in the real world, to work out
its clock error as well as where it is.

The page walks through five small steps, each with something to play with:

1. **Timing.** A satellite shouts the time; your phone notes how late it arrives. A delay is a distance.
2. **Spheres.** One distance puts you somewhere on a giant ball round the satellite. Three balls meet at
   two points, and the phone throws away the one out in space. (Here the phone’s clock is pretend-perfect.)
3. **Clock.** A real phone’s clock is off, so every ball is too big by the same amount. Shrink them all
   until the four balls meet, or let the phone do it. Turn off the fourth satellite and every shrink fits.
4. **Wobble.** Small measurement errors move the dot more when the satellites are bunched together.
   That is the pale circle round your dot.
5. **City.** Tall buildings block and bounce signals, so the dot wanders, sometimes right into a building.

Steps 2–4 happen on a 3D globe you can turn and zoom. Steps 1 and 5 are side views of the same Earth.

## Running it

It is a plain static site in the `site/` folder: no build step and nothing to install. Any static web
server works. With Python:

```
python tools/dev_server.py
```

then open http://localhost:8700. (This little server tells the browser not to cache files, so reloads
always show your latest edits. `python -m http.server --directory site` works too.)

Opening `site/index.html` straight from disk won’t work, because browsers block JavaScript modules on
`file://` pages.

## Running the tests

The maths has automatic checks that use Node’s built-in test runner (Node 20 or later, nothing to install):

```
node --test
```

They check that the phone’s solver finds the exact position and clock with no noise, refuses when it has
too few satellites, lands on the same answer from different first guesses, and never reads your true
position. They also check step 3’s “right shrink”, the size of step 4’s pale circle against the real
scatter of noisy answers, step 1’s distances, and step 5’s bounces.

## How the code is laid out

```
site/
  index.html          the whole page and all its words
  css/style.css       colours (dark and light), layout and controls
  js/main.js          starts everything
  js/math/            pure maths, no drawing: the position solver, Earth geometry, each step's model
  js/steps/           one file per step (and the opening sky): drawing and controls
  js/globe/           the shared 3D globe: renderer, Earth, objects, camera and dragging
  js/drawing/         helpers for the flat drawings in steps 1 and 5
  data/coastlines.json  coastlines, shrunk from Natural Earth by tools/make_coastlines.py
  fonts/, vendor/     the three fonts and three.js, shipped with the site
tests/                checks for the maths
tools/                the coastline converter and the local dev server
```

The phone’s brain is `site/js/math/positionSolver.js`. It is given only satellite positions and measured
signal times, and it guesses, predicts, compares, improves and repeats until the answer stops moving.

`DECISIONS.md` lists every choice this build made that the spec didn’t settle, with a reason for each.

## Credits

- **three.js** 0.187.0 (MIT licence) draws the 3D globes. Its licence is in `site/vendor/three/LICENSE`.
- **Fonts** (SIL Open Font License 1.1), from Fontsource 5.3.0: Space Grotesk by Florian Karsten, Inter by
  Rasmus Andersson, JetBrains Mono by JetBrains. Licences are in `site/fonts/`.
- **Coastlines:** Natural Earth 1:50m land, public domain (naturalearthdata.com).
- **Facts on the page** come from GPS.gov (“Space segment” and “GPS accuracy”); N. Ashby, “Relativity in
  the Global Positioning System”, *Living Reviews in Relativity*, 2003; the GPS specification IS-GPS-200;
  and F. van Diggelen, “Improving urban GPS accuracy for your app”, Android Developers Blog. The
  least-squares and dilution-of-precision method follows Misra and Enge, *Global Positioning System*
  (2nd edition, 2006).

## Licence

MIT, © 2026 The Dissectors. See `LICENSE`.
