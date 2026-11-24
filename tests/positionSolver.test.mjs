// Checks on the phone's position solver and the step 3 and 4 maths. Run: node --test tests/

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SPEED_OF_LIGHT_IN_METRES_PER_SECOND } from '../site/js/math/physics.js';
import { distanceBetween, subtractVectors, dotProduct } from '../site/js/math/vectors.js';
import { findPosition } from '../site/js/math/positionSolver.js';
import { latitudeLongitudeToPoint, localDirectionsAt, whereThreeSpheresMeet, heightAboveGround } from '../site/js/math/earthGeometry.js';
import {
  startingPoint,
  placeSatellites,
  CIRCLES_STEP_SKY,
  CLOCK_STEP_SKY,
  WOBBLE_STEP_SPREAD_SKY,
  WOBBLE_STEP_BUNCHED_SKY,
} from '../site/js/math/sceneLayouts.js';
import { measureWithFastClock, findRightShrink } from '../site/js/math/clockModel.js';
import { paleCircleRadius, makeFixedErrorSets, answerForErrors } from '../site/js/math/wobbleModel.js';
import { distanceToSatelliteAtElevation, messageDelayAtElevation } from '../site/js/math/timingModel.js';

function travelTimes(satellites, truePosition, clockErrorInSeconds) {
  return satellites.map((satellite) => distanceBetween(truePosition, satellite) / SPEED_OF_LIGHT_IN_METRES_PER_SECOND + clockErrorInSeconds);
}

test('finds exact position and clock with no noise, 4 satellites in 3D', () => {
  const you = startingPoint();
  const satellites = placeSatellites(CLOCK_STEP_SKY);
  const answer = findPosition({
    satellitePositions: satellites,
    measuredTravelTimesInSeconds: travelTimes(satellites, you, 0.01),
    firstGuess: [0, 0, 0],
    solveForClock: true,
  });
  assert.ok(distanceBetween(answer.position, you) < 0.01);
  assert.ok(Math.abs(answer.clockErrorInSeconds - 0.01) < 1e-12);
});

test('finds exact position and clock with no noise, 3 satellites in a flat 2D picture', () => {
  const you = [3, 1.4];
  const satellites = [[-1e7, 2e7], [1e6, 2.2e7], [1.5e7, 1.6e7]];
  const answer = findPosition({
    satellitePositions: satellites,
    measuredTravelTimesInSeconds: travelTimes(satellites, you, 2.5e-6),
    firstGuess: [11, 0],
    solveForClock: true,
  });
  assert.ok(distanceBetween(answer.position, you) < 0.01);
});

test('with a perfect clock, 3 satellites in 3D give two meeting points and one is you', () => {
  const you = startingPoint();
  const satellites = placeSatellites(CIRCLES_STEP_SKY);
  const distances = satellites.map((satellite) => distanceBetween(you, satellite));
  const points = whereThreeSpheresMeet(satellites, distances);
  assert.equal(points.length, 2);
  const distancesFromYou = points.map((point) => distanceBetween(point, you)).sort((a, b) => a - b);
  assert.ok(distancesFromYou[0] < 1);
  const other = points.find((point) => distanceBetween(point, you) > 1);
  assert.ok(Math.abs(heightAboveGround(other)) > 1_000_000, 'the other point is far from the ground');

  const answer = findPosition({
    satellitePositions: satellites,
    measuredTravelTimesInSeconds: travelTimes(satellites, you, 0),
    firstGuess: [0, 0, 0],
    solveForClock: false,
  });
  assert.ok(distanceBetween(answer.position, you) < 0.01, 'starting from the Earth\'s centre lands on you');
});

