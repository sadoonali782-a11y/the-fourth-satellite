// Small helpers shared by every step: captions that only change when their words change,
// distance formatting, on/off buttons, the "less motion" setting, and running animation only on screen.

// A caption that only touches the page when its text really changes, so screen readers
// hear each new sentence once instead of 60 times a second.
export function makeCaptionWriter(element) {
  let lastText = null;
  return function writeCaption(htmlText) {
    if (htmlText !== lastText) {
      element.innerHTML = htmlText;
      lastText = htmlText;
    }
  };
}

// Writes text into an element only when it changes.
export function setTextIfChanged(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

const numberFormatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatWholeNumber(value) {
  return numberFormatter.format(value);
}

export function formatOneDecimal(value) {
  return oneDecimalFormatter.format(value);
}

// Distances for people: cm under 1 m, m with one decimal under 10 m, whole m under 1 km, otherwise whole km.
export function formatDistance(metres) {
  const size = Math.abs(metres);
  if (size < 1) {
    return `${formatWholeNumber(size * 100)} cm`;
  }
  if (size < 10) {
    return `${formatOneDecimal(size)} m`;
  }
  if (size < 1000) {
    return `${formatWholeNumber(size)} m`;
  }
  return `${formatWholeNumber(size / 1000)} km`;
}

export function formatKilometres(metres) {
  return `${formatWholeNumber(metres / 1000)} km`;
}

// An on/off button (aria-pressed). Calls whenChanged(isOn) after each click.
export function makeToggleButton(button, whenChanged) {
  button.addEventListener('click', () => {
    const isOn = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(isOn));
    whenChanged(isOn);
  });
  return {
    isOn: () => button.getAttribute('aria-pressed') === 'true',
    setOn(isOn) {
      button.setAttribute('aria-pressed', String(isOn));
    },
  };
}

const lessMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function prefersLessMotion() {
  return lessMotionQuery.matches;
}

export function whenMotionPreferenceChanges(listener) {
  lessMotionQuery.addEventListener('change', () => listener(lessMotionQuery.matches));
}

// One shared animation loop. Each drawing registers a frame function and the element it lives in;
// the frame function runs only while that element is on or within 120 px of the screen.
const animatedThings = [];
let loopIsRunning = false;
let lastFrameTime = null;

function runOneFrame(timeInMilliseconds) {
  const secondsSinceLastFrame = lastFrameTime === null ? 0 : Math.min((timeInMilliseconds - lastFrameTime) / 1000, 0.1);
  lastFrameTime = timeInMilliseconds;
  animatedThings.forEach((thing) => {
    if (thing.isNearScreen) {
      thing.drawFrame(secondsSinceLastFrame, timeInMilliseconds / 1000);
    }
  });
  requestAnimationFrame(runOneFrame);
}

export function animateWhileOnScreen(element, drawFrame) {
  const thing = { element, drawFrame, isNearScreen: false };
  animatedThings.push(thing);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        thing.isNearScreen = entry.isIntersecting;
      });
    },
    { rootMargin: '120px 0px' },
  );
  observer.observe(element);
  if (!loopIsRunning) {
    loopIsRunning = true;
    requestAnimationFrame(runOneFrame);
  }
  return thing;
}

// Eases smoothly in and out: 0 → 0, 1 → 1, slow at both ends.
export function easeInAndOut(fraction) {
  return fraction < 0.5 ? 2 * fraction * fraction : 1 - (-2 * fraction + 2) ** 2 / 2;
}

export function clamp(value, lowest, highest) {
  return Math.min(highest, Math.max(lowest, value));
}
