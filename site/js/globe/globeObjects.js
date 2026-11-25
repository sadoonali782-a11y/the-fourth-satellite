// The 3D things drawn on the globes, apart from the Earth itself: see-through distance balls,
// lines that keep the same width on screen at any zoom, clouds of specks, the pale circle and orbit paths.
// Positions from the maths files are in metres; the 3D scene uses kilometres.

import * as THREE from 'three';
import { Line2 } from '../../vendor/three/lines/Line2.js';
import { LineGeometry } from '../../vendor/three/lines/LineGeometry.js';
import { LineMaterial } from '../../vendor/three/lines/LineMaterial.js';
import { EARTH_RADIUS_IN_KM } from './earthModel.js';
import { localDirectionsAt } from '../math/earthGeometry.js';
import { addVectors, scaleVector, unitVector, crossProduct3d, dotProduct, vectorLength } from '../math/vectors.js';
import { DEGREES_TO_RADIANS } from '../math/physics.js';

// The maths files work in metres; the 3D scene works in kilometres. These two convert between them.
export function toScene(pointInMetres) {
  return new THREE.Vector3(pointInMetres[0] / 1000, pointInMetres[1] / 1000, pointInMetres[2] / 1000);
}

export function fromScene(vectorInKm) {
  return [vectorInKm.x * 1000, vectorInKm.y * 1000, vectorInKm.z * 1000];
}

const sharedBallGeometry = new THREE.SphereGeometry(1, 128, 64);

// A see-through ball: almost clear in the middle, brighter at its edge, so many can overlap and stay readable.
// striped: true draws faint bands instead, for the "true distance" balls in step 3.
export function makeDistanceBall(colour, { striped = false, strength = 1 } = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ballColour: { value: new THREE.Color(colour) },
      strength: { value: strength },
      striped: { value: striped ? 1 : 0 },
    },
    vertexShader: `
      varying vec3 surfaceNormal;
      varying vec3 towardsCamera;
      varying vec3 localPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        surfaceNormal = normalize(mat3(modelMatrix) * normal);
        towardsCamera = normalize(cameraPosition - worldPosition.xyz);
        localPosition = position;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 ballColour;
      uniform float strength;
      uniform float striped;
      varying vec3 surfaceNormal;
      varying vec3 towardsCamera;
      varying vec3 localPosition;
      void main() {
        float edge = 1.0 - abs(dot(surfaceNormal, towardsCamera));
        float alpha = (0.02 + 0.5 * pow(edge, 4.0)) * strength;
        if (striped > 0.5) {
          float band = step(0.5, fract(localPosition.y * 9.0));
          alpha *= band;
        }
        gl_FragColor = vec4(ballColour, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ball = new THREE.Mesh(sharedBallGeometry, material);
  ball.renderOrder = 2;
  return {
    object: ball,
    place(centreInMetres, radiusInMetres) {
      ball.position.copy(toScene(centreInMetres));
      const radiusInKm = Math.max(radiusInMetres / 1000, 0.001);
      ball.scale.set(radiusInKm, radiusInKm, radiusInKm);
    },
    setColour(newColour) {
      material.uniforms.ballColour.value.set(newColour);
    },
    setStrength(newStrength) {
      material.uniforms.strength.value = newStrength;
    },
  };
}

// A line that is always `widthInPixels` wide on screen, however far you zoom.
// Every globe calls setScreenSize on its lines each frame (the width maths needs the picture size).
export function makeScreenLine(colour, widthInPixels, { dashed = false, dashSizeInKm = 400, opacity = 1, onTop = false } = {}) {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 1, 1, 1]);
  const material = new LineMaterial({
    color: new THREE.Color(colour),
    linewidth: widthInPixels,
    dashed,
    dashSize: dashSizeInKm,
    gapSize: dashSizeInKm * 0.8,
    transparent: opacity < 1 || onTop,
    opacity,
    depthTest: !onTop,
    worldUnits: false,
  });
  const line = new Line2(geometry, material);
  line.renderOrder = onTop ? 5 : 3;
  // Each frame the globe multiplies this by the screen's pixel density (see globeView.js).
  line.userData.widthInCssPixels = widthInPixels;
  return {
    object: line,
    material,
    setPoints(pointsInMetres) {
      if (pointsInMetres.length < 2) {
        line.visible = false;
        return;
      }
      line.visible = true;
      const flat = pointsInMetres.flatMap((point) => toScene(point).toArray());
      line.geometry.dispose();
      line.geometry = new LineGeometry();
      line.geometry.setPositions(flat);
      if (dashed) {
        line.computeLineDistances();
      }
    },
    setColour(newColour) {
      material.color.set(newColour);
    },
  };
}

// One point on a circle in 3D, given its centre, radius, the direction its face points (axis) and an angle.
export function pointOnCircle(centre, radius, axis, angle) {
  const helper = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const firstSide = unitVector(crossProduct3d(axis, helper));
  const secondSide = crossProduct3d(axis, firstSide);
  const offset = addVectors(scaleVector(firstSide, Math.cos(angle)), scaleVector(secondSide, Math.sin(angle)));
  return addVectors(centre, scaleVector(offset, radius));
}

// Points all the way round that circle (all in metres).
export function circlePoints(centre, radius, axis, numberOfPoints = 180) {
  const points = [];
  for (let index = 0; index <= numberOfPoints; index += 1) {
    points.push(pointOnCircle(centre, radius, axis, (index / numberOfPoints) * Math.PI * 2));
  }
  return points;
}

// A cloud of small round specks, each a few pixels wide whatever the zoom.
export function makeSpeckCloud(colour, maximumSpecks, sizeInPixels) {
  const positions = new Float32Array(maximumSpecks * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.ShaderMaterial({
    uniforms: { speckColour: { value: new THREE.Color(colour) }, speckSize: { value: sizeInPixels } },
    vertexShader: `
      uniform float speckSize;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = speckSize;
      }
    `,
    fragmentShader: `
      uniform vec3 speckColour;
      void main() {
        float distanceFromCentre = length(gl_PointCoord - vec2(0.5));
        if (distanceFromCentre > 0.5) discard;
        gl_FragColor = vec4(speckColour, 0.55);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 4;
  points.frustumCulled = false;
  return {
    object: points,
    setPoints(pointsInMetres, pixelDensity) {
      pointsInMetres.forEach((point, index) => toScene(point).toArray(positions, index * 3));
      geometry.setDrawRange(0, pointsInMetres.length);
      geometry.attributes.position.needsUpdate = true;
      material.uniforms.speckSize.value = sizeInPixels * pixelDensity;
    },
    setColour(newColour) {
      material.uniforms.speckColour.value.set(newColour);
    },
  };
}

