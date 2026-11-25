// One shared 3D renderer for every globe on the page.
//
// Browsers only allow a few 3D drawing surfaces at once, and each would need its own copy of the Earth's
// map. So we keep one hidden 3D canvas, draw each globe into it in turn, and copy the finished picture
// into that globe's own visible canvas. The copy happens in the same frame, so pictures never lag behind
// the page while scrolling.

import * as THREE from 'three';
import { pixelDensity } from '../pageHelpers.js';

let sharedRenderer = null;

// Returns the shared renderer, or throws if this browser can't draw in 3D.
export function getSharedRenderer() {
  if (sharedRenderer === null) {
    const hiddenCanvas = document.createElement('canvas');
    const context = hiddenCanvas.getContext('webgl2', { antialias: true, alpha: true, preserveDrawingBuffer: false });
    if (!context) {
      throw new Error('3D graphics (WebGL 2) are not available.');
    }
    sharedRenderer = new THREE.WebGLRenderer({ canvas: hiddenCanvas, context, antialias: true, alpha: true, logarithmicDepthBuffer: true });
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.autoClear = true;
  }
  return sharedRenderer;
}

// Draws a scene through a camera into the given visible canvas, sized to that canvas's box.
// backgroundColour is a CSS colour, or null for a see-through background.
export function renderIntoCanvas(scene, camera, visibleCanvas, backgroundColour) {
  const renderer = getSharedRenderer();
  const density = pixelDensity();
  const cssWidth = Math.max(1, visibleCanvas.clientWidth);
  const cssHeight = Math.max(1, visibleCanvas.clientHeight);
  const pixelWidth = Math.round(cssWidth * density);
  const pixelHeight = Math.round(cssHeight * density);

  // Grow the hidden canvas if this globe is bigger than any drawn so far.
  const hiddenCanvas = renderer.domElement;
  if (hiddenCanvas.width < pixelWidth || hiddenCanvas.height < pixelHeight) {
    renderer.setSize(Math.max(hiddenCanvas.width, pixelWidth), Math.max(hiddenCanvas.height, pixelHeight), false);
  }
  if (visibleCanvas.width !== pixelWidth || visibleCanvas.height !== pixelHeight) {
    visibleCanvas.width = pixelWidth;
    visibleCanvas.height = pixelHeight;
  }

  camera.aspect = cssWidth / cssHeight;
  camera.updateProjectionMatrix();

  if (backgroundColour === null) {
    renderer.setClearColor(0x000000, 0);
  } else {
    renderer.setClearColor(new THREE.Color(backgroundColour), 1);
  }
  renderer.setViewport(0, 0, pixelWidth, pixelHeight);
  renderer.setScissor(0, 0, pixelWidth, pixelHeight);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);

  // 3D canvases count rows from the bottom, so our picture sits in the bottom-left corner.
  const visibleContext = visibleCanvas.getContext('2d');
  visibleContext.clearRect(0, 0, pixelWidth, pixelHeight);
  visibleContext.drawImage(
    hiddenCanvas,
    0,
    hiddenCanvas.height - pixelHeight,
    pixelWidth,
    pixelHeight,
    0,
    0,
    pixelWidth,
    pixelHeight,
  );
  return { cssWidth, cssHeight };
}
