// The opening picture: the real-shaped GPS sky. About 31 satellites fly on six tilted orbits round a slowly
// turning Earth, with your blue dot breathing on the ground. Decoration only: hidden from screen readers,
// and still when less motion is preferred.

import * as THREE from 'three';
import { makeGlobeView } from '../globe/globeView.js';
import { makeScreenLine, circlePoints } from '../globe/globeObjects.js';
import { themeColours, whenThemeChanges } from '../theme.js';
import { animateWhileOnScreen, prefersLessMotion } from '../pageHelpers.js';
import { GPS_ORBIT_RADIUS_IN_METRES } from '../math/physics.js';
import { startingPoint } from '../math/sceneLayouts.js';
import { localDirectionsAt } from '../math/earthGeometry.js';

const NUMBER_OF_ORBITS = 6;
const SATELLITES_PER_ORBIT = [6, 5, 5, 5, 5, 5]; // 31 in all
const ORBIT_TILT_IN_DEGREES = 55;
const SECONDS_PER_ON_SCREEN_ORBIT = 60;
const EARTH_TURN_PER_SECOND = 0.03;
const DEGREES_TO_RADIANS = Math.PI / 180;

// The axis of each orbit: tilted 55° from the North Pole, with the six orbits spread evenly round the Earth.
function orbitAxis(orbitIndex) {
  const tilt = ORBIT_TILT_IN_DEGREES * DEGREES_TO_RADIANS;
  const turn = (orbitIndex * 360) / NUMBER_OF_ORBITS * DEGREES_TO_RADIANS;
  return [Math.sin(tilt) * Math.cos(turn), Math.cos(tilt), Math.sin(tilt) * Math.sin(turn)];
}

function pointOnOrbit(axis, angle) {
  const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const first = new THREE.Vector3(...axis).cross(new THREE.Vector3(...helper)).normalize();
  const second = new THREE.Vector3(...axis).cross(first).normalize();
  const radius = GPS_ORBIT_RADIUS_IN_METRES;
  return [0, 1, 2].map((index) => radius * (Math.cos(angle) * first.getComponent(index) + Math.sin(angle) * second.getComponent(index)));
}

export function startOpeningSky() {
  const box = document.getElementById('opening-globe');
  const you = startingPoint();
  const { up, north } = localDirectionsAt(you);
  const towardsCamera = [0, 1, 2].map((index) => up[index] * 0.7 - north[index] * 0.71);

  const view = makeGlobeView(box, {
    home: { target: [0, 0, 0], towardsCamera, up: [0, 1, 0], distanceInKm: 96_000 },
    interactive: false,
    transparentBackground: true,
    label: 'opening globe',
  });
  let colours = themeColours();

  const orbits = [];
  for (let orbitIndex = 0; orbitIndex < NUMBER_OF_ORBITS; orbitIndex += 1) {
    const axis = orbitAxis(orbitIndex);
    const line = makeScreenLine(colours.violet, 1, { dashed: true, dashSizeInKm: 1500, opacity: 0.4 });
    line.setPoints(circlePoints([0, 0, 0], GPS_ORBIT_RADIUS_IN_METRES, axis, 240));
    view.scene.add(line.object);
    const satellites = [];
    for (let slot = 0; slot < SATELLITES_PER_ORBIT[orbitIndex]; slot += 1) {
      const startAngle = (slot / SATELLITES_PER_ORBIT[orbitIndex]) * Math.PI * 2 + orbitIndex * 0.4;
      satellites.push({ startAngle, marker: view.addMarker('satellite-marker opening-satellite', '<span class="opening-satellite-dot"></span>') });
    }
    orbits.push({ axis, line, satellites });
  }
  const blueDot = view.addMarker('blue-dot breathing-dot');

  whenThemeChanges((newColours) => {
    colours = newColours;
    orbits.forEach((orbit) => orbit.line.setColour(colours.violet));
  });

  let secondsOfMotion = 0;
  function drawFrame(secondsSinceLastFrame) {
    if (!prefersLessMotion()) {
      secondsOfMotion += secondsSinceLastFrame;
      view.turnBy(-EARTH_TURN_PER_SECOND * secondsSinceLastFrame, 0);
    }
    const orbitAngle = (secondsOfMotion / SECONDS_PER_ON_SCREEN_ORBIT) * Math.PI * 2;
    orbits.forEach((orbit) => {
      orbit.satellites.forEach((satellite) => {
        satellite.marker.setPoint(pointOnOrbit(orbit.axis, satellite.startAngle + orbitAngle));
      });
    });
    blueDot.setPoint(you);
    view.render(secondsSinceLastFrame);
  }

  animateWhileOnScreen(box, drawFrame);
}
