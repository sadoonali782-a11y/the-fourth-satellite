// Places on a round Earth, and where distance spheres meet. Pure maths: no drawing.
//
// The Earth's centre is [0, 0, 0]. The y direction points to the North Pole.
// Longitude 0 points along +x and longitude 90° east points along −z
// (this matches how three.js wraps a world map around a sphere).

import { EARTH_RADIUS_IN_METRES, GPS_ORBIT_RADIUS_IN_METRES, DEGREES_TO_RADIANS } from './physics.js';
import {
  addVectors,
  subtractVectors,
  scaleVector,
  dotProduct,
  vectorLength,
  unitVector,
  crossProduct3d,
} from './vectors.js';

export function latitudeLongitudeToPoint(latitudeInDegrees, longitudeInDegrees, radiusInMetres = EARTH_RADIUS_IN_METRES) {
  const latitude = latitudeInDegrees * DEGREES_TO_RADIANS;
  const longitude = longitudeInDegrees * DEGREES_TO_RADIANS;
  return [
    radiusInMetres * Math.cos(latitude) * Math.cos(longitude),
    radiusInMetres * Math.sin(latitude),
    -radiusInMetres * Math.cos(latitude) * Math.sin(longitude),
  ];
}

export function pointToLatitudeLongitude(point) {
  const radius = vectorLength(point);
  const latitude = Math.asin(point[1] / radius) / DEGREES_TO_RADIANS;
  const longitude = Math.atan2(-point[2], point[0]) / DEGREES_TO_RADIANS;
  return { latitudeInDegrees: latitude, longitudeInDegrees: longitude };
}

// The three flat directions at a place: up (away from the centre), east and north.
export function localDirectionsAt(point) {
  const up = unitVector(point);
  let east = crossProduct3d([0, 1, 0], up);
  if (vectorLength(east) < 1e-9) {
    east = [0, 0, -1]; // at a pole, any direction will do
  }
  east = unitVector(east);
  const north = crossProduct3d(up, east);
  return { up, east, north };
}

// Where a satellite is, if you look in the given compass direction (azimuth, 0 = north, 90 = east)
// at the given angle above the horizon (elevation), and it flies on a shell of the given radius.
export function satellitePositionSeenFrom(observerPoint, azimuthInDegrees, elevationInDegrees, shellRadius = GPS_ORBIT_RADIUS_IN_METRES) {
  const { up, east, north } = localDirectionsAt(observerPoint);
  const azimuth = azimuthInDegrees * DEGREES_TO_RADIANS;
  const elevation = elevationInDegrees * DEGREES_TO_RADIANS;
  const flatPart = addVectors(scaleVector(east, Math.sin(azimuth)), scaleVector(north, Math.cos(azimuth)));
  const lookDirection = unitVector(addVectors(scaleVector(flatPart, Math.cos(elevation)), scaleVector(up, Math.sin(elevation))));
  const distanceAlongLook = distanceToShellAlong(observerPoint, lookDirection, shellRadius);
  return addVectors(observerPoint, scaleVector(lookDirection, distanceAlongLook));
}

// Walking from a point in a straight line, how far until we reach a sphere of the given radius?
export function distanceToShellAlong(startPoint, direction, shellRadius) {
  const along = dotProduct(startPoint, direction);
  const startRadiusSquared = dotProduct(startPoint, startPoint);
  return -along + Math.sqrt(along * along - startRadiusSquared + shellRadius * shellRadius);
}

// The angle of a satellite above the horizon, seen from a place on the ground.
export function elevationInDegrees(observerPoint, satellitePoint) {
  const { up } = localDirectionsAt(observerPoint);
  const towardsSatellite = unitVector(subtractVectors(satellitePoint, observerPoint));
  return Math.asin(Math.max(-1, Math.min(1, dotProduct(up, towardsSatellite)))) / DEGREES_TO_RADIANS;
}

// The compass direction of a satellite (0 = north, 90 = east), seen from a place on the ground.
export function azimuthInDegrees(observerPoint, satellitePoint) {
  const { east, north } = localDirectionsAt(observerPoint);
  const towardsSatellite = subtractVectors(satellitePoint, observerPoint);
  const azimuth = Math.atan2(dotProduct(towardsSatellite, east), dotProduct(towardsSatellite, north)) / DEGREES_TO_RADIANS;
  return (azimuth + 360) % 360;
}

