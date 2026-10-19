import { expect, test } from "bun:test";
import {
  dismissStarterCard,
  isStarterCardDismissed,
} from "../src/lib/starterCard";

test("remembers the starter dismissal and tolerates unavailable device storage", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    expect(isStarterCardDismissed()).toBe(false);
    dismissStarterCard();
    expect(isStarterCardDismissed()).toBe(true);

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("Device storage is unavailable");
      },
    });
    expect(isStarterCardDismissed()).toBe(false);
    expect(dismissStarterCard).not.toThrow();
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
