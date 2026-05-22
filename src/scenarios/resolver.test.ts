import { describe, expect, it } from "vitest";

import { resolveScenarioId } from "./resolver.js";

const DEFAULT_ID = "civic-us";

describe("resolveScenarioId", () => {
  it("returns the default when neither header nor query is provided", () => {
    expect(resolveScenarioId(undefined, undefined, DEFAULT_ID)).toBe(DEFAULT_ID);
  });

  it("returns the X-Scenario header value when present", () => {
    expect(resolveScenarioId("geo-point", undefined, DEFAULT_ID)).toBe("geo-point");
  });

  it("returns the query value when no header is provided", () => {
    expect(resolveScenarioId(undefined, "geo-circle", DEFAULT_ID)).toBe("geo-circle");
  });

  it("prefers the header over the query when both are present", () => {
    expect(resolveScenarioId("from-header", "from-query", DEFAULT_ID)).toBe("from-header");
  });

  it("trims surrounding whitespace from the header value", () => {
    expect(resolveScenarioId("  geo-point  ", undefined, DEFAULT_ID)).toBe("geo-point");
  });

  it("trims surrounding whitespace from the query value", () => {
    expect(resolveScenarioId(undefined, "\tgeo-circle\n", DEFAULT_ID)).toBe("geo-circle");
  });

  it("treats an empty header as absent and falls through to the query", () => {
    expect(resolveScenarioId("", "from-query", DEFAULT_ID)).toBe("from-query");
  });

  it("treats whitespace-only header as absent and falls through to the query", () => {
    expect(resolveScenarioId("   ", "from-query", DEFAULT_ID)).toBe("from-query");
  });

  it("treats an empty query as absent and falls through to the default", () => {
    expect(resolveScenarioId(undefined, "", DEFAULT_ID)).toBe(DEFAULT_ID);
  });

  it("uses the first value when the header is provided as an array", () => {
    expect(resolveScenarioId(["geo-point", "ignored"], undefined, DEFAULT_ID)).toBe("geo-point");
  });

  it("falls through when the header array's first value is empty", () => {
    expect(resolveScenarioId(["", "from-array"], "from-query", DEFAULT_ID)).toBe("from-query");
  });
});
