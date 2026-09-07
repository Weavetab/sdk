import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  default?: any;
  enum?: any[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaProperty;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  anyOf?: JsonSchemaProperty[];
  oneOf?: JsonSchemaProperty[];
  [key: string]: any;
}

export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
}

export interface WeavetabManifestTool {
  name: string;
  description: string;
  parameters?: JsonSchemaObject;
  inputSchema?: JsonSchemaObject;
  schema?: JsonSchemaObject;
}

/**
 * Converts a Zod type or a ZodRawShape into a standard JSON Schema draft-07 object.
 */
export function zodToJsonSchema(schema: any): JsonSchemaProperty {
  if (!schema) {
    return { type: "object", properties: {} };
  }

  // If already a plain JSON Schema object (not an instance of ZodType)
  if (typeof schema === "object" && !("_def" in schema) && !schema._def) {
    // If it looks like a raw shape: { key: z.string() }
    const values = Object.values(schema);
    const hasZodFields = values.some((v: any) => v && typeof v === "object" && "_def" in v);
    if (hasZodFields) {
      return convertZodShape(schema);
    }
    return schema;
  }

  return convertZodType(schema);
}

function convertZodShape(shape: Record<string, any>): JsonSchemaObject {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    if (!value || typeof value !== "object" || !("_def" in value)) {
      properties[key] = { type: "string" };
      continue;
    }

    const { schema: propSchema, isOptional, defaultValue } = unwrapZodModifiers(value);
    const converted = convertZodType(propSchema);

    if (value.description) {
      converted.description = value.description;
    }
    if (defaultValue !== undefined) {
      converted.default = defaultValue;
    }

    properties[key] = converted;

    if (!isOptional) {
      required.push(key);
    }
  }

  const result: JsonSchemaObject = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    result.required = required;
  }

  return result;
}

function unwrapZodModifiers(schema: any): { schema: any; isOptional: boolean; defaultValue?: any } {
  let current = schema;
  let isOptional = false;
  let defaultValue: any = undefined;

  while (current && current._def) {
    const typeName = current._def.typeName;
    if (typeName === "ZodOptional") {
      isOptional = true;
      current = current._def.innerType;
    } else if (typeName === "ZodDefault") {
      isOptional = true;
      try {
        defaultValue = typeof current._def.defaultValue === "function" ? current._def.defaultValue() : current._def.defaultValue;
      } catch {
        defaultValue = undefined;
      }
      current = current._def.innerType;
    } else if (typeName === "ZodNullable") {
      current = current._def.innerType;
    } else if (typeName === "ZodEffects") {
      current = current._def.schema;
    } else {
      break;
    }
  }

  return { schema: current, isOptional, defaultValue };
}

function convertZodType(schema: any): JsonSchemaProperty {
  if (!schema || !schema._def) {
    return { type: "string" };
  }

  const def = schema._def;
  const typeName: string = def.typeName;
  const res: JsonSchemaProperty = {};

  if (schema.description) {
    res.description = schema.description;
  }

  switch (typeName) {
    case "ZodString": {
      res.type = "string";
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          if (check.kind === "min") res.minLength = check.value;
          if (check.kind === "max") res.maxLength = check.value;
          if (check.kind === "regex") res.pattern = check.regex.source;
          if (check.kind === "email") res.format = "email";
          if (check.kind === "url") res.format = "uri";
        }
      }
      break;
    }

    case "ZodNumber": {
      const isInt = Array.isArray(def.checks) && def.checks.some((c: any) => c.kind === "int");
      res.type = isInt ? "integer" : "number";
      if (Array.isArray(def.checks)) {
        for (const check of def.checks) {
          if (check.kind === "min") res.minimum = check.value;
          if (check.kind === "max") res.maximum = check.value;
        }
      }
      break;
    }

    case "ZodBoolean": {
      res.type = "boolean";
      break;
    }

    case "ZodArray": {
      res.type = "array";
      res.items = convertZodType(def.type);
      if (def.minLength !== null && def.minLength !== undefined) res.minItems = def.minLength.value;
      if (def.maxLength !== null && def.maxLength !== undefined) res.maxItems = def.maxLength.value;
      break;
    }

    case "ZodObject": {
      const shape = typeof def.shape === "function" ? def.shape() : def.shape;
      return convertZodShape(shape);
    }

    case "ZodEnum": {
      res.type = "string";
      res.enum = [...def.values];
      break;
    }

    case "ZodNativeEnum": {
      res.enum = Object.values(def.values);
      break;
    }

    case "ZodLiteral": {
      res.type = typeof def.value;
      res.enum = [def.value];
      break;
    }

    case "ZodUnion": {
      if (Array.isArray(def.options)) {
        res.anyOf = def.options.map((opt: any) => convertZodType(opt));
      }
      break;
    }

    case "ZodRecord": {
      res.type = "object";
      if (def.valueType) {
        res.additionalProperties = convertZodType(def.valueType);
      } else {
        res.additionalProperties = true;
      }
      break;
    }

    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
    case "ZodEffects": {
      const unwrapped = unwrapZodModifiers(schema);
      const converted = convertZodType(unwrapped.schema);
      if (schema.description && !converted.description) {
        converted.description = schema.description;
      }
      if (unwrapped.defaultValue !== undefined) {
        converted.default = unwrapped.defaultValue;
      }
      return converted;
    }

    case "ZodAny":
    case "ZodUnknown": {
      // Empty schema allows any value
      break;
    }

    default: {
      res.type = "string";
      break;
    }
  }

  return res;
}

