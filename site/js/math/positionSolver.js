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

  // Each satellite gives one clue. With fewer clues than unknowns there is no single answer.
  if (satellitePositions.length < numberOfUnknowns) {
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

    // Step 2, PREDICT: how far would each signal have seemed to travel if the guess were right?
    // Step 3, COMPARE: the "miss" is measured minus predicted.
    const misses = satellitePositions.map((satellitePosition, index) => {
      const predictedDistance = distanceBetween(guessedPosition, satellitePosition) + guessedClockErrorInMetres;
      return measuredDistances[index] - predictedDistance;
    });

    // Step 4, IMPROVE: find the one small move that shrinks all the misses together as much as possible
    // (least squares: it makes the sum of the squared misses as small as it can be).
    const move = bestMoveForMisses(slopeRowsAt(guessedPosition, satellitePositions, solveForClock), misses);
    if (move === null) {
      return null; // the satellites are arranged so that no single answer exists
    }
    guessedPosition = guessedPosition.map((part, direction) => part + move[direction]);
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

// The "slopes": how each satellite's predicted distance changes if the position moves a little.
// Moving one metre straight away from a satellite adds one metre, so each row is simply the direction
// away from that satellite. When the clock is being solved too, each row ends with a 1, because one
// extra metre of clock error adds one metre to every prediction.
function slopeRowsAt(position, satellitePositions, includeClock) {
  return satellitePositions.map((satellitePosition) => {
    const distance = Math.max(distanceBetween(position, satellitePosition), 1e-9);
    const awayFromSatellite = scaleVector(subtractVectors(position, satellitePosition), 1 / distance);
    return includeClock ? [...awayFromSatellite, 1] : awayFromSatellite;
  });
}

// slopesᵀ × slopes. Both the solver and the pale circle are built on this one matrix.
function normalMatrix(slopeRows) {
  const size = slopeRows[0].length;
  const matrix = [];
  for (let row = 0; row < size; row += 1) {
    matrix.push(new Array(size).fill(0));
    for (let column = 0; column < size; column += 1) {
      slopeRows.forEach((slopes) => {
        matrix[row][column] += slopes[row] * slopes[column];
      });
    }
  }
  return matrix;
}

// Least squares: solve (slopesᵀ × slopes) × move = slopesᵀ × misses.
function bestMoveForMisses(slopeRows, misses) {
  const size = slopeRows[0].length;
  const rightSide = [];
  for (let row = 0; row < size; row += 1) {
    rightSide.push(slopeRows.reduce((total, slopes, satelliteIndex) => total + slopes[row] * misses[satelliteIndex], 0));
  }
  return solveLinearEquations(normalMatrix(slopeRows), rightSide);
}

// How big the pale circle should be.
// Each measured distance has a random error of typical size measurementErrorInMetres. How much that moves
// the answer depends only on the directions to the satellites (engineers call this "dilution of precision"):
// it uses the very same slopes the solver used, at the answer, with the clock included.
// groundDirections are the flat directions the map shows (for example east and north at the answer).
// We add up how much the answer is expected to wobble along each of them, and take the square root.
// Returns the radius in metres, or null when the layout gives no single answer.
export function sizeUncertaintyCircle({ satellitePositions, answerPosition, measurementErrorInMetres, groundDirections }) {
  const numberOfDirections = answerPosition.length;
  if (satellitePositions.length < numberOfDirections + 1) {
    return null;
  }

  const spreadMatrix = invertMatrix(normalMatrix(slopeRowsAt(answerPosition, satellitePositions, true)));
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
