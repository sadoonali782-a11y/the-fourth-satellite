// Step 3: the phone's clock is fast, so every measured ball is too big by the same amount.
// The visitor shrinks all four balls together until they meet. With only three satellites,
// every shrink gives a meeting point (a trail of equally good answers), so the phone needs a fourth.

import { makeGlobeView } from '../globe/globeView.js';
import { makeDistanceBall, makeScreenLine } from '../globe/globeObjects.js';
import { homeViewFor, colourFromTheme, addOrbitLines, addSatelliteMarkers, addYouGrabTarget } from '../globe/globeHelpers.js';
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
import { distanceBetween, vectorLength } from '../math/vectors.js';
import { distanceToTravelTime } from '../math/physics.js';
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
    glide: null, // { fromMetres, secondsDone }
    trailFor: null, // remembers which situation the trail was worked out for
    trail: [],
  };

  const view = makeGlobeView(box, { home: homeViewFor(homePoint), label: 'step 3 globe' });

  const measuredBalls = satellitePositions.map(() => colourFromTheme('violet', makeDistanceBall('#000')));
  const trueBalls = satellitePositions.map(() => colourFromTheme('violet', makeDistanceBall('#000', { striped: true, strength: 0.7 })));
  [...measuredBalls, ...trueBalls].forEach((ball) => view.scene.add(ball.object));
  addOrbitLines(view, satellitePositions);
  const trailLine = colourFromTheme('limeFill', makeScreenLine('#000', 3, { dashed: true, dashSizeInKm: 60 }));
  view.scene.add(trailLine.object);

  const satellites = addSatelliteMarkers(view, satelliteNames);
  const limePoints = satellitePositions.map(() => view.addMarker('lime-point'));
  const youDot = view.addMarker('you-dot');
  const blueDot = view.addMarker('blue-dot');

  addYouGrabTarget(view, state, homePoint);

  // ---------- Controls ----------

  // Sets the shrink and shows it on the slider and its read-out.
  function setShrink(shrinkInMetres) {
    state.shrinkInMetres = shrinkInMetres;
    shrinkSlider.value = String(Math.round(shrinkInMetres / 1000));
    setTextIfChanged(shrinkValue, `${formatWholeNumber(shrinkInMetres / 1000)} km`);
  }

  clockSlider.addEventListener('input', () => {
    state.clockErrorInSeconds = Number(clockSlider.value) / 1000;
    setTextIfChanged(clockValue, `${clockSlider.value} ms fast`);
    state.glide = null;
    setShrink(0);
  });

  shrinkSlider.addEventListener('input', () => {
    state.glide = null;
    setShrink(Number(shrinkSlider.value) * 1000);
  });

  // When the slider is let go close to the answer, jump exactly onto it (10 km steps can't land on it).
  shrinkSlider.addEventListener('change', () => {
    const right = currentRightShrink();
    if (right !== null && Math.abs(state.shrinkInMetres - right.shrinkInMetres) < SNAP_DISTANCE_IN_METRES) {
      setShrink(right.shrinkInMetres);
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
    // Fly down close to the answer, looking at it from a little to the south.
    view.flyTo(homeViewFor(right.position, CLOSE_UP_DISTANCE_IN_KM, 0.8, vectorLength(right.position) / 1000));
    if (prefersLessMotion()) {
      setShrink(right.shrinkInMetres);
    } else {
      state.glide = { fromMetres: state.shrinkInMetres, secondsDone: 0 };
    }
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

  // Eases the shrink towards the right answer after "Let the phone find it".
  // If the answer disappears on the way (satellite D switched off), the glide just stops.
  function stepGlide(secondsSinceLastFrame, right) {
    if (state.glide === null) {
      return;
    }
    if (right === null) {
      state.glide = null;
      return;
    }
    state.glide.secondsDone += secondsSinceLastFrame;
    const fraction = easeInAndOut(Math.min(1, state.glide.secondsDone / GLIDE_SECONDS));
    setShrink(state.glide.fromMetres + (right.shrinkInMetres - state.glide.fromMetres) * fraction);
    if (fraction >= 1) {
      state.glide = null;
    }
  }

  // ---------- Each frame ----------

  function drawFrame(secondsSinceLastFrame) {
    const times = measuredTimes();
    const right = currentRightShrink();
    stepGlide(secondsSinceLastFrame, right);

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
      satellites[index].place(position, !isOn);
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
      const point = trioPoints[index]?.point;
      marker.setVisible(Boolean(point));
      if (point) marker.setPoint(point);
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
      const milliseconds = formatWholeNumber(distanceToTravelTime(state.shrinkInMetres) * 1000);
      writeCaption(`All four balls meet at a shrink of <strong>${shrinkInKm} km</strong>, right where you are. That amount <strong>is</strong> the clock error: ${shrinkInKm} km ÷ 300,000 km a second = <strong>${milliseconds} ms fast</strong>.`);
    } else {
      const tooBig = right !== null && state.shrinkInMetres < right.shrinkInMetres;
      const missDistance = formatDistance(distanceBetween(bestGuess, state.you));
      const firstPart = tooBig ? 'The balls are still <strong>too big</strong>: shrink them more.' : 'The balls are now <strong>too small</strong>: shrink them less.';
      writeCaption(`${firstPart} The four lime points don’t meet yet, and the phone’s best guess is <strong>${missDistance}</strong> from you.`);
    }

    view.render(secondsSinceLastFrame);
  }

  setShrink(0);
  animateWhileOnScreen(box, drawFrame);
}
