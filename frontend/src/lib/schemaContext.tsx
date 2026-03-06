import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface SchemaEntity {
  id: string;
  displayName: string;
  attributeCount: number;
  logicalName?: string;
  isCustom?: boolean;
  category?: string;
  workflowCount?: number;
  description?: string;
  issues?: Array<{ type: string; severity: string; description: string }>;
  attributes?: Record<string, number>;
  [key: string]: unknown;
}

export interface SchemaRelationship {
  id: string;
  source: string;
  target: string;
  label?: string;
  isProblematic?: boolean;
  issue?: string;
}

export interface Schema {
  entities: SchemaEntity[];
  relationships: SchemaRelationship[];
  metadata?: Record<string, unknown>;
}

interface SchemaContextValue {
  schema: Schema | null;
  setSchema: (schema: Schema) => void;
  clearSchema: () => void;
}

const SchemaContext = createContext<SchemaContextValue | null>(null);

const STORAGE_KEY = "dmv_schema";

export function SchemaProvider({ children }: { children: ReactNode }) {
  const [schema, setSchemaState] = useState<Schema | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setSchema = (newSchema: Schema) => {
    setSchemaState(newSchema);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSchema));
    } catch {
      // localStorage quota exceeded — proceed without persistence
    }
  };

  const clearSchema = () => {
    setSchemaState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SchemaContext.Provider value={{ schema, setSchema, clearSchema }}>
      {children}
    </SchemaContext.Provider>
  );
}

export function useSchema() {
  const ctx = useContext(SchemaContext);
  if (!ctx) throw new Error("useSchema must be used inside SchemaProvider");
  return ctx;
}
