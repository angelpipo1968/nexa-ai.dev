/**
 * Safe JSON serialization that handles circular references.
 */
export const safeStringify = (obj: any, indent?: number): string => {
  const cache = new Set();
  return JSON.stringify(
    obj,
    (_key, value) => {
      // 1. Handle DOM Elements (common cause of circularity in React)
      if (typeof window !== 'undefined' && value instanceof HTMLElement) {
        return `[HTMLElement: ${value.tagName}]`;
      }

      // 2. Handle objects and circularity
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        cache.add(value);
      }
      return value;
    },
    indent
  );
};

/**
 * Safe JSON parsing.
 */
export const safeParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch (e) {
    console.error('[JSON Parse Error]:', e);
    return fallback;
  }
};