// Moves a point over the ground by a distance east and north, keeping it on a sphere of the same radius.
export function moveOverSphere(point, eastInMetres, northInMetres) {
  const radius = vectorLength(point);
  const { east, north } = localDirectionsAt(point);
  const moved = addVectors(point, addVectors(scaleVector(east, eastInMetres), scaleVector(north, northInMetres)));
  return scaleVector(unitVector(moved), radius);
}

// The distance along the ground between two places (the short way round the sphere).
export function groundDistanceBetween(firstPoint, secondPoint, radius = EARTH_RADIUS_IN_METRES) {
  const cosine = dotProduct(unitVector(firstPoint), unitVector(secondPoint));
  return radius * Math.acos(Math.max(-1, Math.min(1, cosine)));
}

// Two spheres meet in a circle. Returns its centre, radius and the direction its face points,
// or null if the spheres don't meet (too far apart, or one inside the other).
export function whereTwoSpheresMeet(firstCentre, firstRadius, secondCentre, secondRadius) {
  const between = subtractVectors(secondCentre, firstCentre);
  const gap = vectorLength(between);
  if (gap === 0 || gap > firstRadius + secondRadius || gap < Math.abs(firstRadius - secondRadius)) {
    return null;
  }
  const axis = scaleVector(between, 1 / gap);
  const distanceToCircleCentre = (gap * gap + firstRadius * firstRadius - secondRadius * secondRadius) / (2 * gap);
  const circleRadius = Math.sqrt(Math.max(0, firstRadius * firstRadius - distanceToCircleCentre * distanceToCircleCentre));
  return {
    centre: addVectors(firstCentre, scaleVector(axis, distanceToCircleCentre)),
    radius: circleRadius,
    axis,
  };
}

// Three spheres meet in (usually) two points, one on each side of the plane through the three centres.
// Returns a list of 0 or 2 points.
export function whereThreeSpheresMeet(centres, radii) {
  const [firstCentre, secondCentre, thirdCentre] = centres;
  const [firstRadius, secondRadius, thirdRadius] = radii;

  // Build a little set of directions: xAxis towards the second centre, yAxis in the plane of all three.
  const towardsSecond = subtractVectors(secondCentre, firstCentre);
  const gapToSecond = vectorLength(towardsSecond);
  if (gapToSecond === 0) {
    return [];
  }
  const xAxis = scaleVector(towardsSecond, 1 / gapToSecond);
  const towardsThird = subtractVectors(thirdCentre, firstCentre);
  const thirdAlongX = dotProduct(xAxis, towardsThird);
  const sidewaysToThird = subtractVectors(towardsThird, scaleVector(xAxis, thirdAlongX));
  const thirdAlongY = vectorLength(sidewaysToThird);
  if (thirdAlongY < 1e-6) {
    return []; // the three centres are in a straight line
  }
  const yAxis = scaleVector(sidewaysToThird, 1 / thirdAlongY);
  const zAxis = crossProduct3d(xAxis, yAxis);

  // Solve the three sphere equations in these directions.
  const x = (firstRadius * firstRadius - secondRadius * secondRadius + gapToSecond * gapToSecond) / (2 * gapToSecond);
  const y =
    (firstRadius * firstRadius - thirdRadius * thirdRadius + thirdAlongX * thirdAlongX + thirdAlongY * thirdAlongY) /
      (2 * thirdAlongY) -
    (thirdAlongX / thirdAlongY) * x;
  const zSquared = firstRadius * firstRadius - x * x - y * y;
  if (zSquared < 0) {
    return [];
  }
  const z = Math.sqrt(zSquared);
  const pointInPlane = addVectors(firstCentre, addVectors(scaleVector(xAxis, x), scaleVector(yAxis, y)));
  return [addVectors(pointInPlane, scaleVector(zAxis, z)), addVectors(pointInPlane, scaleVector(zAxis, -z))];
}

// Of the given points, the one closest to the given target point.
export function closestPointTo(points, target) {
  let bestPoint = null;
  let bestDistance = Infinity;
  points.forEach((point) => {
    const distance = vectorLength(subtractVectors(point, target));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestPoint = point;
    }
  });
  return bestPoint;
}

// How far a point is from the Earth's surface (positive above the ground, negative below).
export function heightAboveGround(point) {
  return vectorLength(point) - EARTH_RADIUS_IN_METRES;
}
