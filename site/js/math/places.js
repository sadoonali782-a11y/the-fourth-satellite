// A short list of well-known places, so a screen reader can say roughly where "you" are on the globe
// ("near Cairo"). Latitude and longitude in degrees.

import { latitudeLongitudeToPoint, groundDistanceBetween } from './earthGeometry.js';

const PLACES = [
  ['Cairo', 30.04, 31.24], ['Alexandria', 31.2, 29.92], ['Luxor', 25.69, 32.64], ['Aswan', 24.09, 32.9],
  ['Khartoum', 15.5, 32.56], ['Tripoli', 32.89, 13.19], ['Benghazi', 32.12, 20.07], ['Tunis', 36.81, 10.18],
  ['Algiers', 36.75, 3.06], ['Jerusalem', 31.77, 35.21], ['Amman', 31.95, 35.93], ['Beirut', 33.89, 35.5],
  ['Damascus', 33.51, 36.28], ['Baghdad', 33.31, 44.36], ['Riyadh', 24.71, 46.68], ['Jeddah', 21.49, 39.19],
  ['Mecca', 21.39, 39.86], ['Medina', 24.47, 39.61], ['Sanaa', 15.37, 44.19], ['Ankara', 39.93, 32.86],
  ['Istanbul', 41.01, 28.98], ['Athens', 37.98, 23.73], ['Rome', 41.9, 12.5], ['Naples', 40.85, 14.27],
  ['Valletta', 35.9, 14.51], ['Nicosia', 35.19, 33.38], ['Tehran', 35.69, 51.39], ['Kuwait City', 29.38, 47.99],
  ['Doha', 25.29, 51.53], ['Dubai', 25.2, 55.27], ['Addis Ababa', 9.03, 38.74], ['Asmara', 15.32, 38.93],
  ["N'Djamena", 12.13, 15.05], ['Niamey', 13.51, 2.13], ['Port Sudan', 19.62, 37.22], ['Sofia', 42.7, 23.32],
  ['Bucharest', 44.43, 26.1], ['Tbilisi', 41.72, 44.79], ['Baku', 40.41, 49.87], ['Kyiv', 50.45, 30.52],
  ['Lagos', 6.52, 3.38], ['Nairobi', -1.29, 36.82], ['Madrid', 40.42, -3.7], ['Paris', 48.86, 2.35],
  ['London', 51.51, -0.13], ['Berlin', 52.52, 13.4], ['Moscow', 55.76, 37.62], ['Karachi', 24.86, 67.0],
  ['Mumbai', 19.08, 72.88], ['Delhi', 28.61, 77.21], ['Tokyo', 35.68, 139.69], ['Sydney', -33.87, 151.21],
  ['New York', 40.71, -74.01], ['São Paulo', -23.55, -46.63], ['Cape Town', -33.92, 18.42],
];

const PLACE_POINTS = PLACES.map(([name, latitude, longitude]) => ({ name, point: latitudeLongitudeToPoint(latitude, longitude) }));

// "near Cairo", or "about 400 km from Cairo" when no listed place is close.
export function describeWhereOnEarth(pointInMetres) {
  let nearest = null;
  let nearestDistance = Infinity;
  PLACE_POINTS.forEach((place) => {
    const distance = groundDistanceBetween(place.point, pointInMetres);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = place;
    }
  });
  if (nearestDistance < 150_000) {
    return `near ${nearest.name}`;
  }
  return `about ${Math.round(nearestDistance / 100_000) * 100} km from ${nearest.name}`;
}

const COMPASS_WORDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

export function compassWord(azimuthInDegrees) {
  return COMPASS_WORDS[Math.round(azimuthInDegrees / 45) % 8];
}
