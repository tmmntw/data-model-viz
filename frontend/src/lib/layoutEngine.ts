import type { SchemaEntity } from "./schemaContext";

const H_SPACING = 260;
const V_SPACING = 300;
const COLUMNS = 4;

export function computeLayout(
  entities: SchemaEntity[]
): Record<string, { x: number; y: number }> {
  // Group by category
  const groups: Record<string, SchemaEntity[]> = {};
  for (const entity of entities) {
    const cat = entity.category ?? "__none__";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(entity);
  }

  const categories = Object.keys(groups);
  const hasCategories = categories.length > 1 || !groups["__none__"];

  const positions: Record<string, { x: number; y: number }> = {};

  if (hasCategories && categories[0] !== "__none__") {
    // One row per category
    categories.forEach((cat, rowIndex) => {
      const row = groups[cat];
      row.forEach((entity, colIndex) => {
        positions[entity.id] = {
          x: colIndex * H_SPACING,
          y: rowIndex * V_SPACING,
        };
      });
    });
  } else {
    // Simple grid layout
    entities.forEach((entity, i) => {
      positions[entity.id] = {
        x: (i % COLUMNS) * H_SPACING,
        y: Math.floor(i / COLUMNS) * V_SPACING,
      };
    });
  }

  return positions;
}
