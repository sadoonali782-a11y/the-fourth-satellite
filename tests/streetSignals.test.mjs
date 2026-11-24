// Checks on step 5's street: bounce lengths, and how bounces push the dot. Run: node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  bounceExtraDistance,
  traceSignal,
  measureStreetSignals,
  findStreetPosition,
  makeSkyStartingAngles,
  skyAnglesAfter,
  PHONE_HEIGHT_IN_METRES,
} from '../site/js/math/streetSignals.js';

test('a bounce adds 2 × distance from the wall × cos(elevation)', () => {
  assert.ok(Math.abs(bounceExtraDistance(10, 60) - 10) < 1e-9);
  assert.ok(Math.abs(bounceExtraDistance(5, 0) - 10) < 1e-9);

  // A satellite low on the right, blocked by the right building, bouncing off the left wall.
  const path = traceSignal({ angleInDegrees: 60, acrossInMetres: 6, heightInMetres: PHONE_HEIGHT_IN_METRES, leftHeight: 40, rightHeight: 32 });
  assert.equal(path.fate, 'bounced');
  assert.ok(Math.abs(path.extraDistanceInMetres - 2 * 6 * Math.cos((60 * Math.PI) / 180)) < 1e-9);
});

test('overhead signals come straight; very low ones behind a tall roof are blocked', () => {
  const buildings = { leftHeight: 80, rightHeight: 64 };
  assert.equal(traceSignal({ angleInDegrees: 90, acrossInMetres: 11, heightInMetres: 1.4, ...buildings }).fate, 'straight');
  assert.equal(traceSignal({ angleInDegrees: 8, acrossInMetres: 11, heightInMetres: 1.4, ...buildings }).fate, 'blocked');
});

test('with tall buildings, bounced signals push the dot away from you', () => {
  const skyAngles = skyAnglesAfter(makeSkyStartingAngles(), 37);
  const signals = measureStreetSignals({ skyAngles, standingAcrossInMetres: 6, leftBuildingHeightInMetres: 40 });
  assert.ok(signals.some((signal) => signal.fate === 'bounced'), 'some signals bounce');
  const answer = findStreetPosition(signals);
  assert.ok(answer === null || Math.abs(answer.acrossInMetres - 6) > 1, 'a bounce makes the answer wrong');
});

test('with open sky (1 m buildings) the phone lands on you', () => {
  const skyAngles = makeSkyStartingAngles();
  const signals = measureStreetSignals({ skyAngles, standingAcrossInMetres: 6, leftBuildingHeightInMetres: 1 });
  const answer = findStreetPosition(signals);
  assert.ok(Math.abs(answer.acrossInMetres - 6) < 0.05);
});
