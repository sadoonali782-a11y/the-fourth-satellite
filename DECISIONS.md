# Decisions

Choices made for this build that SPEC.md did not settle, or that change it. One line of reason each.
The first block records the product interview held before building (24 Nov 2026).

## Product changes agreed in the interview

| # | Decision | Reason |
|---|---|---|
| 1 | Rebuild with room to change the product, not a strict copy. | The team chose to improve the product while rebuilding it. |
| 2 | Steps 2–4 move from flat 2D maps to a 3D globe with distance **spheres**. | Lets the fourth satellite be shown working, not only counted. |
| 3 | 3D is drawn with **three.js**, shipped as a file inside the site (no CDN, no build step). | See-through spheres crossing on a lit, zoomable globe cannot be drawn clearly by hand without far more code than the library itself; raw WebGL would be much harder for a beginner to read. The rest of the code stays library-free. |
| 4 | Step 2 in 3D: 1 sphere → you are somewhere on it; 2 → a circle; 3 → two points, one far out in space or inside the Earth, which the phone throws away. Perfect clock, so 3 satellites still give one spot. | Keeps "one extra satellite is for the clock" as the punchline of step 3. |
| 5 | Step 3 uses four satellites A–D. Every trio of spheres (ABC, ABD, ACD, BCD) gives a lime point; the four points meet in one blue dot when the shrink is right. Turning off D leaves a trail of equally good answers and the button reads "Needs a fourth satellite". | Makes the product's name visible on screen. |
| 6 | No magnifier. Every globe can be zoomed; step 3 has a camera fly-in to the meeting point. Everything stays sharp when zoomed (geometry, not images). | Requested; a lens inset is harder for a child to read than flying down. |
| 7 | Plain-language bar: a child should be able to follow the clock-error idea and why a fourth satellite is needed. | Requested audience bar. |
| 8 | Earth is stylised but natural: shaded sphere, muted land and ocean colours, real coastlines (Natural Earth, public domain), faint atmosphere glow, lat/long grid. No photo textures. | Photo textures blur when zoomed; vectors never do. Earth colours sit outside the blue/violet/lime system and are kept muted so those three still stand out. |
| 9 | On-screen copy: keep the spec's copy, rewrite steps 2–4 and the recap for 3D, and simplify only lines that fail a child-level check. Every change is listed below under "Copy changes". | Most existing copy already passes; keeps one voice. |
| 10 | Steps 1 and 5 stay 2D, drawn as views into the same world: step 1's ground is a cross-section of the same globe (same land/ocean colours, atmosphere, light); step 5's street is a zoomed-in slice of it. | Each 2D view teaches its idea best; it must not feel like a different planet. |
| 11 | Dragging on the globe: a press on a lime grab ring moves that thing (you slide over the ground; satellites slide over their 20,200 km shell); a press on empty space turns the globe. | Keeps every "Try" prompt working, like a map app. |
| 12 | Touch and wheel: one finger scrolls the page, two fingers turn and zoom the globe; plain wheel scrolls, Ctrl/⌘ + wheel zooms. One-finger drags on a grab ring still move things. A first-time hint explains it. Every globe has +, −, and reset-view buttons. | Stops three globes in a row trapping the page scroll on phones. |
| 13 | Step 4 shows the full 3D cloud of answers (it spreads up and down too); the pale circle lies flat on the ground and is sized from the ground directions only, with a note that height is even shakier. All step 4 sizes and thresholds are recomputed for 3D. | Keeps the link to the map app's pale circle and uses 3D for something 2D could not show. |
| 14 | Satellites in steps 2–4 are hand-placed and still, on the real 20,200 km shell, each with a faint orbit line. The opening shows a moving "real sky": ~31 satellites on six tilted orbits. | Puzzles need stillness; the visitor should first see that many satellites really circle the Earth. |
| 15 | The live 3D sky globe replaces the opening's CSS orbit animation. It holds still under reduced motion; the CSS animation is shown instead if 3D cannot start. | Strongest first screen, no extra section. |
| 16 | If 3D cannot run, each globe box shows a plain-words message; the step's text, analogy and Try prompts still read normally. No second 2D version is built. | Doubling the hardest steps for a rare case would break "simple enough to explain". |
| 17 | Keyboard: every draggable thing is focusable; arrow keys slide it over its surface, Shift + arrow moves further; screen readers hear the nearest place name. The grab ring doubles as the focus ring. | Closes the keyboard gap the spec flagged. |
| 18 | Reduced motion: nothing moves on its own, everything still responds. Step 1 sends one message per change plus a "Send again" button; glides and fly-ins jump to the end; step 4's dot holds still with a "New measurement" button; step 5's sky starts paused; the opening globe holds still. Those extra buttons appear only in that mode. | Honours the setting without removing any lesson. |
| 19 | Every real-world number on the page gets a footnote to its source; the 4.9 m figure appears as "about 5 m". | Honesty rule covers facts, not only maths. |
| 20 | Every simplification gets a fine-print line, including frozen satellites, step 2's perfect clock, step 5 showing only the across-street position, and the flat pale circle. | Spec's own honesty rule (its Open question 8). |
| 21 | Step 5 has no "Use a 3D city map" switch, no Try prompt for it, and no map-aided solver; its source (van Diggelen 2020) is dropped from the list. | The team decided the 3D-map fix can't be shown honestly in this end-on street and shouldn't be. Step 5 now ends on why the dot wanders. |
| 22 | Licence MIT, held by "The Dissectors". Repository name `the-fourth-satellite-final`; single branch `main`. Deployment comes later, so the live address is a placeholder in one settings file. | Team's answer. |

## Build choices

