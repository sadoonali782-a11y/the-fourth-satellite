// Step 3: the phone's clock is fast, so every measured ball is too big by the same amount.
// The visitor shrinks all four balls together until they meet. With only three satellites,
// every shrink gives a meeting point (a trail of equally good answers), so the phone needs a fourth.

import { makeGlobeView } from '../globe/globeView.js';
import { makeDistanceBall, makeScreenLine, orbitPathPoints } from '../globe/globeObjects.js';
import { SATELLITE_ICON_HTML, homeViewFor, dragYouTo, nudgeYou, describeYou } from '../globe/globeHelpers.js';
import { themeColours, whenThemeChanges } from '../theme.js';
import {
  makeCaptionWriter,
  makeToggleButton,
  animateWhileOnScreen,
  setTextIfChanged,
  formatWholeNumber,
  formatDistance,
  easeInAndOut,
  prefersLessMotion,
} from '../pageHelpers.js';
import { distanceBetween } from '../math/vectors.js';
import { SPEED_OF_LIGHT_IN_METRES_PER_SECOND } from '../math/physics.js';
import { localDirectionsAt } from '../math/earthGeometry.js';
import {
  measureWithFastClock,
  sphereRadiiAfterShrink,
  findRightShrink,
  bestGuessForShrink,
  trioMeetingPoints,
  trailOfAnswers,
  SHRINK_THAT_COUNTS_AS_MEETING_IN_METRES,
} from '../math/clockModel.js';
import { startingPoint, placeSatellites, CLOCK_STEP_SKY } from '../math/sceneLayouts.js';

const FURTHEST_YOU_CAN_WANDER_IN_METRES = 2_500_000;
const SNAP_DISTANCE_IN_METRES = 60_000;
const GLIDE_SECONDS = 1.6;
const CLOSE_UP_DISTANCE_IN_KM = 2600;

