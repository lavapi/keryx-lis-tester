import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppConfig } from "../config.js";
import { LOCATIONS } from "../locations.js";
import { buildServer } from "../server.js";

const testConfig: AppConfig = {
  port: 0,
  host: "127.0.0.1",
  logLevel: "silent",
  defaultScenarioId: "civic-us",
};

const GML_NS = "http://www.opengis.net/gml";
const GS_NS = "http://www.opengis.net/pidflo/1.0";

const CALIFORNIA = {
  lat: { min: 32.5, max: 42.0 },
  lon: { min: -125.0, max: -114.0 },
};

const inCalifornia = (lat: number, lon: number): boolean =>
  lat >= CALIFORNIA.lat.min &&
  lat <= CALIFORNIA.lat.max &&
  lon >= CALIFORNIA.lon.min &&
  lon <= CALIFORNIA.lon.max;

describe("geodetic scenarios (real catalog)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const fetchScenario = (id: string) =>
    app.inject({
      method: "POST",
      url: "/",
      headers: { "content-type": "application/held+xml", "x-scenario": id },
      payload: "<r/>",
    });

  const extractPos = (body: string): { lat: number; lon: number; alt?: number } | null => {
    const m = body.match(/<gml:pos>(-?\d+\.\d+)\s+(-?\d+\.\d+)(?:\s+(-?\d+\.\d+))?<\/gml:pos>/);
    if (m?.[1] === undefined || m?.[2] === undefined) return null;
    return m[3] !== undefined
      ? { lat: Number(m[1]), lon: Number(m[2]), alt: Number(m[3]) }
      : { lat: Number(m[1]), lon: Number(m[2]) };
  };

  describe("geo-point", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("geo-point")).statusCode).toBe(200);
    });

    it("declares the GML namespace and uses gml:Point", async () => {
      const body = (await fetchScenario("geo-point")).body;
      expect(body).toContain(GML_NS);
      expect(body).toContain("<gml:Point");
      expect(body).toContain("<gml:pos>");
    });

    it("uses the 2D WGS84 CRS (EPSG:4326)", async () => {
      const body = (await fetchScenario("geo-point")).body;
      expect(body).toMatch(/srsName="urn:ogc:def:crs:EPSG::4326"/);
    });

    it("contains a lat/lon pair within California", async () => {
      const body = (await fetchScenario("geo-point")).body;
      const pos = extractPos(body);
      expect(pos).not.toBeNull();
      expect(inCalifornia(pos!.lat, pos!.lon)).toBe(true);
    });

    it("returns at least two distinct coordinate pairs across 20 requests", async () => {
      const pairs = new Set<string>();
      for (let i = 0; i < 20; i += 1) {
        const body = (await fetchScenario("geo-point")).body;
        const pos = extractPos(body);
        if (pos) pairs.add(`${pos.lat},${pos.lon}`);
      }
      expect(pairs.size).toBeGreaterThan(1);
    });
  });

  describe("geo-point-3d", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("geo-point-3d")).statusCode).toBe(200);
    });

    it("uses the 3D WGS84 CRS (EPSG:4979)", async () => {
      const body = (await fetchScenario("geo-point-3d")).body;
      expect(body).toMatch(/srsName="urn:ogc:def:crs:EPSG::4979"/);
    });

    it("contains lat/lon/altitude within California", async () => {
      const body = (await fetchScenario("geo-point-3d")).body;
      const pos = extractPos(body);
      expect(pos?.alt).toBeDefined();
      expect(inCalifornia(pos!.lat, pos!.lon)).toBe(true);
    });
  });

  describe("geo-circle", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("geo-circle")).statusCode).toBe(200);
    });

    it("uses gs:Circle from the pidflo namespace and centres in California", async () => {
      const body = (await fetchScenario("geo-circle")).body;
      expect(body).toContain(GS_NS);
      expect(body).toContain("<gs:Circle");
      const pos = extractPos(body);
      expect(inCalifornia(pos!.lat, pos!.lon)).toBe(true);
    });

    it("includes a radius with a unit of measure", async () => {
      const body = (await fetchScenario("geo-circle")).body;
      expect(body).toMatch(/<gs:radius[^>]*uom=/);
    });
  });

  describe("geo-polygon", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("geo-polygon")).statusCode).toBe(200);
    });

    it("uses gml:Polygon with exterior linear ring", async () => {
      const body = (await fetchScenario("geo-polygon")).body;
      expect(body).toContain("<gml:Polygon");
      expect(body).toContain("<gml:exterior>");
      expect(body).toContain("<gml:LinearRing>");
      expect(body).toContain("<gml:posList>");
    });

    it("posList encloses a California point and closes the ring", async () => {
      const body = (await fetchScenario("geo-polygon")).body;
      const match = body.match(/<gml:posList>([^<]+)<\/gml:posList>/);
      expect(match?.[1]).toBeDefined();
      const nums = match![1]!.trim().split(/\s+/).map(Number);
      expect(nums.length).toBeGreaterThanOrEqual(10);
      expect(nums[0]).toBe(nums[nums.length - 2]);
      expect(nums[1]).toBe(nums[nums.length - 1]);
      expect(inCalifornia(nums[0]!, nums[1]!)).toBe(true);
    });
  });

  describe("geo-arcband", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("geo-arcband")).statusCode).toBe(200);
    });

    it("includes all four ArcBand parameters and centres in California", async () => {
      const body = (await fetchScenario("geo-arcband")).body;
      expect(body).toContain("<gs:ArcBand");
      expect(body).toContain("<gs:innerRadius");
      expect(body).toContain("<gs:outerRadius");
      expect(body).toContain("<gs:startAngle");
      expect(body).toContain("<gs:openingAngle");
      const pos = extractPos(body);
      expect(inCalifornia(pos!.lat, pos!.lon)).toBe(true);
    });
  });

  describe("geo-mixed", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("geo-mixed")).statusCode).toBe(200);
    });

    it("contains both a California civic address and a geodetic shape", async () => {
      const body = (await fetchScenario("geo-mixed")).body;
      expect(body).toContain("<ca:civicAddress");
      expect(body).toContain("<ca:A1>CA</ca:A1>");
      expect(body).toMatch(/<gml:(Point|Polygon)|<gs:(Circle|ArcBand)/);
    });

    it("civic city matches the dataset entry for the geo point (same location used for both)", async () => {
      const body = (await fetchScenario("geo-mixed")).body;
      const pos = extractPos(body);
      const cityMatch = body.match(/<ca:A3>([^<]+)<\/ca:A3>/);
      const dataset = LOCATIONS.find(
        (loc) => Math.abs(loc.latitude - pos!.lat) < 0.0001 && Math.abs(loc.longitude - pos!.lon) < 0.0001,
      );
      expect(dataset, `no dataset entry matches ${pos!.lat}, ${pos!.lon}`).toBeDefined();
      expect(cityMatch?.[1]).toBe(dataset!.city);
    });
  });

  it("all six geo scenarios appear in the registry list", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining([
        "geo-point",
        "geo-point-3d",
        "geo-circle",
        "geo-polygon",
        "geo-arcband",
        "geo-mixed",
      ]),
    );
  });
});
