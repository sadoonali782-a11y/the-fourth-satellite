// Where "you" start and where each step's satellites are placed. These are hand-placed, not real orbits
// (the fine print says so): each layout is chosen to make its step's point clearly.
//
// Satellites are given by how they look from your starting spot: a compass direction (azimuth, 0 = north,
// 90 = east) and an angle above the horizon (elevation). They all sit on the real GPS shell, 20,200 km up.

import { latitudeLongitudeToPoint, satellitePositionSeenFrom } from './earthGeometry.js';

export const STARTING_PLACE = { name: 'Cairo', latitudeInDegrees: 30.04, longitudeInDegrees: 31.24 };

export function startingPoint() {
  return latitudeLongitudeToPoint(STARTING_PLACE.latitudeInDegrees, STARTING_PLACE.longitudeInDegrees);
}

export const CIRCLES_STEP_SKY = [
  { name: 'A', azimuthInDegrees: 300, elevationInDegrees: 55 },
  { name: 'B', azimuthInDegrees: 70, elevationInDegrees: 40 },
  { name: 'C', azimuthInDegrees: 185, elevationInDegrees: 30 },
];

export const CLOCK_STEP_SKY = [
  { name: 'A', azimuthInDegrees: 320, elevationInDegrees: 50 },
  { name: 'B', azimuthInDegrees: 45, elevationInDegrees: 62 },
  { name: 'C', azimuthInDegrees: 140, elevationInDegrees: 35 },
  { name: 'D', azimuthInDegrees: 235, elevationInDegrees: 28 },
];

export const WOBBLE_STEP_SPREAD_SKY = [
  { name: 'A', azimuthInDegrees: 10, elevationInDegrees: 78 },
  { name: 'B', azimuthInDegrees: 95, elevationInDegrees: 22 },
  { name: 'C', azimuthInDegrees: 215, elevationInDegrees: 25 },
  { name: 'D', azimuthInDegrees: 325, elevationInDegrees: 20 },
];

export const WOBBLE_STEP_BUNCHED_SKY = [
  { name: 'A', azimuthInDegrees: 0, elevationInDegrees: 70 },
  { name: 'B', azimuthInDegrees: 60, elevationInDegrees: 45 },
  { name: 'C', azimuthInDegrees: 120, elevationInDegrees: 40 },
  { name: 'D', azimuthInDegrees: 40, elevationInDegrees: 30 },
];

// Turns a sky layout into satellite positions in metres, seen from the given place.
export function placeSatellites(skyLayout, observerPoint = startingPoint()) {
  return skyLayout.map((satellite) =>
    satellitePositionSeenFrom(observerPoint, satellite.azimuthInDegrees, satellite.elevationInDegrees),
  );
}
