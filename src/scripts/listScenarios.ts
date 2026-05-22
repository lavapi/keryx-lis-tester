import { catalog } from "../scenarios/catalog.js";
import { formatCatalog } from "../scenarios/format.js";

process.stdout.write(`Registered scenarios (${catalog.length}):\n`);
process.stdout.write(`${formatCatalog(catalog)}\n`);
