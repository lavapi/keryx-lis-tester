import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadRegistry, type ScenarioMeta } from "./registry.js";

const writeFixture = (dir: string, name: string, body: string): void => {
  writeFileSync(join(dir, name), body, "utf-8");
};

describe("loadRegistry", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "lis-registry-"));
    writeFixture(dir, "alpha.xml", "<alpha/>");
    writeFixture(dir, "beta.xml", "<beta/>");
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads every scenario in the catalog into a get-by-id map", () => {
    const catalog: ScenarioMeta[] = [
      { id: "alpha", file: "alpha.xml", description: "first" },
      { id: "beta", file: "beta.xml", description: "second" },
    ];

    const registry = loadRegistry(catalog, dir);

    expect(registry.get("alpha")?.body).toBe("<alpha/>");
    expect(registry.get("beta")?.body).toBe("<beta/>");
  });

  it("applies defaults: status 200, application/held+xml content-type, no delay", () => {
    const catalog: ScenarioMeta[] = [{ id: "alpha", file: "alpha.xml", description: "first" }];

    const scenario = loadRegistry(catalog, dir).get("alpha");

    expect(scenario?.status).toBe(200);
    expect(scenario?.contentType).toBe("application/held+xml");
    expect(scenario?.delayMs).toBe(0);
  });

  it("preserves overrides for status, contentType, and delayMs", () => {
    const catalog: ScenarioMeta[] = [
      {
        id: "alpha",
        file: "alpha.xml",
        description: "first",
        status: 503,
        contentType: "text/plain",
        delayMs: 1500,
      },
    ];

    const scenario = loadRegistry(catalog, dir).get("alpha");

    expect(scenario?.status).toBe(503);
    expect(scenario?.contentType).toBe("text/plain");
    expect(scenario?.delayMs).toBe(1500);
  });

  it("returns undefined for an unknown id", () => {
    const catalog: ScenarioMeta[] = [{ id: "alpha", file: "alpha.xml", description: "first" }];
    expect(loadRegistry(catalog, dir).get("does-not-exist")).toBeUndefined();
  });

  it("exposes list() with every loaded scenario", () => {
    const catalog: ScenarioMeta[] = [
      { id: "alpha", file: "alpha.xml", description: "first" },
      { id: "beta", file: "beta.xml", description: "second" },
    ];

    const ids = loadRegistry(catalog, dir)
      .list()
      .map((s) => s.id);

    expect(ids).toEqual(["alpha", "beta"]);
  });

  it("throws on a duplicate id", () => {
    const catalog: ScenarioMeta[] = [
      { id: "alpha", file: "alpha.xml", description: "first" },
      { id: "alpha", file: "beta.xml", description: "dup" },
    ];

    expect(() => loadRegistry(catalog, dir)).toThrow(/Duplicate scenario id: alpha/);
  });

  it("throws when a referenced file is missing", () => {
    const catalog: ScenarioMeta[] = [
      { id: "ghost", file: "ghost.xml", description: "missing" },
    ];

    expect(() => loadRegistry(catalog, dir)).toThrow(/ghost\.xml/);
  });

  describe("bodyProvider", () => {
    it("uses bodyProvider's return value instead of reading the file", () => {
      const catalog: ScenarioMeta[] = [
        {
          id: "synthetic",
          file: "alpha.xml",
          description: "generated",
          bodyProvider: () => "synthetic body",
        },
      ];

      const scenario = loadRegistry(catalog, dir).get("synthetic");

      expect(scenario?.body).toBe("synthetic body");
    });

    it("invokes bodyProvider once at load time", () => {
      let calls = 0;
      const catalog: ScenarioMeta[] = [
        {
          id: "synthetic",
          file: "alpha.xml",
          description: "generated",
          bodyProvider: () => {
            calls += 1;
            return `call-${calls}`;
          },
        },
      ];

      const registry = loadRegistry(catalog, dir);

      registry.get("synthetic");
      registry.get("synthetic");

      expect(calls).toBe(1);
    });

    it("tolerates a missing file when bodyProvider supplies the body", () => {
      const catalog: ScenarioMeta[] = [
        {
          id: "synthetic",
          file: "does-not-exist.xml",
          description: "generated",
          bodyProvider: () => "ok",
        },
      ];

      expect(() => loadRegistry(catalog, dir)).not.toThrow();
    });
  });
});
