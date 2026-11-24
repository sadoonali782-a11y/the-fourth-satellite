# SPEC: "The Fourth Satellite", an interactive GPS explainer

This document describes a finished product so another team can rebuild it from nothing. It says what the visitor sees and does, and what the numbers behind it mean. It does not say how the current code is organised, and it contains no code.

**How to read it.**

- Text in quote blocks (`>`) is **product copy**: the exact words the visitor reads on screen. It is quoted on purpose, because the brief asks for the exact on-screen text. Our own team wrote all of it for the GPS project; none of it comes from the organisers' exemplar (see Part B). Everything outside quote blocks is new wording written for this spec. See Open question 1 if the copy should be rewritten as well.
- In product copy, `**word**` means that word is shown bold and in the highlight colour. *Italic* inside quoted headings means the word is shown in violet (see Visual design, "emphasis").
- "km" in this spec means real-world kilometres in the simulated scene, not screen size.

---

## Part A. Every file in the current repository

| File | What it does |
|---|---|
| `AGENTS.md` | Notes for coding agents: what the project is, the folder layout, and house rules (short text, colour roles, live captions). |
| `CLAUDE.md` | One line that points to `AGENTS.md`. |
| `LICENSE` | MIT licence, copyright "The Dissectors" (our team). |
| `README.md` | Short top-level readme: one paragraph on the project, the live link, a credit to the exemplar, the licence. |
| `links.js` | Two web addresses (the code repository and the live site). The page reads the repository address from it. |
| `.claude/launch.json` | Tells the Claude desktop app how to start a local static server (Python, port 8642) to preview the site. |
| `.github/workflows/pages.yml` | On every push to `main`, copies the site and `links.js` into a folder, adds a root page that redirects to the site, and publishes it to GitHub Pages. |
| `submission/index.html` | The whole page: top bar, opening section, three number cards, the five steps, recap, three surprising facts, the fine print, the footer. All on-screen text lives here except live captions. |
| `submission/css/style.css` | All styling: dark and light colour sets, starfield, top bar, opening animation, cards, sliders, buttons, chips, switches, read-outs, the two narrower-screen layouts, and reduced-motion handling. |
| `submission/favicon.svg` | Browser tab icon: a dark rounded square with a dashed violet orbit, a blue dot with a white rim, and a small lime dot. |
| `submission/README.md` | The long project page: what each step does, how the maths works, what was simplified, shortcomings, outside material, sources, how to run it, a file table, licences. |
| `submission/js/app.js` | Starts the page: applies the theme, starts each step, runs each step's animation only while it is near the screen, highlights the current step in the top bar and fills the progress line. |
| `submission/js/theme.js` | Light/dark switch, remembering the choice in the browser, and handing the current colours to the drawings. |
| `submission/js/ui.js` | Small shared helpers: an on/off toggle button, distance formatting (cm, m, km), and a caption writer that only rewrites a caption when its text really changes. |
| `submission/js/geo.js` | Physical constants (speed of light, Earth radius, GPS orbit radius and period), 2D vector helpers, a small linear-equation solver and matrix inverse, a repeatable random-number generator with bell-curve noise, and where two circles cross. |
| `submission/js/receiver.js` | The "phone": turns satellite positions and measured signal times into a position and a clock error by repeated guess-and-improve (least squares). Also works out how big the uncertainty circle should be. |
| `submission/js/draw.js` | Shared drawing pieces: sizing a drawing area to the screen, converting scene metres to screen pixels, the blue dot, the satellite icon, the person icon, the magnifying lens, the dashed "grab me" ring, pointer dragging, and a pausable animation loop. |
| `submission/js/space.js` | The shared flat "map of space" for steps 2–4: its scale, the starting satellite positions and names, the "middle of the satellites" first guess, and the limit that keeps dragged things on screen. |
| `submission/js/step1-timing.js` | Step 1: a satellite on an arc, a time message travelling down to a person, a stopwatch and the distance sum. |
| `submission/js/step2-circles.js` | Step 2: switch satellites on, see one ring, two crossing points, then one spot. |
| `submission/js/step3-clock.js` | Step 3: the clock-error puzzle with the shrink slider, faint true rings, a magnifier, the "find it" glide and the two-satellite trail. |
| `submission/js/step4-wobble.js` | Step 4: noisy measurements, a cloud of past answers, the pale uncertainty circle, spread vs bunched satellites. |
| `submission/js/step5-city.js` | Step 5: a street between two buildings seen end on, a rotating sky of 16 satellites, straight/bounced/blocked signals, a top-down map with the wandering dot, and the "3D city map" correction. |
| `tests/receiver.test.mjs` | Nine automatic checks on the receiver and on step 5's signal paths and map check, using Node's built-in test runner. All nine pass today. |

There are no images, textures, audio files, 3D models or bundled fonts in the repository. The fonts are fetched from Google Fonts at page load.

---

## Part B. Material inherited from the organisers' exemplar (do NOT carry into the new build)

The git history shows the exemplar was uploaded on 18 Nov 2026 and was a different project: a voice-codec explainer called "The throat in your phone" (audio files, codec maths, an old-book serif look). Our team replaced its content with the GPS explainer on 22 Nov 2026. So almost none of the GPS **content** is inherited, but much of the **scaffolding and documentation shape** is.

**Clearly inherited**

1. **Folder layout.** The site sits in a `submission/` folder, with `css/`, `js/`, `favicon.svg`, `index.html` and its own `README.md`, and a `links.js` one level up that the page loads with a "go up one folder" path. This is the organisers' template layout.
2. **`links.js` itself and how it is used.** A global constant with `repo` and `live` addresses, and a small inline script that rewrites placeholder links pointing at `https://github.com/`. The original held `your-org/your-repo` placeholders.
3. **The deploy workflow's shape.** It exists only to keep the `submission/` + `../links.js` arrangement working on GitHub Pages, and it adds a redirect page. It was written to support the inherited layout.
4. **Local server instructions.** "Python `http.server` on port 8642" (in the readmes and `.claude/launch.json`) is the exemplar's exact command and port.
5. **Readme outline.** The long readme follows the exemplar's section order and headings almost one to one: "What you can do with it", "How it works", "What is computed and what is drawn by hand", "What we simplified", "Where this falls short" (the exemplar's "A winning entry would…" became "A better version would…"), "Things we didn't make ourselves", sources, licences.
6. **Page-building habits.** Google Fonts loaded through `preconnect` links, footnote superscripts styled as small links to a numbered source list, and `aria-pressed` toggle buttons all appear in the exemplar's page.
7. **Footer and closing line, near word for word.** The exemplar's footer was "<product name>. Read the code." and its last fine-print note was "All of it runs in your browser, in about N lines of … JavaScript, with no … libraries" followed by a GitHub link. Our footer and fine-print closing line follow the same wording and use the same link ids and placeholder addresses.
8. **LICENSE text.** Standard MIT. The holder was changed from "Global Virtual Hackathon organisers" to our team. The new build needs a licence, but there is no need to keep this file's history.
9. **On-page and readme statements about the exemplar.** The fine print says the code is "built on the organisers' exemplar"; the top readme says "We kept its project structure and coding style"; the long readme says the receiver, orbits, street and theme switch "came from the organisers' exemplar". These are about the old codebase and do not belong in a fresh build.

**Probably inherited, or leftovers from earlier versions (unsure)**

10. **Coding style** (small ES modules, a one-letter "find element by id" helper, terse helper names, one shared `ui.js`). The readme says the style was kept from the exemplar. The exemplar did have an `app.js` and a `ui.js`.
11. **The stored theme name `blue-dot-theme`** and the page description "How your phone finds the blue dot…". These look like leftovers from an earlier working title ("blue dot"), not from the exemplar. Harmless, but the new build should pick its own name.
12. **"About 870 lines of JavaScript, no libraries"** in the fine print. Besides following the exemplar's sentence (item 7), it describes this codebase, so it will be wrong for the new one.
13. **The long readme's claim that the receiver etc. came from the exemplar** is factually wrong (the exemplar had no GPS code). Treat it as a mistake, not as a credit to keep.

**Not inherited (written for GPS)**: every step, all on-screen copy, the colour system (dark space theme, blue/violet/lime), the fonts chosen, the receiver maths, step 5's street model, the tests, `AGENTS.md`.

