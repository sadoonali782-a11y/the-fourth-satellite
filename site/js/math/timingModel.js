// Step 1's maths: how far away a satellite is when you see it at a given angle above the horizon,
// and how long its message takes to reach you. Uses a real orbit 20,200 km up on a round Earth.

import { EARTH_RADIUS_IN_METRES, GPS_ORBIT_RADIUS_IN_METRES, distanceToTravelTime } from './physics.js';

const DEGREES_TO_RADIANS = Math.PI / 180;

export const MESSAGE_SLOW_DOWN = 30;
export const RESULT_STAYS_FOR_SECONDS = 1.6;

// Straight-line distance from you (on the ground) to a satellite seen at this elevation.
export function distanceToSatelliteAtElevation(elevationInDegrees) {
  const elevation = elevationInDegrees * DEGREES_TO_RADIANS;
  const sideways = EARTH_RADIUS_IN_METRES * Math.cos(elevation);
  return Math.sqrt(GPS_ORBIT_RADIUS_IN_METRES ** 2 - sideways ** 2) - EARTH_RADIUS_IN_METRES * Math.sin(elevation);
}

export function messageDelayAtElevation(elevationInDegrees) {
  return distanceToTravelTime(distanceToSatelliteAtElevation(elevationInDegrees));
}

// How long the trip lasts on screen, slowed down 30 times.
export function onScreenTripSeconds(elevationInDegrees) {
  return messageDelayAtElevation(elevationInDegrees) * MESSAGE_SLOW_DOWN;
}
