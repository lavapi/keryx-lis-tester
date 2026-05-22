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

const CONF_NS = "urn:ietf:params:xml:ns:geopriv:conf";

describe("confidence scenarios (RFC 7459)", () => {
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

  describe("with-confidence-normal", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("with-confidence-normal")).statusCode).toBe(200);
    });

    it("declares the conf namespace and emits <con:confidence pdf=\"normal\">", async () => {
      const body = (await fetchScenario("with-confidence-normal")).body;
      expect(body).toContain(CONF_NS);
      expect(body).toContain("<con:confidence");
      expect(body).toContain('pdf="normal"');
    });

    it("the confidence value is a decimal between 0 and 100", async () => {
      const body = (await fetchScenario("with-confidence-normal")).body;
      const match = body.match(/<con:confidence[^>]*>([^<]+)<\/con:confidence>/);
      const value = Number(match?.[1]);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(100);
    });

    it("attaches confidence to a region (not a Point)", async () => {
      const body = (await fetchScenario("with-confidence-normal")).body;
      expect(body).toMatch(/<gs:Circle|<gml:Polygon|<gs:Ellipse|<gs:ArcBand/);
      expect(body).not.toMatch(/<gml:Point/);
    });
  });

  describe("with-confidence-rectangular", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("with-confidence-rectangular")).statusCode).toBe(200);
    });

    it("emits <con:confidence pdf=\"rectangular\">", async () => {
      const body = (await fetchScenario("with-confidence-rectangular")).body;
      expect(body).toContain("<con:confidence");
      expect(body).toContain('pdf="rectangular"');
    });
  });

  describe("with-confidence-unknown", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("with-confidence-unknown")).statusCode).toBe(200);
    });

    it("emits <con:confidence pdf=\"unknown\">unknown</con:confidence>", async () => {
      const body = (await fetchScenario("with-confidence-unknown")).body;
      expect(body).toContain("<con:confidence");
      expect(body).toContain('pdf="unknown"');
      expect(body).toMatch(/<con:confidence[^>]*>\s*unknown\s*<\/con:confidence>/);
    });
  });

  it("all three confidence scenarios appear in the registry list", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining([
        "with-confidence-normal",
        "with-confidence-rectangular",
        "with-confidence-unknown",
      ]),
    );
  });
});
