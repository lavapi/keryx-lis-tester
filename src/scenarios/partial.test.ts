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

describe("partial / missing-field scenarios (real catalog)", () => {
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

  describe("partial-no-timestamp", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("partial-no-timestamp")).statusCode).toBe(200);
    });

    it("omits the <timestamp> element from the tuple", async () => {
      const body = (await fetchScenario("partial-no-timestamp")).body;
      expect(body).not.toMatch(/<timestamp[\s>]/);
      expect(body).not.toContain("{{timestamp}}");
    });

    it("still contains a presence document and a civic address", async () => {
      const body = (await fetchScenario("partial-no-timestamp")).body;
      expect(body).toContain("<presence");
      expect(body).toContain("civicAddress");
    });
  });

  describe("partial-no-method", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("partial-no-method")).statusCode).toBe(200);
    });

    it("omits the <gp:method> element", async () => {
      const body = (await fetchScenario("partial-no-method")).body;
      expect(body).not.toContain("<gp:method>");
      expect(body).not.toContain("</gp:method>");
    });

    it("still contains a geopriv block", async () => {
      const body = (await fetchScenario("partial-no-method")).body;
      expect(body).toContain("<gp:geopriv>");
    });
  });

  describe("partial-no-confidence", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("partial-no-confidence")).statusCode).toBe(200);
    });

    it("does not include any conf:* element", async () => {
      const body = (await fetchScenario("partial-no-confidence")).body;
      expect(body).not.toMatch(/<conf:/);
    });

    it("contains a geodetic shape (baseline that confidence would attach to)", async () => {
      const body = (await fetchScenario("partial-no-confidence")).body;
      expect(body).toMatch(/<gml:(Point|Polygon)|<gs:(Circle|ArcBand)/);
    });
  });

  describe("partial-empty-location-info", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("partial-empty-location-info")).statusCode).toBe(200);
    });

    it("contains an empty <gp:location-info/> with no children", async () => {
      const body = (await fetchScenario("partial-empty-location-info")).body;
      expect(body).toMatch(/<gp:location-info\s*\/>|<gp:location-info>\s*<\/gp:location-info>/);
      expect(body).not.toContain("<ca:civicAddress");
      expect(body).not.toContain("<gml:Point");
    });
  });

  it("all four partial scenarios appear in the registry list", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining([
        "partial-no-timestamp",
        "partial-no-method",
        "partial-no-confidence",
        "partial-empty-location-info",
      ]),
    );
  });
});