---

## Part C. The product specification

### 1. Purpose and audience

**Who the viewer is.** Someone who opens a map app every day, sees the blue dot, and has never asked how it gets there. No maths or physics is assumed beyond "speed × time = distance". They are curious but busy, so every block of text is at most three sentences, and every idea comes with something to play with and an everyday comparison.

**What they probably believe.** That satellites watch or track their phone, or that the phone sends something up.

**The one idea to leave with.** Your phone works out its own position by timing messages from satellites that don't know it exists, and because the phone's own clock is wrong it needs **one more satellite than you'd expect** (four in the real world) so it can work out its clock error too. That is the product's name: the fourth satellite.

**Supporting ideas, one per step:** a delay is a distance (1); one distance is a ring, and rings cross where you are (2); a wrong clock makes every ring wrong by the same amount, which costs one extra satellite (3); where the satellites sit in the sky decides how big the uncertainty circle is (4); in cities, buildings block and bounce signals, so the dot wanders (5).

**Important mismatch with the brief's template.** The brief mentions a 3D globe, Earth texture, distance spheres, WebGL and a 3D library. **The product has none of these.** Every picture is a flat 2D drawing made in the browser's built-in canvas. Satellites and the phone live on a flat "map of space" seen from above (steps 2–4), a side view of a curved ground with an arc (step 1), and an end-on street plus a top-down map (step 5). "Distance spheres" are drawn as circles ("rings"). The "3D city map" in step 5 is an idea the phone uses (it knows the building heights), not a 3D picture. This spec describes the product as it is. See Open question 2.

### 2. The user journey

The site is one long scrolling page. In order: top bar (always visible), opening section, three number cards, steps 1–5, recap, three surprising facts, fine print, footer.

#### 2.0 Top bar (sticky, on every screen)

- **Left:** a small blue dot with a soft halo, then the product name.
  > The Fourth Satellite
  Clicking it scrolls to the top.
