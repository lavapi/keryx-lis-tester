import { describe, expect, it } from "vitest";

import { formatCatalog } from "./format.js";
import type { ScenarioMeta } from "./registry.js";

describe("formatCatalog", () => {
  it("returns a placeholder for an empty catalog", () => {
    expect(formatCatalog([])).toBe("(no scenarios registered)");
  });

  it("renders id and description for a single scenario", () => {
    const items: ScenarioMeta[] = [
      { id: "civic-us", file: "civic-us.xml", description: "Civic US" },
    ];
    const out = formatCatalog(items);
    expect(out).toContain("civic-us");
    expect(out).toContain("Civic US");
  });

  it("renders every scenario on its own line", () => {
    const items: ScenarioMeta[] = [
      { id: "civic-us", file: "civic-us.xml", description: "Civic US" },
      { id: "geo-point", file: "geo-point.xml", description: "Geodetic point" },
    ];
    const lines = formatCatalog(items).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("civic-us");
    expect(lines[1]).toContain("geo-point");
  });

  it("annotates non-200 status overrides", () => {
    const items: ScenarioMeta[] = [
      {
        id: "http-503",
        file: "http-503.xml",
        description: "Service unavailable",
        status: 503,
      },
    ];
    expect(formatCatalog(items)).toContain("[503]");
  });

  it("annotates artificial delays", () => {
    const items: ScenarioMeta[] = [
      {
        id: "slow-2s",
        file: "civic-us.xml",
        description: "Two-second delay",
        delayMs: 2000,
      },
    ];
    expect(formatCatalog(items)).toContain("delay=2000ms");
  });
});
