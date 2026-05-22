import type { ScenarioMeta } from "./registry.js";

const ID_COLUMN_WIDTH = 28;

const annotations = (meta: ScenarioMeta): string => {
  const tags: string[] = [];
  if (meta.status !== undefined && meta.status !== 200) tags.push(`[${meta.status}]`);
  if (meta.delayMs !== undefined && meta.delayMs > 0) tags.push(`delay=${meta.delayMs}ms`);
  return tags.length === 0 ? "" : ` ${tags.join(" ")}`;
};

export const formatCatalog = (items: ScenarioMeta[]): string => {
  if (items.length === 0) return "(no scenarios registered)";
  return items
    .map((meta) => `  ${meta.id.padEnd(ID_COLUMN_WIDTH)} ${meta.description}${annotations(meta)}`)
    .join("\n");
};
