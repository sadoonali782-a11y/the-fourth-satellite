// The Earth as drawn on every globe: a lit ball with muted ocean and land, real coastlines as sharp lines,
// a latitude/longitude grid that gets finer as you zoom in, and a faint glow of atmosphere.
//
// Scene units are kilometres (1 unit = 1 km), so numbers stay small enough for the graphics card.
// The land colours are painted once into a picture wrapped round the ball. That picture would look soft
// close up, so the coastlines are drawn on top as real lines, which stay sharp at any zoom.

import * as THREE from 'three';
import { EARTH_RADIUS_IN_METRES } from '../math/physics.js';
import { latitudeLongitudeToPoint } from '../math/earthGeometry.js';
import { earthColours } from '../earthColours.js';

export const EARTH_RADIUS_IN_KM = EARTH_RADIUS_IN_METRES / 1000;
const LAND_PICTURE_WIDTH = 4096;
const LAND_PICTURE_HEIGHT = 2048;
const FINE_GRID_SHOWS_BELOW_KM_ABOVE_GROUND = 6000;

// Things made once and shared by every globe.
const shared = {
  coastlineRings: null,
  landPictureCanvas: null,
  landTexture: null,
  ballGeometry: null,
  coastlineGeometry: null,
  coarseGridGeometry: null,
  fineGridGeometry: null,
  atmosphereGeometry: null,
  starGeometry: null,
  isLight: null,
};

export async function loadCoastlines() {
  if (shared.coastlineRings !== null) {
    return;
  }
  const response = await fetch('data/coastlines.json');
  const data = await response.json();
  shared.coastlineRings = data.rings.map((numbers) => decodeRing(numbers, data.unitInDegrees));
}

// Turns one ring from the file (first point in full, then steps) into [[longitude, latitude], ...].
function decodeRing(numbers, unitInDegrees) {
  const points = [];
  let longitude = 0;
  let latitude = 0;
  for (let index = 0; index < numbers.length; index += 2) {
    longitude += numbers[index];
    latitude += numbers[index + 1];
    points.push([longitude * unitInDegrees, latitude * unitInDegrees]);
  }
  return points;
}

function pointInKm(latitude, longitude, radiusInKm) {
  const [x, y, z] = latitudeLongitudeToPoint(latitude, longitude, radiusInKm);
  return [x, y, z];
}

// Paints ocean and land into the flat world picture. Land shades from icy near the poles,
// to green, to dry around the deserts' latitudes.
function paintLandPicture(isLight) {
  const colours = earthColours(isLight);
  if (shared.landPictureCanvas === null) {
    shared.landPictureCanvas = document.createElement('canvas');
    shared.landPictureCanvas.width = LAND_PICTURE_WIDTH;
    shared.landPictureCanvas.height = LAND_PICTURE_HEIGHT;
  }
  const canvas = shared.landPictureCanvas;
  const context = canvas.getContext('2d');
  const toX = (longitude) => ((longitude + 180) / 360) * canvas.width;
  const toY = (latitude) => ((90 - latitude) / 180) * canvas.height;

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, colours.oceanDeep);
  ocean.addColorStop(0.5, colours.ocean);
  ocean.addColorStop(1, colours.oceanDeep);
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const land = context.createLinearGradient(0, 0, 0, canvas.height);
  const stopAtLatitude = (latitude, colour) => land.addColorStop((90 - latitude) / 180, colour);
  stopAtLatitude(90, colours.landIce);
  stopAtLatitude(68, colours.landIce);
  stopAtLatitude(58, colours.landGreen);
  stopAtLatitude(38, colours.landGreen);
  stopAtLatitude(26, colours.landDry);
  stopAtLatitude(14, colours.landDry);
  stopAtLatitude(6, colours.landGreen);
  stopAtLatitude(-12, colours.landGreen);
  stopAtLatitude(-26, colours.landDry);
  stopAtLatitude(-40, colours.landGreen);
  stopAtLatitude(-60, colours.landIce);
  stopAtLatitude(-90, colours.landIce);

  context.beginPath();
  shared.coastlineRings.forEach((ring) => {
    ring.forEach(([longitude, latitude], index) => {
      if (index === 0) {
        context.moveTo(toX(longitude), toY(latitude));
      } else {
        context.lineTo(toX(longitude), toY(latitude));
      }
    });
    context.closePath();
  });
  context.fillStyle = land;
  context.fill('evenodd');

  if (shared.landTexture === null) {
    shared.landTexture = new THREE.CanvasTexture(canvas);
    shared.landTexture.colorSpace = THREE.SRGBColorSpace;
    shared.landTexture.anisotropy = 8;
  } else {
    shared.landTexture.needsUpdate = true;
  }
}