export function startClockStep() {
  const box = document.getElementById('clock-globe');
  const clockSlider = document.getElementById('clock-error');
  const clockValue = document.getElementById('clock-error-value');
  const shrinkSlider = document.getElementById('clock-shrink');
  const shrinkValue = document.getElementById('clock-shrink-value');
  const findButton = document.getElementById('clock-find');
  const writeCaption = makeCaptionWriter(document.getElementById('clock-caption'));

  const homePoint = startingPoint();
  const satellitePositions = placeSatellites(CLOCK_STEP_SKY);
  const satelliteNames = CLOCK_STEP_SKY.map((satellite) => satellite.name);

  const state = {
    you: homePoint,
    clockErrorInSeconds: Number(clockSlider.value) / 1000,
    shrinkInMetres: 0,
    satelliteDIsOn: true,
    glide: null, // { fromMetres, toMetres, secondsDone }
    trailFor: null, // remembers which situation the trail was worked out for
    trail: [],
  };

  const view = makeGlobeView(box, { home: homeViewFor(homePoint), label: 'step 3 globe' });
  let colours = themeColours();

  const measuredBalls = satellitePositions.map(() => makeDistanceBall(colours.violet));
  const trueBalls = satellitePositions.map(() => makeDistanceBall(colours.violet, { striped: true, strength: 0.7 }));
  [...measuredBalls, ...trueBalls].forEach((ball) => view.scene.add(ball.object));
  const orbitLines = satellitePositions.map((position) => {
    const line = makeScreenLine(colours.violet, 1, { dashed: true, dashSizeInKm: 900, opacity: 0.35 });
    line.setPoints(orbitPathPoints(position));
    view.scene.add(line.object);
    return line;
  });
  const trailLine = makeScreenLine(colours.limeFill, 3, { dashed: true, dashSizeInKm: 60 });
  view.scene.add(trailLine.object);

  const satelliteMarkers = satellitePositions.map(() => view.addMarker('satellite-marker', SATELLITE_ICON_HTML));
  const satelliteLabels = satellitePositions.map((position, index) => {
    const label = view.addMarker('globe-label');
    label.element.textContent = satelliteNames[index];
    return label;
  });
  const limePoints = [0, 1, 2, 3].map(() => view.addMarker('lime-point'));
  const youDot = view.addMarker('you-dot');
  const blueDot = view.addMarker('blue-dot');

  view.addGrabTarget({
    name: 'You',
    getPointInMetres: () => state.you,
    onDragTo(screenX, screenY) {
      const moved = dragYouTo(view, screenX, screenY, homePoint, FURTHEST_YOU_CAN_WANDER_IN_METRES);
      if (moved) state.you = moved;
    },
    onArrowKey(stepsRight, stepsUp, isBigStep) {
      state.you = nudgeYou(state.you, stepsRight, stepsUp, isBigStep, homePoint, FURTHEST_YOU_CAN_WANDER_IN_METRES);
    },
    describe: () => describeYou(state.you),
  });

  // ---------- Controls ----------

  function showShrink() {
    shrinkSlider.value = String(Math.round(state.shrinkInMetres / 1000));
    setTextIfChanged(shrinkValue, `${formatWholeNumber(state.shrinkInMetres / 1000)} km`);
  }

  clockSlider.addEventListener('input', () => {
    state.clockErrorInSeconds = Number(clockSlider.value) / 1000;
    setTextIfChanged(clockValue, `${clockSlider.value} ms fast`);
    state.shrinkInMetres = 0;
    state.glide = null;
    showShrink();
  });

  shrinkSlider.addEventListener('input', () => {
    state.glide = null;
    state.shrinkInMetres = Number(shrinkSlider.value) * 1000;
    setTextIfChanged(shrinkValue, `${formatWholeNumber(state.shrinkInMetres / 1000)} km`);
  });

  // When the slider is let go close to the answer, jump exactly onto it (10 km steps can't land on it).
  shrinkSlider.addEventListener('change', () => {
    const right = currentRightShrink();
    if (right !== null && Math.abs(state.shrinkInMetres - right.shrinkInMetres) < SNAP_DISTANCE_IN_METRES) {
      state.shrinkInMetres = right.shrinkInMetres;
      setTextIfChanged(shrinkValue, `${formatWholeNumber(state.shrinkInMetres / 1000)} km`);
    }
  });

  makeToggleButton(document.getElementById('clock-satellite-d'), (isOn) => {
    state.satelliteDIsOn = isOn;
  });

  findButton.addEventListener('click', () => {
    const right = currentRightShrink();
    if (right === null) {
      return;
    }
    flyDownTo(right.position);
    if (prefersLessMotion()) {
      state.shrinkInMetres = right.shrinkInMetres;
      showShrink();
      setTextIfChanged(shrinkValue, `${formatWholeNumber(state.shrinkInMetres / 1000)} km`);
    } else {
      state.glide = { fromMetres: state.shrinkInMetres, secondsDone: 0 };
    }
  });

  function flyDownTo(pointInMetres) {
    const { up, north } = localDirectionsAt(pointInMetres);
    const towardsCamera = [0, 1, 2].map((index) => up[index] * 0.8 - north[index] * 0.6);
    view.flyTo({ target: pointInMetres.map((part) => part / 1000), towardsCamera, up, distanceInKm: CLOSE_UP_DISTANCE_IN_KM });
  }

  whenThemeChanges((newColours) => {
    colours = newColours;
    [...measuredBalls, ...trueBalls].forEach((ball) => ball.setColour(colours.violet));
    orbitLines.forEach((line) => line.setColour(colours.violet));
    trailLine.setColour(colours.limeFill);
  });

  // ---------- The maths for this moment ----------

  function activeIndexes() {
    return state.satelliteDIsOn ? [0, 1, 2, 3] : [0, 1, 2];
  }

  function measuredTimes() {
    return measureWithFastClock(satellitePositions, state.you, state.clockErrorInSeconds);
  }

  function currentRightShrink() {
    if (!state.satelliteDIsOn) {
      return null;
    }
    return findRightShrink(satellitePositions, measuredTimes());
  }

  function trailForNow(times) {
    const key = `${state.you.join(',')}|${state.clockErrorInSeconds}`;
    if (state.trailFor !== key) {
      state.trailFor = key;
      state.trail = trailOfAnswers(satellitePositions.slice(0, 3), times.slice(0, 3)).map((entry) => entry.point);
    }
    return state.trail;
  }

  // ---------- Each frame ----------

  function drawFrame(secondsSinceLastFrame) {
    const times = measuredTimes();
    const right = currentRightShrink();

    if (state.glide) {
      if (right === null) {
        state.glide.secondsDone += secondsSinceLastFrame; // keeps going, but can't meet without D
      } else {
        state.glide.secondsDone += secondsSinceLastFrame;
        const fraction = easeInAndOut(Math.min(1, state.glide.secondsDone / GLIDE_SECONDS));
        state.shrinkInMetres = state.glide.fromMetres + (right.shrinkInMetres - state.glide.fromMetres) * fraction;
        if (fraction >= 1) {
          state.shrinkInMetres = right.shrinkInMetres;
          state.glide = null;
        }
        showShrink();
        setTextIfChanged(shrinkValue, `${formatWholeNumber(state.shrinkInMetres / 1000)} km`);
      }
      if (state.glide && state.glide.secondsDone > GLIDE_SECONDS) {
        state.glide = null;
      }
    }

    findButton.disabled = !state.satelliteDIsOn;
    setTextIfChanged(findButton, state.satelliteDIsOn ? 'Let the phone find it' : 'Needs a fourth satellite');

    const indexes = activeIndexes();
    const radii = sphereRadiiAfterShrink(times, state.shrinkInMetres);
    satellitePositions.forEach((position, index) => {
      const isOn = indexes.includes(index);
      measuredBalls[index].object.visible = isOn && radii[index] > 0;
      measuredBalls[index].place(position, radii[index]);
      trueBalls[index].object.visible = isOn;
      trueBalls[index].place(position, distanceBetween(state.you, position));
      satelliteMarkers[index].setPoint(position);
      satelliteMarkers[index].element.classList.toggle('is-faded', !isOn);
      satelliteLabels[index].setPoint(position, -5, -30);
      satelliteLabels[index].element.classList.toggle('is-faded', !isOn);
    });

    const activePositions = indexes.map((index) => satellitePositions[index]);
    const activeTimes = indexes.map((index) => times[index]);
    const bestGuess = bestGuessForShrink(activePositions, activeTimes, state.shrinkInMetres) || state.you;
    const isMet = right !== null && Math.abs(state.shrinkInMetres - right.shrinkInMetres) < SHRINK_THAT_COUNTS_AS_MEETING_IN_METRES;

    youDot.setPoint(state.you);
    youDot.setVisible(!isMet);
    blueDot.setVisible(isMet);
    if (isMet) blueDot.setPoint(right.position);

    // The four trio meeting points (lime), only with all four satellites and only while they don't meet.
    const trioPoints = state.satelliteDIsOn && !isMet ? trioMeetingPoints(activePositions, radii, bestGuess) : [];
    limePoints.forEach((marker, index) => {
      const entry = trioPoints[index];
      marker.setVisible(Boolean(entry && entry.point));
      if (entry && entry.point) marker.setPoint(entry.point);
    });

    trailLine.object.visible = !state.satelliteDIsOn;
    if (!state.satelliteDIsOn) {
      trailLine.setPoints(trailForNow(times));
    }

    // Caption
    if (!state.satelliteDIsOn) {
      writeCaption('With only three satellites, <strong>every</strong> shrink amount gives a place where the balls meet. That’s the dotted trail. The phone can’t choose, so it needs a fourth satellite.');
    } else if (isMet) {
      const shrinkInKm = formatWholeNumber(state.shrinkInMetres / 1000);
      const milliseconds = formatWholeNumber((state.shrinkInMetres / SPEED_OF_LIGHT_IN_METRES_PER_SECOND) * 1000);
      writeCaption(`All four balls meet at a shrink of <strong>${shrinkInKm} km</strong>, right where you are. That amount <strong>is</strong> the clock error: ${shrinkInKm} km ÷ 300,000 km a second = <strong>${milliseconds} ms fast</strong>.`);
    } else {
      const tooBig = right !== null && state.shrinkInMetres < right.shrinkInMetres;
      const missDistance = formatDistance(distanceBetween(bestGuess, state.you));
      const firstPart = tooBig ? 'The balls are still <strong>too big</strong>: shrink them more.' : 'The balls are now <strong>too small</strong>: shrink them less.';
      writeCaption(`${firstPart} The four lime points don’t meet yet, and the phone’s best guess is <strong>${missDistance}</strong> from you.`);
    }

    view.render(secondsSinceLastFrame);
  }

  showShrink();
  animateWhileOnScreen(box, drawFrame);
}
