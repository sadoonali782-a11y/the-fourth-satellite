// Pieces shared by the three globe steps: the usual camera view, satellite markers and labels,
// and the rules for dragging "you" over the ground and satellites over their orbit shell.

import { localDirectionsAt, moveOverSphere, groundDistanceBetween, elevationInDegrees, azimuthInDegrees, satellitePositionSeenFrom } from '../math/earthGeometry.js';
import { EARTH_RADIUS_IN_METRES, GPS_ORBIT_RADIUS_IN_METRES } from '../math/physics.js';
import { describeWhereOnEarth, compassWord } from '../math/places.js';
import { formatWholeNumber } from '../pageHelpers.js';

export const SATELLITE_ICON_HTML = `
  <svg class="satellite-icon" viewBox="0 0 30 16" aria-hidden="true">
    <rect x="11" y="2" width="8" height="12" rx="1" fill="currentColor"/>
    <rect x="0" y="4.5" width="9" height="7" fill="currentColor"/>
    <rect x="21" y="4.5" width="9" height="7" fill="currentColor"/>
    <rect x="8" y="7.3" width="14" height="1.4" fill="currentColor"/>
  </svg>`;

// The starting view for a step: looking at the Earth from a little south of you and well above,
// so you sit near the top of the Earth with your satellites in the sky above.
// lookingDown: how steeply the camera looks down on you (0 = from the side, 1 = straight down).
export function homeViewFor(youInMetres, distanceInKm = 80_000, lookingDown = 0.62, targetFromCentreInKm = 6000) {
  const { up, north } = localDirectionsAt(youInMetres);
  const sideways = Math.sqrt(1 - lookingDown * lookingDown);
  const towardsCamera = [0, 1, 2].map((index) => up[index] * lookingDown - north[index] * sideways);
  const target = up.map((part) => part * targetFromCentreInKm);
  return { target, towardsCamera, up, distanceInKm };
}

// Moves "you" to where the pointer is on the ground, but not further than maxDistance from home.
export function dragYouTo(view, screenX, screenY, homePoint, maxDistanceInMetres) {
  const groundPoint = view.screenPointOnShell(screenX, screenY, EARTH_RADIUS_IN_METRES);
  if (groundPoint === null || groundDistanceBetween(groundPoint, homePoint) > maxDistanceInMetres) {
    return null;
  }
  return groundPoint;
}

// Moves "you" with the arrow keys: 100 km a press, 500 km with Shift.
export function nudgeYou(youPoint, stepsRight, stepsUp, isBigStep, homePoint, maxDistanceInMetres) {
  const stepInMetres = isBigStep ? 500_000 : 100_000;
  const moved = moveOverSphere(youPoint, stepsRight * stepInMetres, stepsUp * stepInMetres);
  return groundDistanceBetween(moved, homePoint) > maxDistanceInMetres ? youPoint : moved;
}

export function describeYou(youPoint) {
  return describeWhereOnEarth(youPoint);
}

// Moves a satellite to where the pointer is on its orbit shell, if it stays at least minElevation
// above your horizon (a satellite below your horizon couldn't be heard).
export function dragSatelliteTo(view, screenX, screenY, observerPoint, minimumElevationInDegrees) {
  const shellPoint = view.screenPointOnShell(screenX, screenY, GPS_ORBIT_RADIUS_IN_METRES);
  if (shellPoint === null || elevationInDegrees(observerPoint, shellPoint) < minimumElevationInDegrees) {
    return null;
  }
  return shellPoint;
}

// Moves a satellite with the arrow keys: left/right turns it round your sky, up/down raises or lowers it.
export function nudgeSatellite(satellitePoint, observerPoint, stepsRight, stepsUp, isBigStep, minimumElevationInDegrees) {
  const stepInDegrees = isBigStep ? 15 : 5;
  const azimuth = azimuthInDegrees(observerPoint, satellitePoint) + stepsRight * stepInDegrees;
  const elevation = Math.min(89, Math.max(minimumElevationInDegrees, elevationInDegrees(observerPoint, satellitePoint) + stepsUp * stepInDegrees * 0.6));
  return satellitePositionSeenFrom(observerPoint, azimuth, elevation);
}

export function describeSatellite(satellitePoint, observerPoint) {
  const elevation = Math.round(elevationInDegrees(observerPoint, satellitePoint));
  const direction = compassWord(azimuthInDegrees(observerPoint, satellitePoint));
  return `${elevation}° up, towards the ${direction}`;
}

export function kilometresLabel(metres) {
  return `${formatWholeNumber(metres / 1000)} km`;
}