function buildSharedGeometry() {
  if (shared.ballGeometry !== null) {
    return;
  }
  shared.ballGeometry = new THREE.SphereGeometry(EARTH_RADIUS_IN_KM, 192, 96);
  shared.atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS_IN_KM * 1.035, 96, 48);

  // Coastlines: each pair of neighbouring points becomes one short line, lifted 1 km above the ground.
  const coastlinePoints = [];
  shared.coastlineRings.forEach((ring) => {
    for (let index = 0; index < ring.length - 1; index += 1) {
      coastlinePoints.push(...pointInKm(ring[index][1], ring[index][0], EARTH_RADIUS_IN_KM + 1));
      coastlinePoints.push(...pointInKm(ring[index + 1][1], ring[index + 1][0], EARTH_RADIUS_IN_KM + 1));
    }
  });
  shared.coastlineGeometry = new THREE.BufferGeometry();
  shared.coastlineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(coastlinePoints, 3));

  shared.coarseGridGeometry = makeGridGeometry(15, 2);
  shared.fineGridGeometry = makeGridGeometry(2, 0.5);

  // Faint stars on a far-away sphere, for the dark theme.
  const starPoints = [];
  let seed = 7;
  const nextNumber = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let index = 0; index < 500; index += 1) {
    const latitude = Math.asin(2 * nextNumber() - 1) * (180 / Math.PI);
    const longitude = nextNumber() * 360 - 180;
    starPoints.push(...pointInKm(latitude, longitude, 900_000));
  }
  shared.starGeometry = new THREE.BufferGeometry();
  shared.starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3));
}

// Lines of latitude and longitude every `spacing` degrees, each drawn in short pieces of `step` degrees.
function makeGridGeometry(spacing, step) {
  const points = [];
  const radius = EARTH_RADIUS_IN_KM + 0.5;
  for (let longitude = -180; longitude < 180; longitude += spacing) {
    for (let latitude = -90; latitude < 90; latitude += step) {
      points.push(...pointInKm(latitude, longitude, radius), ...pointInKm(latitude + step, longitude, radius));
    }
  }
  for (let latitude = -90 + spacing; latitude < 90; latitude += spacing) {
    for (let longitude = -180; longitude < 180; longitude += step) {
      points.push(...pointInKm(latitude, longitude, radius), ...pointInKm(latitude, longitude + step, radius));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

// A soft glow round the Earth's edge: brightest where we look across the air, fading outwards.
function makeAtmosphereMaterial(colour) {
  return new THREE.ShaderMaterial({
    uniforms: { glowColour: { value: new THREE.Color(colour) } },
    vertexShader: `
      varying vec3 surfaceNormal;
      varying vec3 towardsCamera;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        surfaceNormal = normalize(mat3(modelMatrix) * normal);
        towardsCamera = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColour;
      varying vec3 surfaceNormal;
      varying vec3 towardsCamera;
      void main() {
        float facing = dot(surfaceNormal, towardsCamera);
        float strength = pow(clamp(0.62 + facing, 0.0, 1.0), 4.0);
        gl_FragColor = vec4(glowColour, strength * 0.9);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

// Builds one Earth for one globe. Returns { group, update(cameraDistanceAboveGround), applyTheme(isLight) }.
export function makeEarth(isLight) {
  buildSharedGeometry();
  if (shared.isLight !== isLight) {
    paintLandPicture(isLight);
    shared.isLight = isLight;
  }

  const group = new THREE.Group();
  const ballMaterial = new THREE.MeshStandardMaterial({ map: shared.landTexture, roughness: 0.92, metalness: 0 });
  const ball = new THREE.Mesh(shared.ballGeometry, ballMaterial);
  group.add(ball);

  const coastlineMaterial = new THREE.LineBasicMaterial({ transparent: true });
  const coastlines = new THREE.LineSegments(shared.coastlineGeometry, coastlineMaterial);
  group.add(coastlines);

  const gridMaterial = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
  const coarseGrid = new THREE.LineSegments(shared.coarseGridGeometry, gridMaterial);
  const fineGrid = new THREE.LineSegments(shared.fineGridGeometry, gridMaterial);
  group.add(coarseGrid, fineGrid);

  const atmosphereMaterial = makeAtmosphereMaterial('#5f9bff');
  const atmosphere = new THREE.Mesh(shared.atmosphereGeometry, atmosphereMaterial);
  group.add(atmosphere);

  const starMaterial = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, color: 0xffffff });
  const stars = new THREE.Points(shared.starGeometry, starMaterial);
  group.add(stars);

  function applyTheme(newIsLight) {
    if (shared.isLight !== newIsLight) {
      paintLandPicture(newIsLight);
      shared.isLight = newIsLight;
    }
    const colours = earthColours(newIsLight);
    const coastlineColour = parseRgba(colours.coastline);
    coastlineMaterial.color.set(coastlineColour.colour);
    coastlineMaterial.opacity = coastlineColour.alpha;
    const gridColour = parseRgba(colours.grid);
    gridMaterial.color.set(gridColour.colour);
    gridMaterial.opacity = gridColour.alpha;
    atmosphereMaterial.uniforms.glowColour.value.set(colours.atmosphere);
    atmosphereMaterial.blending = newIsLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    stars.visible = !newIsLight;
  }
  applyTheme(isLight);

  function update(cameraHeightAboveGroundInKm) {
    fineGrid.visible = cameraHeightAboveGroundInKm < FINE_GRID_SHOWS_BELOW_KM_ABOVE_GROUND;
  }

  return { group, update, applyTheme };
}

function parseRgba(text) {
  const numbers = text.match(/[\d.]+/g).map(Number);
  const colour = new THREE.Color().setRGB(numbers[0] / 255, numbers[1] / 255, numbers[2] / 255, THREE.SRGBColorSpace);
  return { colour, alpha: numbers[3] ?? 1 };
}
