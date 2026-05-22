import type { ScenarioMeta } from "../scenarios/registry.js";

export interface PostmanHeader {
  key: string;
  value: string;
  type?: "text";
}

export interface PostmanUrl {
  raw: string;
  host: string[];
  path: string[];
  query?: { key: string; value: string }[];
}

export interface PostmanBody {
  mode: "raw";
  raw: string;
  options?: { raw: { language: "xml" } };
}

export interface PostmanScript {
  type: "text/javascript";
  exec: string[];
}

export interface PostmanEvent {
  listen: "test" | "prerequest";
  script: PostmanScript;
}

export interface PostmanRequest {
  name: string;
  request: {
    method: "GET" | "POST";
    header: PostmanHeader[];
    url: PostmanUrl;
    body?: PostmanBody;
    description?: string;
  };
  event?: PostmanEvent[];
}

export interface PostmanFolder {
  name: string;
  description?: string;
  item: PostmanRequest[];
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: "string";
}

export interface PostmanCollection {
  info: {
    name: string;
    description: string;
    schema: string;
  };
  item: PostmanFolder[];
  variable: PostmanVariable[];
}

const SCHEMA_URL =
  "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";
const HELD_CONTENT_TYPE = "application/held+xml";
const DEFAULT_BASE_URL = "http://localhost:8088";

const SAMPLE_REQUEST_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<locationRequest xmlns="urn:ietf:params:xml:ns:geopriv:held">
  <locationType exact="true">geodetic civic</locationType>
  <responseTime>emergencyRouting</responseTime>
</locationRequest>`;

const FOLDER_ORDER = [
  "Health",
  "Dereference",
  "Civic",
  "Geodetic",
  "Partial / missing-field",
  "HELD errors",
  "HTTP errors",
  "Edge cases",
  "Delays",
] as const;

type FolderName = (typeof FOLDER_ORDER)[number];
type ScenarioFolderName = Exclude<FolderName, "Health" | "Dereference">;

const categorize = (id: string): ScenarioFolderName => {
  if (id.startsWith("civic-")) return "Civic";
  if (id.startsWith("geo-")) return "Geodetic";
  if (id.startsWith("partial-")) return "Partial / missing-field";
  if (id.startsWith("error-")) return "HELD errors";
  if (id.startsWith("http-")) return "HTTP errors";
  if (id.startsWith("slow-")) return "Delays";
  return "Edge cases";
};

const baseUrlVariable: PostmanVariable = {
  key: "baseUrl",
  value: DEFAULT_BASE_URL,
  type: "string",
};

const buildRootUrl = (extraPath: string[] = []): PostmanUrl => {
  const path = extraPath.length === 0 ? [""] : extraPath;
  const raw = `{{baseUrl}}/${extraPath.join("/")}`;
  return { raw, host: ["{{baseUrl}}"], path };
};

const buildHealthRequest = (): PostmanRequest => ({
  name: "Health check",
  request: {
    method: "GET",
    header: [],
    url: buildRootUrl(["health"]),
    description: "Liveness probe — returns 200 with {\"status\":\"ok\"}.",
  },
  event: [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "pm.test(\"status is 200\", () => {",
          "  pm.expect(pm.response.code).to.equal(200);",
          "});",
          "pm.test(\"body is {status: ok}\", () => {",
          "  pm.expect(pm.response.json()).to.eql({ status: \"ok\" });",
          "});",
        ],
      },
    },
  ],
});

const DEREFERENCE_TEST_SCRIPT: PostmanEvent = {
  listen: "test",
  script: {
    type: "text/javascript",
    exec: [
      "pm.test(\"status is 200\", () => {",
      "  pm.expect(pm.response.code).to.equal(200);",
      "});",
      "pm.test(\"content-type is application/held+xml\", () => {",
      "  pm.expect(pm.response.headers.get(\"Content-Type\")).to.match(/application\\/held\\+xml/);",
      "});",
    ],
  },
};

const buildDereferenceGetRequest = (): PostmanRequest => ({
  name: "Dereference (GET) — RFC 6753",
  request: {
    method: "GET",
    header: [],
    url: {
      raw: "{{baseUrl}}/locations/{{$randomUUID}}",
      host: ["{{baseUrl}}"],
      path: ["locations", "{{$randomUUID}}"],
    },
    description:
      "Dereferences a HELD locationURI. Per RFC 6753 §3.2 the LIS MUST accept GET " +
      "and return a HELD location response (default locationType=any).",
  },
  event: [DEREFERENCE_TEST_SCRIPT],
});

const buildDereferencePostRequest = (): PostmanRequest => ({
  name: "Dereference (POST) — RFC 6753",
  request: {
    method: "POST",
    header: [{ key: "Content-Type", value: HELD_CONTENT_TYPE, type: "text" }],
    url: {
      raw: "{{baseUrl}}/locations/{{$randomUUID}}",
      host: ["{{baseUrl}}"],
      path: ["locations", "{{$randomUUID}}"],
    },
    body: {
      mode: "raw",
      raw: SAMPLE_REQUEST_BODY,
      options: { raw: { language: "xml" } },
    },
    description:
      "Dereferences a HELD locationURI with an explicit locationRequest body " +
      "(RFC 6753 §3.1).",
  },
  event: [DEREFERENCE_TEST_SCRIPT],
});

const buildScenarioRequest = (meta: ScenarioMeta): PostmanRequest => {
  const expectedStatus = meta.status ?? 200;
  return {
    name: meta.id,
    request: {
      method: "POST",
      header: [
        { key: "Content-Type", value: HELD_CONTENT_TYPE, type: "text" },
        { key: "X-Scenario", value: meta.id, type: "text" },
      ],
      url: buildRootUrl(),
      body: {
        mode: "raw",
        raw: SAMPLE_REQUEST_BODY,
        options: { raw: { language: "xml" } },
      },
      description: meta.description,
    },
    event: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            `pm.test("status is ${expectedStatus}", () => {`,
            `  pm.expect(pm.response.code).to.equal(${expectedStatus});`,
            "});",
          ],
        },
      },
    ],
  };
};

export const buildCollection = (catalog: ScenarioMeta[]): PostmanCollection => {
  const folders: Record<FolderName, PostmanRequest[]> = {
    Health: [buildHealthRequest()],
    Dereference: [buildDereferenceGetRequest(), buildDereferencePostRequest()],
    Civic: [],
    Geodetic: [],
    "Partial / missing-field": [],
    "HELD errors": [],
    "HTTP errors": [],
    "Edge cases": [],
    Delays: [],
  };

  for (const meta of catalog) {
    folders[categorize(meta.id)].push(buildScenarioRequest(meta));
  }

  return {
    info: {
      name: "LIS Tester",
      description:
        "Mock LIS scenarios for exercising HELD (RFC 5985) client parsing. " +
        "Set `baseUrl` (collection variable) to point at the running server, " +
        "then fire any request — each one selects a scenario via the X-Scenario header.",
      schema: SCHEMA_URL,
    },
    item: FOLDER_ORDER.map((name) => ({ name, item: folders[name] })),
    variable: [baseUrlVariable],
  };
};
