// Step 4: every measurement is a little off, and where the satellites sit decides how far that moves
// the dot. A cloud of 120 answers (each with its own fixed set of errors), the live blue dot that hops
// every 0.9 s, and the pale circle on the ground sized from the satellites' layout.

import { makeGlobeView } from '../globe/globeView.js';
import { makeSpeckCloud, makePaleCircle } from '../globe/globeObjects.js';
import { homeViewFor, colourFromTheme, addOrbitLines, addSatelliteMarkers, addSatelliteGrabTarget } from '../globe/globeHelpers.js';
import { makeCaptionWriter, animateWhileOnScreen, setTextIfChanged, formatWholeNumber, prefersLessMotion, pixelDensity } from '../pageHelpers.js';
import { blendVectors, scaleVector, unitVector, distanceBetween } from '../math/vectors.js';
import { GPS_ORBIT_RADIUS_IN_METRES, EARTH_RADIUS_IN_METRES } from '../math/physics.js';
import { makeRandomNumberGenerator, bellCurveNumber } from '../math/randomNumbers.js';
import {
  makeFixedErrorSets,
  answerForErrors,
  paleCircleRadius,
  NUMBER_OF_SPECKS_IN_CLOUD,
  ROUNDS_PER_SPECK,
  EXAGGERATED_MEASUREMENT_ERROR_IN_METRES,
} from '../math/wobbleModel.js';
import { startingPoint, placeSatellites, WOBBLE_STEP_SPREAD_SKY, WOBBLE_STEP_BUNCHED_SKY } from '../math/sceneLayouts.js';

const SECONDS_BETWEEN_HOPS = 0.9;
const GLIDE_SHARE_PER_FRAME = 0.08;
const GLIDE_ARRIVES_WITHIN_METRES = 5000;
const LOWEST_SATELLITE_IN_DEGREES = 10;
const CAPTION_SWITCHES_AT_METRES = 3_600_000;
const METER_FULL_AT_METRES = 12_000_000;

