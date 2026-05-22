import { describe, expect, it } from "vitest";

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("returns sensible defaults when env is empty", () => {
    const config = loadConfig({});

    expect(config.port).toBe(8088);
    expect(config.host).toBe("0.0.0.0");
    expect(config.logLevel).toBe("info");
    expect(config.defaultScenarioId).toBe("civic-us");
  });

  it("honours PORT, HOST, LOG_LEVEL, DEFAULT_SCENARIO overrides", () => {
    const config = loadConfig({
      PORT: "9090",
      HOST: "127.0.0.1",
      LOG_LEVEL: "debug",
      DEFAULT_SCENARIO: "geo-point",
    });

    expect(config.port).toBe(9090);
    expect(config.host).toBe("127.0.0.1");
    expect(config.logLevel).toBe("debug");
    expect(config.defaultScenarioId).toBe("geo-point");
  });

  it("rejects a non-numeric PORT", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/Invalid PORT/);
  });

  it("rejects a PORT out of range", () => {
    expect(() => loadConfig({ PORT: "0" })).toThrow(/Invalid PORT/);
    expect(() => loadConfig({ PORT: "70000" })).toThrow(/Invalid PORT/);
  });

  it("rejects a fractional PORT", () => {
    expect(() => loadConfig({ PORT: "80.5" })).toThrow(/Invalid PORT/);
  });

  it("rejects an unknown LOG_LEVEL", () => {
    expect(() => loadConfig({ LOG_LEVEL: "loud" })).toThrow(/Invalid LOG_LEVEL/);
  });

  it("accepts every documented LOG_LEVEL", () => {
    const levels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
    for (const level of levels) {
      expect(loadConfig({ LOG_LEVEL: level }).logLevel).toBe(level);
    }
  });
});
