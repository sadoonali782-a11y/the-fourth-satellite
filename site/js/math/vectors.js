// Small helpers for points and arrows written as plain arrays: [x, y] or [x, y, z].
// Every function works for any number of directions unless its name says otherwise.

export function addVectors(first, second) {
  return first.map((value, index) => value + second[index]);
}

export function subtractVectors(first, second) {
  return first.map((value, index) => value - second[index]);
}

export function scaleVector(vector, factor) {
  return vector.map((value) => value * factor);
}

export function dotProduct(first, second) {
  let total = 0;
  for (let index = 0; index < first.length; index += 1) {
    total += first[index] * second[index];
  }
  return total;
}

export function vectorLength(vector) {
  return Math.sqrt(dotProduct(vector, vector));
}

export function distanceBetween(first, second) {
  return vectorLength(subtractVectors(first, second));
}

export function unitVector(vector) {
  const length = vectorLength(vector);
  if (length === 0) {
    return vector.map(() => 0);
  }
  return scaleVector(vector, 1 / length);
}

export function crossProduct3d(first, second) {
  return [
    first[1] * second[2] - first[2] * second[1],
    first[2] * second[0] - first[0] * second[2],
    first[0] * second[1] - first[1] * second[0],
  ];
}

// Moves part of the way from one point to another. fraction 0 gives start, 1 gives end.
export function blendVectors(start, end, fraction) {
  return start.map((value, index) => value + (end[index] - value) * fraction);
}

export function averageOfPoints(points) {
  const total = points.reduce((sum, point) => addVectors(sum, point), points[0].map(() => 0));
  return scaleVector(total, 1 / points.length);
}
