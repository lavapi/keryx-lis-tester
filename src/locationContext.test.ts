import { describe, expect, it } from "vitest";

import { buildLocationContext } from "./locationContext.js";
import type { Location } from "./locations.js";

const sampleLocation: Location = {
  streetNumber: "100",
  streetName: "Campanile",
  streetSuffix: "Way",
  city: "Berkeley",
  county: "Alameda",
  postalCode: "94720",
  latitude: 37.8721,
  longitude: -122.2578,
  extended: {
    building: "Sather Tower",
    floor: "10",
    room: "Observation Deck",
    placeType: "public",
    name: "UC Berkeley Campanile",
    landmark: "UC Berkeley",
  },
};

describe("buildLocationContext", () => {
  it("exposes latitude and longitude as decimal strings", () => {
    const ctx = buildLocationContext(sampleLocation);
    expect(ctx.latitude).toMatch(/^37\.872\d+$/);
    expect(ctx.longitude).toMatch(/^-122\.257\d+$/);
  });

  it("always sets state=CA and country=US", () => {
    const ctx = buildLocationContext(sampleLocation);
    expect(ctx.state).toBe("CA");
    expect(ctx.country).toBe("US");
  });

  it("propagates civic fields", () => {
    const ctx = buildLocationContext(sampleLocation);
    expect(ctx.streetNumber).toBe("100");
    expect(ctx.streetName).toBe("Campanile");
    expect(ctx.streetSuffix).toBe("Way");
    expect(ctx.city).toBe("Berkeley");
    expect(ctx.county).toBe("Alameda");
    expect(ctx.postalCode).toBe("94720");
  });

  it("propagates extended fields", () => {
    const ctx = buildLocationContext(sampleLocation);
    expect(ctx.building).toBe("Sather Tower");
    expect(ctx.floor).toBe("10");
    expect(ctx.room).toBe("Observation Deck");
    expect(ctx.placeType).toBe("public");
    expect(ctx.name).toBe("UC Berkeley Campanile");
    expect(ctx.landmark).toBe("UC Berkeley");
  });

  it("provides a non-empty altitude in metres", () => {
    const ctx = buildLocationContext(sampleLocation);
    expect(Number.isFinite(Number(ctx.altitude))).toBe(true);
  });

  it("produces a polygonPosList with 5 lat/lon pairs (closed ring)", () => {
    const list = buildLocationContext(sampleLocation).polygonPosList ?? "";
    const pairs = list.trim().split(/\s+/);
    expect(pairs).toHaveLength(10);
    expect(pairs[0]).toBe(pairs[8]);
    expect(pairs[1]).toBe(pairs[9]);
  });

  it("polygonPosList encloses the centre point", () => {
    const list = buildLocationContext(sampleLocation).polygonPosList ?? "";
    const lats = list.split(/\s+/).filter((_, i) => i % 2 === 0).map(Number);
    const lons = list.split(/\s+/).filter((_, i) => i % 2 === 1).map(Number);
    expect(Math.min(...lats)).toBeLessThan(sampleLocation.latitude);
    expect(Math.max(...lats)).toBeGreaterThan(sampleLocation.latitude);
    expect(Math.min(...lons)).toBeLessThan(sampleLocation.longitude);
    expect(Math.max(...lons)).toBeGreaterThan(sampleLocation.longitude);
  });
});
