import { randomUUID } from "node:crypto";

const LIS_BASE_HOST = "lis.keryx.example.com";
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const buildDereferenceContext = (now: Date = new Date()): Record<string, string> => {
  const token = randomUUID();
  const expires = new Date(now.getTime() + DEFAULT_TTL_MS).toISOString();
  return {
    locationToken: token,
    locationExpires: expires,
    httpsLocationURI: `https://${LIS_BASE_HOST}/locations/${token}`,
    sipLocationURI: `sip:${token}@${LIS_BASE_HOST}`,
  };
};
