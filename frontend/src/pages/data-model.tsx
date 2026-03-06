import { useCallback, useState, useMemo } from "react";
import { useLocation } from "wouter";

import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSchema } from "@/lib/schemaContext";
import { computeLayout } from "@/lib/layoutEngine";

// Color mapping for entity categories
const CATEGORY_STYLES: Record<
  string,
  { background: string; border: string; color: string }
> = {
  core: { background: "#0f1729", border: "#3b82f6", color: "#93c5fd" },
  operations: { background: "#1a0f29", border: "#a855f7", color: "#d8b4fe" },
  aml: { background: "#291a0f", border: "#f97316", color: "#fed7aa" },
  support: { background: "#0f2918", border: "#22c55e", color: "#86efac" },
};

const DEFAULT_STYLE = { background: "#111827", border: "#475569", color: "#cbd5e1" };

function getCategoryStyle(cat?: string) {
  return (cat && CATEGORY_STYLES[cat]) || DEFAULT_STYLE;
}

// Health color based on attribute count
function getHealthColor(count: number): string {
  if (count <= 250) return "#22c55e";
  if (count <= 500) return "#f59e0b";
  return "#ef4444";
}

// Custom node component
function EntityNode({ data }: { data: any }) {
  const style = getCategoryStyle(data.category);
  const healthColor = getHealthColor(data.attributeCount);
  const hasIssues = data.issues && data.issues.length > 0;

  return (
    <div style={{ position: "relative" }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#555", width: 8, height: 8 }}
      />
      <div
        style={{
          background: style.background,
          border: `2px solid ${hasIssues ? "#ef4444" : style.border}`,
          borderRadius: 8,
          padding: 12,
          minWidth: 200,
          fontFamily: "system-ui, sans-serif",
          boxShadow: hasIssues
            ? "0 0 12px rgba(239, 68, 68, 0.3)"
            : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: style.color }}>
            {data.displayName}
          </span>
          {data.isCustom && (
            <span
              style={{
                fontSize: 9,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(255,255,255,0.1)",
                color: "#888",
              }}
            >
              CUSTOM
            </span>
          )}
        </div>

        {/* Logical name */}
        <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
          {data.logicalName}
        </div>

        {/* Attribute health bar */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              marginBottom: 3,
            }}
          >
            <span style={{ color: "#888" }}>Attributes</span>
            <span style={{ color: healthColor, fontWeight: 600 }}>
              {data.attributeCount}
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "#1e293b",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min((data.attributeCount / 1000) * 100, 100)}%`,
                height: "100%",
                background: healthColor,
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* Workflows */}
        <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>
          {data.workflowCount ?? 0} workflows
        </div>

        {/* Issues */}
        {hasIssues && (
          <div
            style={{
              fontSize: 11,
              color: "#ef4444",
              borderTop: "1px solid rgba(239,68,68,0.2)",
              paddingTop: 6,
              marginTop: 4,
            }}
          >
            {data.issues.length} issue{data.issues.length !== 1 ? "s" : ""}{" "}
            detected
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#555", width: 8, height: 8 }}
      />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

export default function DataModel() {
  const { schema } = useSchema();
  const [, navigate] = useLocation();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const positions = useMemo(
    () => computeLayout(schema?.entities ?? []),
    [schema]
  );

  const initialNodes: Node[] = useMemo(() => {
    if (!schema) return [];
    return schema.entities.map((entity) => ({
      id: entity.id,
      type: "entity",
      position: positions[entity.id] ?? { x: 0, y: 0 },
      data: entity,
    }));
  }, [schema, positions]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!schema) return [];
    return (schema.relationships ?? []).map((rel) => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      label: rel.label,
      animated: rel.isProblematic,
      style: {
        stroke: rel.isProblematic ? "#ef4444" : "#334155",
        strokeWidth: rel.isProblematic ? 2 : 1,
      },
      labelStyle: {
        fontSize: 10,
        fill: rel.isProblematic ? "#ef4444" : "#64748b",
      },
      labelBgStyle: { fill: "#0a0a0a", fillOpacity: 0.8 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: rel.isProblematic ? "#ef4444" : "#334155",
        width: 15,
        height: 15,
      },
    }));
  }, [schema]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const selectedEntity = useMemo(() => {
    if (!selectedNode || !schema) return null;
    return schema.entities.find((e) => e.id === selectedNode) ?? null;
  }, [selectedNode, schema]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  // Collect unique categories for legend
  const usedCategories = useMemo(() => {
    if (!schema) return [];
    const cats = new Set(schema.entities.map((e) => e.category ?? "core"));
    return [...cats].filter((c) => CATEGORY_STYLES[c]);
  }, [schema]);

  if (!schema) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#555",
        }}
      >
        <p style={{ marginBottom: 16 }}>No schema loaded.</p>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "8px 20px",
            color: "#93c5fd",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          ← Upload a schema
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0a0a0a",
        display: "flex",
      }}
    >
      {/* Graph area */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "6px 14px",
            color: "#93c5fd",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Upload new schema
        </button>

        {/* Category legend */}
        {usedCategories.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              background: "rgba(15,23,41,0.9)",
              border: "1px solid #1e293b",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {usedCategories.map((cat) => {
              const s = CATEGORY_STYLES[cat];
              return (
                <div
                  key={cat}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: s.border,
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#aaa", textTransform: "capitalize" }}>
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: "#0a0a0a" }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background color="#1e293b" gap={20} />
          <Controls
            style={{
              background: "#1e293b",
              borderRadius: 8,
              border: "1px solid #334155",
            }}
          />
          <MiniMap
            nodeColor={(node) => {
              const cat = node.data?.category as string;
              return getCategoryStyle(cat).border;
            }}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
            }}
          />
        </ReactFlow>
      </div>

      {/* Detail panel */}
      <div
        style={{
          width: 320,
          background: "#111",
          borderLeft: "1px solid #222",
          padding: 20,
          overflowY: "auto",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {selectedEntity ? (
          <>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 4,
              }}
            >
              {selectedEntity.displayName}
            </h2>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>
              {selectedEntity.logicalName}
            </p>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
              {selectedEntity.description}
            </p>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ background: "#1a1a1a", padding: 10, borderRadius: 6 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: getHealthColor(selectedEntity.attributeCount),
                  }}
                >
                  {selectedEntity.attributeCount}
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>Attributes</div>
              </div>
              <div style={{ background: "#1a1a1a", padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#93c5fd" }}>
                  {selectedEntity.workflowCount ?? 0}
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>Workflows</div>
              </div>
            </div>

            {/* Attribute breakdown */}
            {selectedEntity.attributes && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#888",
                    marginBottom: 8,
                  }}
                >
                  ATTRIBUTE BREAKDOWN
                </div>
                {Object.entries(selectedEntity.attributes)
                  .filter(([key]) => key !== "total")
                  .map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        padding: "3px 0",
                        color: "#aaa",
                      }}
                    >
                      <span>{key}</span>
                      <span>{value as number}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Issues */}
            {selectedEntity.issues && selectedEntity.issues.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#ef4444",
                    marginBottom: 8,
                  }}
                >
                  ISSUES
                </div>
                {selectedEntity.issues.map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 8,
                      fontSize: 12,
                      color: "#fca5a5",
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {issue.type.replace(/_/g, " ")}
                    </div>
                    <div style={{ color: "#aaa" }}>{issue.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Duplicate fields */}
            {(selectedEntity as any).duplicateFields && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#f59e0b",
                    marginBottom: 8,
                  }}
                >
                  DUPLICATE FIELDS
                </div>
                {(selectedEntity as any).duplicateFields.map(
                  (dup: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        borderRadius: 6,
                        padding: 10,
                        marginBottom: 8,
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{ fontWeight: 600, color: "#fbbf24", marginBottom: 4 }}
                      >
                        {dup.concept}
                      </div>
                      {dup.fields.map((f: string, j: number) => (
                        <div key={j} style={{ color: "#aaa", paddingLeft: 8 }}>
                          - {f}
                        </div>
                      ))}
                      <div
                        style={{ color: "#888", marginTop: 4, fontStyle: "italic" }}
                      >
                        {dup.recommendation}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: "#555", textAlign: "center", paddingTop: 40 }}>
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Click an entity to see details
            </p>
            <p style={{ fontSize: 12 }}>
              Red borders = issues detected
              <br />
              Red animated lines = problematic relationships
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
