/** Join class names, skipping falsy values. */
export const cx = (...classes) => classes.flat().filter(Boolean).join(' ');
