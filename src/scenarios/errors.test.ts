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

describe("error & edge-case scenarios (real catalog)", () => {
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

  describe("HELD-level errors (RFC 5985 §6.4)", () => {
    const cases: { id: string; code: string }[] = [
      { id: "error-locationUnknown", code: "locationUnknown" },
      { id: "error-timeout", code: "timeout" },
      { id: "error-notLocatable", code: "notLocatable" },
    ];

    for (const { id, code } of cases) {
      describe(id, () => {
        it("returns HTTP 200", async () => {
          expect((await fetchScenario(id)).statusCode).toBe(200);
        });

        it("responds with application/held+xml", async () => {
          expect((await fetchScenario(id)).headers["content-type"]).toMatch(
            /application\/held\+xml/,
          );
        });

        it(`carries a HELD <error code="${code}"> body`, async () => {
          const body = (await fetchScenario(id)).body;
          expect(body).toContain("<error");
          expect(body).toContain(`code="${code}"`);
          expect(body).toContain("urn:ietf:params:xml:ns:geopriv:held");
        });
      });
    }
  });

  describe("HTTP-level errors", () => {
    const cases: { id: string; status: number }[] = [
      { id: "http-404", status: 404 },
      { id: "http-500", status: 500 },
      { id: "http-503", status: 503 },
    ];

    for (const { id, status } of cases) {
      it(`${id} returns HTTP ${status} with an empty body`, async () => {
        const r = await fetchScenario(id);
        expect(r.statusCode).toBe(status);
        expect(r.body).toBe("");
      });
    }
  });

  describe("empty-body", () => {
    it("returns HTTP 200 with an empty body and held+xml content-type", async () => {
      const r = await fetchScenario("empty-body");
      expect(r.statusCode).toBe(200);
      expect(r.body).toBe("");
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
    });
  });

  describe("wrong-content-type", () => {
    it("returns valid HELD XML labelled as text/plain", async () => {
      const r = await fetchScenario("wrong-content-type");
      expect(r.statusCode).toBe(200);
      expect(r.headers["content-type"]).toMatch(/text\/plain/);
      expect(r.body).toContain("<locationResponse");
    });
  });

  describe("oversized", () => {
    it("returns HTTP 200", async () => {
      expect((await fetchScenario("oversized")).statusCode).toBe(200);
    });

    it("returns a body well above the 100 KB threshold by default", async () => {
      const r = await fetchScenario("oversized");
      expect(r.body.length).toBeGreaterThan(100_000);
    });

    it("the body is still well-formed XML at the boundaries", async () => {
      const r = await fetchScenario("oversized");
      expect(r.body.startsWith("<?xml")).toBe(true);
      expect(r.body.trimEnd().endsWith("</locationResponse>")).toBe(true);
    });
  });

  describe("malformed-xml", () => {
    it("returns HTTP 200 with held+xml content-type", async () => {
      const r = await fetchScenario("malformed-xml");
      expect(r.statusCode).toBe(200);
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
    });

    it("body is not well-formed XML (unbalanced/truncated)", async () => {
      const body = (await fetchScenario("malformed-xml")).body;
      const opens = (body.match(/<[a-zA-Z][^/>\s]*[^/]?>/g) ?? []).length;
      const closes = (body.match(/<\/[a-zA-Z][^>]*>/g) ?? []).length;
      expect(opens).not.toBe(closes);
    });
  });

  it("all error/edge scenarios are registered", async () => {
    const r = await fetchScenario("does-not-exist");
    const payload = r.json() as { available: string[] };
    expect(payload.available).toEqual(
      expect.arrayContaining([
        "error-locationUnknown",
        "error-timeout",
        "error-notLocatable",
        "http-404",
        "http-500",
        "http-503",
        "empty-body",
        "wrong-content-type",
        "malformed-xml",
        "oversized",
        "slow-2s",
        "slow-10s",
      ]),
    );
  });
});
