import type { Schema, SchemaEntity, SchemaRelationship } from "./schemaContext";

export function analyzeSchema(raw: Schema): Schema {
  const relationships = analyzeRelationships(raw.relationships ?? []);
  const entities = raw.entities.map((e) => normalizeEntity(e, relationships));
  return { ...raw, entities, relationships };
}

function normalizeEntity(
  entity: SchemaEntity,
  relationships: SchemaRelationship[]
): SchemaEntity {
  const normalized: SchemaEntity = {
    isCustom: false,
    workflowCount: 0,
    category: "core",
    ...entity,
  };

  // Only auto-detect issues if none are provided
  if (!entity.issues || entity.issues.length === 0) {
    const issues: SchemaEntity["issues"] = [];

    const attrs = normalized.attributeCount ?? 0;
    if (attrs > 500) {
      issues.push({
        type: "attribute_bloat",
        severity: "high",
        description: `${attrs} attributes — well above the healthy 150-250 range`,
      });
    } else if (attrs > 250) {
      issues.push({
        type: "attribute_bloat",
        severity: "medium",
        description: `${attrs} attributes — moderately above the healthy 150-250 range`,
      });
    }

    const wf = normalized.workflowCount ?? 0;
    if (wf > 100) {
      issues.push({
        type: "workflow_density",
        severity: "high",
        description: `${wf} workflows on a single entity`,
      });
    } else if (wf > 50) {
      issues.push({
        type: "workflow_density",
        severity: "medium",
        description: `${wf} workflows on a single entity`,
      });
    }

    normalized.issues = issues;
  }

  return normalized;
}

function analyzeRelationships(rels: SchemaRelationship[]): SchemaRelationship[] {
  const result = rels.map((r) => ({ ...r }));

  // Detect bidirectional pairs (A→B and B→A both exist)
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];
      if (a.source === b.target && a.target === b.source) {
        a.isProblematic = true;
        a.issue = a.issue ?? "Bidirectional relationship";
        b.isProblematic = true;
        b.issue = b.issue ?? "Bidirectional relationship";
      }
    }
  }

  // Detect duplicate edges (2+ edges between same pair)
  const pairCount: Record<string, number[]> = {};
  result.forEach((r, idx) => {
    const key = [r.source, r.target].sort().join("|");
    if (!pairCount[key]) pairCount[key] = [];
    pairCount[key].push(idx);
  });
  for (const indices of Object.values(pairCount)) {
    if (indices.length > 1) {
      // Mark all but the first as problematic
      indices.slice(1).forEach((idx) => {
        result[idx].isProblematic = true;
        result[idx].issue = result[idx].issue ?? "Duplicate edge";
      });
    }
  }

  return result;
}
