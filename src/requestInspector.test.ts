import { describe, expect, it } from "vitest";

import { inspectHeldRequest } from "./requestInspector.js";

const wrap = (inner: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<locationRequest xmlns="urn:ietf:params:xml:ns:geopriv:held">${inner}</locationRequest>`;

describe("inspectHeldRequest", () => {
  it("returns an empty object for undefined input", () => {
    expect(inspectHeldRequest(undefined)).toEqual({});
  });

  it("returns an empty object for an empty string", () => {
    expect(inspectHeldRequest("")).toEqual({});
  });

  it("returns an empty object for non-XML input", () => {
    expect(inspectHeldRequest("totally not xml")).toEqual({});
  });

  it("extracts locationType", () => {
    const body = wrap("<locationType>geodetic</locationType>");
    expect(inspectHeldRequest(body)).toEqual({ locationType: "geodetic" });
  });

  it("extracts responseTime", () => {
    const body = wrap("<responseTime>emergencyRouting</responseTime>");
    expect(inspectHeldRequest(body)).toEqual({ responseTime: "emergencyRouting" });
  });

  it("extracts both locationType and responseTime", () => {
    const body = wrap(
      "<locationType exact=\"true\">geodetic civic</locationType><responseTime>4</responseTime>",
    );
    expect(inspectHeldRequest(body)).toEqual({
      locationType: "geodetic civic",
      responseTime: "4",
    });
  });

  it("tolerates namespace-prefixed element names", () => {
    const body = `<held:locationRequest xmlns:held="urn:ietf:params:xml:ns:geopriv:held">
      <held:locationType>civic</held:locationType>
      <held:responseTime>8</held:responseTime>
    </held:locationRequest>`;
    expect(inspectHeldRequest(body)).toEqual({
      locationType: "civic",
      responseTime: "8",
    });
  });

  it("trims surrounding whitespace from extracted values", () => {
    const body = wrap("<locationType>   geodetic   </locationType>");
    expect(inspectHeldRequest(body)).toEqual({ locationType: "geodetic" });
  });

  it("returns an empty object when the body has neither element", () => {
    const body = wrap("<somethingElse>x</somethingElse>");
    expect(inspectHeldRequest(body)).toEqual({});
  });

  it("never throws — best-effort even for clearly broken input", () => {
    expect(() => inspectHeldRequest("<locationType>unclosed")).not.toThrow();
    expect(inspectHeldRequest("<locationType>unclosed")).toEqual({});
  });
});
