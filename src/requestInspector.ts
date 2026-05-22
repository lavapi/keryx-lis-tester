export interface HeldRequestSummary {
  locationType?: string;
  responseTime?: string;
}

const LOCATION_TYPE = /<(?:[\w-]+:)?locationType[^>]*>([^<]+)<\/(?:[\w-]+:)?locationType>/;
const RESPONSE_TIME = /<(?:[\w-]+:)?responseTime[^>]*>([^<]+)<\/(?:[\w-]+:)?responseTime>/;

const captured = (body: string, pattern: RegExp): string | undefined => {
  const match = body.match(pattern);
  if (match === null) return undefined;
  return match[1]?.trim();
};

export const inspectHeldRequest = (body: string | undefined): HeldRequestSummary => {
  if (body === undefined || body.length === 0) return {};
  try {
    const summary: HeldRequestSummary = {};
    const locationType = captured(body, LOCATION_TYPE);
    if (locationType !== undefined) summary.locationType = locationType;
    const responseTime = captured(body, RESPONSE_TIME);
    if (responseTime !== undefined) summary.responseTime = responseTime;
    return summary;
  } catch {
    return {};
  }
};