- **Middle:** five pill-shaped links, each with a numbered circle and a word:
  > 1 Timing · 2 Circles · 3 Clock · 4 Wobble · 5 City
  Clicking one smooth-scrolls to that step (the step's top stops just below the bar). The step being read is highlighted: solid blue pill, white text. "Being read" means the last step whose top edge has scrolled above the middle of the window. Before step 1 nothing is highlighted.
- **Right:** a light/dark switch drawn as a small track with a round knob. In dark mode the knob is a crescent moon (lime crescent) on the left; in light mode it slides right and becomes a warm orange sun with a glow.
- **Bottom edge:** a 3-pixel progress line that fills left to right with a blue-to-violet gradient in proportion to how far down the whole page you have scrolled.
- The bar is slightly see-through and blurs what scrolls under it.

#### 2.1 Opening section

Two columns on wide screens (text left, animation right), stacked on narrow ones. Takes most of the first screen.

- Small label above the headline (monospace, capitals, wide letter-spacing, lime):
  > How your phone finds you
- Headline:
  > Nobody up there knows where you are.
- Subtitle:
  > Satellites don’t track you. They don’t even know you exist. Your phone works out the blue dot all by itself, from a few clocks in space.
- Smaller line:
  > Five small steps. Each one is something you can play with.
- Lime rounded button with dark text (lifts slightly and glows on hover), scrolls to step 1:
  > Start with step 1 ↓
- **Animation (decoration only, hidden from screen readers):** three dashed concentric circles, each turning at its own pace (the outer one once every 26 s, the middle one every 18 s in the opposite direction, the inner one every 12 s). Each carries one small violet satellite (a square body with two short side panels). In the centre sits a large blue dot with a thick white rim and a pale blue halo that slowly swells and fades every 2.6 s, like a breathing location dot.

#### 2.2 Three number cards

A row of three cards (one column on phones). Big number on top, small grey line under it. Numbers are blue, violet and lime respectively.

> **~31** GPS satellites in orbit
> **20,200 km** how high they fly
> **0** messages your phone sends them

#### Common layout of every step

Each step is a section with a thin line above it and:

- **Heading row:** a rounded square tile with the step number in white on a blue-to-violet gradient, the step title, and a one-sentence "big idea" in grey beneath.
- **Body, two columns on wide screens:** left is the **stage** (a raised card holding the drawing, the controls under it, and a live caption or read-out); right is the **side column** (an "analogy" card, then two or three "Try" prompts, sometimes a note).
- **Analogy card:** a card with a faint violet tint, a small violet monospace capitals tag that reads
  > Think of it like…
  followed by one bold phrase and a short explanation.
- **Try prompts:** each in its own outlined box, with a small lime badge reading **TRY** on the left.
- **Note:** small grey text with a blue bar down its left edge.
- **Live caption:** a line of text under the drawing that changes as the visitor plays. It always reserves room for about two lines so the layout doesn't jump. Bold words in it are shown in the highlight colour. It is announced politely to screen readers, and only when its text actually changes.

#### 2.3 Step 1: Timing

- **Goal:** a delay is a distance. The satellite only broadcasts its name, position and time; the phone times how late it arrives.
- **Title:**
  > Satellites just shout the time
- **Big idea:**
  > Each satellite repeats one message: *“I’m satellite A, I’m here, and the time is exactly…”* Your phone notes how late it arrives.
- **What is shown** (a shorter drawing than the other steps, roughly 320 px tall):
  - A curved patch of ground along the bottom (the top of a very wide ellipse).
  - A small stick person at the bottom centre, holding a phone (the phone is a small blue rectangle).
  - A faint dashed half-circle arc centred on the person: the possible positions of the satellite from left horizon, through overhead, to right horizon.
  - The satellite (violet icon) sits on the arc at the chosen angle above the **left** horizon, with the label "Satellite A" above it. A thin faint line joins it to the person.
  - The **message**: a filled violet dot with a thin violet ring around it, moving in a straight line from the satellite to the person. Beside it, in violet, the text
    > “A here. It’s 12:00:00.000”
  - When the message arrives it disappears and a **lime ring** circles the person's upper body, marking arrival.
  - Top-right corner, small grey text:
    > slowed down 30×
- **Read-out box** (under the controls):
  - Left label "Stopwatch"; right, a large monospace time that counts up from "0.0 ms" while the message travels, one decimal place, and turns lime when the message arrives.
  - A line below that swaps between two texts. While travelling:
    > The message is on its way…
    On arrival:
    > **69.6 ms** × 300,000 km a second = **20,851 km** away
    (numbers update with the angle; see the table below). Both texts always occupy the same space so nothing below moves when they swap.
- **What the viewer can do:** one slider.
  > Where the satellite is
  Next to it a value: "right overhead" above 75°, "near the horizon" below 15°, otherwise "N° up" (for example "60° up").
- **What changes:** moving the slider moves the satellite along the arc, restarts the message from the satellite immediately, and updates the result line. Lower satellites are further away, so the message takes visibly longer.
- **Timing cycle:** the message travels at the speed of light slowed 30 times, so a trip of about 70 ms takes about 2 s on screen. After it arrives, the result stays for 1.6 s, then a new message sets off. This repeats forever while the step is on screen.
- **Reference values** (computed from a real orbit 20,200 km up on a round Earth):

  | Angle | Distance | Delay | Shown for |
  |---|---|---|---|
  | 90° (overhead) | 20,189 km | 67.3 ms | ≈2.0 s |
  | 60° (start) | 20,851 km | 69.6 ms | ≈2.1 s |
  | 30° | 22,795 km | 76.0 ms | ≈2.3 s |
  | 5° (lowest) | 25,235 km | 84.2 ms | ≈2.5 s |

- **Side column:**
  > **Lightning and thunder.** Count the seconds between the flash and the boom and you know how far away the storm is. Your phone does the same with radio, which travels 300,000 km every second.

  Try:
  > Slide the satellite down towards the horizon. It’s further away, so the message takes longer.

  > Watch the stopwatch. The whole trip takes less than a tenth of a second.

#### 2.4 Step 2: Circles

- **Goal:** one distance only gives a ring; two rings cross in two places; three meet in one spot.
- **Title:**
  > One distance draws a circle
- **Big idea:**
  > Knowing you’re 21,000 km from a satellite doesn’t say *where* you are. It only says how far.
- **What is shown:** the flat map of space (see 4.3). Three satellites, labelled A, B and C. You start a little right of and above the centre. Around every satellite that is switched on, a solid violet ring whose radius is that satellite's true distance to you. The ring therefore always passes through you.
  - Satellite labels: when on, the letter and the distance, e.g. "A · 21,915 km"; when off, just the letter, and the satellite and label are faded to about a third.
  - **You:** drawn as a faded person icon, always wrapped in a lime dashed "grab me" ring.
  - **With exactly two satellites on:** a lime disc with a dark "?" at each of the two places the rings cross.
  - **With all three on:** the phone works out the spot itself and a **blue dot** appears there (the person icon is hidden; the grab ring stays). This step's clock is perfect, so the dot lands exactly on you.
- **Controls:** a grey label "Listen to" and three chips: "Satellite A" (on at start), "Satellite B" (off), "Satellite C" (off). Each chip toggles on click. On = filled violet with white text; off = dashed grey outline. You can also drag yourself around.
- **Default distances at start:** A 21,915 km, B 20,304 km, C 24,052 km.
- **Live caption by number of satellites on:**
  - 0: > Turn on a satellite to hear it.
  - 1: > One satellite: you are **somewhere on that ring**. That’s all it can tell you.
  - 2: > Two satellites: the rings cross in **two places**. You’re at one of them.
  - 3: > Three satellites: only **one spot** is on all three rings. That’s your blue dot.
- **Side column:**
  > **A friend texting “I’m 5 km from the station.”** They could be anywhere on a ring around it. A second friend’s ring crosses the first in two places, and a third tells you which one.

  Try:
  > Turn on the satellites one at a time.

  > Drag yourself around (the dashed ring). The circles follow, and still meet where you are.

  Note:
  > This is a flat picture of space, seen from above. The real world is 3D, which adds one more satellite to everything here.

#### 2.5 Step 3: Clock (the heart of the product)

- **Goal:** the phone's clock is off, so every measured distance is too long by the **same** amount. Finding that one amount fixes everything, and it costs one extra satellite.
- **Title:**
  > Your phone’s clock is the problem
- **Big idea:**
  > Radio is so fast that a clock one millionth of a second out puts you 300 m wrong. A phone’s clock is far worse, so every ring comes out *too big by the same amount*.
- **What is shown:** the flat map of space with three **different** satellites from step 2, all in the upper half ("all above you, as real ones are"). You start in the same place as step 2.
  - **Faint dashed violet rings** (half see-through): the true distances. The phone can't see these; they're there so the visitor knows the target.
  - **Solid violet rings**: what the phone measured (too big by the clock error) minus whatever the visitor has shrunk them by.
  - **You:** a small grey dot at your true spot, inside a lime dashed grab ring.
  - **Lime crossing dots:** for each pair of rings (A–B, B–C, C–A), the crossing point nearest the phone's current best guess. When the shrink is wrong these three dots sit apart, forming a small triangle.
  - **Magnifier:** a round lens in the bottom-right corner (about 95 px radius, smaller on short screens) with a grey rim, showing the area around the phone's best guess 12 times closer, with all the same rings and dots. Beneath it, small grey text "12× closer".
  - **When the shrink is right** (within 1 km of the answer): the grey dot and lime crossing dots are replaced by a **blue dot** at the phone's spot, both in the main view and in the lens.
  - **With Satellite C off:** only A and B rings, C drawn faded. A **trail of small lime dots** shows where the two rings cross for every possible shrink from 0 to 8,000 km (sampled every 20 km): a long curve of equally good answers. No crossing dots, no blue dot.
- **Controls** (stacked vertically, full width):
  1. Slider "Phone’s clock is", 1 to 20 (milliseconds), starts at 10. Value shown as "10 ms fast". Moving it resets the shrink to 0 and cancels any glide.
  2. Slider "Shrink every ring by" (label in bold, normal text colour, lime slider thumb), 0 to 8,000 km in 10 km steps, starts at 0 km. Value shown in km, e.g. "2,998 km".
     - **Snap:** when the visitor lets go within 60 km of the right amount, it jumps exactly onto it. (10 km steps can't land on the exact answer.)
  3. A row with a chip "Satellite C" (on at start) and a blue button "Let the phone find it".
     - The button smoothly slides the shrink slider (and the rings) from where it is to the right amount over 1.6 s, easing in and out. Touching any slider stops the glide.
     - With C off the button is greyed out, cannot be pressed, and reads "Needs a third satellite".
- **The right amount** is the clock error × speed of light: at the default 10 ms it is 2,998 km; at the maximum 20 ms, 5,996 km (always inside the slider's 8,000 km range). It does not depend on where you are: drag yourself and it stays the same.
- **Live caption, three cases:**
  - C off:
    > With only A and B, **every** shrink amount gives a place where the rings cross. That’s the dotted trail. The phone has no way to choose, so it needs one more satellite.
  - Rings meet (example at 10 ms):
    > All three rings meet at a shrink of **2,998 km**, right where you are. That amount **is** the clock error: 2,998 km ÷ 300,000 km/s = **10 ms fast**.
  - Otherwise, either "too big" (shrink less than the answer) or "too small" (more):
    > The rings are still **too big**: shrink them more. The three crossings (lime, close up in the magnifier) don’t meet, and the phone’s best guess is **1,234 km** from you.

    > The rings are now **too small**: shrink them less. The three crossings (lime, close up in the magnifier) don’t meet, and the phone’s best guess is **1,234 km** from you.

    (The distance is live, formatted as cm, m to one decimal under 10 m, whole m under 1 km, otherwise whole km.)
- **Side column:**
  > **A watch that’s 5 minutes fast.** Every time you check it, you’re out by the same 5 minutes. Find that 5 minutes once and you can fix every answer.

  Try:
  > Drag **Shrink every ring** until the rings sit on the faint dashed ones, the true distances. The amount you shrank them by is the clock error.

  > Drag yourself (the dashed circle) and shrink again. The amount stays the same, because it’s the clock’s error, not yours.

  > Turn off **Satellite C**. Now every shrink amount gives a crossing, so there’s no way to choose.

  **"Unknowns" card** (dashed violet border):
  > Why one more satellite?

  > Count what the phone doesn’t know. Each satellite gives it one clue, and it needs one clue per unknown.

  Then two rows of small tag-chips. Position chips are pale blue; the clock chip is lime with dark text.
  - Row 1: `left–right` `up–down` `clock` → **3 unknowns → 3 satellites**, caption "In this flat picture".
  - Row 2: `east–west` `north–south` `height` `clock` → **4 unknowns → 4 satellites**, caption "In the real, round world".

#### 2.6 Step 4: Wobble

- **Goal:** every measurement is slightly off; the satellites' layout decides how much that moves the dot. That's the pale circle around the dot in map apps.
- **Title:**
  > Why there’s a pale circle
- **Big idea:**
  > Every measurement is a little off. *Where* the satellites are decides how much that moves your dot.
- **What is shown:** the flat map of space with **four** satellites A–D, each with a lime dashed grab ring (they are draggable). You are not drawn; only the phone's answer is.
  - **Cloud of answers:** 120 small blue specks (half see-through). Each is the phone's answer to one fixed set of random measurement errors. The errors behind each speck never change, so the cloud holds still while nothing moves and reshapes smoothly when satellites move.
  - **Blue dot:** the phone's current answer. A new set of random errors is drawn about once every 0.9 s, so the dot hops about inside the cloud like a real phone's dot.
  - **Pale circle:** a filled pale-blue disc with a thin blue edge, centred on the blue dot, whose radius is the expected size of the error (see 5.4).
- **Controls:** two buttons, "Spread them out" (solid blue) and "Bunch them together" (outlined). Pressing one makes all four satellites glide smoothly to that layout (each frame they move 8% of the way, so they settle in about a second). Dragging any satellite cancels the glide.
- **Read-out box:** label "Pale circle", value "±763 km" style (whole km), or "can’t tell" if the layout makes a fix impossible. Under it a thin meter bar whose fill (blue → violet → lime gradient) grows with the circle size, full at 6,000 km.
- **Default sizes:** spread layout ±763 km; bunched layout ±7,346 km.
- **Live caption:** below 1,800 km:
  > The satellites are **spread around you**, so their rings cross at wide angles. Small errors only nudge the dot.

  At or above 1,800 km:
  > The satellites are **bunched together**, so their rings cross at shallow angles. The same small errors now slide the dot a long way.
- **Side column:**
  > **Two torch beams.** Cross them at a right angle and they meet in a small, sharp spot, but at a shallow angle they overlap in a long smear. The rings work the same way.

  Try:
  > Press **Bunch them together** and watch the cloud of answers stretch out.

  > Drag one satellite to the far side. The cloud snaps back.

  Note:
  > We made every measurement about 500,000× shakier than real so you can see it. On a real phone the pale circle is a few metres across.

#### 2.7 Step 5: City

- **Goal:** tall buildings block some signals and bounce others; a bounced signal is late, so the phone thinks that satellite is further away and pushes the dot the wrong way. Knowing the buildings (a 3D city map) lets the phone undo this.
- **Title:**
  > Downtown, signals bounce
- **Big idea:**
  > Tall buildings block some satellites and bounce others. A bounced signal took the long way round, so that satellite seems further away than it is.
- **Layout:** the stage is wider in this step (about two-thirds of the width). Inside it, two drawings side by side (stacked on phones), each with a small grey caption beneath:
  - Left, larger: **"The street, seen end on"**.
  - Right: **"Your map, from above"**.
- **Street drawing:**
  - A street 22 m wide between a left building and a right building. The left building's height is the slider value; the right one is always 80% of that.
  - Buildings are solid blocks reaching from the street wall to the edge of the drawing, with a grid of faint windows: one row per 4 m floor (only whole floors that fit), windows every 3 m going away from the street.
  - At each roof's street corner, a short line along the roof and a label such as "40 m tall" / "32 m tall".
  - The ground is a band along the bottom. You are a person icon (slightly larger) standing at your chosen spot; the phone is held 1.4 m up.
  - The drawing rescales so the whole street and both roofs always fit, with some margin.
  - **Every satellite above 5° from either horizon** sends a signal, drawn according to its fate:
    - **Straight:** solid **blue** line from the edge of the drawing to you, with a small violet dot near the edge marking the satellite's direction.
    - **Bounced:** dashed **lime** line from the edge of the drawing to the point on the opposite building's wall where it reflects (marked with a small lime dot), then on to you. Violet direction dot at the edge.
    - **Blocked:** dotted **grey** line from the edge down to the roof corner that is in the way, with a small grey **×** where it is stopped.
  - The sky slowly turns, so signals keep changing from straight to bounced to blocked.
- **Map drawing (top-down):** the two buildings as solid blocks on either side, the street as a light band between them with a dashed centre line. Your true spot is a dashed circle (normal text colour) with the word "you" under it, about two-thirds of the way down. The **blue dot** sits on the same line at the across-street position the phone worked out. Above it, a **trail** of up to 30 earlier answers: small blue dots, each older one a bit higher up and more faded, so the trail scrolls up like a timeline. The blue dot is clamped to stay inside the drawing even when the answer lands deep inside a building. When there is no fix, the last dot is shown faded.
- **Legend row:** three keys with live counts: a solid blue line "Straight N", a dashed lime line "Bounced N", a dotted grey line "Blocked N".
- **Controls:**
  - Slider "Building height", 1 to 80 m, starts at 40 m. (No number shown beside it; the roof labels show the heights.)
  - Slider "Where you stand", 1 to 21 m from the left wall in half-metre steps, starts at 6 m. (No number shown.)
  - Outlined button "Pause the sky": freezes the sky; its text becomes "Play the sky". Pressing again resumes. Measurements and the dot keep updating while paused (fresh small noise each time).
  - Switch "Use a 3D city map": off at start; when on, the knob slides right and turns lime.
  - Changing either slider or the switch clears the trail.
- **Updates:** the phone produces a new answer twice a second.
- **Live caption:**
  - Within 1 m: > The blue dot is **right where you are**.
  - Otherwise, e.g.: > The blue dot is **7.3 m to your right**.
    and when the answer is outside the street, add: > , **inside a building**
  - No fix (too few signals heard): > **No fix.** The phone hears 2 satellites and needs 3.
    (singular "satellite" for 1; needs 3 without the map, 2 with the map) and, if there has been an earlier answer, add: > The faded dot is its last answer.
- **Side column:**
  > **A friend calling your name across a busy street.** If the sound bounces off a wall first, it reaches you late and from the wrong side. Your phone gets fooled the same way, and pushes the dot the wrong way.

  Try:
  > Raise the buildings. Watch the dot drift, sometimes right into a building.

  > Turn on **Use a 3D city map**. The phone checks which signals could really have come straight.

  > Drop the buildings to 1 m: open sky, and the dot sits still.

#### 2.8 Recap

> The whole trick, in five lines

Five cards in a row (two columns on tablets, one on phones), each with a small gradient number tile:

> 1 Satellites shout the time. Your phone times how late it arrives.
> 2 Each delay is a distance, and each distance is a ring.
> 3 A wrong clock makes every ring too big. One extra satellite lets the phone find out by how much.
> 4 Satellites spread across the sky give a small pale circle.
> 5 Buildings bounce signals, which is why the dot wanders in cities.

#### 2.9 Three surprising facts

> Three things that surprise people

Three cards (one column below tablet width). Each has a violet title and a short text ending in a small lime superscript footnote number that jumps to the source list. Cards lift slightly and get a violet border on hover.

> **Einstein in your pocket** — Clocks up there tick faster than clocks down here, by 38 millionths of a second a day. So they’re set to run slightly slow before launch. [3]

> **A 12-minute download** — Satellites send their orbit details at 50 bits a second. Hearing the full list takes 12.5 minutes, so your phone fetches it from the internet instead. [4]

> **Quieter than a whisper** — The signal reaching your phone is weaker than the background noise around it. Your phone finds it by knowing exactly what pattern to listen for. [4]

#### 2.10 Fine print (collapsed by default)

A card with a disclosure toggle:

> What we simplified, and sources

Opened, it shows a bullet list of simplifications:

> Step 1’s arc isn’t to scale, but its distance and delay come from a real orbit 20,200 km up.
> Steps 2 to 4 are a flat picture, so 3 satellites do the job that 4 do in the real, 3D world.
> Step 4’s wobble is hugely exaggerated, so you can see it.
> Step 5 has one bounce at most, flat glass walls and a perfect city map. Its sky turns about 140× faster than real life.
> Nothing slows the signal down on its way (in real life the upper air adds a few metres).

Then a numbered source list (a source is highlighted when reached through its footnote link):

> 1. Number of satellites, height and orbits: GPS.gov, “Space segment”.
> 2. Phones are typically accurate to within 4.9 m under open sky: GPS.gov, “GPS accuracy”.
> 3. Clocks 38 µs a day fast, set to 10.22999999543 MHz: N. Ashby, “Relativity in the Global Positioning System”, *Living Reviews in Relativity*, 2003.
> 4. 50 bits a second, 12.5 minutes for the full list, and the signal’s strength and pattern: the GPS specification IS-GPS-200.
> 5. 3D-map-aided positioning on Android from 2020: F. van Diggelen, “Improving urban GPS accuracy for your app”, Android Developers Blog.

Then a closing line with a link to the code repository. The current line copies the exemplar's sentence, mentions the exemplar and gives a line count (Part B, items 7, 9 and 12), so **the new build must write its own closing line in new words**, with the repository link.

#### 2.11 Footer

A small blue dot, the product name, and a link to the code repository. The current footer wording follows the exemplar's (Part B, item 7), so the new build should word this link itself.

### 3. Interactions (every control)

| Where | Control | Range / states | Starts at | What it does |
|---|---|---|---|---|
| Top bar | Step links 1–5 | — | none highlighted | Smooth-scroll to the step; current step highlighted while scrolling. |
| Top bar | Theme switch | dark / light | dark, or the visitor's last choice | Switches all page and drawing colours at once; remembered in the browser for next visit. Screen-reader label says what it will switch *to*. |
| Opening | "Start with step 1" | — | — | Scrolls to step 1. |
| Step 1 | "Where the satellite is" slider | 5°–90°, whole degrees | 60° | Moves satellite on arc; restarts message; updates sum. |
| Step 2 | Chips Satellite A/B/C | on/off each | A on, B and C off | Show/hide that satellite's ring; caption and markers follow the count. |
| Step 2 | Drag "you" | inside a central box: 30% of the scene's height either side of centre vertically, same proportion of width horizontally | 1,500 km right, 1,000 km up from centre | Rings follow; still meet at you. Grab within about 24 px of you. |
| Step 3 | "Phone’s clock is" slider | 1–20 ms, whole ms | 10 ms | Sets the error; resets shrink to 0; cancels glide. |
| Step 3 | "Shrink every ring by" slider | 0–8,000 km, 10 km steps | 0 km | Shrinks all measured rings equally; snaps on release within 60 km of answer; cancels glide. |
| Step 3 | Chip "Satellite C" | on/off | on | Off: two satellites, trail of answers, find button disabled. |
| Step 3 | "Let the phone find it" | enabled only with C on | enabled | 1.6 s eased glide of the shrink to the answer. |
| Step 3 | Drag "you" | same box as step 2 | same as step 2 | All rings and the answer move; the right shrink amount does not change. |
| Step 4 | "Spread them out" / "Bunch them together" | — | spread layout | Satellites glide to layout. |
| Step 4 | Drag any satellite | inside 44% of scene height either side of centre (and proportionally across) | spread layout | Cloud, dot, circle and read-out update live; cancels any glide. |
| Step 5 | "Building height" slider | 1–80 m, whole metres | 40 m (right building 32 m) | Changes both buildings; clears trail. |
| Step 5 | "Where you stand" slider | 1–21 m, 0.5 m steps | 6 m | Moves you across the street; clears trail. |
| Step 5 | "Pause the sky" / "Play the sky" | toggle | playing | Freezes/resumes the sky's rotation. |
| Step 5 | "Use a 3D city map" switch | on/off | off | Switches the phone's method (see 5.5); clears trail. |
| Fine print | Disclosure | open/closed | closed | Shows simplifications and sources. |
| Facts | Footnote numbers | — | — | Jump to and highlight the source. |

Dragging works with mouse, pen and touch. While over a draggable drawing the cursor is an open hand, a closed hand while dragging. Touch-dragging inside these drawings must not scroll the page. Nothing else can be dragged; a press that misses a draggable point does nothing.

### 4. Visual design

#### 4.1 Overall feel

A dark "night sky" page by default: deep navy background with a sprinkling of tiny white and lavender stars and two very soft coloured glows (violet top-right, blue on the left). Rounded cards everywhere, generous spacing, one centred column up to about 1,180 px wide. Light mode is a soft lavender-white with white cards and no stars. Colours fade smoothly when the theme changes.

#### 4.2 Colour roles (strict)

| Role | Dark | Light | Used for |
|---|---|---|---|
| Background | very dark navy (#060a1c) | pale lavender (#f2f4fc) | page |
| Drawing background | dark navy (#0c1230) | (#e7eafa) | inside every drawing, read-out boxes |
| Card | navy (#10183a) | white | cards, stage, label outlines in drawings |
| Text | near-white (#eef1ff) | near-black navy (#121834) | |
| Muted | grey-lilac (#98a2c9) | slate (#5a6386) | secondary text, blocked signals, off chips |
| Line | faint pale line (16% opacity) | faint dark line (14%) | borders, dashed arcs, windows |
| **Blue = you** | (#4d8dff) | (#1f66f0) | the blue dot, its pale halo/circle, the phone, current step pill, buttons, links; **plus** straight signals in step 5 (the one exception) |
| **Violet = satellites and signals** | (#a67cff) | (#7646e0) | satellite icons, rings, the moving message, analogy tags, emphasised words |
| **Lime = draggable / going wrong / highlight** | (#d4ff3a) | (#b6e000) for fills, dark olive (#4f6400) for text | grab rings, crossing points and "?" markers, step 3's trail, bounced signals, the arrival ring in step 1, the call-to-action, "Try" badges, opening label, footnotes, bold live-caption words, keyboard focus outline, the "on" switch knob, the step 3 shrink slider thumb |
| Ground / building / street | navy shades | pale greys | step 1 ground, step 5 scenes |

Lime fills always carry dark text (#101400) for contrast. Number tiles use a blue-to-violet gradient with white numbers.

#### 4.3 The flat map of space (steps 2–4)

- Seen from above. The scene's centre is the centre of the drawing. The drawing's full **height** always shows 74,000 km; wider drawings show more space sideways, never less vertically.
- Satellites sit about 20,000 km from you; at this scale they are well inside the drawing.
- Satellite positions (km from centre; right and up are positive):
  - Steps 2 and 4 (spread): A (−8,500, 20,500), B (21,500, 4,500), C (−15,000, −16,500), D (9,000, −20,000). Step 2 uses A–C only.
  - Step 3: A (−14,000, 17,000), B (4,000, 21,000), C (19,000, 10,000).
  - Step 4 bunched: (−6,000, 21,000), (1,500, 22,000), (8,000, 20,000), (−12,000, 18,500).
- You start at (1,500, 1,000) km in steps 2 and 3, and are fixed there (not drawn) in step 4.

#### 4.4 Drawn objects

- **Satellite icon:** a small violet upright rectangle body with a flat rectangular solar panel on each side, about 30 px wide. Its name in small bold text above it, outlined in the card colour so it reads over rings.
- **Blue dot:** like a map app's: a pale blue halo about two and a half times its size, a white rim, a solid blue centre (about 8–9 px radius; 7 px inside the step 3 lens).
- **Person:** a simple stick figure (round head, body, two legs, one arm raised to hold a small blue phone), in the text colour.
- **Rings:** circles about 2.5 px thick. Faint "true" rings are thinner, dashed and half transparent.
- **Grab ring:** lime, dashed, about 2 px thick, 16–22 px radius around anything draggable.
- **All labels in drawings** have a thick outline in the card colour behind the letters, so they stay readable over lines.

#### 4.5 Type

- Display / headings / buttons / chips / labels in drawings: **Space Grotesk** (bold).
- Body text: **Inter**, 17 px, line height 1.6.
- Numbers, stopwatch, slider values, small tags: **JetBrains Mono**.
- Headline scales between about 40 and 72 px with screen width; section titles between about 28 and 40 px.
- *Emphasis* in big-idea sentences is shown upright in violet, not italic.

#### 4.6 Animation behaviour

- The opening orbits and breathing dot run continuously (CSS-style decoration).
- Each step's drawing redraws every frame **only while the step is on or near the screen** (within about 120 px of it). Off-screen steps freeze and cost nothing; they resume where they were.
- Step 1's message speed, step 3's glide, step 4's satellite glide and dot hops, and step 5's sky rotation and twice-a-second answers are all as described above.
- Buttons lift by 1–2 px on hover. Disabled buttons fade to about half.

#### 4.7 Layout by screen width

- **Wide (above ~980 px):** top bar shows names and numbers; opening in two columns; each step has stage (wider, about 60%) and side column; step 5's stage about two-thirds; recap 5 across; facts 3 across. Drawings are 400 px tall (step 1: 320 px; step 5's two drawings: 360 px).
- **Tablet (≤ 980 px):** top bar shows step numbers only; opening stacks, the orbit shrinks to about 280 px; every step becomes one column (stage on top, side column under it); recap 2 across; surprise cards 1 across.
- **Phone (≤ 620 px):** side padding drops to 16 px; brand name hidden, only its dot shown; number cards stack; stage padding shrinks; drawings 320 px tall (step 5's: 280 px, stacked one above the other); step tiles shrink; recap 1 across.

### 5. The GPS logic in plain words

#### 5.1 What the phone is given (inputs)

For each satellite it can hear, the phone (the "receiver") gets exactly two things: **where the satellite is**, and **how long its signal seemed to take**, measured by the phone's own clock. It is never given the visitor's true position. The page knows the true position only to draw you, to draw step 3's faint true rings, and to say how far off the dot is.

The measured time is built, in each step, from: the real travel time (distance ÷ speed of light, 299,792,458 m/s), **plus** the phone's clock error (steps 3 and 5), **plus** random noise (steps 4 and 5), **plus** the extra path of a bounce (step 5).

#### 5.2 What is calculated (the receiver)

The receiver finds the position (and, when asked, the clock error) that best explains all the measured times. It works by guess-and-improve:

1. **Start with a guess.** In steps 2–4, the middle of the satellites being heard; in step 5, the middle of the street at ground level.
2. **Predict.** For the guess, work out how long each signal *would* have taken: distance from the guess to the satellite, plus the guessed clock error (expressed as a distance, i.e. clock error × speed of light).
3. **Compare.** The difference between each measured and predicted value is that satellite's "miss".
4. **Improve.** Work out which small move of the guess (sideways, up/down, and clock) would shrink all the misses together as much as possible (a least-squares step), and make that move.
5. **Repeat** until the move is smaller than a millimetre, or for at most 12 rounds (6 for step 4's 120-speck cloud, for speed).

It refuses and reports "no fix" when there are fewer satellites than unknowns: 2 unknowns (two position directions) without the clock, 3 with the clock. It also refuses if the satellites are arranged so that no unique answer exists.

**Result meaning:** a position (where the blue dot goes) and, if solved for, a clock error (how fast the phone's clock is).

#### 5.3 How the clock-error step works (step 3)

- The phone's clock is fast by the chosen number of milliseconds, so every measured time is too long by that much, and every ring is too big by the same distance (clock error × speed of light ≈ 300 km per millisecond).
- The visitor picks a shrink amount. For that amount, the receiver solves for position only (clock assumed fixed) and finds its best single spot; the page reports whether the rings are still too big (shrink less than the answer) or now too small, and how far the best spot is from you.
- Separately, the receiver solves for position **and** clock with all three satellites. That clock answer, as a distance, is "the right amount". The rings are said to meet when the visitor's shrink is within 1 km of it; then the blue dot is drawn at the receiver's spot, and the caption converts the shrink back into milliseconds.
- "Let the phone find it" glides the shrink to that same right amount, so the animation shows exactly what the receiver found.
- With only two satellites: three unknowns but two clues, so the receiver refuses. The page instead shows, for every shrink amount, where the two rings cross: a trail of equally valid answers.
- With no noise in this step, the meeting point is exactly where you are, and the right amount is independent of where you stand.

#### 5.4 How the pale circle works (step 4)

- Every measured distance gets an independent random error with a typical size of **750 km** (bell-shaped). Real errors are about 1.5 m, so this is about **500,000× larger** (said on screen).
- Here the receiver solves for position and clock with four satellites (the true clock error is zero, but the phone doesn't know that).
- The pale circle's radius is the expected error of the answer, worked out from the geometry alone: from the satellites' directions as seen from the current answer, compute how much 750 km of error in each distance moves the position east–west and north–south, and combine them as the square root of the sum of the two variances (the same way phones size their circle; engineers call the geometry factor "dilution of precision").
- The noise is repeatable: each of the 120 specks always uses the same random numbers, and the blue dot uses a new set each 0.9 s.
- A checked property (from the tests): the actual scatter of many noisy answers matches the circle's radius to within ±15%, and the bunched layout's circle is at least twice the spread layout's.

#### 5.5 How the city works (step 5)

- **Scene:** a 22 m street, seen end on. Across-street position runs from the left wall (0 m) to the right wall (22 m); height is up. The phone is 1.4 m above the ground.
- **Sky:** 16 satellites evenly spaced around a circle in this end-on plane, nudged slightly so they're not perfectly regular (because phones use several satellite systems at once, a real sky has plenty). The whole sky rotates at a rate about 137× faster than a real GPS orbit (on screen: "about 140×"). Satellites lower than 5° above either horizon are ignored (as real phones do).
- **Satellites are so far away** (20,200 km) that their signals arrive as parallel lines at each satellite's elevation angle.
- **Each signal's fate:**
  - **Straight** if the line from the phone towards the satellite passes above the roof on that side.
  - Otherwise **bounced** if it can reach the phone by reflecting once off the glass wall of the opposite building: the reflection point must be below that building's roof, and the incoming line from the satellite to that point must clear the other roof. A bounce makes the path longer by **2 × (distance from the reflecting wall) × cos(elevation)**.
  - Otherwise **blocked** (not heard).
- **Measured time** for each heard signal: true distance + bounce extra + a small random error of about 1.5 m, divided by the speed of light, plus a fixed clock error of 2.5 µs (the phone solves for it, as in step 3).
- **Without the 3D map:** the receiver solves for across-street position, height and clock (3 unknowns) using all heard signals, believing every one was straight. Bounced signals look too far away, so the answer is pushed away from those satellites, often into a building. Needs at least 3 heard signals. Only the across-street position is shown.
- **With the 3D map:** the phone knows the building heights and that it's at hand height. It tries every spot across the street every 0.25 m (from 0.25 m to 21.75 m) and, for each, predicts every heard signal's delay **including any bounce** it would have from there. Because the unknown clock adds the same amount to every signal, it compares only the *differences* between signals (how spread out the misses are around their average). Each signal it heard that would have been **blocked** from that spot adds a large penalty. It keeps the best-scoring spot. It needs at least 2 heard signals. With no noise it lands within a quarter metre of you (tested at several spots); with the small live noise it stays close to you instead of drifting into a building.
- With **1 m buildings** (open sky) nearly every signal is straight and the dot sits on you.

#### 5.6 Simplifications (and where each is said on screen)

| Simplification | Said on screen where |
|---|---|
| Steps 2–4 are flat (2D), so 3 satellites do the job of 4 | Step 2 note; step 3 "unknowns" card; fine print |
| Step 1's arc is a drawing, not to scale (distance and delay are real) | Fine print |
| Step 1's message is slowed down 30× | In the step 1 drawing |
| Step 4's measurement error is ~500,000× real | Step 4 note; fine print |
| No atmosphere delay; orbits are perfect circles known exactly | Fine print (atmosphere); orbits **not** stated on screen (see Open questions) |
| Step 5: flat walls, at most one bounce, perfect city map | Fine print |
| Step 5's sky turns ~140× faster than real | Fine print |
| Satellites in steps 2–4 are placed by hand, not real orbits; step 3's are all "above you" | Partly implied; not stated explicitly |
| Step 5 shows only the across-street position (1D) of the answer | Not stated (the map shows a single row) |
| Step 2's clock is perfect | Not stated on screen |

### 6. Edge cases and behaviour

- **Step 1, slider at 5°:** satellite sits low on the left end of the arc; delay 84.2 ms; value reads "near the horizon". At 90°: directly above; "right overhead". Moving the slider mid-flight restarts the message from the satellite.
- **Step 2, zero satellites on:** only faded satellites and you; caption "Turn on a satellite…". **Two on:** if the rings only touch or don't cross (not possible with true distances, but handled), no "?" markers are drawn. **Dragging to the edge:** you stop at the allowed box; you can't be dragged onto a satellite.
- **Step 3, shrink 0:** rings far too big, caption "too big". **Shrink 8,000 km** (max): rings far too small; some pairs may stop crossing, in which case that pair's lime dot is simply not drawn; a ring never shrinks below zero. **Clock 1 ms** (right amount ≈ 300 km) and **20 ms** (≈ 5,996 km) both fit the slider. **Changing the clock** always puts the shrink back to 0 so the puzzle restarts. **C off during a glide:** the glide continues but the button disables; meeting is impossible without C. **Dragging you** while met: met state stays, because the right amount doesn't depend on where you are.
- **Step 4, satellites dragged on top of each other or in a line:** the circle gets very large (drawn at most 2,000 px radius), the meter is full, caption says bunched; if a unique answer becomes impossible the read-out says "can’t tell" and the dot and circle disappear while specks that can't be solved are skipped.
- **Step 5, buildings at 80 m and you near a wall:** very few signals get through; with fewer than 3 (2 with the map) the caption says "No fix…" and the last dot is shown faded (if there was one). **Before any fix** (e.g. the very first reading fails) no dot is drawn and the caption omits the "faded dot" sentence. **Answer outside the street:** caption adds "inside a building"; the map dot is kept just inside the drawing's edge. **Paused sky:** geometry frozen; answers keep coming with fresh noise, so the dot may still jitter slightly.
- **Window resized or phone rotated:** every drawing re-measures itself every frame, so it always fills its box sharply. Steps 2–4 keep showing 74,000 km top to bottom; drag limits follow the new shape. High-density screens are drawn at up to twice the resolution (capped at 2× for speed).
- **Tab hidden / scrolled away / slow device:** off-screen steps stop drawing. In step 5, the time step per frame is capped at 0.1 s so the sky doesn't leap after a pause. On a slow device animations simply run at a lower frame rate; step 1's timing and step 4's dot hops are based on the clock, not frame count, so they stay correct.
- **No WebGL:** not needed; the product uses only 2D drawing. **No 2D canvas or no JavaScript:** the page's text, headings, analogies and "Try" prompts still read in order; the drawings are blank boxes (the new build should add a short fallback message; see Open questions).
- **Fonts fail to load:** falls back to system sans-serif and monospace; layout still works.
- **Reduced motion preference:** all CSS animations and transitions (opening orbits, breathing dot, hover lifts, colour fades, smooth scrolling) are switched off. The step drawings still animate (they *are* the explanation); see Open questions.
- **Theme switched while animations run:** drawings pick up the new colours on the next frame.
- **Saved theme storage unavailable:** the page should still start in dark mode and the switch should still work for the visit.

### 7. Non-functional requirements

- **Static site, no backend.** Plain HTML, CSS and JavaScript files served by any static web server. No build step, no package installs, no frameworks, no libraries.
- **No location access, no credentials, no accounts, no analytics, no cookies.** The only stored item is the theme choice in the browser's local storage.
- **Network:** the page must load **only its own files**. *Change from today:* the current site fetches fonts from Google Fonts; the new build must ship the three font files itself (their licence allows it) or fall back to system fonts.
- **Performance:** smooth (target 60 frames a second) on a mid-range phone. Only on-screen steps animate. Step 4 re-solves 120 small problems per frame, which must stay cheap (limit rounds as described). Total page weight small (no images besides the icon; fonts are the largest files).
- **Accessibility:**
  - Every drawing has a descriptive accessible label (e.g. step 1: a satellite's timed message travelling down to a person with a phone).
  - Live captions are announced politely and only when their text changes (not every frame).
  - All buttons, chips, sliders, switches, links and the disclosure work by keyboard, show a clear lime focus outline, and announce their on/off state.
  - The theme switch's accessible name says what pressing it will do.
  - Lime text in light mode uses the darker olive so it passes contrast; lime fills carry dark text.
  - Body text at least 17 px, captions about 16.5 px, nothing important below 12 px.
  - Decorative animation is hidden from screen readers.
  - *Known gap:* dragging (you in steps 2–3, satellites in step 4) has no keyboard alternative. See Open questions.
- **Browsers:** current Chrome, Edge, Firefox and Safari on desktop and mobile. Needs ES modules, canvas 2D, pointer events, an "is this on screen" observer and modern CSS colour mixing.
- **Mobile:** touch dragging works and doesn't scroll the page inside draggable drawings; layouts as in 4.7; tap targets comfortably sized.
- **Text rule:** no block of text longer than three sentences anywhere on the page.
- **Honesty rule:** every number, ring, dot, circle and caption is computed live from the model; anything exaggerated or simplified says so on screen.
- **Deployment:** publishable as-is to a static host such as GitHub Pages.
- **Tests:** automatic checks for the receiver and step 5 runnable with no installs (Node's built-in test runner is fine).

### 8. Assets and third-party material

| Item | Version | Source | Licence | Used for |
|---|---|---|---|---|
| Space Grotesk | Google Fonts current release (variable, weights 400–700 used) | Florian Karsten, via Google Fonts | SIL Open Font License 1.1 | Headings, buttons, chips, drawing labels |
| Inter | Google Fonts current release (weights 400–600 used) | Rasmus Andersson, via Google Fonts | SIL Open Font License 1.1 | Body text |
| JetBrains Mono | Google Fonts current release (weights 500–700 used) | JetBrains, via Google Fonts | SIL Open Font License 1.1 | Numbers and tags |
| Browser canvas (2D) | built into browsers | — | — | All drawings |
| Node.js built-in test runner | Node 20 or later | Node.js | MIT | Tests only, not shipped |
| Favicon | — | made by the team | project licence | Tab icon |

**Not used (despite the brief's template):** no 3D library, no WebGL, no Earth texture or any image, no map tiles, no icon library. The current repo does not pin font versions (it asks Google for the latest); the new build should download and record the exact versions it ships.

Facts on the page are taken from the sources listed in 2.10 (GPS.gov pages, Ashby 2003, IS-GPS-200, van Diggelen 2020). The long readme also cites Misra and Enge, *Global Positioning System* (2nd ed., 2006) for the least-squares and dilution-of-precision method.

### 9. Definition of done

- [ ] Page loads from a plain static server with no console errors and **no requests to other sites**.
- [ ] Dark mode by default; switch flips every page and drawing colour; choice remembered after reload; no flash of the wrong theme on load.
- [ ] Top bar highlights the current step while scrolling; progress line tracks scroll; step links scroll correctly under the sticky bar.
- [ ] Opening, number cards, recap, surprise facts, fine print and footer show the copy in section 2.
- [ ] **Step 1:** message travels ~2 s (slowed 30×), stopwatch counts up and turns lime, arrival ring appears, sum line shows 69.6 ms / 20,851 km at 60°; values in the table at 5° and 90°; slider restarts the message; nothing below the read-out jumps.
- [ ] **Step 2:** chips toggle rings; two rings show two "?" markers; three show a blue dot exactly on you; dragging works and is limited; four captions correct.
- [ ] **Step 3:** rings start too big by 2,998 km at 10 ms; shrink slider, snap within 60 km, glide button (1.6 s) all land exactly on the answer; magnifier shows 12× close-up; met caption converts to ms correctly; dragging you doesn't change the answer; C off shows the trail, disables the button with "Needs a third satellite"; clock change resets shrink; "unknowns" card present.
- [ ] **Step 4:** spread ≈ ±763 km, bunched ≈ ±7,346 km; glide between layouts; dragging satellites updates cloud and circle; dot hops about once a second; caption switches at 1,800 km; "can't tell" when impossible.
- [ ] **Step 5:** signals drawn straight/bounced/blocked with correct colours and counts; sky turns and can be paused; dot drifts with tall buildings, sits still at 1 m; map switch pulls the dot back close to you (within 0.25 m in the noise-free test); "No fix" with faded last dot; "inside a building" when outside the street; trail clears on any control change.
- [ ] Every simplification in 5.6 that the current product states on screen is still stated.
- [ ] Off-screen steps stop animating.
- [ ] Works at phone, tablet and desktop widths and on rotate/resize; touch dragging doesn't scroll the page.
- [ ] Every control reachable and operable by keyboard with visible focus; captions announced only on change; drawings labelled.
- [ ] Reduced-motion setting stops decorative animation.
- [ ] No text block over three sentences.
- [ ] Tests pass for: exact position and clock with no noise (4 and 3 satellites); refusal with too few satellites; same answer from different first guesses; receiver reads only positions and times; bunched circle > 2× spread; noisy scatter matches circle within ±15%; bounce extra length formula; map check within 0.25 m at several spots.
- [ ] README, project page and DECISIONS file written fresh (see Build guidelines).

### 10. What we decided and why

| Decision | Why (in an interview) |
|---|---|
| **Flat 2D pictures, not a 3D globe** | A beginner can see rings crossing on a flat picture instantly; in 3D, spheres crossing are hard to read and need rotating. The flat picture also makes the clock argument countable: 2 position unknowns + clock = 3 satellites, and the page then states that the real world adds height, making 4. It also keeps the site tiny and fast with no library. |
| **Simulated satellites, not live orbit data** | Each step needs a layout that makes its point clearly (e.g. spread vs bunched). Live data would need a network service, could fail, and would not change the explanation. |
| **No location access** | The point is that the phone never tells anyone where it is; asking for location would muddy that and raise privacy worries. A dragged "you" shows the idea anywhere in the world. |
| **A real receiver, not faked animations** | Every dot and ring comes from the same guess-and-improve solver real receivers use, given only what a phone has. That makes the page honest and testable, and lets visitors find edge cases themselves. |
| **The visitor shrinks the rings themselves in step 3** | The clock fix is the least intuitive idea; doing it by hand ("all too big by the same amount") makes it physical. The faint true rings give a target, the magnifier shows the near-miss triangle, and the button proves the phone finds the same amount. |
| **Turning off satellite C shows a trail of answers** | It shows *why* the extra satellite is needed instead of just stating it. |
| **"Unknowns" counting card** | Bridges the flat picture (3) to the real world (4) without needing 3D. |
| **Exaggerated wobble (500,000×), slowed message (30×), sped-up sky (~140×)** | Real values are invisible to the eye; each exaggeration is labelled on screen so nothing misleads. |
| **Repeatable noise** | The cloud in step 4 stays stable and comparable as satellites move; tests give the same result every run. |
| **Street seen end on + top-down map** | Shows the cause (bounce) and the effect (dot in a building) side by side, as a phone user experiences it. |
| **The 3D-map toggle** | Real phones (Android, since 2020) do this; it ends the journey on "engineers fixed this", not just "GPS is bad in cities". |
| **One idea, one toy, one analogy per step; three-sentence limit** | The audience is non-technical and busy; every step must be graspable in under a minute. |
| **Dark space theme with a strict 3-colour system** | Space feel; viewers learn quickly that blue = me, violet = satellites, lime = "touch this" or "this is wrong". |
| **Light mode option** | Readability for people who dislike dark pages, and for projectors. |
| **Animate only on screen** | Keeps phones cool and batteries fine with five live simulations on one page. |
| **No build, no libraries** | Anyone can open and read the code; nothing to break or install; easy to host. |
| **Captions only rewrite on change** | Screen readers would otherwise be flooded 60 times a second. |

---

## Build guidelines

1. **Keep the product exactly as described**: same sections, same five steps in the same order, same controls with the same ranges and defaults, same behaviour, same colours, fonts and feel, same on-screen copy (unless Open question 1 decides otherwise).
2. **Do not copy this repo's structure or formatting.** Pick your own simple layout, for example a single site folder at the root of the repository with the page, one stylesheet, and a scripts folder. Do not use a `submission/` folder, a `links.js` loaded from the parent folder, or placeholder-link rewriting. Put the repository address directly in the page or in one small settings file inside the site.
3. **Meaningful names.** Every variable, function and file name says what it is: `satelliteDistanceInKm`, `phoneClockErrorInSeconds`, `drawBlueDot`, `streetScene.js`, never `d1`, `g`, `P`, `$`.
4. **Simple enough for a beginner to explain.** Plain functions, short files, one idea per function. No classes unless they clearly help, no clever one-liners, no deep abstractions, no chained ternaries.
5. **Trilateration maths in one small separate file** (for example `positionSolver.js`), with a plain-words comment before each step: guess, predict, compare, improve, repeat, and how the uncertainty circle is sized. It must take only satellite positions and measured times as input.
6. **Keep drawing separate from maths.** Drawing files may call the solver; the solver never draws or touches the page. Step 5's signal-path and map-check logic should also live apart from its drawing code, so it can be tested.
7. **A short comment at the top of every file** saying what it is for.
8. **Write the README and project page in your own plain words.** Do not reuse this repo's README wording or outline (Part B, item 5). Include: what it is, how to run it, how to run the tests, credits for the fonts and the fact sources, licence.
9. **Keep a `DECISIONS.md`** listing every choice you made that this spec didn't settle (for example font versions, folder names, how keyboard dragging works, fallback text), with one line of reason each.
10. **Ship the fonts with the site** (no outside network calls), and record their versions and licences.
11. **Write captions so they only change the page when the text actually changes.**
12. **Add the tests listed in the Definition of done**, runnable with no installs.
13. **Do not mention the exemplar, this repo's line count, or this repo's history on the page.**

---

## Part D. Checking this spec

**Re-read against the code.** I re-checked each number in this spec against the source: slider ranges and defaults; the 30× slow-down and 1.6 s pause; the orbit radius (26,560 km from the Earth's centre) behind the step 1 table (values computed by running the formula); scene height 74,000 km; satellite positions for each step and layout; drag limits (30% for you, 44% for satellites); snap 60 km; meet 1 km; glide 1.6 s; magnifier 12×; trail sampling 20 km; noise 750 km and 1.5 m; 120 specks, 6 vs 12 rounds; dot hop 0.9 s; circle cap 2,000 px; meter full at 6,000 km; caption threshold 1,800 km; street 22 m; hand 1.4 m; right building 80%; 16 satellites; 5° mask; rotation rate (≈137× real); 2.5 µs clock; 0.25 m map grid and penalty for blocked signals; 3 vs 2 signals needed; answers twice a second; trail of 30; 0.1 s time cap; pixel-density cap 2×; default sizes ±763 km and ±7,346 km (computed by running the code). The nine existing tests pass. Details checked on this pass because they are easy to get wrong: step 1's satellite rises from the **left** horizon; step 4 does not draw "you"; step 5's sliders show no number; step 3 still shows the grey "you" dot when C is off; step 3's clock slider resets the shrink to 0. A second look at the exemplar's page during this check showed the footer and fine-print closing line follow its wording, so I added that to Part B (item 7) and told the builder to reword both.

**No code.** The spec has no code or code snippets. File names appear only in the inventory (Part A) and as naming examples in the guidelines. Formulas are written in words.

**No lifted wording.** All descriptive prose is newly written. The only repo wording is the on-screen copy in quote blocks, included deliberately because the brief asks for the exact on-screen text; all of it is our team's GPS copy and none comes from the exemplar. Short labels ("Try", "Stopwatch", control names) are product copy too. Part B quotes a few short exemplar fragments only to identify them; they are not for reuse.

## Open questions and things I was unsure about

1. **On-screen copy: keep or rewrite?** The brief asks both for the "exact on-screen text" and for "no wording lifted from the repo". I resolved it by quoting the product copy (our own words, not the exemplar's) and writing everything else fresh. If the new build must have new wording too, the builder should rewrite each quoted block with the same meaning, length (≤3 sentences) and tone, and record it in DECISIONS.
2. **3D globe / WebGL / Earth texture.** The brief's template mentions these, but the product has none. Should the new build stay 2D (as specified here) or add a small 3D view? The long readme itself lists "the fourth satellite is only counted, not shown" as a shortcoming and suggests a small 3D view at the end. That would be a product change, not a rebuild.
3. **Fonts from Google.** Today the page fetches fonts from Google Fonts, which breaks the "own files only" requirement. I specified self-hosting. Confirm, or accept system fonts instead.
4. **Keyboard alternative for dragging.** No keyboard way exists today to move "you" (steps 2–3) or the satellites (step 4). Recommend adding one (e.g. arrow keys on a focusable target) but it changes the product slightly.
5. **Reduced motion.** The step drawings keep animating even when the visitor asks for reduced motion. Should step 1's message, step 4's hops and step 5's sky pause or slow down in that case?
6. **No-script / no-canvas fallback.** None today. Suggest a one-line message in each drawing box.
7. **Unreferenced sources.** Sources 1, 2 and 5 are listed but no footnote on the page points to them (the "~31" and "20,200 km" cards, step 4's "a few metres" note and step 5's map toggle could). The 4.9 m figure in source 2 never appears on the page. Add footnotes or keep as is?
8. **Simplifications not stated on screen.** Perfect circular orbits, hand-placed satellites, step 2's perfect clock, and step 5 showing only the across-street position are simplifications without on-screen mention. The house rule says anything simplified must say so; decide whether to add a line to the fine print.
9. **"About 140×" vs 137×.** The rounding is fine but worth knowing if challenged.
10. **Step 4 circle shape.** The cloud becomes a long ellipse when bunched, but the circle stays round (phones do the same). The readme flags this as a shortcoming; kept as is here.
11. **Step 3 "best guess" with C off.** The page still computes a two-satellite best spot internally (used to centre the magnifier). The spec only requires the lens to follow the phone's best guess, or you if there is none.
12. **Deployment and repository address.** The current workflow exists only for the inherited layout. The new build can publish its site folder directly; the repository and live addresses will change and must be filled in.
13. **Licence holder.** I assumed the new repo is also MIT, held by "The Dissectors". Confirm.
14. **Version pinning.** The current repo pins no font versions, so the "version" column in section 8 is only as exact as "current Google Fonts release"; the builder should record the exact files shipped.
