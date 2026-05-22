import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AppConfig } from "./config.js";
import { buildServer } from "./server.js";

const testConfig: AppConfig = {
  port: 0,
  host: "127.0.0.1",
  logLevel: "silent",
  defaultScenarioId: "civic-us",
};

describe("server", () => {
  const app = buildServer(testConfig);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("returns 200", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.statusCode).toBe(200);
    });

    it("returns JSON body { status: 'ok' }", async () => {
      const response = await app.inject({ method: "GET", url: "/health" });
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.json()).toEqual({ status: "ok" });
    });
  });

  describe("unknown routes", () => {
    it("returns 404 for an unknown path", async () => {
      const response = await app.inject({ method: "GET", url: "/does-not-exist" });
      expect(response.statusCode).toBe(404);
    });
  });
});
