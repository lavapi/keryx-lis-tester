import { describe, expect, it } from "vitest";

import { applyTemplate } from "./template.js";

describe("applyTemplate", () => {
  it("returns an empty string unchanged", () => {
    expect(applyTemplate("", {})).toBe("");
  });

  it("returns the body unchanged when there are no placeholders", () => {
    expect(applyTemplate("<x>plain xml</x>", { timestamp: "2026-01-01T00:00:00Z" })).toBe(
      "<x>plain xml</x>",
    );
  });

  it("replaces a single placeholder", () => {
    expect(applyTemplate("<x>{{timestamp}}</x>", { timestamp: "now" })).toBe("<x>now</x>");
  });

  it("replaces every occurrence of the same placeholder", () => {
    expect(applyTemplate("<a>{{x}}</a><b>{{x}}</b>", { x: "1" })).toBe("<a>1</a><b>1</b>");
  });

  it("replaces multiple distinct placeholders", () => {
    expect(applyTemplate("<x a='{{one}}' b='{{two}}'/>", { one: "A", two: "B" })).toBe(
      "<x a='A' b='B'/>",
    );
  });

  it("tolerates whitespace inside the placeholder braces", () => {
    expect(applyTemplate("<x>{{ timestamp }}</x>", { timestamp: "now" })).toBe("<x>now</x>");
  });

  it("throws when a placeholder has no matching variable", () => {
    expect(() => applyTemplate("<x>{{missing}}</x>", { timestamp: "now" })).toThrow(
      /Unknown template variable: missing/,
    );
  });

  it("reports the first missing variable when several are missing", () => {
    expect(() => applyTemplate("<x>{{a}} {{b}}</x>", {})).toThrow(/Unknown template variable: a/);
  });
});
