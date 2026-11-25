// One interactive globe on the page: its scene and camera, how you turn and zoom it, the labels and dots
// drawn over it, and the lime grab rings you can drag (or move with the arrow keys).
//
// Turning and zooming, by design:
//   mouse:     drag empty space to turn; Ctrl (or ⌘) + scroll to zoom; plain scroll moves the page.
//   touch:     one finger scrolls the page; two fingers turn and pinch to zoom.
//   keyboard:  focus the globe and use the arrow keys to turn it; + and − buttons zoom; ⟲ resets the view.
//   grab rings take a one-finger drag or a mouse drag, and the arrow keys when focused.

import * as THREE from 'three';
import { renderIntoCanvas } from './globeRenderer.js';
import { makeEarth, EARTH_RADIUS_IN_KM } from './earthModel.js';
import { toScene, fromScene } from './globeObjects.js';
import { themeColours, whenThemeChanges } from '../theme.js';
import { easeInAndOut, prefersLessMotion, clamp, pixelDensity } from '../pageHelpers.js';

const FIELD_OF_VIEW_IN_DEGREES = 38;
const FARTHEST_CAMERA_IN_KM = 260_000;
const TURN_PER_PIXEL = 0.006;
const KEYBOARD_TURN = 0.08;
const BUTTON_ZOOM_FACTOR = 1.6;
const FLIGHT_SECONDS = 1.6;
const HINT_SECONDS = 2.6;

let hintAlreadyShownForTouch = false;
let hintAlreadyShownForWheel = false;

