// Light and dark mode: the switch in the top bar, remembering the choice, and handing the current
// colours to the drawings (which can't read CSS by themselves).

const STORAGE_KEY = 'fourth-satellite-theme';
const COLOUR_NAMES = [
  'background',
  'drawing-background',
  'card',
  'text',
  'muted',
  'line',
  'blue',
  'violet',
  'lime-fill',
  'lime-text',
  'on-lime',
  'ground',
  'building',
  'street',
];

let currentColours = null;
const themeChangeListeners = [];

export function currentThemeName() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

// The current colour of every role, read from the stylesheet, e.g. themeColours().violet.
export function themeColours() {
  if (currentColours === null) {
    const style = getComputedStyle(document.documentElement);
    currentColours = { isLight: currentThemeName() === 'light' };
    COLOUR_NAMES.forEach((name) => {
      const camelCaseName = name.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      currentColours[camelCaseName] = style.getPropertyValue(`--${name}`).trim();
    });
  }
  return currentColours;
}

export function whenThemeChanges(listener) {
  themeChangeListeners.push(listener);
}

function applyTheme(themeName) {
  document.documentElement.dataset.theme = themeName;
  currentColours = null;
  const switchButton = document.getElementById('theme-switch');
  switchButton.setAttribute('aria-label', themeName === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  themeChangeListeners.forEach((listener) => listener(themeColours()));
}

export function startThemeSwitch() {
  const switchButton = document.getElementById('theme-switch');
  applyTheme(currentThemeName());
  switchButton.addEventListener('click', () => {
    const newTheme = currentThemeName() === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (storageUnavailable) {
      // The choice still works for this visit.
    }
  });
}
