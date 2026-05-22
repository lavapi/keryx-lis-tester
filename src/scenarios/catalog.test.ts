import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { catalog, scenariosDir } from "./catalog.js";

describe("catalog", () => {
  it("is non-empty", () => {
    expect(catalog.length).toBeGreaterThan(0);
  });

  it("has no duplicate scenario ids", () => {
    const ids = catalog.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has either a readable file or a bodyProvider", () => {
    for (const meta of catalog) {
      if (meta.bodyProvider !== undefined) continue;
      const path = resolve(scenariosDir, meta.file);
      expect(existsSync(path), `${meta.id} → ${meta.file}`).toBe(true);
    }
  });

  it("every scenario id uses lower-kebab-case", () => {
    for (const meta of catalog) {
      expect(meta.id, meta.id).toMatch(/^[a-z][a-zA-Z0-9-]*$/);
    }
  });

  it("HTTP-error scenarios have the documented status codes", () => {
    const find = (id: string) => catalog.find((m) => m.id === id);
    expect(find("http-404")?.status).toBe(404);
    expect(find("http-500")?.status).toBe(500);
    expect(find("http-503")?.status).toBe(503);
  });

  it("slow scenarios carry their documented delay", () => {
    const find = (id: string) => catalog.find((m) => m.id === id);
    expect(find("slow-2s")?.delayMs).toBe(2_000);
    expect(find("slow-10s")?.delayMs).toBe(10_000);
  });

  it("wrong-content-type advertises text/plain", () => {
    const meta = catalog.find((m) => m.id === "wrong-content-type");
    expect(meta?.contentType).toBe("text/plain");
  });

  it("every description is non-trivial", () => {
    for (const meta of catalog) {
      expect(meta.description.length, meta.id).toBeGreaterThan(10);
    }
  });
});
