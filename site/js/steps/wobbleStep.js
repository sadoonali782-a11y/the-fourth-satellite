// Step 4: every measurement is a little off, and where the satellites sit decides how far that moves
// the dot. A cloud of 120 answers (each with its own fixed set of errors), the live blue dot that hops
// every 0.9 s, and the pale circle on the ground sized from the satellites' layout.

import { makeGlobeView } from '../globe/globeView.js';
import { makeScreenLine, makeSpeckCloud, makePaleCircle, orbitPathPoints } from '../globe/globeObjects.js';
import { pixelDensity } from '../globe/globeRenderer.js';
import { SATELLITE_ICON_HTML, homeViewFor, dragSatelliteTo, nudgeSatellite, describeSatellite } from '../globe/globeHelpers.js';
import { themeColours, whenThemeChanges } from '../theme.js';
import { makeCaptionWriter, animateWhileOnScreen, setTextIfChanged, formatWholeNumber, prefersLessMotion } from '../pageHelpers.js';
import { blendVectors, scaleVector, unitVector } from '../math/vectors.js';
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
  let colours = themeColours();

  const specks = makeSpeckCloud(colours.blue, NUMBER_OF_SPECKS_IN_CLOUD, 6);
  view.scene.add(specks.object);
  const paleCircle = makePaleCircle(colours.blue);
  view.scene.add(paleCircle.object);
  const orbitLines = state.satellites.map(() => {
    const line = makeScreenLine(colours.violet, 1, { dashed: true, dashSizeInKm: 900, opacity: 0.35 });
    view.scene.add(line.object);
    return line;
  });

  const satelliteMarkers = state.satellites.map(() => view.addMarker('satellite-marker', SATELLITE_ICON_HTML));
  const satelliteLabels = state.satellites.map((position, index) => {
    const label = view.addMarker('globe-label');
    label.element.textContent = names[index];
    return label;
  });
  const blueDot = view.addMarker('blue-dot');

  state.satellites.forEach((position, index) => {
    view.addGrabTarget({
      name: `Satellite ${names[index]}`,
      getPointInMetres: () => state.satellites[index],
      onDragTo(screenX, screenY) {
        const moved = dragSatelliteTo(view, screenX, screenY, you, LOWEST_SATELLITE_IN_DEGREES);
        if (moved) {
          state.satellites[index] = moved;
          state.glideTo = null;
        }
      },
      onArrowKey(stepsRight, stepsUp, isBigStep) {
        state.satellites[index] = nudgeSatellite(state.satellites[index], you, stepsRight, stepsUp, isBigStep, LOWEST_SATELLITE_IN_DEGREES);
        state.glideTo = null;
      },
      describe: () => describeSatellite(state.satellites[index], you),
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

  whenThemeChanges((newColours) => {
    colours = newColours;
    specks.setColour(colours.blue);
    paleCircle.setColour(colours.blue);
    orbitLines.forEach((line) => line.setColour(colours.violet));
  });

  function moveGlidingSatellites() {
    if (state.glideTo === null) {
      return;
    }
    let stillMoving = false;
    state.satellites = state.satellites.map((position, index) => {
      const goal = state.glideTo[index];
      const blended = blendVectors(position, goal, GLIDE_SHARE_PER_FRAME);
      const onShell = scaleVector(unitVector(blended), GPS_ORBIT_RADIUS_IN_METRES);
      if (Math.hypot(onShell[0] - goal[0], onShell[1] - goal[1], onShell[2] - goal[2]) > 5000) {
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

    if (liveAnswer && radius !== null) {
      blueDot.setVisible(true);
      blueDot.setPoint(liveAnswer.position);
      paleCircle.setVisible(true);
      paleCircle.place(scaleVector(unitVector(liveAnswer.position), EARTH_RADIUS_IN_METRES), radius);
      setTextIfChanged(sizeReadOut, `±${formatWholeNumber(radius / 1000)} km`);
      meterFill.style.width = `${Math.min(100, (radius / METER_FULL_AT_METRES) * 100)}%`;
      if (radius < CAPTION_SWITCHES_AT_METRES) {
        writeCaption('The satellites are <strong>spread around you</strong>, so their balls cross at wide angles. Small errors only nudge the dot.');
      } else {
        writeCaption('The satellites are <strong>bunched together</strong>, so their balls cross at shallow angles. The same small errors now slide the dot a long way.');
      }
    } else {
      blueDot.setVisible(false);
      paleCircle.setVisible(false);
      setTextIfChanged(sizeReadOut, 'can’t tell');
      meterFill.style.width = '100%';
      writeCaption('The satellites are <strong>bunched together</strong>, so their balls cross at shallow angles. The same small errors now slide the dot a long way.');
    }

    state.satellites.forEach((position, index) => {
      const orbitKey = position.join(',');
      if (orbitLines[index].lastKey !== orbitKey) {
        orbitLines[index].setPoints(orbitPathPoints(position));
        orbitLines[index].lastKey = orbitKey;
      }
      satelliteMarkers[index].setPoint(position);
      satelliteLabels[index].setPoint(position, -5, -36);
    });

    view.render(secondsSinceLastFrame);
  }

  animateWhileOnScreen(box, drawFrame);
}
