import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppConfig } from "./config.js";
import { buildServer } from "./server.js";

const testConfig: AppConfig = {
  port: 0,
  host: "127.0.0.1",
  logLevel: "silent",
  defaultScenarioId: "civic-us",
};

const HELD_CT = "application/held+xml";

describe("dereference endpoint (RFC 6753)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /locations/:token", () => {
    it("returns 200 with application/held+xml", async () => {
      const r = await app.inject({ method: "GET", url: "/locations/abc-123" });
      expect(r.statusCode).toBe(200);
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
    });

    it("returns a HELD locationResponse with a PIDF-LO presence", async () => {
      const r = await app.inject({ method: "GET", url: "/locations/some-uuid" });
      expect(r.body).toContain("<locationResponse");
      expect(r.body).toContain("<presence");
      expect(r.body).toContain("urn:ietf:params:xml:ns:pidf");
    });

    it("the PIDF-LO contains both civic and geodetic data (default locationType=any)", async () => {
      const r = await app.inject({ method: "GET", url: "/locations/x" });
      expect(r.body).toContain("<ca:civicAddress");
      expect(r.body).toMatch(/<gml:Point|<gs:Circle/);
    });

    it("two consecutive dereferences return different California coordinates", async () => {
      const pairs = new Set<string>();
      for (let i = 0; i < 15; i += 1) {
        const body = (await app.inject({ method: "GET", url: `/locations/t${i}` })).body;
        const m = body.match(/<gml:pos>(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
        if (m?.[1] !== undefined && m?.[2] !== undefined) pairs.add(`${m[1]},${m[2]}`);
      }
      expect(pairs.size).toBeGreaterThan(1);
    });
  });

  describe("POST /locations/:token", () => {
    it("returns 200 with application/held+xml when a HELD body is posted", async () => {
      const r = await app.inject({
        method: "POST",
        url: "/locations/abc-123",
        headers: { "content-type": HELD_CT },
        payload:
          '<?xml version="1.0"?><locationRequest xmlns="urn:ietf:params:xml:ns:geopriv:held"/>',
      });
      expect(r.statusCode).toBe(200);
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
      expect(r.body).toContain("<locationResponse");
    });

    it("also accepts a GET-style POST with no body", async () => {
      const r = await app.inject({
        method: "POST",
        url: "/locations/abc-123",
        headers: { "content-type": HELD_CT },
      });
      expect(r.statusCode).toBe(200);
    });
  });

  describe("disallowed methods on /locations/:token", () => {
    it("PUT returns 404 or 405 (not 200)", async () => {
      const r = await app.inject({ method: "PUT", url: "/locations/x" });
      expect([404, 405]).toContain(r.statusCode);
    });
  });
});

describe("GET / on the main endpoint", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer(testConfig);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 405 Method Not Allowed", async () => {
    const r = await app.inject({ method: "GET", url: "/" });
    expect(r.statusCode).toBe(405);
  });

  it("includes an Allow: POST header per HTTP semantics", async () => {
    const r = await app.inject({ method: "GET", url: "/" });
    expect(r.headers.allow).toBe("POST");
  });
});
