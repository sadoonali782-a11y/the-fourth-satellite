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
| 21 | Licence MIT, held by "The Dissectors". Repository name `the-fourth-satellite-final`; single branch `main`. Deployment comes later, so the live address is a placeholder in one settings file. | Team's answer. |

## Build choices

| Decision | Reason |
|---|---|
| _(filled in while building)_ | |

## Copy changes

| Where | Spec copy | New copy | Why |
|---|---|---|---|
| _(filled in while building)_ | | | |