// home: { target: [x, y, z] in km, towardsCamera: [x, y, z], up: [x, y, z], distanceInKm }
export function makeGlobeView(box, { home, interactive = true, transparentBackground = false, label = 'globe', fieldOfViewInDegrees = FIELD_OF_VIEW_IN_DEGREES }) {
  const canvas = box.querySelector('.globe-picture');
  const overlay = box.querySelector('.globe-overlay');
  const colours = themeColours();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fieldOfViewInDegrees, 1, 1, 2_000_000);
  scene.add(camera);
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.4);
  sunlight.position.set(-0.6, 0.7, 1); // over the viewer's left shoulder
  camera.add(sunlight);
  camera.add(sunlight.target);
  sunlight.target.position.set(0, 0, -1);
  const skyLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(skyLight);

  const earth = makeEarth(colours.isLight);
  scene.add(earth.group);

  // The camera circles a target point. towardsCamera and up are kept at right angles to each other.
  const cameraState = {
    target: new THREE.Vector3(...home.target),
    towardsCamera: new THREE.Vector3(...home.towardsCamera).normalize(),
    up: new THREE.Vector3(...home.up),
    distance: home.distanceInKm,
  };
  straightenUp();

  let flight = null; // an animated camera move in progress
  let lastSize = { cssWidth: 1, cssHeight: 1 };
  const markers = [];
  const grabTargets = [];

  function straightenUp() {
    const along = cameraState.up.dot(cameraState.towardsCamera);
    cameraState.up.addScaledVector(cameraState.towardsCamera, -along).normalize();
  }

  function closestAllowedDistance() {
    const targetHeight = cameraState.target.length();
    return Math.max(40, EARTH_RADIUS_IN_KM + 60 - targetHeight + 60);
  }

  function placeCamera() {
    cameraState.distance = clamp(cameraState.distance, closestAllowedDistance(), FARTHEST_CAMERA_IN_KM);
    // On narrow (tall) screens, step back a little so things at the sides still fit.
    const narrowness = Math.max(1, 1.15 / (lastSize.cssWidth / lastSize.cssHeight));
    camera.position.copy(cameraState.target).addScaledVector(cameraState.towardsCamera, cameraState.distance * narrowness);
    camera.up.copy(cameraState.up);
    camera.lookAt(cameraState.target);
    const heightAboveGround = camera.position.length() - EARTH_RADIUS_IN_KM;
    camera.near = clamp(heightAboveGround * 0.2, 0.5, 5000);
    camera.far = 2_000_000;
    earth.update(heightAboveGround);
  }

  // Turning: spin the camera round its target, left–right about the screen's up, up–down about its right.
  function turnBy(sidewaysAmount, upDownAmount) {
    flight = null;
    const right = new THREE.Vector3().crossVectors(cameraState.up, cameraState.towardsCamera).normalize();
    const sideways = new THREE.Quaternion().setFromAxisAngle(cameraState.up, -sidewaysAmount);
    const upDown = new THREE.Quaternion().setFromAxisAngle(right, -upDownAmount);
    const both = upDown.multiply(sideways);
    cameraState.towardsCamera.applyQuaternion(both).normalize();
    cameraState.up.applyQuaternion(both);
    straightenUp();
  }

  function zoomBy(factor) {
    flight = null;
    cameraState.distance *= factor;
  }

  // Flies the camera smoothly to a new view (or jumps there when less motion is preferred).
  function flyTo({ target, towardsCamera = null, up = null, distanceInKm }) {
    const goal = {
      target: new THREE.Vector3(...target),
      towardsCamera: towardsCamera ? new THREE.Vector3(...towardsCamera).normalize() : cameraState.towardsCamera.clone(),
      up: up ? new THREE.Vector3(...up) : cameraState.up.clone(),
      distance: distanceInKm,
    };
    if (prefersLessMotion()) {
      Object.assign(cameraState, goal);
      straightenUp();
      flight = null;
      return;
    }
    flight = {
      start: {
        target: cameraState.target.clone(),
        towardsCamera: cameraState.towardsCamera.clone(),
        up: cameraState.up.clone(),
        distance: cameraState.distance,
      },
      goal,
      secondsDone: 0,
    };
  }

  function stepFlight(secondsSinceLastFrame) {
    if (flight === null) {
      return;
    }
    flight.secondsDone += secondsSinceLastFrame;
    const fraction = easeInAndOut(Math.min(1, flight.secondsDone / FLIGHT_SECONDS));
    cameraState.target.lerpVectors(flight.start.target, flight.goal.target, fraction);
    cameraState.towardsCamera.lerpVectors(flight.start.towardsCamera, flight.goal.towardsCamera, fraction).normalize();
    cameraState.up.lerpVectors(flight.start.up, flight.goal.up, fraction);
    straightenUp();
    // Distance changes by the same ratio each moment, so zooming feels even.
    cameraState.distance = flight.start.distance * (flight.goal.distance / flight.start.distance) ** fraction;
    if (fraction >= 1) {
      flight = null;
    }
  }

  function resetView() {
    flyTo({ target: home.target, towardsCamera: home.towardsCamera, up: home.up, distanceInKm: home.distanceInKm });
  }

  // ---------- Things drawn over the picture ----------

  // Adds an HTML element that follows a 3D point. Returns the element; call setPoint each frame.
  function addMarker(className, innerHtml = '') {
    const element = document.createElement('div');
    element.className = `marker ${className}`;
    element.innerHTML = innerHtml;
    overlay.appendChild(element);
    const marker = { element, pointInKm: null, offsetX: 0, offsetY: 0, fadesBehindEarth: true };
    markers.push(marker);
    return {
      element,
      setPoint(pointInMetres, offsetX = 0, offsetY = 0) {
        marker.pointInKm = pointInMetres ? toScene(pointInMetres) : null;
        marker.offsetX = offsetX;
        marker.offsetY = offsetY;
      },
      setVisible(isVisible) {
        element.classList.toggle('is-hidden', !isVisible);
      },
    };
  }

  // Is a point hidden behind the Earth, as seen from the camera?
  function isBehindEarth(pointInKm) {
    const towardsPoint = new THREE.Vector3().subVectors(pointInKm, camera.position);
    const distanceToPoint = towardsPoint.length();
    towardsPoint.divideScalar(distanceToPoint);
    const along = -camera.position.dot(towardsPoint);
    const closestApproachSquared = camera.position.lengthSq() - along * along;
    const radius = EARTH_RADIUS_IN_KM - 2;
    if (closestApproachSquared > radius * radius || along < 0) {
      return false;
    }
    const firstHit = along - Math.sqrt(radius * radius - closestApproachSquared);
    return firstHit < distanceToPoint - 1;
  }

  function projectToScreen(pointInKm) {
    const projected = pointInKm.clone().project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * lastSize.cssWidth,
      y: (-projected.y * 0.5 + 0.5) * lastSize.cssHeight,
      isInFront: projected.z < 1,
    };
  }

  function positionOverlay() {
    markers.forEach((marker) => {
      if (marker.pointInKm === null) {
        marker.element.style.visibility = 'hidden';
        return;
      }
      const screen = projectToScreen(marker.pointInKm);
      marker.element.style.visibility = screen.isInFront ? '' : 'hidden';
      marker.element.style.transform = `translate(${screen.x + marker.offsetX}px, ${screen.y + marker.offsetY}px)`;
      marker.element.classList.toggle('is-behind', marker.fadesBehindEarth && isBehindEarth(marker.pointInKm));
    });
    grabTargets.forEach((grabTarget) => {
      const pointInKm = toScene(grabTarget.getPointInMetres());
      const screen = projectToScreen(pointInKm);
      const hidden = !screen.isInFront || isBehindEarth(pointInKm);
      grabTarget.button.classList.toggle('is-hidden', hidden && document.activeElement !== grabTarget.button);
      grabTarget.button.style.transform = `translate(${screen.x}px, ${screen.y}px)`;
    });
  }

  // The ray from the camera through a point on screen (in CSS pixels inside the box).
  function rayThroughScreenPoint(x, y) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2((x / lastSize.cssWidth) * 2 - 1, -(y / lastSize.cssHeight) * 2 + 1), camera);
    return raycaster.ray;
  }

  // Where that ray first meets a ball of the given radius round the Earth's centre, in metres, or null.
  function screenPointOnShell(x, y, shellRadiusInMetres) {
    const ray = rayThroughScreenPoint(x, y);
    const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), shellRadiusInMetres / 1000);
    const hit = ray.intersectSphere(sphere, new THREE.Vector3());
    return hit ? fromScene(hit) : null;
  }

  // A lime dashed ring you can drag. onDragTo receives screen coordinates; onArrowKey receives
  // (stepsRight, stepsUp, isBigStep). describe() returns what a screen reader should hear.
  function addGrabTarget({ name, getPointInMetres, onDragTo, onArrowKey, describe, onDragEnd = () => {} }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grab-ring';
    button.setAttribute('aria-label', `${name}. Arrow keys move it.`);
    overlay.appendChild(button);
    const grabTarget = { button, getPointInMetres };
    grabTargets.push(grabTarget);

    let activePointer = null;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      activePointer = event.pointerId;
      button.setPointerCapture(event.pointerId);
      button.classList.add('is-dragging');
      flight = null;
    });
    button.addEventListener('pointermove', (event) => {
      if (event.pointerId !== activePointer) {
        return;
      }
      const rectangle = box.getBoundingClientRect();
      onDragTo(event.clientX - rectangle.left, event.clientY - rectangle.top);
    });
    const stopDragging = (event) => {
      if (event.pointerId !== activePointer) {
        return;
      }
      activePointer = null;
      button.classList.remove('is-dragging');
      button.setAttribute('aria-label', `${name}, ${describe()}. Arrow keys move it.`);
      onDragEnd();
    };
    button.addEventListener('pointerup', stopDragging);
    button.addEventListener('pointercancel', stopDragging);
    button.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });
    button.addEventListener('keydown', (event) => {
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      const move = moves[event.key];
      if (!move) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onArrowKey(move[0], move[1], event.shiftKey);
      liveRegion.textContent = `${name}, ${describe()}`;
    });
    button.addEventListener('focus', () => {
      button.setAttribute('aria-label', `${name}, ${describe()}. Arrow keys move it.`);
    });
    return grabTarget;
  }

  // ---------- Controls: buttons, mouse, touch, wheel, keyboard ----------

  const liveRegion = document.createElement('p');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('aria-live', 'polite');
  box.appendChild(liveRegion);

  let hint = null;
  let hintTimer = null;
  function showHint(text) {
    if (hint === null) {
      hint = document.createElement('p');
      hint.className = 'globe-hint';
      box.appendChild(hint);
    }
    hint.textContent = text;
    hint.hidden = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      hint.hidden = true;
    }, HINT_SECONDS * 1000);
  }

  if (interactive) {
    box.tabIndex = 0;
    box.setAttribute('aria-description', 'Arrow keys turn the Earth.');
    const buttonRow = document.createElement('div');
    buttonRow.className = 'globe-buttons';
    buttonRow.innerHTML = `
      <button type="button" class="globe-button" data-action="zoom-in" aria-label="Zoom in on the ${label}">+</button>
      <button type="button" class="globe-button" data-action="zoom-out" aria-label="Zoom out from the ${label}">−</button>
      <button type="button" class="globe-button globe-button-reset" data-action="reset" aria-label="Reset the view of the ${label}">⟲</button>`;
    box.appendChild(buttonRow);
    buttonRow.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'zoom-in') zoomBy(1 / BUTTON_ZOOM_FACTOR);
      if (action === 'zoom-out') zoomBy(BUTTON_ZOOM_FACTOR);
      if (action === 'reset') resetView();
    });
    buttonRow.addEventListener('pointerdown', (event) => event.stopPropagation());
    buttonRow.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });

    box.addEventListener('keydown', (event) => {
      if (event.target !== box) {
        return;
      }
      const turns = { ArrowLeft: [-KEYBOARD_TURN, 0], ArrowRight: [KEYBOARD_TURN, 0], ArrowUp: [0, -KEYBOARD_TURN], ArrowDown: [0, KEYBOARD_TURN] };
      const turn = turns[event.key];
      if (turn) {
        event.preventDefault();
        turnBy(turn[0], turn[1]);
      }
      if (event.key === '+' || event.key === '=') zoomBy(1 / BUTTON_ZOOM_FACTOR);
      if (event.key === '-') zoomBy(BUTTON_ZOOM_FACTOR);
    });

    // Mouse and pen: drag on empty space turns the globe.
    let mouseDrag = null;
    box.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch' || event.button !== 0) {
        return;
      }
      mouseDrag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      box.setPointerCapture(event.pointerId);
      box.classList.add('is-turning');
    });
    box.addEventListener('pointermove', (event) => {
      if (!mouseDrag || event.pointerId !== mouseDrag.pointerId) {
        return;
      }
      turnBy((event.clientX - mouseDrag.x) * TURN_PER_PIXEL, (event.clientY - mouseDrag.y) * TURN_PER_PIXEL);
      mouseDrag.x = event.clientX;
      mouseDrag.y = event.clientY;
    });
    const endMouseDrag = () => {
      mouseDrag = null;
      box.classList.remove('is-turning');
    };
    box.addEventListener('pointerup', endMouseDrag);
    box.addEventListener('pointercancel', endMouseDrag);

    // Wheel: plain scroll moves the page; Ctrl or ⌘ + scroll (and trackpad pinch) zooms.
    box.addEventListener(
      'wheel',
      (event) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          zoomBy(Math.exp(event.deltaY * 0.004));
        } else if (!hintAlreadyShownForWheel) {
          hintAlreadyShownForWheel = true;
          showHint('Hold Ctrl (or ⌘) and scroll to zoom');
        }
      },
      { passive: false },
    );

    // Touch: one finger scrolls the page (we leave it alone); two fingers turn and pinch.
    let pinch = null;
    const twoFingerMiddle = (touches) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
      spread: Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY),
    });
    box.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length === 2) {
          event.preventDefault();
          pinch = twoFingerMiddle(event.touches);
          flight = null;
        } else if (event.touches.length === 1 && !hintAlreadyShownForTouch) {
          hintAlreadyShownForTouch = true;
          showHint('Use two fingers to turn the Earth');
        }
      },
      { passive: false },
    );
    box.addEventListener(
      'touchmove',
      (event) => {
        if (event.touches.length !== 2 || pinch === null) {
          return;
        }
        event.preventDefault();
        const now = twoFingerMiddle(event.touches);
        turnBy((now.x - pinch.x) * TURN_PER_PIXEL, (now.y - pinch.y) * TURN_PER_PIXEL);
        if (pinch.spread > 0 && now.spread > 0) {
          zoomBy(pinch.spread / now.spread);
        }
        pinch = now;
      },
      { passive: false },
    );
    box.addEventListener('touchend', (event) => {
      if (event.touches.length < 2) {
        pinch = null;
      }
    });
  }

  // ---------- Theme and drawing ----------

  let currentBackground = transparentBackground ? null : colours.drawingBackground;
  whenThemeChanges((newColours) => {
    earth.applyTheme(newColours.isLight);
    currentBackground = transparentBackground ? null : newColours.drawingBackground;
  });

  function render(secondsSinceLastFrame) {
    stepFlight(secondsSinceLastFrame);
    placeCamera();
    const density = pixelDensity();
    scene.traverse((object) => {
      if (object.userData.widthInCssPixels) {
        object.material.linewidth = object.userData.widthInCssPixels * density;
      }
    });
    lastSize = renderIntoCanvas(scene, camera, canvas, currentBackground);
    positionOverlay();
  }

  placeCamera();

  return { scene, render, flyTo, turnBy, addMarker, addGrabTarget, screenPointOnShell };
}
