import { setTimeout as delay } from "node:timers/promises";

import type { FastifyInstance } from "fastify";

import { buildDereferenceContext } from "./dereferenceContext.js";
import { buildLocationContext } from "./locationContext.js";
import { pickLocation } from "./locationPicker.js";
import { inspectHeldRequest } from "./requestInspector.js";
import type { Registry } from "./scenarios/registry.js";
import { resolveScenarioId } from "./scenarios/resolver.js";
import { applyTemplate } from "./template.js";

export const HELD_CONTENT_TYPE = "application/held+xml";

export interface HeldEndpointDeps {
  registry: Registry;
  defaultScenarioId: string;
}

interface ScenarioQuery {
  scenario?: string;
}

export const registerHeldEndpoint = (
  app: FastifyInstance,
  deps: HeldEndpointDeps,
): void => {
  app.addContentTypeParser(
    HELD_CONTENT_TYPE,
    { parseAs: "string" },
    (_request, body, done) => {
      done(null, body);
    },
  );

  app.get("/", async (_request, reply) => {
    reply.header("allow", "POST").code(405);
    return { error: "Method Not Allowed", allow: "POST" };
  });

  app.post("/", async (request, reply) => {
    const query = (request.query ?? {}) as ScenarioQuery;
    const scenarioId = resolveScenarioId(
      request.headers["x-scenario"],
      query.scenario,
      deps.defaultScenarioId,
    );

    const scenario = deps.registry.get(scenarioId);
    if (scenario === undefined) {
      request.log.warn({ scenarioId }, "unknown scenario requested");
      reply.code(400).type("application/json");
      return {
        error: "Unknown scenario",
        scenario: scenarioId,
        available: deps.registry.list().map((s) => s.id),
      };
    }

    const summary = inspectHeldRequest(request.body as string | undefined);
    request.log.info(
      { scenarioId, ...summary },
      "HELD locationRequest received",
    );
    if (scenario.delayMs > 0) {
      await delay(scenario.delayMs);
    }
    const rendered = applyTemplate(scenario.body, {
      timestamp: new Date().toISOString(),
      ...buildLocationContext(pickLocation()),
      ...buildDereferenceContext(),
    });
    reply.code(scenario.status).type(scenario.contentType);
    return rendered;
  });
};
