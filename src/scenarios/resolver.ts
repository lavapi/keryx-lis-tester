export type HeaderInput = string | string[] | undefined;
export type QueryInput = string | undefined;

const firstNonEmpty = (raw: HeaderInput): string | undefined => {
  if (raw === undefined) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const trimmedOrUndefined = (raw: QueryInput): string | undefined => {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const resolveScenarioId = (
  headerValue: HeaderInput,
  queryValue: QueryInput,
  defaultId: string,
): string => {
  return firstNonEmpty(headerValue) ?? trimmedOrUndefined(queryValue) ?? defaultId;
};
