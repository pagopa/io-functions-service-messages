/**
 * Wait for `ms` milliseconds
 * @param ms milliseconds to wait
 * @returns a promise to wait
 */
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
