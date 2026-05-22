import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppConfig } from "../config.js";
import { buildServer } from "../server.js";

const testConfig: AppConfig = {
  port: 0,
  host: "127.0.0.1",
  logLevel: "silent",
  defaultScenarioId: "civic-us",
};

const CALIFORNIA_LAT = { min: 32.5, max: 42.0 };

describe("civic scenarios (real catalog)", () => {
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

  describe("civic-us (dynamic California)", () => {
    it("returns 200 with held+xml", async () => {
      const r = await fetchScenario("civic-us");
      expect(r.statusCode).toBe(200);
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
    });

    it("contains a US California civic address", async () => {
      const r = await fetchScenario("civic-us");
      expect(r.body).toContain("<ca:country>US</ca:country>");
      expect(r.body).toContain("<ca:A1>CA</ca:A1>");
      expect(r.body).toContain("<ca:HNO>");
      expect(r.body).toContain("<ca:RD>");
      expect(r.body).toContain("<ca:PC>");
    });

    it("postal code is a California ZIP (starts with 9)", async () => {
      const r = await fetchScenario("civic-us");
      const match = r.body.match(/<ca:PC>(\d{5})<\/ca:PC>/);
      expect(match?.[1]).toMatch(/^9/);
    });

    it("returns at least two distinct cities across 20 requests", async () => {
      const cities = new Set<string>();
      for (let i = 0; i < 20; i += 1) {
        const r = await fetchScenario("civic-us");
        const m = r.body.match(/<ca:A3>([^<]+)<\/ca:A3>/);
        if (m?.[1]) cities.add(m[1]);
      }
      expect(cities.size).toBeGreaterThan(1);
    });

    it("substitutes the timestamp placeholder", async () => {
      const r = await fetchScenario("civic-us");
      expect(r.body).not.toContain("{{timestamp}}");
      expect(r.body).toMatch(/<timestamp>\d{4}-\d{2}-\d{2}T/);
    });

    it("substitutes every civic placeholder (no {{…}} leaks)", async () => {
      const r = await fetchScenario("civic-us");
      expect(r.body).not.toMatch(/\{\{[^}]+\}\}/);
    });
  });

  describe("civic-international (static Canada)", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-international")).statusCode).toBe(200);
    });

    it("uses a non-US ISO country code", async () => {
      const body = (await fetchScenario("civic-international")).body;
      const match = body.match(/<ca:country>([^<]+)<\/ca:country>/);
      expect(match?.[1]).toBeDefined();
      expect(match?.[1]).not.toBe("US");
    });

    it("contains street and postal code", async () => {
      const body = (await fetchScenario("civic-international")).body;
      expect(body).toContain("<ca:RD>");
      expect(body).toContain("<ca:PC>");
    });
  });

  describe("civic-minimal", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-minimal")).statusCode).toBe(200);
    });

    it("contains country and A1 only — no street/postal/etc.", async () => {
      const body = (await fetchScenario("civic-minimal")).body;
      expect(body).toContain("<ca:country>");
      expect(body).toContain("<ca:A1>");
      expect(body).not.toContain("<ca:HNO>");
      expect(body).not.toContain("<ca:RD>");
      expect(body).not.toContain("<ca:PC>");
      expect(body).not.toContain("<ca:STS>");
    });
  });

  describe("civic-extended (dynamic California)", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-extended")).statusCode).toBe(200);
    });

    it("uses a US California address", async () => {
      const body = (await fetchScenario("civic-extended")).body;
      expect(body).toContain("<ca:country>US</ca:country>");
      expect(body).toContain("<ca:A1>CA</ca:A1>");
    });

    it("includes the extended civic fields (BLD, FLR, ROOM, NAM, PLC, LMK)", async () => {
      const body = (await fetchScenario("civic-extended")).body;
      expect(body).toContain("<ca:BLD>");
      expect(body).toContain("<ca:FLR>");
      expect(body).toContain("<ca:ROOM>");
      expect(body).toContain("<ca:NAM>");
      expect(body).toContain("<ca:PLC>");
      expect(body).toContain("<ca:LMK>");
    });

    it("returns at least two distinct buildings across 20 requests", async () => {
      const buildings = new Set<string>();
      for (let i = 0; i < 20; i += 1) {
        const r = await fetchScenario("civic-extended");
        const m = r.body.match(/<ca:BLD>([^<]+)<\/ca:BLD>/);
        if (m?.[1]) buildings.add(m[1]);
      }
      expect(buildings.size).toBeGreaterThan(1);
    });
  });

  it("all four civic scenarios appear in the registry list", async () => {
    const r1 = await fetchScenario("does-not-exist");
    const payload = r1.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining(["civic-us", "civic-international", "civic-minimal", "civic-extended"]),
    );
  });

  it("California-scoped scenarios produce valid coordinates when used in geo-mixed (smoke)", async () => {
    const body = (await fetchScenario("geo-mixed")).body;
    const m = body.match(/<gml:pos>(-?\d+\.\d+)\s+(-?\d+\.\d+)<\/gml:pos>/);
    expect(m?.[1]).toBeDefined();
    const lat = Number(m![1]);
    expect(lat).toBeGreaterThanOrEqual(CALIFORNIA_LAT.min);
    expect(lat).toBeLessThanOrEqual(CALIFORNIA_LAT.max);
  });
});
