import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useSchema, Schema } from "@/lib/schemaContext";
import { analyzeSchema } from "@/lib/schemaAnalyzer";
import { isCRMToolboxExport, convertCRMToolboxExport } from "@/lib/crmToolboxConverter";
import rawExampleSchema from "../data/schema.json";

function isValidSchema(data: unknown): data is Schema {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.entities) || d.entities.length === 0) return false;
  const first = d.entities[0];
  return (
    first &&
    typeof first === "object" &&
    "id" in first &&
    "displayName" in first
  );
}

export default function Upload() {
  const { setSchema } = useSchema();
  const [, navigate] = useLocation();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    entities: number;
    relationships: number;
    issues: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSchemaRef = useRef<Schema | null>(null);

  function processFile(file: File) {
    setError(null);
    setSummary(null);
    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        loadSchema(parsed);
      } catch {
        setError("Invalid JSON: could not parse the file.");
      }
    };
    reader.readAsText(file);
  }

  function loadSchema(raw: unknown) {
    // Auto-convert CRM Toolbox / D365 solution export format
    if (isCRMToolboxExport(raw)) {
      raw = convertCRMToolboxExport(raw);
    }

    if (!isValidSchema(raw)) {
      setError(
        'Invalid schema: must have an "entities" array where each item has "id" and "displayName".'
      );
      return;
    }
    const analyzed = analyzeSchema(raw);
    const issueCount = analyzed.entities.reduce(
      (sum, e) => sum + (e.issues?.length ?? 0),
      0
    );
    setSummary({
      entities: analyzed.entities.length,
      relationships: analyzed.relationships?.length ?? 0,
      issues: issueCount,
    });
    pendingSchemaRef.current = analyzed;
  }

  function handleNavigate() {
    if (!pendingSchemaRef.current) return;
    setSchema(pendingSchemaRef.current);
    navigate("/visualize");
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function loadExample() {
    setError(null);
    setSummary(null);
    loadSchema(rawExampleSchema);
  }

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
        padding: 24,
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Data Model Visualizer
      </h1>
      <p
        style={{
          color: "#666",
          fontSize: 14,
          marginBottom: 40,
          textAlign: "center",
        }}
      >
        Upload a CRM/ERP schema JSON to visualize entity relationships and
        auto-detect issues
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: "100%",
          maxWidth: 480,
          border: `2px dashed ${dragging ? "#3b82f6" : "#334155"}`,
          borderRadius: 12,
          padding: "48px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(59,130,246,0.05)" : "#111",
          transition: "all 0.15s",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
        <div style={{ color: "#aaa", fontSize: 14, marginBottom: 8 }}>
          Drag & drop a JSON schema file here
        </div>
        <div style={{ color: "#555", fontSize: 12 }}>or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
      </div>

      {/* Load example */}
      <button
        onClick={loadExample}
        style={{
          background: "transparent",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: "8px 20px",
          color: "#93c5fd",
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 24,
        }}
      >
        Load example (GamingCorp D365)
      </button>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            padding: "12px 16px",
            color: "#fca5a5",
            fontSize: 13,
            maxWidth: 480,
            width: "100%",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Summary + navigate */}
      {summary && (
        <div
          style={{
            background: "#111",
            border: "1px solid #1e293b",
            borderRadius: 12,
            padding: 20,
            maxWidth: 480,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#888",
              marginBottom: 12,
            }}
          >
            SCHEMA LOADED
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <Stat label="Entities" value={summary.entities} color="#93c5fd" />
            <Stat
              label="Relationships"
              value={summary.relationships}
              color="#a78bfa"
            />
            <Stat
              label="Issues"
              value={summary.issues}
              color={summary.issues > 0 ? "#f87171" : "#4ade80"}
            />
          </div>
          <button
            onClick={handleNavigate}
            style={{
              width: "100%",
              background: "#3b82f6",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Visualize →
          </button>
        </div>
      )}

      {/* Format hint */}
      <div
        style={{
          marginTop: 40,
          color: "#444",
          fontSize: 12,
          maxWidth: 480,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Expected format:{" "}
        <code style={{ color: "#666" }}>
          {"{ entities: [{ id, displayName, attributeCount }], relationships: [] }"}
        </code>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        borderRadius: 8,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{label}</div>
    </div>
  );
}
