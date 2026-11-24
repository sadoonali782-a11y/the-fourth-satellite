// Step 1: a satellite on an arc above a person, its timed message travelling down, a stopwatch and the sum.
// The ground is drawn as the edge of the same Earth the globes show, seen from the side.

import { themeColours } from '../theme.js';
import { earthColours } from '../earthColours.js';
import { prepareCanvas, drawPerson, drawSatelliteIcon, drawLabel, hexWithAlpha } from '../drawing/flatDrawing.js';
import {
  makeCaptionWriter,
  setTextIfChanged,
  formatWholeNumber,
  formatOneDecimal,
  animateWhileOnScreen,
  prefersLessMotion,
} from '../pageHelpers.js';
import {
  distanceToSatelliteAtElevation,
  messageDelayAtElevation,
  MESSAGE_SLOW_DOWN,
  RESULT_STAYS_FOR_SECONDS,
} from '../math/timingModel.js';

const DEGREES_TO_RADIANS = Math.PI / 180;

function describeAngle(elevationInDegrees) {
  if (elevationInDegrees > 75) {
    return 'right overhead';
  }
  if (elevationInDegrees < 15) {
    return 'near the horizon';
  }
  return `${elevationInDegrees}° up`;
}

export function startTimingStep() {
  const canvas = document.getElementById('timing-drawing');
  const angleSlider = document.getElementById('timing-angle');
  const angleValue = document.getElementById('timing-angle-value');
  const stopwatch = document.getElementById('timing-stopwatch');
  const sendAgainButton = document.getElementById('timing-send-again');
  const writeResult = makeCaptionWriter(document.getElementById('timing-result'));

  const state = {
    elevationInDegrees: Number(angleSlider.value),
    secondsSinceSent: 0,
    isWaitingForSendAgain: false,
  };

  function sendNewMessage() {
    state.secondsSinceSent = 0;
    state.isWaitingForSendAgain = false;
  }

  angleSlider.addEventListener('input', () => {
    state.elevationInDegrees = Number(angleSlider.value);
    setTextIfChanged(angleValue, describeAngle(state.elevationInDegrees));
    sendNewMessage();
  });
  sendAgainButton.addEventListener('click', sendNewMessage);

  function drawFrame(secondsSinceLastFrame) {
    const tripSeconds = messageDelayAtElevation(state.elevationInDegrees) * MESSAGE_SLOW_DOWN;
    if (!state.isWaitingForSendAgain) {
      state.secondsSinceSent += secondsSinceLastFrame;
    }
    if (state.secondsSinceSent > tripSeconds + RESULT_STAYS_FOR_SECONDS) {
      if (prefersLessMotion()) {
        state.isWaitingForSendAgain = true;
        state.secondsSinceSent = tripSeconds + RESULT_STAYS_FOR_SECONDS;
      } else {
        sendNewMessage();
      }
    }
    const hasArrived = state.secondsSinceSent >= tripSeconds;
    const tripFraction = Math.min(1, state.secondsSinceSent / tripSeconds);

    drawScene(tripFraction, hasArrived);
    updateReadOut(tripFraction, hasArrived);
  }

  function updateReadOut(tripFraction, hasArrived) {
    const delayInMilliseconds = messageDelayAtElevation(state.elevationInDegrees) * 1000;
    const shownMilliseconds = hasArrived ? delayInMilliseconds : delayInMilliseconds * tripFraction;
    setTextIfChanged(stopwatch, `${formatOneDecimal(shownMilliseconds)} ms`);
    stopwatch.classList.toggle('is-arrived', hasArrived);
    if (hasArrived) {
      const distanceInKilometres = distanceToSatelliteAtElevation(state.elevationInDegrees) / 1000;
      writeResult(
        `<strong>${formatOneDecimal(delayInMilliseconds)} ms</strong> × 300,000 km a second = <strong>${formatWholeNumber(distanceInKilometres)} km</strong> away`,
      );
    } else {
      writeResult('The message is on its way…');
    }
  }

  function drawScene(tripFraction, hasArrived) {
    const colours = themeColours();
    const earth = earthColours(colours.isLight);
    const { context, width, height } = prepareCanvas(canvas);
    context.fillStyle = colours.drawingBackground;
    context.fillRect(0, 0, width, height);

    // The Earth's edge: a huge circle whose top just shows along the bottom of the drawing.
    const groundY = height - 44;
    const earthRadius = Math.max(width, 600) * 1.8;
    const earthCentreX = width / 2;
    const earthCentreY = groundY + earthRadius;

    const glow = context.createRadialGradient(earthCentreX, earthCentreY, earthRadius, earthCentreX, earthCentreY, earthRadius + 34);
    glow.addColorStop(0, hexWithAlpha(earth.atmosphere, 0.35));
    glow.addColorStop(1, hexWithAlpha(earth.atmosphere, 0));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(earthCentreX, earthCentreY, earthRadius + 34, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = earth.ocean;
    context.beginPath();
    context.arc(earthCentreX, earthCentreY, earthRadius, 0, Math.PI * 2);
    context.fill();

    // A stretch of land under the person, with a coastline on each side.
    const landHalfAngle = Math.min(0.2, (width * 0.34) / earthRadius);
    context.fillStyle = earth.landGreen;
    context.beginPath();
    context.moveTo(earthCentreX, earthCentreY);
    context.arc(earthCentreX, earthCentreY, earthRadius, -Math.PI / 2 - landHalfAngle, -Math.PI / 2 + landHalfAngle);
    context.closePath();
    context.fill();
    context.strokeStyle = earth.coastline;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(earthCentreX, earthCentreY, earthRadius, -Math.PI / 2 - landHalfAngle, -Math.PI / 2 + landHalfAngle);
    context.stroke();

    // The person, standing on top of the Earth.
    const personX = width / 2;
    const personSize = 54;
    const phone = drawPerson(context, personX, groundY, personSize, colours);

    // The arc of places the satellite could be: from the left horizon, overhead, to the right horizon.
    const arcRadius = Math.min(width * 0.43, groundY - 40);
    context.save();
    context.strokeStyle = colours.line;
    context.lineWidth = 1.5;
    context.setLineDash([5, 6]);
    context.beginPath();
    context.arc(personX, groundY, arcRadius, Math.PI, 2 * Math.PI);
    context.stroke();
    context.restore();

    const elevation = state.elevationInDegrees * DEGREES_TO_RADIANS;
    const satelliteX = personX - arcRadius * Math.cos(elevation);
    const satelliteY = groundY - arcRadius * Math.sin(elevation);

    context.save();
    context.strokeStyle = colours.line;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(satelliteX, satelliteY);
    context.lineTo(phone.phoneX, phone.phoneY);
    context.stroke();
    context.restore();

    drawSatelliteIcon(context, satelliteX, satelliteY, colours);
    drawLabel(context, 'Satellite A', satelliteX, satelliteY - 20, colours);

    if (hasArrived) {
      context.save();
      context.strokeStyle = colours.limeFill;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(personX, groundY - personSize * 0.72, personSize * 0.42, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    } else {
      const messageX = satelliteX + (phone.phoneX - satelliteX) * tripFraction;
      const messageY = satelliteY + (phone.phoneY - satelliteY) * tripFraction;
      context.save();
      context.fillStyle = colours.violet;
      context.strokeStyle = colours.violet;
      context.beginPath();
      context.arc(messageX, messageY, 5, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(messageX, messageY, 10, 0, Math.PI * 2);
      context.stroke();
      context.restore();
      const labelOnRight = messageX < width * 0.62;
      drawLabel(context, '“A here. It’s 12:00:00.000”', messageX + (labelOnRight ? 16 : -16), messageY, colours, {
        colour: colours.violet,
        size: 12.5,
        align: labelOnRight ? 'left' : 'right',
        weight: 600,
        font: 'JetBrains Mono',
      });
    }

    drawLabel(context, `slowed down ${MESSAGE_SLOW_DOWN}×`, width - 12, 16, colours, {
      colour: colours.muted,
      size: 12.5,
      align: 'right',
      weight: 500,
      font: 'Inter',
    });
  }

  animateWhileOnScreen(canvas, drawFrame);
}
