// Step 4's numbers: noisy measurements, the cloud of answers and the size of the pale circle.
// Pure maths, shared by the step's drawing and by the tests.

import { SPEED_OF_LIGHT_IN_METRES_PER_SECOND } from './physics.js';
import { distanceBetween } from './vectors.js';
import { findPosition, sizeUncertaintyCircle } from './positionSolver.js';
import { localDirectionsAt } from './earthGeometry.js';
import { makeRandomNumberGenerator, bellCurveNumber } from './randomNumbers.js';

// Real measurement errors are about 1.5 m. We use 1,500 km, a million times bigger, so you can see it.
export const EXAGGERATED_MEASUREMENT_ERROR_IN_METRES = 1_500_000;
export const NUMBER_OF_SPECKS_IN_CLOUD = 120;
export const ROUNDS_PER_SPECK = 6;

// A fixed list of random errors (one per satellite) for each speck. They never change,
// so the cloud only moves when the satellites move.
export function makeFixedErrorSets(numberOfSets, numberOfSatellites, seed) {
  const nextRandomNumber = makeRandomNumberGenerator(seed);
  const errorSets = [];
  for (let set = 0; set < numberOfSets; set += 1) {
    const errors = [];
    for (let satellite = 0; satellite < numberOfSatellites; satellite += 1) {
      errors.push(bellCurveNumber(nextRandomNumber) * EXAGGERATED_MEASUREMENT_ERROR_IN_METRES);
    }
    errorSets.push(errors);
  }
  return errorSets;
}

// What the phone would measure: the true travel time plus the given errors (written as distances).
export function measureWithErrors(satellitePositions, truePosition, errorsInMetres) {
  return satellitePositions.map(
    (satellitePosition, index) =>
      (distanceBetween(truePosition, satellitePosition) + errorsInMetres[index]) / SPEED_OF_LIGHT_IN_METRES_PER_SECOND,
  );
}

// The phone's answer for one set of errors. It solves for position and clock, starting from the Earth's centre.
export function answerForErrors(satellitePositions, truePosition, errorsInMetres, maximumRounds = 12) {
  return findPosition({
    satellitePositions,
    measuredTravelTimesInSeconds: measureWithErrors(satellitePositions, truePosition, errorsInMetres),
    firstGuess: [0, 0, 0],
    solveForClock: true,
    maximumRounds,
  });
}

// The pale circle's radius at the given answer: east–west and north–south wobble only (what a map shows).
export function paleCircleRadius(satellitePositions, answerPosition) {
  const { east, north } = localDirectionsAt(answerPosition);
  return sizeUncertaintyCircle({
    satellitePositions,
    answerPosition,
    measurementErrorInMetres: EXAGGERATED_MEASUREMENT_ERROR_IN_METRES,
    groundDirections: [east, north],
  });
}
