// Step 2: one distance is a giant ball round a satellite. Two balls meet in a circle; three meet at just
// two points, one of which is far from the ground, so the phone throws it away. The clock here is perfect.

import { makeGlobeView } from '../globe/globeView.js';
import { makeDistanceBall, makeScreenLine, circlePoints, orbitPathPoints } from '../globe/globeObjects.js';
import { SATELLITE_ICON_HTML, homeViewFor, dragYouTo, nudgeYou, describeYou, kilometresLabel } from '../globe/globeHelpers.js';
import { themeColours, whenThemeChanges } from '../theme.js';
import { makeCaptionWriter, makeToggleButton, animateWhileOnScreen } from '../pageHelpers.js';
import { distanceBetween } from '../math/vectors.js';
import { SPEED_OF_LIGHT_IN_METRES_PER_SECOND } from '../math/physics.js';
import { whereTwoSpheresMeet, whereThreeSpheresMeet, heightAboveGround } from '../math/earthGeometry.js';
import { findPosition } from '../math/positionSolver.js';
import { startingPoint, placeSatellites, CIRCLES_STEP_SKY } from '../math/sceneLayouts.js';

const FURTHEST_YOU_CAN_WANDER_IN_METRES = 2_500_000;

export function startSpheresStep() {
  const box = document.getElementById('spheres-globe');
  const writeCaption = makeCaptionWriter(document.getElementById('spheres-caption'));
  const homePoint = startingPoint();
  const satellitePositions = placeSatellites(CIRCLES_STEP_SKY);
  const satelliteNames = CIRCLES_STEP_SKY.map((satellite) => satellite.name);

  const state = {
    you: homePoint,
    isListening: [true, false, false],
  };

  const view = makeGlobeView(box, { home: homeViewFor(homePoint), label: 'step 2 globe' });
  let colours = themeColours();

  // 3D objects
  const balls = satellitePositions.map(() => makeDistanceBall(colours.violet));
  balls.forEach((ball) => view.scene.add(ball.object));
  const orbitLines = satellitePositions.map((position) => {
    const line = makeScreenLine(colours.violet, 1, { dashed: true, dashSizeInKm: 900, opacity: 0.35 });
    line.setPoints(orbitPathPoints(position));
    view.scene.add(line.object);
    return line;
  });
  const meetingCircle = makeScreenLine(colours.limeFill, 3);
  view.scene.add(meetingCircle.object);

  // Markers over the picture
  const satelliteMarkers = satellitePositions.map(() => view.addMarker('satellite-marker', SATELLITE_ICON_HTML));
  const satelliteLabels = satellitePositions.map(() => view.addMarker('globe-label'));
  const youDot = view.addMarker('you-dot');
  const blueDot = view.addMarker('blue-dot');
  const otherPointMarker = view.addMarker('question-mark', '?');
  const otherPointLabel = view.addMarker('globe-label lime-label');

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

  document.querySelectorAll('#step-spheres .chip[data-satellite]').forEach((chip) => {
    const index = Number(chip.dataset.satellite);
    makeToggleButton(chip, (isOn) => {
      state.isListening[index] = isOn;
    });
  });

  whenThemeChanges((newColours) => {
    colours = newColours;
    balls.forEach((ball) => ball.setColour(colours.violet));
    orbitLines.forEach((line) => line.setColour(colours.violet));
    meetingCircle.setColour(colours.limeFill);
  });

  function drawFrame(secondsSinceLastFrame) {
    const listening = satellitePositions.map((position, index) => ({ position, index })).filter((satellite) => state.isListening[satellite.index]);
    const distances = satellitePositions.map((position) => distanceBetween(state.you, position));

    satellitePositions.forEach((position, index) => {
      const isOn = state.isListening[index];
      balls[index].object.visible = isOn;
      if (isOn) balls[index].place(position, distances[index]);
      satelliteMarkers[index].setPoint(position);
      satelliteMarkers[index].element.classList.toggle('is-faded', !isOn);
      satelliteLabels[index].setPoint(position, -14, -30);
      satelliteLabels[index].element.textContent = isOn ? `${satelliteNames[index]} · ${kilometresLabel(distances[index])}` : satelliteNames[index];
      satelliteLabels[index].element.classList.toggle('is-faded', !isOn);
    });

    meetingCircle.object.visible = false;
    otherPointMarker.setVisible(false);
    otherPointLabel.setVisible(false);
    blueDot.setVisible(false);
    youDot.setVisible(true);
    youDot.setPoint(state.you);

    if (listening.length === 0) {
      writeCaption('Turn on a satellite to hear it.');
    } else if (listening.length === 1) {
      writeCaption('One satellite: you are <strong>somewhere on that ball</strong>. That’s all it can tell you.');
    } else if (listening.length === 2) {
      const [first, second] = listening;
      const circle = whereTwoSpheresMeet(first.position, distances[first.index], second.position, distances[second.index]);
      if (circle) {
        meetingCircle.setPoints(circlePoints(circle.centre, circle.radius, circle.axis, 240));
      }
      writeCaption('Two satellites: the balls meet in a <strong>circle</strong> (lime). You’re somewhere on it.');
    } else {
      // The phone does the work: it is given only satellite positions and travel times.
      const answer = findPosition({
        satellitePositions,
        measuredTravelTimesInSeconds: distances.map((distance) => distance / SPEED_OF_LIGHT_IN_METRES_PER_SECOND),
        firstGuess: [0, 0, 0],
        solveForClock: false,
      });
      const bothPoints = whereThreeSpheresMeet(satellitePositions, distances);
      const otherPoint = bothPoints.length === 2 && answer ? (distanceBetween(bothPoints[0], answer.position) > distanceBetween(bothPoints[1], answer.position) ? bothPoints[0] : bothPoints[1]) : null;
      let whereTheOtherIs = 'far out in space';
      if (otherPoint) {
        otherPointMarker.setVisible(true);
        otherPointMarker.setPoint(otherPoint);
        otherPointLabel.setVisible(true);
        whereTheOtherIs = heightAboveGround(otherPoint) > 0 ? 'far out in space' : 'deep inside the Earth';
        otherPointLabel.element.textContent = whereTheOtherIs === 'far out in space' ? 'out in space' : 'inside the Earth';
        otherPointLabel.setPoint(otherPoint, 16, -8);
      }
      if (answer) {
        blueDot.setVisible(true);
        blueDot.setPoint(answer.position);
        youDot.setVisible(false);
      }
      writeCaption(`Three satellites: the balls meet at just <strong>two points</strong>. One is ${whereTheOtherIs} (the lime ?), so the phone throws it away. The other is <strong>your blue dot</strong>.`);
    }

    view.render(secondsSinceLastFrame);
  }

  animateWhileOnScreen(box, drawFrame);
}
