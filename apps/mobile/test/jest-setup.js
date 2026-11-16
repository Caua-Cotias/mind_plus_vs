if (typeof window !== 'undefined' && !window.screen) {
  Object.defineProperty(window, 'screen', {
    configurable: true,
    value: {},
  });
}
