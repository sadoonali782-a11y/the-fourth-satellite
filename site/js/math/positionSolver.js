// The phone's brain: turns satellite positions and measured signal times into a position
// (and, when asked, the phone's clock error). This file never draws anything and never touches the page.
//
// The phone is given only two things per satellite: where the satellite is, and how long its signal
// seemed to take by the phone's own clock. It is never told where it really is.

import { SPEED_OF_LIGHT_IN_METRES_PER_SECOND } from './physics.js';
import { distanceBetween, subtractVectors, scaleVector } from './vectors.js';
import { solveLinearEquations, invertMatrix } from './linearAlgebra.js';

const STOP_WHEN_STEP_IS_SMALLER_THAN_METRES = 0.001;

// Finds the position that best explains the measured times.
//   satellitePositions:          list of points in metres, all [x, y] or all [x, y, z]
//   measuredTravelTimesInSeconds: one time per satellite, as measured by the phone's clock
//   firstGuess:                  where to start guessing (same number of directions as the satellites)
//   solveForClock:               true to also find the clock error, false to trust knownClockErrorInSeconds
//   knownClockErrorInSeconds:    used only when solveForClock is false
//   maximumRounds:               how many guess-and-improve rounds to allow
// Returns { position, clockErrorInSeconds, roundsUsed }, or null when there is no single answer.
export function findPosition({
  satellitePositions,
  measuredTravelTimesInSeconds,
  firstGuess,
  solveForClock,
  knownClockErrorInSeconds = 0,
  maximumRounds = 12,
}) {
  const numberOfDirections = firstGuess.length;
  const numberOfUnknowns = numberOfDirections + (solveForClock ? 1 : 0);
  const numberOfSatellites = satellitePositions.length;

  // Each satellite gives one clue. With fewer clues than unknowns there is no single answer.
  if (numberOfSatellites < numberOfUnknowns) {
    return null;
  }

  // Measured times become measured distances ("pseudoranges"): time × speed of light.
  const measuredDistances = measuredTravelTimesInSeconds.map(
    (timeInSeconds) => timeInSeconds * SPEED_OF_LIGHT_IN_METRES_PER_SECOND,
  );

  // Step 1, GUESS: start somewhere. The clock error is written as a distance (error × speed of light).
  let guessedPosition = [...firstGuess];
  let guessedClockErrorInMetres = solveForClock ? 0 : knownClockErrorInSeconds * SPEED_OF_LIGHT_IN_METRES_PER_SECOND;
  let roundsUsed = 0;

  for (let round = 1; round <= maximumRounds; round += 1) {
    roundsUsed = round;
    const misses = [];
    const slopeRows = [];

    for (let index = 0; index < numberOfSatellites; index += 1) {
      // Step 2, PREDICT: how far would this signal have seemed to travel if the guess were right?
      const distanceFromGuess = distanceBetween(guessedPosition, satellitePositions[index]);
      const predictedDistance = distanceFromGuess + guessedClockErrorInMetres;

      // Step 3, COMPARE: the "miss" is measured minus predicted.
      misses.push(measuredDistances[index] - predictedDistance);

      // How the prediction changes if the guess moves a little in each direction (and if the clock changes).
      const directionAwayFromSatellite = scaleVector(
        subtractVectors(guessedPosition, satellitePositions[index]),
        1 / Math.max(distanceFromGuess, 1e-9),
      );
      slopeRows.push(solveForClock ? [...directionAwayFromSatellite, 1] : directionAwayFromSatellite);
    }

    // Step 4, IMPROVE: find the one small move that shrinks all the misses together as much as possible
    // (least squares: it makes the sum of the squared misses as small as it can be).
    const move = bestMoveForMisses(slopeRows, misses);
    if (move === null) {
      return null; // the satellites are arranged so that no single answer exists
    }
    for (let direction = 0; direction < numberOfDirections; direction += 1) {
      guessedPosition[direction] += move[direction];
    }
    if (solveForClock) {
      guessedClockErrorInMetres += move[numberOfDirections];
    }

    // Step 5, REPEAT until the move is tiny.
    const moveSize = Math.sqrt(move.reduce((total, part) => total + part * part, 0));
    if (moveSize < STOP_WHEN_STEP_IS_SMALLER_THAN_METRES) {
      break;
    }
  }

  return {
    position: guessedPosition,
    clockErrorInSeconds: guessedClockErrorInMetres / SPEED_OF_LIGHT_IN_METRES_PER_SECOND,
    roundsUsed,
  };
}

// Least squares: solve (slopesᵀ × slopes) × move = slopesᵀ × misses.
function bestMoveForMisses(slopeRows, misses) {
  const numberOfUnknowns = slopeRows[0].length;
  const leftSide = [];
  const rightSide = [];
  for (let row = 0; row < numberOfUnknowns; row += 1) {
    leftSide.push(new Array(numberOfUnknowns).fill(0));
    rightSide.push(0);
  }
  slopeRows.forEach((slopes, satelliteIndex) => {
    for (let row = 0; row < numberOfUnknowns; row += 1) {
      rightSide[row] += slopes[row] * misses[satelliteIndex];
      for (let column = 0; column < numberOfUnknowns; column += 1) {
        leftSide[row][column] += slopes[row] * slopes[column];
      }
    }
  });
  return solveLinearEquations(leftSide, rightSide);
}

// How big the pale circle should be.
// Each measured distance has a random error of typical size measurementErrorInMetres. How much that moves
// the answer depends only on the directions to the satellites (engineers call this "dilution of precision").
// groundDirections are the flat directions the map shows (for example east and north at the answer).
// We add up how much the answer is expected to wobble along each of them, and take the square root.
// Returns the radius in metres, or null when the layout gives no single answer.
export function sizeUncertaintyCircle({ satellitePositions, answerPosition, measurementErrorInMetres, groundDirections }) {
  const numberOfDirections = answerPosition.length;
  const slopeRows = satellitePositions.map((satellitePosition) => {
    const distance = Math.max(distanceBetween(answerPosition, satellitePosition), 1e-9);
    const direction = scaleVector(subtractVectors(answerPosition, satellitePosition), 1 / distance);
    return [...direction, 1];
  });
  if (slopeRows.length < numberOfDirections + 1) {
    return null;
  }

  const numberOfUnknowns = numberOfDirections + 1;
  const normalMatrix = [];
  for (let row = 0; row < numberOfUnknowns; row += 1) {
    normalMatrix.push(new Array(numberOfUnknowns).fill(0));
  }
  slopeRows.forEach((slopes) => {
    for (let row = 0; row < numberOfUnknowns; row += 1) {
      for (let column = 0; column < numberOfUnknowns; column += 1) {
        normalMatrix[row][column] += slopes[row] * slopes[column];
      }
    }
  });

  const spreadMatrix = invertMatrix(normalMatrix);
  if (spreadMatrix === null) {
    return null;
  }

  let totalVariance = 0;
  groundDirections.forEach((groundDirection) => {
    for (let row = 0; row < numberOfDirections; row += 1) {
      for (let column = 0; column < numberOfDirections; column += 1) {
        totalVariance += groundDirection[row] * spreadMatrix[row][column] * groundDirection[column];
      }
    }
  });
  if (!(totalVariance >= 0)) {
    return null;
  }
  return measurementErrorInMetres * Math.sqrt(totalVariance);
}
