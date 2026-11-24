// Starts the page: theme switch, top bar, footnotes, links, and every step.
// The 2D steps start first; the 3D globe steps are loaded separately so that, if 3D can't run,
// the rest of the page still works.

import { SITE_SETTINGS } from './settings.js';
import { startThemeSwitch } from './theme.js';
import { prefersLessMotion, whenMotionPreferenceChanges } from './pageHelpers.js';
import { startTimingStep } from './steps/timingStep.js';
import { startCityStep } from './steps/cityStep.js';

document.documentElement.classList.add('scripts-running');

function markMotionPreference() {
  document.documentElement.classList.toggle('prefers-less-motion', prefersLessMotion());
}

function fillInRepositoryLinks() {
  document.querySelectorAll('.repository-link').forEach((link) => {
    link.href = SITE_SETTINGS.repositoryAddress;
  });
}

// Highlights the step being read: the last step whose top has scrolled above the middle of the window.
// Also fills the progress line under the top bar.
function startTopBar() {
  const stepLinks = [...document.querySelectorAll('[data-step-link]')];
  const steps = stepLinks.map((link) => document.getElementById(link.dataset.stepLink));
  const progressFill = document.getElementById('scroll-progress-fill');

  function update() {
    const middleOfWindow = window.innerHeight / 2;
    let currentIndex = -1;
    steps.forEach((step, index) => {
      if (step.getBoundingClientRect().top < middleOfWindow) {
        currentIndex = index;
      }
    });
    stepLinks.forEach((link, index) => {
      const isCurrent = index === currentIndex;
      link.classList.toggle('is-current', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'step');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    progressFill.style.width = `${Math.min(100, Math.max(0, fraction * 100))}%`;
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// A footnote opens the fine print and highlights its source.
function startFootnotes() {
  const finePrint = document.getElementById('fine-print');
  document.querySelectorAll('.footnote').forEach((footnote) => {
    footnote.addEventListener('click', () => {
      finePrint.open = true;
      const source = document.querySelector(footnote.getAttribute('href'));
      document.querySelectorAll('.sources li').forEach((item) => item.classList.remove('is-highlighted'));
      source.classList.add('is-highlighted');
    });
  });
}

function startEverything() {
  markMotionPreference();
  whenMotionPreferenceChanges(markMotionPreference);
  startThemeSwitch();
  fillInRepositoryLinks();
  startTopBar();
  startFootnotes();
  startTimingStep();
  startCityStep();

  import('./globe/globeSteps.js')
    .then((globeSteps) => globeSteps.startGlobeSteps())
    .catch((problem) => {
      console.error('The 3D steps could not start.', problem);
      document.querySelectorAll('.globe-box').forEach((box) => box.classList.add('no-3d'));
      document.getElementById('orbit-fallback').hidden = false;
    });
}

startEverything();
