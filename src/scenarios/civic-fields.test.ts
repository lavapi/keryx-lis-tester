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

describe("civic field-showcase scenarios (RFC 5139 coverage)", () => {
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

  describe("civic-with-directionals", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-with-directionals")).statusCode).toBe(200);
    });

    it("contains a pre-directional (<ca:PRD>) and post-directional (<ca:POD>)", async () => {
      const body = (await fetchScenario("civic-with-directionals")).body;
      expect(body).toContain("<ca:PRD>");
      expect(body).toContain("<ca:POD>");
    });
  });

  describe("civic-with-hns", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-with-hns")).statusCode).toBe(200);
    });

    it("contains a house-number suffix (<ca:HNS>)", async () => {
      const body = (await fetchScenario("civic-with-hns")).body;
      expect(body).toContain("<ca:HNO>");
      expect(body).toContain("<ca:HNS>");
    });
  });

  describe("civic-with-pobox", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-with-pobox")).statusCode).toBe(200);
    });

    it("contains <ca:POBOX> and omits street-level fields", async () => {
      const body = (await fetchScenario("civic-with-pobox")).body;
      expect(body).toContain("<ca:POBOX>");
      expect(body).not.toContain("<ca:HNO>");
      expect(body).not.toContain("<ca:RD>");
    });
  });

  describe("civic-with-loc-unit", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-with-loc-unit")).statusCode).toBe(200);
    });

    it("contains <ca:UNIT> and <ca:LOC>", async () => {
      const body = (await fetchScenario("civic-with-loc-unit")).body;
      expect(body).toContain("<ca:UNIT>");
      expect(body).toContain("<ca:LOC>");
    });
  });

  describe("civic-with-road-sections", () => {
    it("returns 200", async () => {
      expect((await fetchScenario("civic-with-road-sections")).statusCode).toBe(200);
    });

    it("contains <ca:RDSEC>, <ca:RDBR> and <ca:RDSUBBR>", async () => {
      const body = (await fetchScenario("civic-with-road-sections")).body;
      expect(body).toContain("<ca:RDSEC>");
      expect(body).toContain("<ca:RDBR>");
      expect(body).toContain("<ca:RDSUBBR>");
    });
  });

  it("all five civic-field scenarios are registered", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining([
        "civic-with-directionals",
        "civic-with-hns",
        "civic-with-pobox",
        "civic-with-loc-unit",
        "civic-with-road-sections",
      ]),
    );
  });
});
