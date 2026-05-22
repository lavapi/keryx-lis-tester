import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ScenarioMeta {
  id: string;
  file: string;
  description: string;
  status?: number;
  contentType?: string;
  delayMs?: number;
  bodyProvider?: () => string;
}

export interface LoadedScenario {
  id: string;
  description: string;
  body: string;
  status: number;
  contentType: string;
  delayMs: number;
}

export interface Registry {
  get(id: string): LoadedScenario | undefined;
  list(): LoadedScenario[];
}

const DEFAULT_STATUS = 200;
const DEFAULT_CONTENT_TYPE = "application/held+xml";
const DEFAULT_DELAY_MS = 0;

const readBody = (scenariosDir: string, meta: ScenarioMeta): string => {
  try {
    return readFileSync(resolve(scenariosDir, meta.file), "utf-8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load scenario "${meta.id}" from ${meta.file}: ${reason}`);
  }
};

const toLoaded = (meta: ScenarioMeta, body: string): LoadedScenario => ({
  id: meta.id,
  description: meta.description,
  body,
  status: meta.status ?? DEFAULT_STATUS,
  contentType: meta.contentType ?? DEFAULT_CONTENT_TYPE,
  delayMs: meta.delayMs ?? DEFAULT_DELAY_MS,
});

export const loadRegistry = (catalog: ScenarioMeta[], scenariosDir: string): Registry => {
  const map = new Map<string, LoadedScenario>();

  for (const meta of catalog) {
    if (map.has(meta.id)) {
      throw new Error(`Duplicate scenario id: ${meta.id}`);
    }
    const body = meta.bodyProvider !== undefined ? meta.bodyProvider() : readBody(scenariosDir, meta);
    map.set(meta.id, toLoaded(meta, body));
  }

  return {
    get: (id) => map.get(id),
    list: () => [...map.values()],
  };
};
