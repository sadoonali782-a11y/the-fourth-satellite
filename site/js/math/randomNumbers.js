// Repeatable random numbers. The same seed always gives the same list of numbers,
// so the cloud of answers in step 4 holds still and the tests give the same result every run.

// A tiny well-known generator ("mulberry32"). Returns a function that gives numbers from 0 up to 1.
export function makeRandomNumberGenerator(seed) {
  let state = seed >>> 0;
  return function nextRandomNumber() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// A bell-curve number with average 0 and typical size 1 (the Box–Muller method).
export function bellCurveNumber(nextRandomNumber) {
  const first = Math.max(nextRandomNumber(), 1e-12);
  const second = nextRandomNumber();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}
