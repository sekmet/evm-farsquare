import '@testing-library/jest-dom';

// Some Radix/UI components and layout code rely on ResizeObserver.
// Provide a minimal mock to avoid ReferenceErrors in jsdom.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock as any;
