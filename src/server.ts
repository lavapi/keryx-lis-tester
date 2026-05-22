import Fastify, { type FastifyInstance } from "fastify";

import type { AppConfig } from "./config.js";
import { registerHeldEndpoint } from "./heldEndpoint.js";
import { catalog, scenariosDir } from "./scenarios/catalog.js";
import { loadRegistry } from "./scenarios/registry.js";

export const buildServer = (config: AppConfig): FastifyInstance => {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss.l" } },
    },
    disableRequestLogging: false,
  });

  const registry = loadRegistry(catalog, scenariosDir);

  app.get("/health", async () => ({ status: "ok" }));
  registerHeldEndpoint(app, {
    registry,
    defaultScenarioId: config.defaultScenarioId,
  });

  return app;
};
