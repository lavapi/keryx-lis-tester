import { describe, expect, it } from "vitest";

import { buildDereferenceContext } from "./dereferenceContext.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("buildDereferenceContext", () => {
  it("produces a UUID-formatted locationToken", () => {
    const ctx = buildDereferenceContext();
    expect(ctx.locationToken).toMatch(UUID_RE);
  });

  it("each call returns a distinct token", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      tokens.add(buildDereferenceContext().locationToken ?? "");
    }
    expect(tokens.size).toBe(50);
  });

  it("locationExpires is an ISO-8601 timestamp in the future", () => {
    const before = Date.now();
    const ctx = buildDereferenceContext();
    const expires = new Date(ctx.locationExpires ?? "").getTime();
    expect(Number.isFinite(expires)).toBe(true);
    expect(expires).toBeGreaterThan(before);
  });

  it("locationExpires honours a custom now and adds the default TTL", () => {
    const fixedNow = new Date("2026-05-01T12:00:00.000Z");
    const ctx = buildDereferenceContext(fixedNow);
    const expiresMs = new Date(ctx.locationExpires ?? "").getTime();
    expect(expiresMs - fixedNow.getTime()).toBeGreaterThan(0);
    expect(expiresMs - fixedNow.getTime()).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("httpsLocationURI uses https scheme and embeds the token", () => {
    const ctx = buildDereferenceContext();
    expect(ctx.httpsLocationURI).toMatch(/^https:\/\//);
    expect(ctx.httpsLocationURI).toContain(ctx.locationToken ?? "MISSING");
  });

  it("sipLocationURI uses sip scheme and embeds the token", () => {
    const ctx = buildDereferenceContext();
    expect(ctx.sipLocationURI).toMatch(/^sip:/);
    expect(ctx.sipLocationURI).toContain(ctx.locationToken ?? "MISSING");
  });
});
