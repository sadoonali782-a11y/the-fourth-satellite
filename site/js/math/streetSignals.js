// Step 5's maths: a street seen end on, which signals get through, and how the phone finds itself
// (fooled by bounced signals, because it assumes every signal came straight).
// Pure maths, shared by the step's drawing and by the tests. No drawing here.
//
// The street is a flat slice: "across" runs from the left wall (0 m) to the right wall (22 m), "up" is height.
// Satellite directions are angles measured from the right-hand horizon: 0° is low on the right,
// 90° is straight overhead, 180° is low on the left.

import {
  SPEED_OF_LIGHT_IN_METRES_PER_SECOND,
  GPS_HEIGHT_ABOVE_GROUND_IN_METRES,
  GPS_ORBIT_PERIOD_IN_SECONDS,
  DEGREES_TO_RADIANS,
} from './physics.js';
import { distanceBetween } from './vectors.js';
import { findPosition } from './positionSolver.js';
import { makeRandomNumberGenerator, bellCurveNumber } from './randomNumbers.js';

export const STREET_WIDTH_IN_METRES = 22;
export const PHONE_HEIGHT_IN_METRES = 1.4;
export const RIGHT_BUILDING_SHARE_OF_LEFT = 0.8;
export const LOWEST_SATELLITE_ANGLE_IN_DEGREES = 5;
export const NUMBER_OF_SATELLITES_IN_SKY = 16;
export const SMALL_MEASUREMENT_ERROR_IN_METRES = 1.5;
export const PHONE_CLOCK_ERROR_IN_SECONDS = 2.5e-6;

// The real sky turns once every 11 h 58 min. Ours turns about 137 times faster so you can watch it.
export const SKY_SPEED_UP = 137;
export const SKY_TURN_RATE_IN_DEGREES_PER_SECOND = (360 / GPS_ORBIT_PERIOD_IN_SECONDS) * SKY_SPEED_UP;

// 16 satellites spaced evenly round the sky, each nudged a little so the pattern isn't perfectly regular.
export function makeSkyStartingAngles(seed = 5) {
  const nextRandomNumber = makeRandomNumberGenerator(seed);
  const spacing = 360 / NUMBER_OF_SATELLITES_IN_SKY;
  const angles = [];
  for (let index = 0; index < NUMBER_OF_SATELLITES_IN_SKY; index += 1) {
    const nudge = (nextRandomNumber() - 0.5) * spacing * 0.6;
    angles.push(index * spacing + nudge);
  }
  return angles;
}

export function skyAnglesAfter(startingAngles, secondsOfTurning) {
  return startingAngles.map((angle) => (((angle + secondsOfTurning * SKY_TURN_RATE_IN_DEGREES_PER_SECOND) % 360) + 360) % 360);
}

// Only satellites more than 5° above either horizon are used, as real phones do.
export function isHighEnoughToUse(angleInDegrees) {
  return angleInDegrees > LOWEST_SATELLITE_ANGLE_IN_DEGREES && angleInDegrees < 180 - LOWEST_SATELLITE_ANGLE_IN_DEGREES;
}

export function buildingHeights(leftBuildingHeightInMetres) {
  return { leftHeight: leftBuildingHeightInMetres, rightHeight: leftBuildingHeightInMetres * RIGHT_BUILDING_SHARE_OF_LEFT };
}

// The extra distance a signal travels when it bounces once off a wall before reaching the phone.
export function bounceExtraDistance(distanceFromReflectingWallInMetres, elevationInDegrees) {
  return 2 * distanceFromReflectingWallInMetres * Math.cos(elevationInDegrees * DEGREES_TO_RADIANS);
}