test('refuses when there are fewer satellites than unknowns', () => {
  const you = startingPoint();
  const satellites = placeSatellites(CLOCK_STEP_SKY).slice(0, 3);
  const answer = findPosition({
    satellitePositions: satellites,
    measuredTravelTimesInSeconds: travelTimes(satellites, you, 0.01),
    firstGuess: [0, 0, 0],
    solveForClock: true,
  });
  assert.equal(answer, null);
  assert.equal(
    findPosition({ satellitePositions: [[0, 2e7]], measuredTravelTimesInSeconds: [0.07], firstGuess: [11, 0], solveForClock: false }),
    null,
  );
});

test('gives the same answer from different first guesses', () => {
  const you = startingPoint();
  const satellites = placeSatellites(CLOCK_STEP_SKY);
  const times = travelTimes(satellites, you, 0.004);
  const guesses = [[0, 0, 0], latitudeLongitudeToPoint(-20, -60), latitudeLongitudeToPoint(45, 10)];
  guesses.forEach((firstGuess) => {
    const answer = findPosition({ satellitePositions: satellites, measuredTravelTimesInSeconds: times, firstGuess, solveForClock: true });
    assert.ok(distanceBetween(answer.position, you) < 0.01);
  });
});

test('reads only satellite positions and measured times (and its own settings)', () => {
  const you = startingPoint();
  const satellites = placeSatellites(CLOCK_STEP_SKY);
  const keysRead = new Set();
  const input = new Proxy(
    {
      satellitePositions: satellites,
      measuredTravelTimesInSeconds: travelTimes(satellites, you, 0.002),
      firstGuess: [0, 0, 0],
      solveForClock: true,
      truePosition: you,
    },
    {
      get(target, key) {
        keysRead.add(key);
        return target[key];
      },
    },
  );
  findPosition(input);
  assert.ok(!keysRead.has('truePosition'));
});

test('step 3: the right shrink equals clock error × speed of light, wherever you stand', () => {
  const satellites = placeSatellites(CLOCK_STEP_SKY);
  const places = [startingPoint(), latitudeLongitudeToPoint(25, 20), latitudeLongitudeToPoint(36, 40)];
  places.forEach((you) => {
    const right = findRightShrink(satellites, measureWithFastClock(satellites, you, 0.01));
    assert.ok(Math.abs(right.shrinkInMetres - 0.01 * SPEED_OF_LIGHT_IN_METRES_PER_SECOND) < 1);
    assert.ok(distanceBetween(right.position, you) < 0.01);
  });
});

test('step 4: bunched satellites give a pale circle at least twice the spread one', () => {
  const you = startingPoint();
  const spread = paleCircleRadius(placeSatellites(WOBBLE_STEP_SPREAD_SKY), you);
  const bunched = paleCircleRadius(placeSatellites(WOBBLE_STEP_BUNCHED_SKY), you);
  assert.ok(bunched > 2 * spread, `bunched ${bunched} vs spread ${spread}`);
});

test('step 4: the scatter of many noisy answers matches the pale circle within 15%', () => {
  const you = startingPoint();
  const satellites = placeSatellites(WOBBLE_STEP_SPREAD_SKY);
  const radius = paleCircleRadius(satellites, you);
  const { east, north } = localDirectionsAt(you);
  let total = 0;
  let count = 0;
  makeFixedErrorSets(3000, 4, 11).forEach((errors) => {
    const answer = answerForErrors(satellites, you, errors);
    const offset = subtractVectors(answer.position, you);
    total += dotProduct(offset, east) ** 2 + dotProduct(offset, north) ** 2;
    count += 1;
  });
  const scatter = Math.sqrt(total / count);
  assert.ok(Math.abs(scatter / radius - 1) < 0.15, `scatter ${scatter} vs circle ${radius}`);
});

test('step 1: distances and delays match a real 20,200 km orbit', () => {
  assert.equal(Math.round(distanceToSatelliteAtElevation(90) / 1000), 20189);
  assert.equal(Math.round(distanceToSatelliteAtElevation(60) / 1000), 20851);
  assert.equal(Math.round(messageDelayAtElevation(60) * 10000) / 10, 69.6);
  assert.equal(Math.round(messageDelayAtElevation(5) * 10000) / 10, 84.2);
});