| Decision | Reason |
|---|---|
| Folders: `site/` (the whole website), `tests/`, `tools/`. Repository address lives in `site/js/settings.js`. | One obvious place for each kind of file; no parent-folder tricks. |
| three.js **0.187.0**, shipped unminified (`three.module.js` + `three.core.js`, about 2.1 MB, roughly 450 KB compressed by a web server). | That release ships no minified files, and there is no build step to minify. Unminified also means anyone can read it. |
| Fat-line add-on from the same three.js package (`vendor/three/lines/`), loaded through an import map. | Lines that keep their on-screen width at any zoom, so rings and trails stay crisp close up. |
| Fonts: Fontsource 5.3.0 variable Latin `.woff2` files (Inter, Space Grotesk, JetBrains Mono), about 110 KB in total. | Smallest self-hosted files; no outside requests. |
| Coastlines: Natural Earth 1:50m land, rounded to 0.01° (about 1 km) and stored as steps between points (345 KB). Converter kept in `tools/make_coastlines.py`. | Detailed enough to stay sharp in step 3's fly-in, small enough to load quickly. |
| One shared 3D renderer draws each globe in turn and copies the picture into that globe's own canvas. | Browsers limit 3D contexts, and the Earth's map only needs uploading once. Copying in the same frame keeps pictures in step with scrolling. |
| Land is painted into a 4096 × 2048 picture; coastlines and grid are real lines on top. | The fill can be soft close up, but its edge is hidden under the sharp coastline line. |
| Scene units are kilometres; the maths files use metres. | Keeps numbers small enough for the graphics card. |
| Labels, dots, satellite icons and grab rings are HTML drawn over the 3D picture. | Always crisp text, real focusable buttons for keyboard dragging, and screen-reader names. |
| "You" start in Cairo (30.04° N, 31.24° E) and can wander up to 2,500 km. | Africa and Europe face the camera; the limit keeps the satellites in your sky. |
| The phone's first guess is the Earth's centre (the spec said "the middle of the satellites" for 2D). | In 3D, starting there lands on the answer near the ground, not on the twin far out in space. Real receivers do the same. |
| Step 4 satellites can't be dragged below 10° above your horizon. | A satellite under your horizon can't be heard; this avoids a "no fix" dead end. |
| Step 4's measurement error is **1,500 km** (about a million times real), not 750 km. Pale circle ±1,877 km spread, ±7,010 km bunched; caption switches at 3,600 km; meter full at 12,000 km. | On a globe 12,700 km across, a 750 km cloud was too small to see. A million times is also an easier number for a child. |
| Step 4 bunched layout chosen so its circle is about 3.7× the spread one. | Tighter bunches give circles bigger than the Earth, and the solver's answers fly off wildly. |
| Step 4 uses a wider camera lens (64°) than the other globes (38°). | Keeps all four satellites and the cloud in view at once. |
| Globes step the camera back on narrow screens. | Satellites at the sides stay in view on phones. |
| `tools/dev_server.py` serves the site with caching turned off, on port 8700. | Reloads always show the latest edits. |
| `package.json` exists only to mark the JavaScript as modules for Node's test runner. | `node --test` works with no installs. |

## Copy changes

| Where | Spec copy | New copy | Why |
|---|---|---|---|
| Top bar | 2 Circles | 2 Spheres | The step is now 3D. |
| Step 2 title | One distance draws a circle | One distance draws a giant ball | 3D, and "ball" is a child's word. |
| Step 2 big idea | …It only says how far. | …You could be anywhere on a giant ball (a sphere) around it. | Introduces the ball once, with its proper name. |
| Step 2 captions | ring / two places / one spot | ball / a circle (lime) / two points, one out in space thrown away, the other your blue dot | Matches what three balls really do in 3D. |
| Step 2 analogy | …A second friend's ring crosses the first in two places, and a third tells you which one. | …They could be anywhere 5 km away, in any direction. Two more friends' clues, and only one place fits them all. | "Ring" no longer fits a 3D picture. |
| Step 2 Try / note | "the circles follow"; note about the flat picture | "the balls follow"; new Try about turning and zooming; note: "This step pretends your phone's clock is perfect…" | The flat-picture note no longer applies; the perfect clock is the new simplification. |
| Step 3 | ring(s), Satellite C, "Needs a third satellite", "three crossings" | ball(s), Satellite D, "Needs a fourth satellite", "four lime points" | Four satellites in 3D. |
| Step 3 Try | Drag yourself and shrink again. | Press **Let the phone find it** and fly down to where the four lime points meet. | Shows the new fly-in. |
| Step 3 unknowns card | Why one more satellite? / flat: 3 unknowns, round: 4 | Why a fourth satellite? / perfect clock (step 2): 3 unknowns, real phone clock: 4 | The globe is already 3D; the extra unknown is the clock. |
| Step 4 | ±763 km, rings, 500,000× shakier, "a few metres across", "Drag one satellite to the far side. The cloud snaps back." | live 3D sizes, balls, "a million times shakier", "reaches about 5 m from the dot" (footnote 2), "…other side of the sky. The cloud shrinks back." Two new lines: a Try about turning the Earth, and a note that height is shakier. | New numbers, footnoted fact, and the 3D cloud. |
| Recap 2 and 3 | ring / one extra satellite | giant ball / a fourth satellite | Matches the steps. |
| Number cards | (no footnotes) | footnote 1 added | Every real-world number now has a source. |
| Fine print | flat-picture line | lines for frozen hand-placed satellites, step 2's perfect clock, the flat pale circle, step 5 showing only across-street position, perfect-ball Earth and perfect orbits | Every simplification is said on screen. |
| Fine print closing line and footer | wording followed the exemplar | "Every number, ball and dot on this page is worked out live in your browser…" / "The code is open on GitHub" | New words, as the spec asked. |
