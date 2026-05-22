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

describe("multi-tuple scenario (RFC 5491 rule #2)", () => {
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

  it("returns 200", async () => {
    expect((await fetchScenario("multi-tuple")).statusCode).toBe(200);
  });

  it("contains exactly two <tuple> elements with distinct ids", async () => {
    const body = (await fetchScenario("multi-tuple")).body;
    const tupleOpens = body.match(/<tuple\s+id="[^"]+"/g) ?? [];
    expect(tupleOpens).toHaveLength(2);
    const ids = tupleOpens.map((s) => s.match(/id="([^"]+)"/)?.[1]);
    expect(new Set(ids).size).toBe(2);
  });

  it("one tuple carries civic, the other carries geodetic", async () => {
    const body = (await fetchScenario("multi-tuple")).body;
    expect(body).toContain("<ca:civicAddress");
    expect(body).toMatch(/<gml:Point|<gs:Circle|<gml:Polygon/);
  });

  it("appears in the registry list", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toContain("multi-tuple");
  });
});
