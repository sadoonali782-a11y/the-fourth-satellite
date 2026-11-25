// Step 2: one distance is a giant ball round a satellite. Two balls meet in a circle; three meet at just
// two points, one of which is far from the ground, so the phone throws it away. The clock here is perfect.

import { makeGlobeView } from '../globe/globeView.js';
import { makeDistanceBall, makeScreenLine, circlePoints } from '../globe/globeObjects.js';
import { homeViewFor, colourFromTheme, addOrbitLines, addSatelliteMarkers, addYouGrabTarget } from '../globe/globeHelpers.js';
import { makeCaptionWriter, makeToggleButton, animateWhileOnScreen, formatKilometres } from '../pageHelpers.js';
import { distanceBetween } from '../math/vectors.js';
import { distanceToTravelTime } from '../math/physics.js';
import { whereTwoSpheresMeet, whereThreeSpheresMeet, heightAboveGround, closestPointTo } from '../math/earthGeometry.js';
import { findPosition } from '../math/positionSolver.js';
import { startingPoint, placeSatellites, CIRCLES_STEP_SKY } from '../math/sceneLayouts.js';

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

  // 3D objects
  const balls = satellitePositions.map(() => colourFromTheme('violet', makeDistanceBall('#000')));
  balls.forEach((ball) => view.scene.add(ball.object));
  addOrbitLines(view, satellitePositions);
  const meetingCircle = colourFromTheme('limeFill', makeScreenLine('#000', 3));
  view.scene.add(meetingCircle.object);

  // Markers over the picture
  const satellites = addSatelliteMarkers(view, satelliteNames, [-14, -30]);
  const youDot = view.addMarker('you-dot');
  const blueDot = view.addMarker('blue-dot');
  const otherPointMarker = view.addMarker('question-mark', '?');
  const otherPointLabel = view.addMarker('globe-label lime-label');

  addYouGrabTarget(view, state, homePoint);

  document.querySelectorAll('#step-spheres .chip[data-satellite]').forEach((chip) => {
    const index = Number(chip.dataset.satellite);
    makeToggleButton(chip, (isOn) => {
      state.isListening[index] = isOn;
    });
  });

  function drawFrame(secondsSinceLastFrame) {
    const distances = satellitePositions.map((position) => distanceBetween(state.you, position));
    const listening = satelliteNames.map((name, index) => index).filter((index) => state.isListening[index]);

    satellitePositions.forEach((position, index) => {
      const isOn = state.isListening[index];
      balls[index].object.visible = isOn;
      if (isOn) balls[index].place(position, distances[index]);
      satellites[index].place(position, !isOn);
      satellites[index].label.element.textContent = isOn ? `${satelliteNames[index]} · ${formatKilometres(distances[index])}` : satelliteNames[index];
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
      const circle = whereTwoSpheresMeet(satellitePositions[first], distances[first], satellitePositions[second], distances[second]);
      if (circle) {
        meetingCircle.setPoints(circlePoints(circle.centre, circle.radius, circle.axis, 240));
      }
      writeCaption('Two satellites: the balls meet in a <strong>circle</strong> (lime). You’re somewhere on it.');
    } else {
      // The phone does the work: it is given only satellite positions and travel times.
      const answer = findPosition({
        satellitePositions,
        measuredTravelTimesInSeconds: distances.map(distanceToTravelTime),
        firstGuess: [0, 0, 0],
        solveForClock: false,
      });
      // The three balls meet at two points; the "other" one is whichever the phone did not pick.
      const bothPoints = whereThreeSpheresMeet(satellitePositions, distances);
      const otherPoint = answer && bothPoints.length === 2 ? bothPoints.find((point) => point !== closestPointTo(bothPoints, answer.position)) : null;
      const isOutInSpace = otherPoint === null || heightAboveGround(otherPoint) > 0;
      if (otherPoint) {
        otherPointMarker.setVisible(true);
        otherPointMarker.setPoint(otherPoint);
        otherPointLabel.setVisible(true);
        otherPointLabel.element.textContent = isOutInSpace ? 'out in space' : 'inside the Earth';
        otherPointLabel.setPoint(otherPoint, 16, -8);
      }
      if (answer) {
        blueDot.setVisible(true);
        blueDot.setPoint(answer.position);
        youDot.setVisible(false);
      }
      const whereTheOtherIs = isOutInSpace ? 'far out in space' : 'deep inside the Earth';
      writeCaption(`Three satellites: the balls meet at just <strong>two points</strong>. One is ${whereTheOtherIs} (the lime ?), so the phone throws it away. The other is <strong>your blue dot</strong>.`);
    }

    view.render(secondsSinceLastFrame);
  }

  animateWhileOnScreen(box, drawFrame);
}
