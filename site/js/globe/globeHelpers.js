// Pieces shared by the three globe steps: the usual camera view, satellite markers and labels, orbit paths,
// colours that follow the theme, and the grab rings for dragging "you" over the ground and satellites
// over their orbit shell.

import { localDirectionsAt, moveOverSphere, groundDistanceBetween, elevationInDegrees, azimuthInDegrees, satellitePositionSeenFrom } from '../math/earthGeometry.js';
import { EARTH_RADIUS_IN_METRES, GPS_ORBIT_RADIUS_IN_METRES } from '../math/physics.js';
import { describeWhereOnEarth, compassWord } from '../math/places.js';
import { themeColours, whenThemeChanges } from '../theme.js';
import { makeScreenLine, orbitPathPoints } from './globeObjects.js';

const FURTHEST_YOU_CAN_WANDER_IN_METRES = 2_500_000;

const SATELLITE_ICON_HTML = `
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

// Makes an object take a theme colour (such as 'violet') now, and again whenever light/dark mode switches.
// The object needs a setColour method, as everything in globeObjects.js has. Returns the object.
export function colourFromTheme(colourName, object) {
  object.setColour(themeColours()[colourName]);
  whenThemeChanges((colours) => object.setColour(colours[colourName]));
  return object;
}

// A faint violet dashed orbit path for each satellite. Call setSatellite(position) to move one.
export function addOrbitLines(view, satellitePositions) {
  return satellitePositions.map((position) => {
    const line = colourFromTheme('violet', makeScreenLine('#000', 1, { dashed: true, dashSizeInKm: 900, opacity: 0.35 }));
    view.scene.add(line.object);
    line.setSatellite = (newPosition) => line.setPoints(orbitPathPoints(newPosition));
    line.setSatellite(position);
    return line;
  });
}

// A satellite icon and a name label for each name. place(position, isFaded) moves both together.
export function addSatelliteMarkers(view, names, labelOffset = [-5, -36]) {
  return names.map((name) => {
    const icon = view.addMarker('satellite-marker', SATELLITE_ICON_HTML);
    const label = view.addMarker('globe-label');
    label.element.textContent = name;
    return {
      label,
      place(position, isFaded = false) {
        icon.setPoint(position);
        label.setPoint(position, ...labelOffset);
        icon.element.classList.toggle('is-faded', isFaded);
        label.element.classList.toggle('is-faded', isFaded);
      },
    };
  });
}

// The grab ring on "you". Dragging moves you over the ground; the arrow keys move you 100 km a press
// (500 km with Shift). You can't wander more than 2,500 km from home.
export function addYouGrabTarget(view, state, homePoint) {
  const isTooFar = (point) => groundDistanceBetween(point, homePoint) > FURTHEST_YOU_CAN_WANDER_IN_METRES;
  view.addGrabTarget({
    name: 'You',
    getPointInMetres: () => state.you,
    onDragTo(screenX, screenY) {
      const groundPoint = view.screenPointOnShell(screenX, screenY, EARTH_RADIUS_IN_METRES);
      if (groundPoint !== null && !isTooFar(groundPoint)) {
        state.you = groundPoint;
      }
    },
    onArrowKey(stepsRight, stepsUp, isBigStep) {
      const stepInMetres = isBigStep ? 500_000 : 100_000;
      const moved = moveOverSphere(state.you, stepsRight * stepInMetres, stepsUp * stepInMetres);
      if (!isTooFar(moved)) {
        state.you = moved;
      }
    },
    describe: () => describeWhereOnEarth(state.you),
  });
}

// The grab ring on a satellite. Dragging moves it over its orbit shell; left/right arrow keys turn it
// round your sky and up/down raise or lower it. It never goes lower than minimumElevation above your horizon
// (a satellite below your horizon couldn't be heard). setPoint is called with each new position.
export function addSatelliteGrabTarget(view, { name, getPoint, setPoint, observerPoint, minimumElevationInDegrees }) {
  view.addGrabTarget({
    name,
    getPointInMetres: getPoint,
    onDragTo(screenX, screenY) {
      const shellPoint = view.screenPointOnShell(screenX, screenY, GPS_ORBIT_RADIUS_IN_METRES);
      if (shellPoint !== null && elevationInDegrees(observerPoint, shellPoint) >= minimumElevationInDegrees) {
        setPoint(shellPoint);
      }
    },
    onArrowKey(stepsRight, stepsUp, isBigStep) {
      const stepInDegrees = isBigStep ? 15 : 5;
      const azimuth = azimuthInDegrees(observerPoint, getPoint()) + stepsRight * stepInDegrees;
      const raised = elevationInDegrees(observerPoint, getPoint()) + stepsUp * stepInDegrees * 0.6;
      const elevation = Math.min(89, Math.max(minimumElevationInDegrees, raised));
      setPoint(satellitePositionSeenFrom(observerPoint, azimuth, elevation));
    },
    describe() {
      const elevation = Math.round(elevationInDegrees(observerPoint, getPoint()));
      const direction = compassWord(azimuthInDegrees(observerPoint, getPoint()));
      return `${elevation}° up, towards the ${direction}`;
    },
  });
}
