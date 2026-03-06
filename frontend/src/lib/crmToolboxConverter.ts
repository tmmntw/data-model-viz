import type { Schema } from "./schemaContext";

/**
 * Detects and converts a CRM Toolbox / D365 solution export JSON
 * into the visualizer's canonical schema format.
 */
export function isCRMToolboxExport(data: unknown): boolean {
  return (
    !!data &&
    typeof data === "object" &&
    "ImportExportXml" in (data as object) &&
    !!(data as any).ImportExportXml?.Entities?.Entity
  );
}

export function convertCRMToolboxExport(data: any): Schema {
  const xml = data.ImportExportXml;
  const solutionName =
    xml.SolutionManifest?.LocalizedNames?.LocalizedName?._attributes
      ?.description ??
    xml.SolutionManifest?.UniqueName ??
    "Unknown";

  // --- Entities ---
  let rawEntities = xml.Entities?.Entity ?? [];
  if (!Array.isArray(rawEntities)) rawEntities = [rawEntities];

  // --- Workflows: count per primary entity ---
  let rawWorkflows = xml.Workflows?.Workflow ?? [];
  if (!Array.isArray(rawWorkflows)) rawWorkflows = [rawWorkflows];

  const wfPerEntity: Record<string, number> = {};
  for (const wf of rawWorkflows) {
    const primary = wf.PrimaryEntity;
    const name =
      typeof primary === "string"
        ? primary
        : primary?._text ?? primary?._attributes?.Name ?? "";
    if (name) wfPerEntity[name] = (wfPerEntity[name] ?? 0) + 1;
  }

  // --- Build entities ---
  const entities = rawEntities.map((e: any) => {
    const logicalName: string = e._attributes?.Name ?? "";
    const info = e.EntityInfo?.entity ?? {};
    const displayName: string =
      info.LocalizedNames?.LocalizedName?._attributes?.description ??
      logicalName;
    const description: string =
      info.Descriptions?.Description?._attributes?.description ?? "";

    let attrs = info.attributes?.attribute ?? [];
    if (!Array.isArray(attrs)) attrs = [attrs];
    const attributeCount: number = attrs.length;

    const isCustom: boolean =
      logicalName.includes("_") && !logicalName.startsWith("new_")
        ? true
        : false;

    return {
      id: logicalName,
      displayName,
      logicalName,
      isCustom,
      attributeCount,
      workflowCount: wfPerEntity[logicalName] ?? 0,
      description,
      category: "core",
      issues: [],
    };
  });

  // --- Build relationships from lookup attributes ---
  const relationships: Schema["relationships"] = [];
  let relIndex = 0;

  for (const e of rawEntities) {
    const sourceId: string = e._attributes?.Name ?? "";
    let attrs = e.EntityInfo?.entity?.attributes?.attribute ?? [];
    if (!Array.isArray(attrs)) attrs = [attrs];

    const entityIds = new Set(entities.map((en: any) => en.id));

    for (const attr of attrs) {
      if (attr.Type !== "lookup") continue;
      const targets: string[] = [];

      // ReferencedEntity can be a string or object
      const ref = attr.ReferencedEntity ?? attr.Targets;
      if (typeof ref === "string") {
        targets.push(ref);
      } else if (Array.isArray(ref)) {
        targets.push(...ref.map((r: any) => (typeof r === "string" ? r : r._text ?? "")));
      }

      for (const target of targets) {
        if (!target || !entityIds.has(target)) continue;
        relationships.push({
          id: `r${relIndex++}`,
          source: sourceId,
          target,
          label: attr.LogicalName ?? attr.Name ?? "",
        });
      }
    }
  }

  return {
    metadata: {
      org: solutionName,
      totalEntities: entities.length,
      totalWorkflows: rawWorkflows.length,
    },
    entities,
    relationships,
  };
}
