// Step 5: a street between two buildings seen end on, a turning sky of 16 satellites, straight / bounced /
// blocked signals, and a map from above with the blue dot. The maths lives in math/streetSignals.js.

import { themeColours } from '../theme.js';
import { earthColours } from '../earthColours.js';
import { prepareCanvas, drawPerson, drawBlueDot, drawLabel, hexWithAlpha } from '../drawing/flatDrawing.js';
import { makeCaptionWriter, setTextIfChanged, formatWholeNumber, formatOneDecimal, animateWhileOnScreen, prefersLessMotion, clamp } from '../pageHelpers.js';
import { makeRandomNumberGenerator } from '../math/randomNumbers.js';
import { DEGREES_TO_RADIANS } from '../math/physics.js';
import {
  STREET_WIDTH_IN_METRES,
  PHONE_HEIGHT_IN_METRES,
  makeSkyStartingAngles,
  skyAnglesAfter,
  measureStreetSignals,
  heardSignals,
  findStreetPosition,
  buildingHeights,
  isInsideTheStreet,
} from '../math/streetSignals.js';

const SECONDS_BETWEEN_ANSWERS = 0.5;
const LONGEST_TRAIL = 30;
const FLOOR_HEIGHT_IN_METRES = 4;
const WINDOW_SPACING_IN_METRES = 3;

