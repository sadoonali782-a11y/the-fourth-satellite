// Starts everything that needs 3D: the opening sky and steps 2, 3 and 4.
// If 3D can't run, this throws and main.js shows the plain-words messages instead.

import { getSharedRenderer } from './globeRenderer.js';
import { loadCoastlines } from './earthModel.js';
import { startOpeningSky } from '../steps/openingSky.js';
import { startSpheresStep } from '../steps/spheresStep.js';
import { startClockStep } from '../steps/clockStep.js';
import { startWobbleStep } from '../steps/wobbleStep.js';

export async function startGlobeSteps() {
  getSharedRenderer(); // throws if this browser has no 3D graphics
  await loadCoastlines();
  startOpeningSky();
  startSpheresStep();
  startClockStep();
  startWobbleStep();
}
