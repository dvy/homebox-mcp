#!/usr/bin/env node
/**
 * Read-only smoke test against a live Homebox instance.
 *
 * Exists because the endpoint drift that broke list_items/list_locations
 * (upstream #1414 merged /items and /locations into /entities) was invisible
 * to a type-check — only a real request against the server catches it.
 *
 * Every call here is a GET. Nothing in this file mutates inventory data.
 *
 *   HOMEBOX_URL=... HOMEBOX_USERNAME=... HOMEBOX_PASSWORD=... npm run smoke
 */

import { AuthManager } from "./auth.js";
import { HomeboxClient } from "./client.js";

const url = process.env.HOMEBOX_URL;
if (!url) {
  console.error("HOMEBOX_URL environment variable is required");
  process.exit(1);
}

const auth = new AuthManager(
  url,
  process.env.HOMEBOX_USERNAME ?? "",
  process.env.HOMEBOX_PASSWORD ?? "",
  process.env.HOMEBOX_TOKEN,
);
const client = new HomeboxClient(url, auth);

type EntityList = {
  total: number;
  items: Array<{ id: string; name: string; entityType?: { isLocation: boolean } }>;
};

let failures = 0;

async function check(name: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (e) {
    failures++;
    console.error(`FAIL  ${name} — ${e instanceof Error ? e.message : String(e)}`);
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

await check("get_status", async () => {
  const status = await client.request<{ health: boolean }>("GET", "/status");
  assert(status.health, "server reported unhealthy");
  return "healthy";
});

await check("get_statistics", async () => {
  const stats = await client.request<{ totalItems: number; totalLocations: number }>(
    "GET",
    "/groups/statistics",
  );
  assert(typeof stats.totalItems === "number", "totalItems missing");
  return `${stats.totalItems} items, ${stats.totalLocations} locations`;
});

await check("list_entity_types", async () => {
  const types = await client.request<Array<{ isLocation: boolean }>>("GET", "/entity-types");
  assert(Array.isArray(types) && types.length > 0, "no entity types returned");
  assert(
    types.some((t) => t.isLocation === true),
    "no location entity type — create_location would create an item",
  );
  return `${types.length} types`;
});

// The core regression: listing exactly one item.
let sampleItemId: string | undefined;
await check("list_items (pageSize=1)", async () => {
  const page = await client.request<EntityList>("GET", "/entities", {
    params: { pageSize: "1", isLocation: "false" },
  });
  assert(Array.isArray(page.items), "response has no items array");
  assert(page.items.length > 0, "expected at least one item, got none");
  assert(
    page.items[0].entityType?.isLocation !== true,
    "isLocation=false filter leaked a location into the item list",
  );
  sampleItemId = page.items[0].id;
  return `1 of ${page.total}: ${page.items[0].name}`;
});

await check("get_item", async () => {
  assert(sampleItemId, "skipped: no sample item from list_items");
  const item = await client.request<{ id: string; name: string }>(
    "GET",
    `/entities/${sampleItemId}`,
  );
  assert(item.id === sampleItemId, "returned a different item");
  return item.name;
});

await check("get_item_path", async () => {
  assert(sampleItemId, "skipped: no sample item from list_items");
  const path = await client.request<Array<{ name: string }>>(
    "GET",
    `/entities/${sampleItemId}/path`,
  );
  assert(Array.isArray(path) && path.length > 0, "empty path");
  return path.map((p) => p.name).join(" > ");
});

await check("list_locations", async () => {
  const page = await client.request<EntityList>("GET", "/entities", {
    params: { isLocation: "true" },
  });
  assert(Array.isArray(page.items), "response has no items array");
  assert(page.items.length > 0, "expected at least one location, got none");
  assert(
    page.items.every((l) => l.entityType?.isLocation === true),
    "isLocation=true filter leaked a non-location",
  );
  return `${page.items.length} locations, first: ${page.items[0].name}`;
});

await check("get_location_tree", async () => {
  const tree = await client.request<Array<{ name: string }>>("GET", "/entities/tree");
  assert(Array.isArray(tree) && tree.length > 0, "empty tree");
  return `${tree.length} roots`;
});

await check("get_custom_field_names / values", async () => {
  const names = await client.request<string[]>("GET", "/entities/fields");
  assert(Array.isArray(names), "field names is not an array");
  if (names.length === 0) return "no custom fields defined";
  // /entities/fields/values requires the field param — it 422s without it.
  const values = await client.request<string[]>("GET", "/entities/fields/values", {
    params: { field: names[0] },
  });
  assert(Array.isArray(values), "field values is not an array");
  return `${names.length} fields, "${names[0]}" has ${values.length} values`;
});

await check("list_tags", async () => {
  const tags = await client.request<unknown[]>("GET", "/tags");
  assert(Array.isArray(tags), "tags is not an array");
  return `${tags.length} tags`;
});

await check("get_currencies", async () => {
  const currencies = await client.request<unknown[]>("GET", "/currencies");
  assert(Array.isArray(currencies) && currencies.length > 0, "no currencies returned");
  return `${currencies.length} currencies`;
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
