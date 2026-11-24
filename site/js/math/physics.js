// Physical numbers used everywhere on the page. All distances are in metres, all times in seconds.

export const SPEED_OF_LIGHT_IN_METRES_PER_SECOND = 299_792_458;

export const EARTH_RADIUS_IN_METRES = 6_371_000;

// GPS satellites fly about 20,200 km above the ground, which is 26,560 km from the Earth's centre.
export const GPS_ORBIT_RADIUS_IN_METRES = 26_560_000;
export const GPS_HEIGHT_ABOVE_GROUND_IN_METRES = 20_200_000;

// One trip round the Earth takes half a sidereal day: 11 hours 58 minutes.
export const GPS_ORBIT_PERIOD_IN_SECONDS = 11 * 3600 + 58 * 60;

export function metresToKilometres(metres) {
  return metres / 1000;
}

export function kilometresToMetres(kilometres) {
  return kilometres * 1000;
}

// How far light travels in the given time. This is how a delay becomes a distance.
export function travelTimeToDistance(timeInSeconds) {
  return timeInSeconds * SPEED_OF_LIGHT_IN_METRES_PER_SECOND;
}

export function distanceToTravelTime(distanceInMetres) {
  return distanceInMetres / SPEED_OF_LIGHT_IN_METRES_PER_SECOND;
}