// What happens to one satellite's signal on its way to a phone at (acrossInMetres, heightInMetres).
// Satellites are so far away that their signals arrive as parallel lines.
// Returns { fate: 'straight' | 'bounced' | 'blocked', extraDistanceInMetres, reflectionPoint, blockingCorner }.
export function traceSignal({ angleInDegrees, acrossInMetres, heightInMetres, leftHeight, rightHeight }) {
  const angle = angleInDegrees * DEGREES_TO_RADIANS;
  const comesFromTheRight = Math.cos(angle) > 0;
  const elevationInDegrees = comesFromTheRight ? angleInDegrees : 180 - angleInDegrees;
  const slope = Math.tan(elevationInDegrees * DEGREES_TO_RADIANS); // metres up per metre across

  const nearWallAcross = comesFromTheRight ? STREET_WIDTH_IN_METRES : 0;
  const nearRoofHeight = comesFromTheRight ? rightHeight : leftHeight;
  const farWallAcross = comesFromTheRight ? 0 : STREET_WIDTH_IN_METRES;
  const farRoofHeight = comesFromTheRight ? leftHeight : rightHeight;

  // Straight: the line from the phone towards the satellite passes above the roof on that side.
  const distanceToNearWall = Math.abs(nearWallAcross - acrossInMetres);
  const heightAtNearWall = heightInMetres + distanceToNearWall * slope;
  if (heightAtNearWall >= nearRoofHeight) {
    return { fate: 'straight', extraDistanceInMetres: 0, reflectionPoint: null, blockingCorner: null };
  }

  // Bounced: the signal comes over the near roof, hits the far building's glass wall, and reflects to the phone.
  const distanceToFarWall = Math.abs(farWallAcross - acrossInMetres);
  const reflectionHeight = heightInMetres + distanceToFarWall * slope;
  const incomingHeightAtNearWall = reflectionHeight + STREET_WIDTH_IN_METRES * slope;
  if (reflectionHeight < farRoofHeight && incomingHeightAtNearWall >= nearRoofHeight) {
    return {
      fate: 'bounced',
      extraDistanceInMetres: bounceExtraDistance(distanceToFarWall, elevationInDegrees),
      reflectionPoint: [farWallAcross, reflectionHeight],
      blockingCorner: null,
    };
  }

  // Blocked: the near roof is in the way.
  return { fate: 'blocked', extraDistanceInMetres: 0, reflectionPoint: null, blockingCorner: [nearWallAcross, nearRoofHeight] };
}

// Where a satellite is in this slice: 20,200 km away from the middle of the street, in its direction.
export function satellitePositionInStreet(angleInDegrees) {
  const angle = angleInDegrees * DEGREES_TO_RADIANS;
  return [
    STREET_WIDTH_IN_METRES / 2 + GPS_HEIGHT_ABOVE_GROUND_IN_METRES * Math.cos(angle),
    GPS_HEIGHT_ABOVE_GROUND_IN_METRES * Math.sin(angle),
  ];
}

// Traces every usable satellite to the phone and measures the heard ones.
// Returns a list of { angleInDegrees, fate, extraDistanceInMetres, reflectionPoint, blockingCorner,
//                     satellitePosition, measuredTravelTimeInSeconds (null if blocked) }.
export function measureStreetSignals({ skyAngles, standingAcrossInMetres, leftBuildingHeightInMetres, nextRandomNumber = null }) {
  const { leftHeight, rightHeight } = buildingHeights(leftBuildingHeightInMetres);
  const phonePosition = [standingAcrossInMetres, PHONE_HEIGHT_IN_METRES];
  const signals = [];
  skyAngles.forEach((angleInDegrees) => {
    if (!isHighEnoughToUse(angleInDegrees)) {
      return;
    }
    const path = traceSignal({
      angleInDegrees,
      acrossInMetres: standingAcrossInMetres,
      heightInMetres: PHONE_HEIGHT_IN_METRES,
      leftHeight,
      rightHeight,
    });
    const satellitePosition = satellitePositionInStreet(angleInDegrees);
    let measuredTravelTimeInSeconds = null;
    if (path.fate !== 'blocked') {
      const noise = nextRandomNumber ? bellCurveNumber(nextRandomNumber) * SMALL_MEASUREMENT_ERROR_IN_METRES : 0;
      const seemingDistance = distanceBetween(phonePosition, satellitePosition) + path.extraDistanceInMetres + noise;
      measuredTravelTimeInSeconds = seemingDistance / SPEED_OF_LIGHT_IN_METRES_PER_SECOND + PHONE_CLOCK_ERROR_IN_SECONDS;
    }
    signals.push({ angleInDegrees, ...path, satellitePosition, measuredTravelTimeInSeconds });
  });
  return signals;
}

export function heardSignals(signals) {
  return signals.filter((signal) => signal.measuredTravelTimeInSeconds !== null);
}

// The phone believes every signal came straight, and solves for
// across-street position, height and clock (3 unknowns). It needs at least 3 heard signals.
// Returns { acrossInMetres } or null.
export function findStreetPosition(signals) {
  const heard = heardSignals(signals);
  const answer = findPosition({
    satellitePositions: heard.map((signal) => signal.satellitePosition),
    measuredTravelTimesInSeconds: heard.map((signal) => signal.measuredTravelTimeInSeconds),
    firstGuess: [STREET_WIDTH_IN_METRES / 2, 0],
    solveForClock: true,
  });
  return answer ? { acrossInMetres: answer.position[0] } : null;
}

export function isInsideTheStreet(acrossInMetres) {
  return acrossInMetres >= 0 && acrossInMetres <= STREET_WIDTH_IN_METRES;
}