// The pale circle: a thin cap lying on the ground around a point, plus its edge.
export function makePaleCircle(colour) {
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(colour), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 8, 0, Math.PI * 2, 0, 0.1), material);
  cap.renderOrder = 3;
  const edge = makeScreenLine(colour, 2);
  const group = new THREE.Group();
  group.add(cap, edge.object);
  return {
    object: group,
    edge,
    place(groundPointInMetres, radiusInMetres) {
      const angle = Math.min(radiusInMetres / (EARTH_RADIUS_IN_KM * 1000), Math.PI * 0.9);
      cap.geometry.dispose();
      cap.geometry = new THREE.SphereGeometry(EARTH_RADIUS_IN_KM + 3, 96, 12, 0, Math.PI * 2, 0, angle);
      const up = toScene(groundPointInMetres).normalize();
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

      // The edge: a circle on the ground at that angle round the point.
      const groundRadius = (EARTH_RADIUS_IN_KM + 3) * 1000;
      const { up: upDirection } = localDirectionsAt(groundPointInMetres);
      const circleCentre = upDirection.map((part) => part * groundRadius * Math.cos(angle));
      edge.setPoints(circlePoints(circleCentre, groundRadius * Math.sin(angle), upDirection));
    },
    setVisible(isVisible) {
      group.visible = isVisible;
    },
    setColour(newColour) {
      material.color.set(newColour);
      edge.setColour(newColour);
    },
  };
}

// A faint orbit path through a satellite: a circle round the Earth's centre, tilted 55° like GPS orbits.
export function orbitPathPoints(satellitePositionInMetres) {
  const radius = vectorLength(satellitePositionInMetres);
  const outward = unitVector(satellitePositionInMetres);
  // Lean the orbit's axis 55° away from the North Pole, sideways to the satellite.
  const towardsNorth = [0, 1, 0];
  const sideways = unitVector(addVectors(crossProduct3d(towardsNorth, outward), [0, 1e-9, 0]));
  const tilt = 55 * DEGREES_TO_RADIANS;
  const axis = addVectors(scaleVector(towardsNorth, Math.cos(tilt)), scaleVector(sideways, Math.sin(tilt)));
  // Remove any part of the axis along the satellite's direction, so the circle goes through it.
  const correctedAxis = unitVector(addVectors(axis, scaleVector(outward, -dotProduct(axis, outward))));
  return circlePoints([0, 0, 0], radius, correctedAxis, 240);
}
