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

describe("location-by-reference scenarios (RFC 5985 §6.5)", () => {
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

  describe("location-by-reference", () => {
    it("returns 200 with held+xml", async () => {
      const r = await fetchScenario("location-by-reference");
      expect(r.statusCode).toBe(200);
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
    });

    it("contains <locationUriSet> with the required expires attribute", async () => {
      const body = (await fetchScenario("location-by-reference")).body;
      expect(body).toContain("<locationUriSet");
      expect(body).toMatch(/expires="\d{4}-\d{2}-\d{2}T/);
    });

    it("contains at least one <locationURI>", async () => {
      const body = (await fetchScenario("location-by-reference")).body;
      expect(body).toContain("<locationURI>");
    });

    it("does NOT carry a PIDF-LO presence body (reference-only)", async () => {
      const body = (await fetchScenario("location-by-reference")).body;
      expect(body).not.toContain("<presence");
    });

    it("two consecutive requests produce distinct location URIs", async () => {
      const a = (await fetchScenario("location-by-reference")).body;
      const b = (await fetchScenario("location-by-reference")).body;
      const uriA = a.match(/<locationURI>([^<]+)<\/locationURI>/)?.[1];
      const uriB = b.match(/<locationURI>([^<]+)<\/locationURI>/)?.[1];
      expect(uriA).toBeDefined();
      expect(uriB).toBeDefined();
      expect(uriA).not.toBe(uriB);
    });
  });

  describe("location-by-value-and-reference", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("location-by-value-and-reference")).statusCode).toBe(200);
    });

    it("carries BOTH a <presence> body AND a <locationUriSet>", async () => {
      const body = (await fetchScenario("location-by-value-and-reference")).body;
      expect(body).toContain("<presence");
      expect(body).toContain("<locationUriSet");
      expect(body).toContain("<locationURI>");
    });
  });

  describe("multi-locationURI", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("multi-locationURI")).statusCode).toBe(200);
    });

    it("contains two <locationURI> elements with different schemes", async () => {
      const body = (await fetchScenario("multi-locationURI")).body;
      const matches = body.match(/<locationURI>[^<]+<\/locationURI>/g) ?? [];
      expect(matches).toHaveLength(2);
      const schemes = matches.map((m) => m.replace(/<\/?locationURI>/g, "").split(":")[0]);
      expect(new Set(schemes).size).toBe(2);
      expect(schemes).toEqual(expect.arrayContaining(["https", "sip"]));
    });
  });

  it("all three location-by-reference scenarios are registered", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining([
        "location-by-reference",
        "location-by-value-and-reference",
        "multi-locationURI",
      ]),
    );
  });
});
