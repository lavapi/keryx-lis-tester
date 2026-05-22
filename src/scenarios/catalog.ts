import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ScenarioMeta } from "./registry.js";

export const SCENARIOS_DIR = dirname(fileURLToPath(import.meta.url));

const DEFAULT_OVERSIZED_KB = 256;

const generateOversizedBody = (): string => {
  const raw = process.env.OVERSIZED_KB;
  const parsed = raw === undefined ? DEFAULT_OVERSIZED_KB : Number(raw);
  const kb = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_OVERSIZED_KB;
  const targetBytes = kb * 1024;
  const header =
    '<?xml version="1.0" encoding="UTF-8"?>\n<locationResponse xmlns="urn:ietf:params:xml:ns:geopriv:held">\n  <padding>';
  const footer = "</padding>\n</locationResponse>\n";
  const padLen = Math.max(0, targetBytes - header.length - footer.length);
  return header + "x".repeat(padLen) + footer;
};

export const catalog: ScenarioMeta[] = [
  {
    id: "civic-us",
    file: "civic-us.xml",
    description: "Dynamic California civic address — different real CA location per request.",
  },
  {
    id: "civic-international",
    file: "civic-international.xml",
    description: "Static non-US civic address (Canada — country, A1, A3, RD, STS, HNO, PC).",
  },
  {
    id: "civic-minimal",
    file: "civic-minimal.xml",
    description: "Minimal civic address — country and A1 only.",
  },
  {
    id: "civic-extended",
    file: "civic-extended.xml",
    description: "Dynamic California civic with extended fields (BLD, FLR, ROOM, PLC, NAM, LMK).",
  },
  {
    id: "geo-point",
    file: "geo-point.xml",
    description: "Dynamic California 2D point (gml:Point, EPSG:4326).",
  },
  {
    id: "geo-point-3d",
    file: "geo-point-3d.xml",
    description: "Dynamic California 3D point with altitude (gml:Point, EPSG:4979).",
  },
  {
    id: "geo-circle",
    file: "geo-circle.xml",
    description: "Dynamic California 50 m circle (gs:Circle).",
  },
  {
    id: "geo-polygon",
    file: "geo-polygon.xml",
    description: "Dynamic California ~100 m square polygon (gml:Polygon, LinearRing).",
  },
  {
    id: "geo-arcband",
    file: "geo-arcband.xml",
    description: "Dynamic California arc-band sector (gs:ArcBand, inner/outer radius + angles).",
  },
  {
    id: "geo-mixed",
    file: "geo-mixed.xml",
    description: "Dynamic California civic + circle — both reflect the same picked location.",
  },
  {
    id: "partial-no-timestamp",
    file: "partial-no-timestamp.xml",
    description: "Well-formed civic PIDF-LO with the optional <timestamp> element omitted.",
  },
  {
    id: "partial-no-method",
    file: "partial-no-method.xml",
    description: "Well-formed civic PIDF-LO with the optional <gp:method> element omitted.",
  },
  {
    id: "partial-no-confidence",
    file: "partial-no-confidence.xml",
    description: "Geodetic Point with no RFC 7459 <conf:*> uncertainty/confidence elements.",
  },
  {
    id: "partial-empty-location-info",
    file: "partial-empty-location-info.xml",
    description: "PIDF-LO with a self-closing, empty <gp:location-info/> element.",
  },
  {
    id: "error-locationUnknown",
    file: "error-locationUnknown.xml",
    description: "HELD <error code=\"locationUnknown\"> (RFC 5985 §6.4).",
  },
  {
    id: "error-timeout",
    file: "error-timeout.xml",
    description: "HELD <error code=\"timeout\"> — exceeded responseTime budget.",
  },
  {
    id: "error-notLocatable",
    file: "error-notLocatable.xml",
    description: "HELD <error code=\"notLocatable\"> — known device, no location available.",
  },
  {
    id: "http-404",
    file: "empty.xml",
    description: "HTTP 404 Not Found, empty body.",
    status: 404,
    contentType: "text/plain",
  },
  {
    id: "http-500",
    file: "empty.xml",
    description: "HTTP 500 Internal Server Error, empty body.",
    status: 500,
    contentType: "text/plain",
  },
  {
    id: "http-503",
    file: "empty.xml",
    description: "HTTP 503 Service Unavailable, empty body.",
    status: 503,
    contentType: "text/plain",
  },
  {
    id: "empty-body",
    file: "empty.xml",
    description: "HTTP 200 with held+xml content-type but zero-byte body.",
  },
  {
    id: "wrong-content-type",
    file: "wrong-content-type.xml",
    description: "Valid HELD body served as text/plain — stresses parsers that key off Content-Type.",
    contentType: "text/plain",
  },
  {
    id: "malformed-xml",
    file: "malformed-xml.xml",
    description: "Truncated, unbalanced XML body — exercises parser error handling.",
  },
  {
    id: "oversized",
    file: "empty.xml",
    description: "Large padded HELD response (~256 KB by default; OVERSIZED_KB env override).",
    bodyProvider: generateOversizedBody,
  },
  {
    id: "slow-2s",
    file: "civic-us.xml",
    description: "Civic-US body delayed by 2 seconds.",
    delayMs: 2000,
  },
  {
    id: "slow-10s",
    file: "civic-us.xml",
    description: "Civic-US body delayed by 10 seconds.",
    delayMs: 10_000,
  },
];

export const scenariosDir = resolve(SCENARIOS_DIR);
