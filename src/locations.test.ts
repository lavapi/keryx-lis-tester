import { describe, expect, it } from "vitest";

import { LOCATIONS } from "./locations.js";

const CALIFORNIA_LAT_RANGE = { min: 32.5, max: 42.0 };
const CALIFORNIA_LON_RANGE = { min: -125.0, max: -114.0 };

describe("LOCATIONS dataset", () => {
  it("ships at least 20 California locations", () => {
    expect(LOCATIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("every latitude is within California bounds (32.5°N — 42°N)", () => {
    for (const loc of LOCATIONS) {
      expect(loc.latitude, loc.streetName).toBeGreaterThanOrEqual(CALIFORNIA_LAT_RANGE.min);
      expect(loc.latitude, loc.streetName).toBeLessThanOrEqual(CALIFORNIA_LAT_RANGE.max);
    }
  });

  it("every longitude is within California bounds (-125° to -114°)", () => {
    for (const loc of LOCATIONS) {
      expect(loc.longitude, loc.streetName).toBeGreaterThanOrEqual(CALIFORNIA_LON_RANGE.min);
      expect(loc.longitude, loc.streetName).toBeLessThanOrEqual(CALIFORNIA_LON_RANGE.max);
    }
  });

  it("every postal code is a California ZIP (starts with 9)", () => {
    for (const loc of LOCATIONS) {
      expect(loc.postalCode, loc.streetName).toMatch(/^9\d{4}/);
    }
  });

  it("every required civic field is non-empty", () => {
    for (const loc of LOCATIONS) {
      expect(loc.streetNumber.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.streetName.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.city.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.county.length, loc.streetName).toBeGreaterThan(0);
    }
  });

  it("every entry carries populated extended fields", () => {
    for (const loc of LOCATIONS) {
      expect(loc.extended.building.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.extended.floor.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.extended.room.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.extended.placeType.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.extended.name.length, loc.streetName).toBeGreaterThan(0);
      expect(loc.extended.landmark.length, loc.streetName).toBeGreaterThan(0);
    }
  });

  it("geographic spread: cities cover both Northern and Southern California", () => {
    const northern = LOCATIONS.filter((l) => l.latitude >= 36);
    const southern = LOCATIONS.filter((l) => l.latitude < 36);
    expect(northern.length).toBeGreaterThan(0);
    expect(southern.length).toBeGreaterThan(0);
  });
});
