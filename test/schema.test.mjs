import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  z,
  defineTool,
  definePlugin,
  PluginBuilder,
  zodToJsonSchema,
  exportToolSchema,
  exportManifest,
  getManifestSchema,
  getToolSchema,
} from "../dist/index.js";

describe("SDK Schema Exporter & Typegen", () => {
  it("converts primitive Zod types to JSON Schema draft-07", () => {
    const stringSchema = zodToJsonSchema(z.string().min(3).max(100).describe("A test string"));
    assert.equal(stringSchema.type, "string");
    assert.equal(stringSchema.minLength, 3);
    assert.equal(stringSchema.maxLength, 100);
    assert.equal(stringSchema.description, "A test string");

    const intSchema = zodToJsonSchema(z.number().int().min(1).max(50));
    assert.equal(intSchema.type, "integer");
    assert.equal(intSchema.minimum, 1);
    assert.equal(intSchema.maximum, 50);

    const boolSchema = zodToJsonSchema(z.boolean());
    assert.equal(boolSchema.type, "boolean");

    const enumSchema = zodToJsonSchema(z.enum(["fast", "slow", "balanced"]));
    assert.equal(enumSchema.type, "string");
    assert.deepEqual(enumSchema.enum, ["fast", "slow", "balanced"]);
  });

  it("converts ZodObject and raw shapes with required fields and defaults", () => {
    const rawShape = {
      query: z.string().describe("Search query"),
      limit: z.number().int().default(10).describe("Max results"),
      includeDetails: z.boolean().optional().describe("Include full details"),
    };

    const jsonSchema = zodToJsonSchema(rawShape);
    assert.equal(jsonSchema.type, "object");
    assert.ok(jsonSchema.properties.query);
    assert.equal(jsonSchema.properties.query.type, "string");
    assert.equal(jsonSchema.properties.limit.type, "integer");
    assert.equal(jsonSchema.properties.limit.default, 10);
    assert.equal(jsonSchema.properties.includeDetails.type, "boolean");

    // Only non-optional fields should be in required
    assert.deepEqual(jsonSchema.required, ["query"]);
  });

  it("exports tool schemas into standard MCP tool format", () => {
    const tool = defineTool({
      name: "scrape_catalog",
      description: "Extracts product catalogue items",
      schema: {
        category: z.string().describe("Product category"),
        page: z.number().default(1),
      },
      handler: async (args) => {
        return { content: [{ type: "text", text: `Scraped ${args.category} page ${args.page}` }] };
      },
    });

    const exported = exportToolSchema(tool);
    assert.equal(exported.name, "scrape_catalog");
    assert.equal(exported.description, "Extracts product catalogue items");
    assert.equal(exported.parameters.type, "object");
    assert.equal(exported.parameters.properties.category.type, "string");
    assert.deepEqual(exported.parameters.required, ["category"]);
  });

  it("generates full weavetab.json manifest from plugin definition", () => {
    const plugin = definePlugin({
      name: "enterprise-shield",
      version: "1.2.0",
      description: "Ad-blocker and telemetry filter",
      tools: [
        defineTool({
          name: "block_domain",
          description: "Block domain traffic",
          schema: {
            domain: z.string(),
          },
          handler: async () => {},
        }),
      ],
      onBeforeAction: async (tool, args) => {
        if (tool === "browser_navigate" && args.url.includes("tracker.com")) {
          return { __blocked: true, reason: "Blocked tracker" };
        }
      },
      onDOMMutation: async (delta) => {},
    });

    const manifest = exportManifest(plugin);
    assert.equal(manifest.name, "enterprise-shield");
    assert.equal(manifest.version, "1.2.0");
    assert.equal(manifest.tools.length, 1);
    assert.equal(manifest.tools[0].name, "block_domain");
    assert.ok(manifest.middleware.onBeforeAction);
    assert.ok(manifest.middleware.onDOMMutation);
    assert.equal(manifest.middleware.onAfterAction, undefined);
  });

  it("supports PluginBuilder fluent chaining with middleware hooks", () => {
    const builder = new PluginBuilder("fluent-plugin")
      .version("2.0.0")
      .description("Fluent test plugin")
      .onBeforeAction(async () => {})
      .onAfterAction(async () => {})
      .onDOMMutation(async () => {});

    const def = builder.build();
    assert.equal(def.name, "fluent-plugin");
    assert.ok(typeof def.onBeforeAction === "function");
    assert.ok(typeof def.onAfterAction === "function");
    assert.ok(typeof def.onDOMMutation === "function");

    const manifest = exportManifest(def);
    assert.ok(manifest.middleware.onBeforeAction);
    assert.ok(manifest.middleware.onAfterAction);
    assert.ok(manifest.middleware.onDOMMutation);
  });

  it("retrieves official plugin and tool JSON schemas", () => {
    const pluginSchema = getManifestSchema();
    assert.ok(pluginSchema.title);
    assert.equal(pluginSchema.title, "WeavetabPluginManifest");

    const toolSchema = getToolSchema();
    assert.ok(toolSchema.title);
    assert.equal(toolSchema.title, "WeavetabToolSchema");
  });
});
