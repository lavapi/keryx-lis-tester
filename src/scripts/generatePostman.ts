import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCollection } from "../postman/builder.js";
import { catalog } from "../scenarios/catalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "postman");
const COLLECTION_PATH = resolve(OUTPUT_DIR, "keryx-lis-tester.postman_collection.json");
const ENVIRONMENT_PATH = resolve(OUTPUT_DIR, "keryx-lis-tester.postman_environment.json");

const environment = {
  id: "lis-tester-local",
  name: "LIS Tester — local",
  values: [
    {
      key: "baseUrl",
      value: "http://localhost:8088",
      type: "default",
      enabled: true,
    },
  ],
  _postman_variable_scope: "environment",
};

mkdirSync(OUTPUT_DIR, { recursive: true });

const collection = buildCollection(catalog);
writeFileSync(COLLECTION_PATH, `${JSON.stringify(collection, null, 2)}\n`, "utf-8");
writeFileSync(ENVIRONMENT_PATH, `${JSON.stringify(environment, null, 2)}\n`, "utf-8");

process.stdout.write(
  `Wrote ${collection.item.length} folders / ${
    collection.item.flatMap((f) => f.item).length
  } requests to:\n` +
    `  ${COLLECTION_PATH}\n` +
    `  ${ENVIRONMENT_PATH}\n`,
);
