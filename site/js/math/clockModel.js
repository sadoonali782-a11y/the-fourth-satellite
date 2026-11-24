// Step 3's maths: a phone whose clock is fast, spheres that come out too big, and the shrink that fixes them.
// Pure maths, shared by the step's drawing and by the tests.

import { SPEED_OF_LIGHT_IN_METRES_PER_SECOND } from './physics.js';
import { distanceBetween } from './vectors.js';
import { findPosition } from './positionSolver.js';
import { whereThreeSpheresMeet, closestPointTo, heightAboveGround } from './earthGeometry.js';

export const SHRINK_THAT_COUNTS_AS_MEETING_IN_METRES = 1000;
export const TRAIL_SPACING_IN_METRES = 20_000;
export const LARGEST_SHRINK_IN_METRES = 8_000_000;

// What the phone measures: the true travel time, plus its clock error (every time is late by the same amount).
export function measureWithFastClock(satellitePositions, truePosition, clockErrorInSeconds) {
  return satellitePositions.map(
    (satellitePosition) => distanceBetween(truePosition, satellitePosition) / SPEED_OF_LIGHT_IN_METRES_PER_SECOND + clockErrorInSeconds,
  );
}

// The sphere sizes the phone would draw: measured time × speed of light, minus the shrink. Never below zero.
export function sphereRadiiAfterShrink(measuredTravelTimesInSeconds, shrinkInMetres) {
  return measuredTravelTimesInSeconds.map((time) => Math.max(0, time * SPEED_OF_LIGHT_IN_METRES_PER_SECOND - shrinkInMetres));
}

// The phone solves for position AND clock. The clock answer, written as a distance, is "the right shrink".
export function findRightShrink(satellitePositions, measuredTravelTimesInSeconds) {
  const answer = findPosition({
    satellitePositions,
    measuredTravelTimesInSeconds,
    firstGuess: [0, 0, 0],
    solveForClock: true,
  });
  if (answer === null) {
    return null;
  }
  return { shrinkInMetres: answer.clockErrorInSeconds * SPEED_OF_LIGHT_IN_METRES_PER_SECOND, position: answer.position };
}

// For a chosen shrink, the phone trusts that shrink as its clock error and finds its best single spot.
export function bestGuessForShrink(satellitePositions, measuredTravelTimesInSeconds, shrinkInMetres) {
  const answer = findPosition({
    satellitePositions,
    measuredTravelTimesInSeconds,
    firstGuess: [0, 0, 0],
    solveForClock: false,
    knownClockErrorInSeconds: shrinkInMetres / SPEED_OF_LIGHT_IN_METRES_PER_SECOND,
  });
  return answer ? answer.position : null;
}

// Every trio of spheres meets in up to two points; keep the one nearest the target. Returns one entry per trio:
// { trio: [i, j, k], point } where point is null if that trio's spheres don't meet.
export function trioMeetingPoints(satellitePositions, radii, target) {
  const results = [];
  const count = satellitePositions.length;
  for (let first = 0; first < count; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      for (let third = second + 1; third < count; third += 1) {
        const points = whereThreeSpheresMeet(
          [satellitePositions[first], satellitePositions[second], satellitePositions[third]],
          [radii[first], radii[second], radii[third]],
        );
        results.push({ trio: [first, second, third], point: points.length ? closestPointTo(points, target) : null });
      }
    }
  }
  return results;
}

// With only three satellites, every shrink gives a place where the spheres meet: a trail of equally good answers.
// For each shrink we keep the meeting point nearer the Earth's surface.
export function trailOfAnswers(threeSatellitePositions, threeMeasuredTimes) {
  const trail = [];
  for (let shrink = 0; shrink <= LARGEST_SHRINK_IN_METRES; shrink += TRAIL_SPACING_IN_METRES) {
    const radii = sphereRadiiAfterShrink(threeMeasuredTimes, shrink);
    const points = whereThreeSpheresMeet(threeSatellitePositions, radii);
    if (points.length === 0) {
      continue;
    }
    const nearerTheGround =
      Math.abs(heightAboveGround(points[0])) < Math.abs(heightAboveGround(points[1])) ? points[0] : points[1];
    trail.push({ shrinkInMetres: shrink, point: nearerTheGround });
  }
  return trail;
}