export function startCityStep() {
  const streetCanvas = document.getElementById('city-street-drawing');
  const mapCanvas = document.getElementById('city-map-drawing');
  const heightSlider = document.getElementById('city-height');
  const standSlider = document.getElementById('city-stand');
  const pauseButton = document.getElementById('city-pause');
  const writeCaption = makeCaptionWriter(document.getElementById('city-caption'));
  const counts = {
    straight: document.getElementById('city-count-straight'),
    bounced: document.getElementById('city-count-bounced'),
    blocked: document.getElementById('city-count-blocked'),
  };

  const state = {
    skyStartingAngles: makeSkyStartingAngles(),
    secondsOfTurning: 0,
    skyIsPaused: prefersLessMotion(),
    leftBuildingHeight: Number(heightSlider.value),
    standingAcross: Number(standSlider.value),
    secondsUntilNextAnswer: 0,
    trail: [], // earlier answers, newest first: { acrossInMetres }
    latestAnswer: null,
    hasHadAnAnswer: false,
    signals: [],
    nextRandomNumber: makeRandomNumberGenerator(2026),
  };

  function showPauseState() {
    pauseButton.textContent = state.skyIsPaused ? 'Play the sky' : 'Pause the sky';
    pauseButton.setAttribute('aria-pressed', String(state.skyIsPaused));
  }
  showPauseState();

  function clearTrail() {
    state.trail = [];
    state.latestAnswer = null;
    state.hasHadAnAnswer = false;
    state.secondsUntilNextAnswer = 0;
  }

  heightSlider.addEventListener('input', () => {
    state.leftBuildingHeight = Number(heightSlider.value);
    clearTrail();
  });
  standSlider.addEventListener('input', () => {
    state.standingAcross = Number(standSlider.value);
    clearTrail();
  });
  pauseButton.addEventListener('click', () => {
    state.skyIsPaused = !state.skyIsPaused;
    showPauseState();
  });

  // Every signal as it is right now. With nextRandomNumber, each heard signal also gets a little noise.
  function signalsNow(nextRandomNumber = null) {
    return measureStreetSignals({
      skyAngles: skyAnglesAfter(state.skyStartingAngles, state.secondsOfTurning),
      standingAcrossInMetres: state.standingAcross,
      leftBuildingHeightInMetres: state.leftBuildingHeight,
      nextRandomNumber,
    });
  }

  // The phone's answer from a fresh, slightly noisy measurement.
  function workOutNewAnswer() {
    const answer = findStreetPosition(signalsNow(state.nextRandomNumber));
    if (answer) {
      state.latestAnswer = answer;
      state.hasHadAnAnswer = true;
      state.trail.unshift(answer);
      state.trail.length = Math.min(state.trail.length, LONGEST_TRAIL);
    } else {
      state.latestAnswer = null;
    }
  }

  function drawFrame(secondsSinceLastFrame) {
    if (!state.skyIsPaused) {
      state.secondsOfTurning += secondsSinceLastFrame;
    }
    state.secondsUntilNextAnswer -= secondsSinceLastFrame;
    if (state.secondsUntilNextAnswer <= 0) {
      workOutNewAnswer();
      state.secondsUntilNextAnswer = SECONDS_BETWEEN_ANSWERS;
    }
    // The drawing always shows the sky as it is now (no noise needed to draw paths).
    state.signals = signalsNow();

    const colours = themeColours();
    drawStreet(colours);
    drawMap(colours);
    updateCountsAndCaption();
  }

  function updateCountsAndCaption() {
    const tally = { straight: 0, bounced: 0, blocked: 0 };
    state.signals.forEach((signal) => {
      tally[signal.fate] += 1;
    });
    Object.keys(tally).forEach((fate) => setTextIfChanged(counts[fate], String(tally[fate])));

    if (state.latestAnswer === null) {
      const heardCount = heardSignals(state.signals).length;
      const satelliteWord = heardCount === 1 ? 'satellite' : 'satellites';
      let text = `<strong>No fix.</strong> The phone hears ${heardCount} ${satelliteWord} and needs 3.`;
      if (state.hasHadAnAnswer) {
        text += ' The faded dot is its last answer.';
      }
      writeCaption(text);
      return;
    }
    const offset = state.latestAnswer.acrossInMetres - state.standingAcross;
    if (Math.abs(offset) <= 1) {
      writeCaption('The blue dot is <strong>right where you are</strong>.');
      return;
    }
    const side = offset > 0 ? 'right' : 'left';
    let text = `The blue dot is <strong>${formatOneDecimal(Math.abs(offset))} m to your ${side}</strong>`;
    if (!isInsideTheStreet(state.latestAnswer.acrossInMetres)) {
      text += ', <strong>inside a building</strong>';
    }
    writeCaption(`${text}.`);
  }

  function drawStreet(colours) {
    const earth = earthColours(colours.isLight);
    const { context, width, height } = prepareCanvas(streetCanvas);
    const { leftHeight, rightHeight } = buildingHeights(state.leftBuildingHeight);

    // Scale so the street, both roofs and some sky always fit.
    const groundBand = 26;
    const groundY = height - groundBand;
    const metresAcrossShown = STREET_WIDTH_IN_METRES + 16;
    const metresUpShown = leftHeight * 1.12 + 8;
    const pixelsPerMetre = Math.min(width / metresAcrossShown, (groundY - 18) / metresUpShown);
    const streetLeftX = width / 2 - (STREET_WIDTH_IN_METRES / 2) * pixelsPerMetre;
    const toScreen = (across, up) => [streetLeftX + across * pixelsPerMetre, groundY - up * pixelsPerMetre];

    // Sky with the same faint atmosphere glow as the globe, then the ground.
    context.fillStyle = colours.drawingBackground;
    context.fillRect(0, 0, width, height);
    const sky = context.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, hexWithAlpha(earth.atmosphere, 0));
    sky.addColorStop(1, hexWithAlpha(earth.atmosphere, 0.18));
    context.fillStyle = sky;
    context.fillRect(0, 0, width, groundY);
    context.fillStyle = earth.landGreen;
    context.fillRect(0, groundY, width, 4);
    context.fillStyle = colours.ground;
    context.fillRect(0, groundY + 4, width, groundBand);

    // Buildings: solid blocks from the street walls out to the drawing's edges, with faint windows.
    drawBuilding(context, colours, 0, toScreen(0, leftHeight)[1], toScreen(0, 0)[0], groundY, leftHeight, pixelsPerMetre, 'left');
    drawBuilding(context, colours, toScreen(STREET_WIDTH_IN_METRES, 0)[0], toScreen(0, rightHeight)[1], width, groundY, rightHeight, pixelsPerMetre, 'right');
    drawRoofLabel(context, colours, toScreen(0, leftHeight), `${formatWholeNumber(leftHeight)} m tall`, 'left');
    drawRoofLabel(context, colours, toScreen(STREET_WIDTH_IN_METRES, rightHeight), `${formatWholeNumber(rightHeight)} m tall`, 'right');

    // Signals.
    const [phoneX, phoneY] = toScreen(state.standingAcross, PHONE_HEIGHT_IN_METRES);
    state.signals.forEach((signal) => {
      const angle = signal.angleInDegrees * DEGREES_TO_RADIANS;
      const screenDirection = [Math.cos(angle), -Math.sin(angle)]; // towards the satellite, on screen
      if (signal.fate === 'straight') {
        const edge = pointAtDrawingEdge(phoneX, phoneY, screenDirection, width, height);
        drawSignalLine(context, [edge, [phoneX, phoneY]], colours.blue, []);
        drawDirectionDot(context, edge, screenDirection, colours);
      } else if (signal.fate === 'bounced') {
        const reflection = toScreen(signal.reflectionPoint[0], signal.reflectionPoint[1]);
        const edge = pointAtDrawingEdge(reflection[0], reflection[1], screenDirection, width, height);
        drawSignalLine(context, [edge, reflection, [phoneX, phoneY]], colours.limeFill, [7, 5]);
        context.fillStyle = colours.limeFill;
        context.beginPath();
        context.arc(reflection[0], reflection[1], 3.5, 0, Math.PI * 2);
        context.fill();
        drawDirectionDot(context, edge, screenDirection, colours);
      } else {
        const corner = toScreen(signal.blockingCorner[0], signal.blockingCorner[1]);
        const edge = pointAtDrawingEdge(corner[0], corner[1], screenDirection, width, height);
        drawSignalLine(context, [edge, corner], colours.muted, [2, 4]);
        drawCross(context, corner, colours.muted);
      }
    });

    drawPerson(context, phoneX - 10, groundY, Math.max(30, pixelsPerMetre * 1.8), colours);
  }

  function drawMap(colours) {
    const earth = earthColours(colours.isLight);
    const { context, width, height } = prepareCanvas(mapCanvas);
    const pixelsPerMetre = width / (STREET_WIDTH_IN_METRES + 14);
    const streetLeftX = width / 2 - (STREET_WIDTH_IN_METRES / 2) * pixelsPerMetre;
    const streetRightX = streetLeftX + STREET_WIDTH_IN_METRES * pixelsPerMetre;
    const toScreenX = (across) => streetLeftX + across * pixelsPerMetre;

    context.fillStyle = colours.building;
    context.fillRect(0, 0, width, height);
    context.fillStyle = earth.landGreen;
    context.fillRect(streetLeftX - 3, 0, STREET_WIDTH_IN_METRES * pixelsPerMetre + 6, height);
    context.fillStyle = colours.street;
    context.fillRect(streetLeftX, 0, streetRightX - streetLeftX, height);
    context.save();
    context.strokeStyle = colours.line;
    context.lineWidth = 2;
    context.setLineDash([10, 10]);
    context.beginPath();
    context.moveTo(width / 2, 0);
    context.lineTo(width / 2, height);
    context.stroke();
    context.restore();

    const youY = height * 0.66;
    const youX = toScreenX(state.standingAcross);
    context.save();
    context.strokeStyle = colours.text;
    context.lineWidth = 1.5;
    context.setLineDash([4, 4]);
    context.beginPath();
    context.arc(youX, youY, 13, 0, Math.PI * 2);
    context.stroke();
    context.restore();
    drawLabel(context, 'you', youX, youY + 26, colours, { size: 12.5 });

    const edgeMargin = 12;
    const keepInside = (x) => clamp(x, edgeMargin, width - edgeMargin);
    const trailStep = (youY - 18) / LONGEST_TRAIL;
    for (let index = state.trail.length - 1; index >= 1; index -= 1) {
      const x = keepInside(toScreenX(state.trail[index].acrossInMetres));
      const y = youY - index * trailStep;
      context.globalAlpha = 0.75 * (1 - index / (LONGEST_TRAIL + 2));
      context.fillStyle = colours.blue;
      context.beginPath();
      context.arc(x, y, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    if (state.trail.length > 0) {
      const newest = state.latestAnswer || state.trail[0];
      const alpha = state.latestAnswer ? 1 : 0.4;
      drawBlueDot(context, keepInside(toScreenX(newest.acrossInMetres)), youY, 8, colours, alpha);
    }
  }

  animateWhileOnScreen(streetCanvas, drawFrame);
}

function drawBuilding(context, colours, leftX, topY, rightX, bottomY, heightInMetres, pixelsPerMetre, side) {
  context.fillStyle = colours.building;
  context.fillRect(leftX, topY, rightX - leftX, bottomY - topY);
  const wholeFloors = Math.floor(heightInMetres / FLOOR_HEIGHT_IN_METRES);
  const windowWidth = Math.max(2, pixelsPerMetre * 1.2);
  const windowHeight = Math.max(2, pixelsPerMetre * 1.6);
  context.fillStyle = colours.line;
  const streetWallX = side === 'left' ? rightX : leftX;
  const awayFromStreet = side === 'left' ? -1 : 1;
  for (let floor = 0; floor < wholeFloors; floor += 1) {
    const windowY = bottomY - (floor + 1) * FLOOR_HEIGHT_IN_METRES * pixelsPerMetre + pixelsPerMetre * 1.2;
    for (let column = 0; ; column += 1) {
      const centreX = streetWallX + awayFromStreet * (1.5 + column * WINDOW_SPACING_IN_METRES) * pixelsPerMetre;
      if (centreX < leftX + 2 || centreX > rightX - 2) {
        break;
      }
      context.fillRect(centreX - windowWidth / 2, windowY, windowWidth, windowHeight);
    }
  }
}

function drawRoofLabel(context, colours, [cornerX, cornerY], text, side) {
  const lineLength = 34;
  const direction = side === 'left' ? -1 : 1;
  context.save();
  context.strokeStyle = colours.text;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(cornerX, cornerY);
  context.lineTo(cornerX + direction * lineLength, cornerY);
  context.stroke();
  context.restore();
  drawLabel(context, text, cornerX + direction * 6, cornerY - 11, colours, { size: 12.5, align: side === 'left' ? 'right' : 'left' });
}

// Walks from a point in a direction until it reaches the edge of the drawing.
function pointAtDrawingEdge(x, y, [directionX, directionY], width, height) {
  const steps = [];
  if (directionX > 1e-9) steps.push((width - x) / directionX);
  if (directionX < -1e-9) steps.push(-x / directionX);
  if (directionY < -1e-9) steps.push(-y / directionY);
  if (directionY > 1e-9) steps.push((height - y) / directionY);
  const distance = Math.max(0, Math.min(...steps));
  return [x + directionX * distance, y + directionY * distance];
}

function drawSignalLine(context, points, colour, dashPattern) {
  context.save();
  context.strokeStyle = colour;
  context.lineWidth = 2;
  context.setLineDash(dashPattern);
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
  context.stroke();
  context.restore();
}

function drawDirectionDot(context, [edgeX, edgeY], [directionX, directionY], colours) {
  context.fillStyle = colours.violet;
  context.beginPath();
  context.arc(edgeX - directionX * 9, edgeY - directionY * 9, 4, 0, Math.PI * 2);
  context.fill();
}

function drawCross(context, [x, y], colour) {
  context.save();
  context.strokeStyle = colour;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 5, y - 5);
  context.lineTo(x + 5, y + 5);
  context.moveTo(x + 5, y - 5);
  context.lineTo(x - 5, y + 5);
  context.stroke();
  context.restore();
}
