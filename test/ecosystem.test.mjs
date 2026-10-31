import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defineTool,
  defineOverride,
  createMockContext,
  simulateToolCall,
  TabClient,
  DesktopClient,
  runPreflight,
  z,
} from "../dist/index.js";

describe("Weavetab SDK Ecosystem Features", () => {
  it("executes tool through simulateToolCall with auto-wrapped return", async () => {
    const testTool = defineTool({
      name: "fetch_stats",
      description: "fetches stats",
      schema: {
        repo: z.string(),
      },
      handler: async ({ repo }, ctx) => {
        const url = await ctx.tab.url();
        return {
          repo,
          url,
          cached: await ctx.storage.remember(`stat:${repo}`, 5000, async () => 42),
        };
      },
    });

    const ctx = createMockContext({
      mockUrl: "https://github.com/weavetab/sdk",
    });

    const res = await simulateToolCall(testTool, { repo: "weavetab/sdk" }, ctx);
    assert.equal(res.isError, undefined);
    assert.equal(res.content.length, 1);
    assert.equal(res.content[0].type, "text");

    const payload = JSON.parse(res.content[0].text);
    assert.equal(payload.repo, "weavetab/sdk");
    assert.equal(payload.url, "https://github.com/weavetab/sdk");
    assert.equal(payload.cached, 42);

    // Second call should hit cache directly
    const cachedVal = await ctx.storage.getWithExpiry("stat:weavetab/sdk");
    assert.equal(cachedVal, 42);
  });

  it("handles storage remember expiration correctly", async () => {
    const ctx = createMockContext();
    let callCount = 0;

    const resolver = async () => {
      callCount++;
      return "expensive_data";
    };

    // First call sets TTL of 1ms (immediately expired)
    const val1 = await ctx.storage.remember("quick_key", 1, resolver);
    assert.equal(val1, "expensive_data");
    assert.equal(callCount, 1);

    // Wait 5ms for expiration
    await new Promise((r) => setTimeout(r, 5));

    const val2 = await ctx.storage.remember("quick_key", 1000, resolver);
    assert.equal(val2, "expensive_data");
    assert.equal(callCount, 2);
  });

  it("interacts cleanly with TabClient", async () => {
    const tab = new TabClient({
      Runtime: {
        evaluate: async ({ expression }) => {
          if (expression.includes("location.href")) {
            return { result: { value: "https://example.org/dashboard" } };
          }
          if (expression.includes("document.title")) {
            return { result: { value: "Dashboard Page" } };
          }
          if (expression.includes("outerHTML")) {
            return { result: { value: "<div class='main'>Content</div>" } };
          }
          return { result: { value: true } };
        },
      },
    });

    assert.equal(tab.isAvailable(), true);
    assert.equal(await tab.url(), "https://example.org/dashboard");
    assert.equal(await tab.title(), "Dashboard Page");
    assert.equal(await tab.waitForSelector(".main"), true);
  });

  it("interacts with DesktopClient", async () => {
    const desktop = new DesktopClient({
      listApps: async () => [
        { name: "Slack", port: 9222, status: "debug_port_open" },
        { name: "VS Code", port: 9229, status: "debug_port_open" },
      ],
      getTargets: async (port) => [{ id: "t1", title: "Target at " + port }],
    });

    assert.equal(desktop.isAvailable(), true);
    const apps = await desktop.listApps();
    assert.equal(apps.length, 2);

    const slack = await desktop.getApp("slack");
    assert.ok(slack);
    assert.equal(slack?.port, 9222);

    const targets = await desktop.getTargets("slack");
    assert.equal(targets.length, 1);
  });

  it("validates defineOverride helper structure", () => {
    const override = defineOverride({
      name: "browser_navigate",
      handler: async (args, session, config, original) => {
        return original ? await original(args, session, config) : { ok: true };
      },
    });

    assert.equal(override.name, "browser_navigate");
    assert.equal(typeof override.handler, "function");
  });

  it("runs preflight verification correctly", () => {
    // Run preflight against the sdk directory itself (which has package.json and README.md)
    const res = runPreflight(process.cwd());
    // Since sdk is a core package and not a plugin with weavetab.json, it will flag missing weavetab.json
    assert.equal(res.success, false);
    assert.ok(res.errors.some((e) => e.includes("weavetab.json")));
  });
});
