/**
 * Mock factories and utilities for testing
 */

/**
 * Create a mock function that tracks calls
 * Compatible with Jest's mock interface
 */
export interface MockFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  mock: {
    calls: TArgs[];
    results: Array<{ type: 'return' | 'throw'; value: unknown }>;
  };
  mockReturnValue: (value: TReturn) => MockFunction<TArgs, TReturn>;
  mockReturnValueOnce: (value: TReturn) => MockFunction<TArgs, TReturn>;
  mockImplementation: (fn: (...args: TArgs) => TReturn) => MockFunction<TArgs, TReturn>;
  mockClear: () => void;
  mockReset: () => void;
}

/**
 * Create a mock function for testing
 */
export function createMockFn<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  defaultImpl?: (...args: TArgs) => TReturn,
): MockFunction<TArgs, TReturn> {
  const calls: TArgs[] = [];
  const results: Array<{ type: 'return' | 'throw'; value: unknown }> = [];
  let impl = defaultImpl;
  const returnValueQueue: TReturn[] = [];

  const mockFn = ((...args: TArgs): TReturn => {
    calls.push(args);
    try {
      let result: TReturn;
      if (returnValueQueue.length > 0) {
        result = returnValueQueue.shift() as TReturn;
      } else if (impl) {
        result = impl(...args);
      } else {
        result = undefined as TReturn;
      }
      results.push({ type: 'return', value: result });
      return result;
    } catch (error) {
      results.push({ type: 'throw', value: error });
      throw error;
    }
  }) as MockFunction<TArgs, TReturn>;

  mockFn.mock = { calls, results };

  mockFn.mockReturnValue = (value: TReturn) => {
    impl = () => value;
    return mockFn;
  };

  mockFn.mockReturnValueOnce = (value: TReturn) => {
    returnValueQueue.push(value);
    return mockFn;
  };

  mockFn.mockImplementation = (fn: (...args: TArgs) => TReturn) => {
    impl = fn;
    return mockFn;
  };

  mockFn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
  };

  mockFn.mockReset = () => {
    mockFn.mockClear();
    impl = defaultImpl;
    returnValueQueue.length = 0;
  };

  return mockFn;
}

/**
 * Create a spy on an object method
 */
export function createSpy<T extends object, K extends keyof T>(obj: T, method: K): MockFunction {
  const original = obj[method];
  if (typeof original !== 'function') {
    throw new Error(`${String(method)} is not a function`);
  }

  const mock = createMockFn(original.bind(obj));
  obj[method] = mock as T[K];

  return mock;
}

/**
 * Mock timer utilities
 */
export interface MockTimers {
  advanceTimersByTime: (ms: number) => void;
  runAllTimers: () => void;
  clearAllTimers: () => void;
  restore: () => void;
}

/**
 * Create mock timers for testing time-dependent code
 */
export function createMockTimers(): MockTimers {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const originalDate = globalThis.Date;

  let currentTime = Date.now();
  const timers: Array<{
    id: number;
    callback: () => void;
    time: number;
    interval?: number;
  }> = [];
  let nextId = 1;

  globalThis.setTimeout = ((callback: () => void, ms: number) => {
    const id = nextId++;
    timers.push({ id, callback, time: currentTime + ms });
    return id;
  }) as unknown as typeof setTimeout;

  globalThis.clearTimeout = ((id: number) => {
    const index = timers.findIndex((t) => t.id === id);
    if (index !== -1) {
      timers.splice(index, 1);
    }
  }) as unknown as typeof clearTimeout;

  globalThis.setInterval = ((callback: () => void, ms: number) => {
    const id = nextId++;
    timers.push({ id, callback, time: currentTime + ms, interval: ms });
    return id;
  }) as unknown as typeof setInterval;

  globalThis.clearInterval = globalThis.clearTimeout;

  // Mock Date.now()
  const MockDate = class extends originalDate {
    constructor(value?: string | number | Date) {
      if (value === undefined) {
        super(currentTime);
      } else {
        super(value as string | number);
      }
    }

    static override now(): number {
      return currentTime;
    }
  };
  globalThis.Date = MockDate as DateConstructor;

  return {
    advanceTimersByTime: (ms: number) => {
      const targetTime = currentTime + ms;
      while (timers.length > 0) {
        const sorted = [...timers].sort((a, b) => a.time - b.time);
        const next = sorted[0];
        if (!next || next.time > targetTime) break;

        currentTime = next.time;
        next.callback();

        if (next.interval) {
          next.time = currentTime + next.interval;
        } else {
          const index = timers.indexOf(next);
          if (index !== -1) timers.splice(index, 1);
        }
      }
      currentTime = targetTime;
    },

    runAllTimers: () => {
      const maxIterations = 1000;
      let iterations = 0;
      while (timers.length > 0 && iterations < maxIterations) {
        const sorted = [...timers].sort((a, b) => a.time - b.time);
        const next = sorted[0];
        if (!next) break;

        currentTime = next.time;
        next.callback();

        if (next.interval) {
          next.time = currentTime + next.interval;
        } else {
          const index = timers.indexOf(next);
          if (index !== -1) timers.splice(index, 1);
        }
        iterations++;
      }
    },

    clearAllTimers: () => {
      timers.length = 0;
    },

    restore: () => {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
      globalThis.Date = originalDate;
      timers.length = 0;
    },
  };
}
