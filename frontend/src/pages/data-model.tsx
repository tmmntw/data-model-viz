import { useCallback, useState, useMemo } from "react";

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
import schema from "../data/schema.json";

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

// Health color based on attribute count
function getHealthColor(count: number): string {
  if (count <= 250) return "#22c55e";
  if (count <= 500) return "#f59e0b";
  return "#ef4444";
}

// Custom node component that renders each entity as a card
function EntityNode({ data }: { data: any }) {
  const style = CATEGORY_STYLES[data.category] || CATEGORY_STYLES.core;
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
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: "#555", width: 8, height: 8 }}
        />
      </div>
      );
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
        {data.workflowCount} workflows
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
  );
}

// Register custom node types
const nodeTypes = { entity: EntityNode };

// Layout positions for entities
function getPositions(): Record<string, { x: number; y: number }> {
  return {
    // Core entities - top row
    case: { x: 500, y: 0 },
    account: { x: 100, y: 0 },
    contact: { x: 900, y: 0 },
    activity: { x: 900, y: 180 },
    note: { x: 1100, y: 180 },

    // Operations - middle rows
    major_win: { x: 100, y: 250 },
    investigation: { x: 400, y: 250 },
    violation: { x: 250, y: 450 },
    prize_claim: { x: 700, y: 250 },
    retail_support: { x: 1000, y: 250 },
    work_note: { x: 1000, y: 450 },
    safer_gaming: { x: 700, y: 450 },
    igaming: { x: 500, y: 450 },

    // AML cluster - bottom
    aml_alert_cash: { x: 50, y: 650 },
    aml_alert_fx: { x: 270, y: 650 },
    aml_alert_highvalue: { x: 490, y: 650 },
    aml_alert_multisite: { x: 710, y: 650 },
    aml_alert_thirdparty: { x: 930, y: 650 },
    aml_alert_frontmoney: { x: 1150, y: 650 },
  };
}

export default function DataModel() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const positions = getPositions();

  // Convert schema entities to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return schema.entities.map((entity) => ({
      id: entity.id,
      type: "entity",
      position: positions[entity.id] || { x: 0, y: 0 },
      data: entity,
    }));
  }, []);

  // Convert schema relationships to React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return schema.relationships.map((rel) => ({
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
      labelBgStyle: {
        fill: "#0a0a0a",
        fillOpacity: 0.8,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: rel.isProblematic ? "#ef4444" : "#334155",
        width: 15,
        height: 15,
      },
    }));
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Find selected entity for detail panel
  const selectedEntity = useMemo(() => {
    if (!selectedNode) return null;
    return schema.entities.find((e) => e.id === selectedNode) || null;
  }, [selectedNode]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id);
  }, []);

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
      <div style={{ flex: 1 }}>
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
              return CATEGORY_STYLES[cat]?.border || "#3b82f6";
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
              <div
                style={{ background: "#1a1a1a", padding: 10, borderRadius: 6 }}
              >
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
              <div
                style={{ background: "#1a1a1a", padding: 10, borderRadius: 6 }}
              >
                <div
                  style={{ fontSize: 20, fontWeight: 700, color: "#93c5fd" }}
                >
                  {selectedEntity.workflowCount}
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
            {selectedEntity.issues.length > 0 && (
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

            {/* Duplicate fields (Case entity) */}
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
                        style={{
                          fontWeight: 600,
                          color: "#fbbf24",
                          marginBottom: 4,
                        }}
                      >
                        {dup.concept}
                      </div>
                      {dup.fields.map((f: string, j: number) => (
                        <div key={j} style={{ color: "#aaa", paddingLeft: 8 }}>
                          - {f}
                        </div>
                      ))}
                      <div
                        style={{
                          color: "#888",
                          marginTop: 4,
                          fontStyle: "italic",
                        }}
                      >
                        {dup.recommendation}
                      </div>
                    </div>
                  ),
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
