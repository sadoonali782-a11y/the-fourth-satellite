// The Earth's own colours, shared by the 3D globe and the flat side views (steps 1 and 5),
// so every picture shows the same planet. Kept muted so blue, violet and lime still stand out.

const DARK_EARTH = {
  oceanDeep: '#0d2147',
  ocean: '#163467',
  landGreen: '#3f5f4a',
  landDry: '#6f6a4c',
  landIce: '#b9c4d8',
  coastline: 'rgba(214, 226, 255, 0.55)',
  grid: 'rgba(214, 226, 255, 0.10)',
  atmosphere: '#5f9bff',
  soil: '#2a3326',
};

const LIGHT_EARTH = {
  oceanDeep: '#7fa6dc',
  ocean: '#9cbde9',
  landGreen: '#93b088',
  landDry: '#c3b48a',
  landIce: '#f2f5fb',
  coastline: 'rgba(30, 50, 100, 0.45)',
  grid: 'rgba(30, 50, 100, 0.10)',
  atmosphere: '#7fb0ff',
  soil: '#a9a07a',
};

export function earthColours(isLight) {
  return isLight ? LIGHT_EARTH : DARK_EARTH;
}
