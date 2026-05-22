import { describe, expect, it } from "vitest";

import type { ScenarioMeta } from "../scenarios/registry.js";
import { buildCollection } from "./builder.js";

const sampleCatalog: ScenarioMeta[] = [
  { id: "civic-us", file: "civic-us.xml", description: "Civic US" },
  { id: "civic-international", file: "civic-international.xml", description: "Civic CA" },
  { id: "geo-point", file: "geo-point.xml", description: "Geo point" },
  { id: "partial-no-timestamp", file: "partial-no-timestamp.xml", description: "No timestamp" },
  { id: "error-timeout", file: "error-timeout.xml", description: "HELD timeout" },
  { id: "http-503", file: "empty.xml", description: "HTTP 503", status: 503 },
  { id: "slow-2s", file: "civic-us.xml", description: "2s delay", delayMs: 2_000 },
  { id: "malformed-xml", file: "malformed-xml.xml", description: "Bad XML" },
];

const findFolder = (collection: ReturnType<typeof buildCollection>, name: string) =>
  collection.item.find((f) => f.name === name);

const findRequest = (
  collection: ReturnType<typeof buildCollection>,
  folderName: string,
  requestName: string,
) => findFolder(collection, folderName)?.item.find((r) => r.name === requestName);

describe("buildCollection", () => {
  it("declares the Postman v2.1.0 schema", () => {
    const c = buildCollection([]);
    expect(c.info.schema).toBe(
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    );
  });

  it("has a baseUrl collection variable defaulting to http://localhost:8088", () => {
    const c = buildCollection([]);
    const baseUrl = c.variable.find((v) => v.key === "baseUrl");
    expect(baseUrl?.value).toBe("http://localhost:8088");
  });

  it("includes a Health folder with a GET /health request", () => {
    const c = buildCollection([]);
    const health = findFolder(c, "Health");
    expect(health).toBeDefined();
    const req = health!.item[0];
    expect(req?.request.method).toBe("GET");
    expect(req?.request.url.raw).toContain("/health");
  });

  it("places civic-* under the Civic folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "Civic", "civic-us")).toBeDefined();
    expect(findRequest(c, "Civic", "civic-international")).toBeDefined();
  });

  it("places geo-* under the Geodetic folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "Geodetic", "geo-point")).toBeDefined();
  });

  it("places partial-* under the Partial / missing-field folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "Partial / missing-field", "partial-no-timestamp")).toBeDefined();
  });

  it("places error-* under the HELD errors folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "HELD errors", "error-timeout")).toBeDefined();
  });

  it("places http-* under the HTTP errors folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "HTTP errors", "http-503")).toBeDefined();
  });

  it("places slow-* under the Delays folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "Delays", "slow-2s")).toBeDefined();
  });

  it("places everything else under the Edge cases folder", () => {
    const c = buildCollection(sampleCatalog);
    expect(findRequest(c, "Edge cases", "malformed-xml")).toBeDefined();
  });

  it("includes every scenario from the catalog exactly once", () => {
    const c = buildCollection(sampleCatalog);
    const allRequests = c.item.flatMap((folder) => folder.item).map((r) => r.name);
    for (const meta of sampleCatalog) {
      expect(allRequests.filter((n) => n === meta.id)).toHaveLength(1);
    }
  });

  it("every scenario request is a POST to {{baseUrl}}/", () => {
    const c = buildCollection(sampleCatalog);
    for (const meta of sampleCatalog) {
      const folders = c.item.filter((f) => f.name !== "Health");
      const r = folders.flatMap((f) => f.item).find((r) => r.name === meta.id);
      expect(r?.request.method).toBe("POST");
      expect(r?.request.url.raw).toContain("{{baseUrl}}");
    }
  });

  it("every scenario request sets the held+xml Content-Type and X-Scenario header", () => {
    const c = buildCollection(sampleCatalog);
    const r = findRequest(c, "Civic", "civic-us");
    const contentType = r?.request.header.find((h) => h.key.toLowerCase() === "content-type");
    const scenarioHeader = r?.request.header.find((h) => h.key === "X-Scenario");
    expect(contentType?.value).toBe("application/held+xml");
    expect(scenarioHeader?.value).toBe("civic-us");
  });

  it("every scenario request carries a sample HELD locationRequest body", () => {
    const c = buildCollection(sampleCatalog);
    const r = findRequest(c, "Geodetic", "geo-point");
    expect(r?.request.body?.mode).toBe("raw");
    expect(r?.request.body?.raw).toContain("<locationRequest");
    expect(r?.request.body?.raw).toContain("urn:ietf:params:xml:ns:geopriv:held");
  });

  it("the sample body includes locationType and responseTime so the inspector parses them", () => {
    const c = buildCollection(sampleCatalog);
    const r = findRequest(c, "Civic", "civic-us");
    expect(r?.request.body?.raw).toContain("<locationType");
    expect(r?.request.body?.raw).toContain("<responseTime");
  });

  it("attaches a test script asserting the scenario's declared status code", () => {
    const c = buildCollection(sampleCatalog);
    const r = findRequest(c, "HTTP errors", "http-503");
    const testEvent = r?.event?.find((e) => e.listen === "test");
    const script = testEvent?.script.exec.join("\n") ?? "";
    expect(script).toContain("503");
  });

  it("defaults the asserted status to 200 for scenarios without an explicit status", () => {
    const c = buildCollection(sampleCatalog);
    const r = findRequest(c, "Civic", "civic-us");
    const testEvent = r?.event?.find((e) => e.listen === "test");
    const script = testEvent?.script.exec.join("\n") ?? "";
    expect(script).toContain("200");
  });

  it("propagates the scenario description into the request", () => {
    const c = buildCollection(sampleCatalog);
    const r = findRequest(c, "HELD errors", "error-timeout");
    expect(r?.request.description).toBe("HELD timeout");
  });

  it("folders appear in a stable, documented order", () => {
    const c = buildCollection(sampleCatalog);
    const names = c.item.map((f) => f.name);
    expect(names).toEqual([
      "Health",
      "Civic",
      "Geodetic",
      "Partial / missing-field",
      "HELD errors",
      "HTTP errors",
      "Edge cases",
      "Delays",
    ]);
  });
});
