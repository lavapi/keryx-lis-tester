import { describe, expect, it } from "vitest";

import { LOCATIONS } from "./locations.js";
import { pickLocation } from "./locationPicker.js";

describe("pickLocation", () => {
  it("returns an entry from the LOCATIONS dataset", () => {
    const picked = pickLocation();
    expect(LOCATIONS).toContain(picked);
  });

  it("with rng=0 returns the first location", () => {
    const picked = pickLocation(() => 0);
    expect(picked).toBe(LOCATIONS[0]);
  });

  it("with rng just below 1 returns the last location", () => {
    const picked = pickLocation(() => 0.9999);
    expect(picked).toBe(LOCATIONS[LOCATIONS.length - 1]);
  });

  it("different rng values can return different locations", () => {
    const a = pickLocation(() => 0);
    const b = pickLocation(() => 0.5);
    expect(a).not.toBe(b);
  });

  it("over many random calls returns more than one distinct location", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const picked = pickLocation();
      seen.add(`${picked.latitude},${picked.longitude}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