export function startWobbleStep() {
  const box = document.getElementById('wobble-globe');
  const sizeReadOut = document.getElementById('wobble-size');
  const meterFill = document.getElementById('wobble-meter');
  const writeCaption = makeCaptionWriter(document.getElementById('wobble-caption'));
  const you = startingPoint();
  const spreadLayout = placeSatellites(WOBBLE_STEP_SPREAD_SKY);
  const bunchedLayout = placeSatellites(WOBBLE_STEP_BUNCHED_SKY);
  const names = WOBBLE_STEP_SPREAD_SKY.map((satellite) => satellite.name);

  const cloudErrorSets = makeFixedErrorSets(NUMBER_OF_SPECKS_IN_CLOUD, 4, 404);
  const nextRandomNumber = makeRandomNumberGenerator(909);
  const newLiveErrors = () => [0, 1, 2, 3].map(() => bellCurveNumber(nextRandomNumber) * EXAGGERATED_MEASUREMENT_ERROR_IN_METRES);

  const state = {
    satellites: spreadLayout.map((position) => [...position]),
    glideTo: null,
    liveErrors: newLiveErrors(),
    secondsUntilHop: SECONDS_BETWEEN_HOPS,
  };

  const view = makeGlobeView(box, { home: homeViewFor(you, 40_000, 0.8, 6371), label: 'step 4 globe', fieldOfViewInDegrees: 64 });

  const specks = colourFromTheme('blue', makeSpeckCloud('#000', NUMBER_OF_SPECKS_IN_CLOUD, 6));
  view.scene.add(specks.object);
  const paleCircle = colourFromTheme('blue', makePaleCircle('#000'));
  view.scene.add(paleCircle.object);
  const orbitLines = addOrbitLines(view, state.satellites);
  const satelliteMarkers = addSatelliteMarkers(view, names);
  const blueDot = view.addMarker('blue-dot');

  names.forEach((name, index) => {
    addSatelliteGrabTarget(view, {
      name: `Satellite ${name}`,
      getPoint: () => state.satellites[index],
      setPoint(newPosition) {
        state.satellites[index] = newPosition;
        state.glideTo = null;
      },
      observerPoint: you,
      minimumElevationInDegrees: LOWEST_SATELLITE_IN_DEGREES,
    });
  });

  document.getElementById('wobble-spread').addEventListener('click', () => startGlide(spreadLayout));
  document.getElementById('wobble-bunch').addEventListener('click', () => startGlide(bunchedLayout));
  document.getElementById('wobble-new-measurement').addEventListener('click', () => {
    state.liveErrors = newLiveErrors();
  });

  function startGlide(layout) {
    if (prefersLessMotion()) {
      state.satellites = layout.map((position) => [...position]);
      state.glideTo = null;
    } else {
      state.glideTo = layout;
    }
  }

  // Each frame, every gliding satellite moves a share of the way to its goal, staying on the orbit shell.
  function moveGlidingSatellites() {
    if (state.glideTo === null) {
      return;
    }
    let stillMoving = false;
    state.satellites = state.satellites.map((position, index) => {
      const goal = state.glideTo[index];
      const onShell = scaleVector(unitVector(blendVectors(position, goal, GLIDE_SHARE_PER_FRAME)), GPS_ORBIT_RADIUS_IN_METRES);
      if (distanceBetween(onShell, goal) > GLIDE_ARRIVES_WITHIN_METRES) {
        stillMoving = true;
        return onShell;
      }
      return [...goal];
    });
    if (!stillMoving) {
      state.glideTo = null;
    }
  }

  function drawFrame(secondsSinceLastFrame) {
    moveGlidingSatellites();
    if (!prefersLessMotion()) {
      state.secondsUntilHop -= secondsSinceLastFrame;
      if (state.secondsUntilHop <= 0) {
        state.liveErrors = newLiveErrors();
        state.secondsUntilHop = SECONDS_BETWEEN_HOPS;
      }
    }

    // The cloud: one quick answer per fixed set of errors. Sets that can't be solved are skipped.
    const cloudPoints = [];
    cloudErrorSets.forEach((errors) => {
      const answer = answerForErrors(state.satellites, you, errors, ROUNDS_PER_SPECK);
      if (answer) cloudPoints.push(answer.position);
    });
    specks.setPoints(cloudPoints, pixelDensity());

    const liveAnswer = answerForErrors(state.satellites, you, state.liveErrors);
    const radius = liveAnswer ? paleCircleRadius(state.satellites, liveAnswer.position) : null;
    const canTell = radius !== null;

    blueDot.setVisible(canTell);
    paleCircle.setVisible(canTell);
    if (canTell) {
      blueDot.setPoint(liveAnswer.position);
      paleCircle.place(scaleVector(unitVector(liveAnswer.position), EARTH_RADIUS_IN_METRES), radius);
    }
    setTextIfChanged(sizeReadOut, canTell ? `±${formatWholeNumber(radius / 1000)} km` : 'can’t tell');
    meterFill.style.width = `${canTell ? Math.min(100, (radius / METER_FULL_AT_METRES) * 100) : 100}%`;

    const isBunched = !canTell || radius >= CAPTION_SWITCHES_AT_METRES;
    writeCaption(
      isBunched
        ? 'The satellites are <strong>bunched together</strong>, so their balls cross at shallow angles. The same small errors now slide the dot a long way.'
        : 'The satellites are <strong>spread around you</strong>, so their balls cross at wide angles. Small errors only nudge the dot.',
    );

    state.satellites.forEach((position, index) => {
      // Working out an orbit path takes a moment, so only redo it when the satellite has moved.
      const orbitKey = position.join(',');
      if (orbitLines[index].lastKey !== orbitKey) {
        orbitLines[index].setSatellite(position);
        orbitLines[index].lastKey = orbitKey;
      }
      satelliteMarkers[index].place(position);
    });

    view.render(secondsSinceLastFrame);
  }

  animateWhileOnScreen(box, drawFrame);
}
