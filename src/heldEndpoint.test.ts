import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registerHeldEndpoint } from "./heldEndpoint.js";
import { loadRegistry, type Registry, type ScenarioMeta } from "./scenarios/registry.js";

const HELD_CONTENT_TYPE = "application/held+xml";

const CIVIC_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<locationResponse xmlns="urn:ietf:params:xml:ns:geopriv:held">
  <presence xmlns="urn:ietf:params:xml:ns:pidf"
            xmlns:gp="urn:ietf:params:xml:ns:pidf:geopriv10"
            xmlns:ca="urn:ietf:params:xml:ns:pidf:geopriv10:civicAddr"
            entity="pres:test@keryx">
    <tuple id="t1">
      <status>
        <gp:geopriv>
          <gp:location-info>
            <ca:civicAddress xml:lang="en-US">
              <ca:country>US</ca:country>
              <ca:A1>NY</ca:A1>
            </ca:civicAddress>
          </gp:location-info>
        </gp:geopriv>
      </status>
      <timestamp>{{timestamp}}</timestamp>
    </tuple>
  </presence>
</locationResponse>`;

const GEO_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<locationResponse xmlns="urn:ietf:params:xml:ns:geopriv:held">
  <marker>geo-test-marker</marker>
</locationResponse>`;

const sampleRequest = `<?xml version="1.0" encoding="UTF-8"?>
<locationRequest xmlns="urn:ietf:params:xml:ns:geopriv:held"/>`;

const buildTestApp = (registry: Registry, defaultScenarioId: string): FastifyInstance => {
  const app = Fastify({ logger: false });
  registerHeldEndpoint(app, { registry, defaultScenarioId });
  return app;
};

describe("POST / (HELD endpoint)", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "lis-endpoint-"));
    writeFileSync(join(dir, "civic-us.xml"), CIVIC_BODY, "utf-8");
    writeFileSync(join(dir, "geo-marker.xml"), GEO_BODY, "utf-8");
    writeFileSync(join(dir, "slow-test.xml"), GEO_BODY, "utf-8");

    const catalog: ScenarioMeta[] = [
      { id: "civic-us", file: "civic-us.xml", description: "Civic US" },
      { id: "geo-marker", file: "geo-marker.xml", description: "Geo marker" },
      { id: "slow-test", file: "slow-test.xml", description: "Delayed", delayMs: 80 },
    ];
    const registry = loadRegistry(catalog, dir);
    app = buildTestApp(registry, "civic-us");
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const post = (options: {
    body?: string;
    contentType?: string;
    scenarioHeader?: string;
    scenarioQuery?: string;
  } = {}) => {
    const headers: Record<string, string> = {};
    if (options.contentType !== undefined) headers["content-type"] = options.contentType;
    if (options.scenarioHeader !== undefined) headers["x-scenario"] = options.scenarioHeader;
    const url = options.scenarioQuery !== undefined
      ? `/?scenario=${encodeURIComponent(options.scenarioQuery)}`
      : "/";
    if (options.body === undefined) {
      return app.inject({ method: "POST", url, headers });
    }
    return app.inject({ method: "POST", url, headers, payload: options.body });
  };

  describe("default scenario", () => {
    it("returns 200 for a well-formed HELD locationRequest", async () => {
      const r = await post({ body: sampleRequest, contentType: HELD_CONTENT_TYPE });
      expect(r.statusCode).toBe(200);
    });

    it("responds with Content-Type application/held+xml", async () => {
      const r = await post({ body: sampleRequest, contentType: HELD_CONTENT_TYPE });
      expect(r.headers["content-type"]).toMatch(/application\/held\+xml/);
    });

    it("returns a well-formed XML body", async () => {
      const r = await post({ body: sampleRequest, contentType: HELD_CONTENT_TYPE });
      expect(r.body.startsWith("<?xml")).toBe(true);
    });

    it("returns the default scenario body when no selector is provided", async () => {
      const r = await post({ body: sampleRequest, contentType: HELD_CONTENT_TYPE });
      expect(r.body).toContain("civicAddress");
      expect(r.body).toContain("<ca:country>US</ca:country>");
    });

    it("substitutes the {{timestamp}} placeholder with an ISO 8601 timestamp", async () => {
      const r = await post({ body: sampleRequest, contentType: HELD_CONTENT_TYPE });
      expect(r.body).not.toContain("{{timestamp}}");
      expect(r.body).toMatch(/<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z<\/timestamp>/);
    });
  });

  describe("scenario selection", () => {
    it("X-Scenario header selects the matching scenario", async () => {
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioHeader: "geo-marker",
      });
      expect(r.statusCode).toBe(200);
      expect(r.body).toContain("geo-test-marker");
    });

    it("?scenario= query selects the matching scenario", async () => {
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioQuery: "geo-marker",
      });
      expect(r.statusCode).toBe(200);
      expect(r.body).toContain("geo-test-marker");
    });

    it("X-Scenario header takes precedence over ?scenario= query", async () => {
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioHeader: "geo-marker",
        scenarioQuery: "civic-us",
      });
      expect(r.body).toContain("geo-test-marker");
      expect(r.body).not.toContain("civicAddress");
    });
  });

  describe("unknown scenario id", () => {
    it("returns 400 when the X-Scenario header is unknown", async () => {
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioHeader: "does-not-exist",
      });
      expect(r.statusCode).toBe(400);
    });

    it("returns 400 when ?scenario= is unknown", async () => {
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioQuery: "does-not-exist",
      });
      expect(r.statusCode).toBe(400);
    });

    it("the 400 response is JSON with an error and the requested scenario id", async () => {
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioHeader: "does-not-exist",
      });
      expect(r.headers["content-type"]).toMatch(/application\/json/);
      const payload = r.json() as { error: string; scenario: string; available: string[] };
      expect(payload.error).toMatch(/Unknown scenario/);
      expect(payload.scenario).toBe("does-not-exist");
      expect(payload.available).toEqual(expect.arrayContaining(["civic-us", "geo-marker"]));
    });
  });

  describe("artificial delay", () => {
    it("waits at least delayMs before responding", async () => {
      const started = Date.now();
      const r = await post({
        body: sampleRequest,
        contentType: HELD_CONTENT_TYPE,
        scenarioHeader: "slow-test",
      });
      const elapsed = Date.now() - started;
      expect(r.statusCode).toBe(200);
      expect(elapsed).toBeGreaterThanOrEqual(75);
    });

    it("does not delay scenarios with delayMs=0", async () => {
      const started = Date.now();
      await post({ body: sampleRequest, contentType: HELD_CONTENT_TYPE, scenarioHeader: "civic-us" });
      const elapsed = Date.now() - started;
      expect(elapsed).toBeLessThan(75);
    });
  });

  describe("request body tolerance", () => {
    it("accepts an empty body when Content-Type is HELD", async () => {
      const r = await post({ body: "", contentType: HELD_CONTENT_TYPE });
      expect(r.statusCode).toBe(200);
    });

    it("accepts a request with no body and no Content-Type", async () => {
      const r = await post();
      expect(r.statusCode).toBe(200);
    });
  });
});