/**
 * Extracts and formats a tool definition into standard MCP/weavetab.json tool structure.
 */
export function exportToolSchema(tool: any): WeavetabManifestTool {
  const name = tool.name;
  const description = tool.description || "";
  let parameters: JsonSchemaObject = { type: "object", properties: {} };

  if (tool.schema) {
    parameters = zodToJsonSchema(tool.schema) as JsonSchemaObject;
  } else if (tool.parameters) {
    parameters = zodToJsonSchema(tool.parameters) as JsonSchemaObject;
  } else if (tool.inputSchema) {
    parameters = zodToJsonSchema(tool.inputSchema) as JsonSchemaObject;
  }

  // Ensure type is object
  if (!parameters.type) {
    parameters.type = "object";
  }
  if (!parameters.properties) {
    parameters.properties = {};
  }

  return {
    name,
    description,
    parameters,
    inputSchema: parameters,
  };
}

/**
 * Generates or synchronizes a weavetab.json manifest from a plugin definition and existing manifest.
 */
export function exportManifest(plugin: any, existingManifest: any = {}): any {
  const manifest = { ...existingManifest };

  manifest.$schema = manifest.$schema || "https://raw.githubusercontent.com/weavetab/sdk/main/schema/plugin.json";
  manifest.name = plugin.name || manifest.name || "unnamed-plugin";
  if (plugin.version) manifest.version = plugin.version;
  if (plugin.description) manifest.description = plugin.description;
  manifest.entry = manifest.entry || "dist/index.js";

  if (!manifest.engines) {
    manifest.engines = {
      weavetab: "^2.5.0",
      node: ">=18.0.0",
    };
  }

  if (!manifest.environments) {
    manifest.environments = ["mcp"];
  }

  // Export static tools
  const tools: WeavetabManifestTool[] = [];
  if (Array.isArray(plugin.tools)) {
    for (const tool of plugin.tools) {
      tools.push(exportToolSchema(tool));
    }
  }
  manifest.tools = tools;

  // Export declared interceptor middleware hooks if defined
  const middleware: Record<string, boolean> = {};
  if (plugin.onBeforeAction || (plugin.hooks && plugin.hooks.onBeforeAction)) {
    middleware.onBeforeAction = true;
  }
  if (plugin.onAfterAction || (plugin.hooks && plugin.hooks.onAfterAction)) {
    middleware.onAfterAction = true;
  }
  if (plugin.onDOMMutation || (plugin.hooks && plugin.hooks.onDOMMutation)) {
    middleware.onDOMMutation = true;
  }
  if (Object.keys(middleware).length > 0) {
    manifest.middleware = middleware;
  }

  return manifest;
}

/**
 * Reads the official plugin manifest schema (plugin.json).
 */
export function getManifestSchema(): any {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.resolve(__dirname, "../../schema/plugin.json");
    if (fs.existsSync(schemaPath)) {
      return JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    }
  } catch {
    // Fallback if bundled or browser environment
  }
  return { $schema: "http://json-schema.org/draft-07/schema#", title: "WeavetabPluginManifest" };
}

/**
 * Reads the official tool schema (tool.json).
 */
export function getToolSchema(): any {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.resolve(__dirname, "../../schema/tool.json");
    if (fs.existsSync(schemaPath)) {
      return JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    }
  } catch {
    // Fallback if bundled
  }
  return { $schema: "http://json-schema.org/draft-07/schema#", title: "WeavetabToolSchema" };
}
