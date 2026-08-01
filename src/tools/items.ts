import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import {
  toolResult,
  errorResult,
  buildEntityUpdateBody,
  stripItem,
  stripItemSummary,
  ITEM_SECTIONS,
  type ItemSection,
} from "./helpers.js";

// Homebox merged items and locations into a single "entities" resource
// (upstream #1414). Items are entities whose entity type has isLocation=false,
// and an item's location is simply its parent entity.
const fieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  textValue: z.string().optional(),
  numberValue: z.number().optional(),
  booleanValue: z.boolean().optional(),
});

const itemSectionEnum = z.enum(ITEM_SECTIONS as unknown as [string, ...string[]]);

export function registerItemTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_items",
    "Query items with optional filtering by location, tags, search text, and parent. Returns paginated item summaries.",
    {
      q: z.string().optional().describe("Search query string"),
      page: z.number().int().positive().optional().describe("Page number (1-indexed)"),
      pageSize: z.number().int().min(1).max(500).optional().describe("Items per page (default 50)"),
      locations: z.array(z.string()).optional().describe("Location IDs to filter by"),
      tags: z.array(z.string()).optional().describe("Tag IDs to filter by"),
      parentIds: z.array(z.string()).optional().describe("Parent item IDs to filter by"),
      includeArchived: z.boolean().optional().describe("Include archived items (default false)"),
    },
    async (params) => {
      try {
        // Locations and parent items are both just parent entities now.
        const parents = [
          ...new Set([...(params.locations ?? []), ...(params.parentIds ?? [])]),
        ];
        const data = await client.request("GET", "/entities", {
          params: {
            q: params.q,
            page: params.page?.toString(),
            pageSize: (params.pageSize ?? 50).toString(),
            parentIds: parents.length > 0 ? parents : undefined,
            tags: params.tags,
            isLocation: "false",
            includeArchived: params.includeArchived?.toString(),
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_item",
    `Get item details by ID. Use 'include' to request only specific sections and reduce response size. Available sections: ${ITEM_SECTIONS.join(", ")}. Basics (id, name, quantity, archived, assetId, timestamps) are always included. Description is in the 'notes' section.`,
    {
      id: z.string().describe("Item ID (UUID)"),
      include: z.array(itemSectionEnum).optional().describe(
        "Sections to include. Omit for all sections. Options: fields, tags, attachments, location, purchase, warranty, sold, notes, details",
      ),
    },
    async ({ id, include }) => {
      try {
        const data = await client.request<Record<string, unknown>>("GET", `/entities/${id}`);
        return toolResult(stripItem(data, include as ItemSection[] | undefined));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_item",
    "Create a new item. Returns a minimal summary by default (id, name, updatedAt). Set verbose=true for full item.",
    {
      name: z.string().describe("Item name"),
      locationId: z.string().describe("Location ID to place the item in"),
      description: z.string().optional().describe("Item description"),
      quantity: z.number().int().optional().describe("Quantity (default 1)"),
      tagIds: z.array(z.string()).optional().describe("Tag IDs to assign"),
      parentId: z.string().optional().describe("Parent item ID for hierarchical items (overrides locationId)"),
      entityTypeId: z.string().optional().describe("Entity type ID (defaults to the group's item type)"),
      verbose: z.boolean().optional().describe("Return full item instead of summary (default false)"),
    },
    async (params) => {
      try {
        const data = await client.request<Record<string, unknown>>("POST", "/entities", {
          body: {
            name: params.name,
            parentId: params.parentId ?? params.locationId,
            description: params.description ?? "",
            quantity: params.quantity ?? 1,
            tagIds: params.tagIds ?? [],
            entityTypeId: params.entityTypeId,
          },
        });
        return toolResult(params.verbose ? data : stripItemSummary(data));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_item",
    "Full update of an item. Returns a minimal summary by default (id, name, updatedAt). Set verbose=true for full item.",
    {
      id: z.string().describe("Item ID (UUID)"),
      name: z.string().optional().describe("Item name"),
      description: z.string().optional().describe("Description"),
      locationId: z.string().optional().describe("Location ID (the item's parent entity)"),
      tagIds: z.array(z.string()).optional().describe("Tag IDs (replaces all tags)"),
      parentId: z.string().nullable().optional().describe("Parent entity ID (null to clear; overrides locationId)"),
      quantity: z.number().int().optional().describe("Quantity"),
      insured: z.boolean().optional().describe("Whether the item is insured"),
      archived: z.boolean().optional().describe("Whether the item is archived"),
      manufacturer: z.string().optional().describe("Manufacturer name"),
      modelNumber: z.string().optional().describe("Model number"),
      serialNumber: z.string().optional().describe("Serial number"),
      purchaseFrom: z.string().optional().describe("Where purchased from"),
      purchasePrice: z.number().optional().describe("Purchase price as a number (e.g. 29.99)"),
      purchaseTime: z.string().optional().describe("Purchase date (ISO 8601)"),
      soldTo: z.string().optional().describe("Who the item was sold to"),
      soldPrice: z.number().optional().describe("Sale price"),
      soldTime: z.string().optional().describe("Sale date (ISO 8601)"),
      soldNotes: z.string().optional().describe("Sale notes"),
      notes: z.string().optional().describe("General notes"),
      lifetimeWarranty: z.boolean().optional().describe("Has lifetime warranty"),
      warrantyExpires: z.string().optional().describe("Warranty expiry date (ISO 8601)"),
      warrantyDetails: z.string().optional().describe("Warranty details"),
      syncChildEntityLocations: z.boolean().optional().describe("Move child entities along with this one"),
      fields: z.array(fieldSchema).optional().describe("Custom fields"),
      verbose: z.boolean().optional().describe("Return full item instead of summary (default false)"),
    },
    async (params) => {
      try {
        // PUT /entities/{id} is a full replace, so merge over the current state.
        const current = await client.request<Record<string, unknown>>("GET", `/entities/${params.id}`);
        const body = buildEntityUpdateBody(params, current);
        const data = await client.request<Record<string, unknown>>("PUT", `/entities/${params.id}`, { body });
        return toolResult(params.verbose ? data : stripItemSummary(data));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "patch_item",
    "Partial item update - only location, quantity, and tags. Returns minimal summary by default. Set verbose=true for full item.",
    {
      id: z.string().describe("Item ID (UUID)"),
      locationId: z.string().optional().describe("New location ID (the item's parent entity)"),
      parentId: z.string().optional().describe("New parent entity ID (overrides locationId)"),
      quantity: z.number().int().optional().describe("New quantity"),
      tagIds: z.array(z.string()).optional().describe("New tag IDs (replaces all)"),
      verbose: z.boolean().optional().describe("Return full item instead of summary (default false)"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = { id: params.id };
        const parent = params.parentId ?? params.locationId;
        if (parent !== undefined) body.parentId = parent;
        if (params.quantity !== undefined) body.quantity = params.quantity;
        if (params.tagIds !== undefined) body.tagIds = params.tagIds;
        const data = await client.request<Record<string, unknown>>("PATCH", `/entities/${params.id}`, { body });
        return toolResult(params.verbose ? data : stripItemSummary(data));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "patch_fields",
    "Update only custom fields on an item without affecting other data. Returns the updated fields.",
    {
      id: z.string().describe("Item ID (UUID)"),
      fields: z.array(fieldSchema).describe("Custom fields to set"),
    },
    async ({ id, fields }) => {
      try {
        // PUT /entities/{id} is a full replace, so merge over the current state.
        const current = await client.request<Record<string, unknown>>("GET", `/entities/${id}`);
        const body = buildEntityUpdateBody({ id, fields }, current);

        const data = await client.request<Record<string, unknown>>("PUT", `/entities/${id}`, { body });
        return toolResult({
          id: data.id,
          name: data.name,
          updatedAt: data.updatedAt,
          fields: data.fields,
        });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "batch_get_items",
    "Get multiple items by ID in a single call. Supports the same 'include' filtering as get_item. Max 50 items.",
    {
      ids: z.array(z.string()).min(1).max(50).describe("Item IDs (UUIDs)"),
      include: z.array(itemSectionEnum).optional().describe(
        "Sections to include per item. Omit for all sections. Options: fields, tags, attachments, location, purchase, warranty, sold, notes, details",
      ),
    },
    async ({ ids, include }) => {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const data = await client.request<Record<string, unknown>>("GET", `/entities/${id}`);
              return stripItem(data, include as ItemSection[] | undefined);
            } catch (e) {
              return { id, error: e instanceof Error ? e.message : String(e) };
            }
          }),
        );
        return toolResult(results);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "batch_update_items",
    "Update multiple items in a single call. Each item entry requires an id and the fields to update (same as update_item). Returns minimal summaries. Max 50 items.",
    {
      items: z.array(z.object({
        id: z.string().describe("Item ID (UUID)"),
        name: z.string().optional(),
        description: z.string().optional(),
        locationId: z.string().optional(),
        tagIds: z.array(z.string()).optional(),
        parentId: z.string().nullable().optional().describe("Parent entity ID (overrides locationId)"),
        quantity: z.number().int().optional(),
        insured: z.boolean().optional(),
        archived: z.boolean().optional(),
        manufacturer: z.string().optional(),
        modelNumber: z.string().optional(),
        serialNumber: z.string().optional(),
        purchaseFrom: z.string().optional(),
        purchasePrice: z.number().optional(),
        purchaseTime: z.string().optional(),
        soldTo: z.string().optional(),
        soldPrice: z.number().optional(),
        soldTime: z.string().optional(),
        soldNotes: z.string().optional(),
        notes: z.string().optional(),
        lifetimeWarranty: z.boolean().optional(),
        warrantyExpires: z.string().optional(),
        warrantyDetails: z.string().optional(),
        syncChildEntityLocations: z.boolean().optional(),
        fields: z.array(fieldSchema).optional(),
      })).min(1).max(50).describe("Items to update"),
    },
    async ({ items }) => {
      try {
        const results = await Promise.all(
          items.map(async (params) => {
            try {
              // PUT /entities/{id} is a full replace, so merge over the current state.
              const current = await client.request<Record<string, unknown>>("GET", `/entities/${params.id}`);
              const body = buildEntityUpdateBody(params, current);
              const data = await client.request<Record<string, unknown>>("PUT", `/entities/${params.id}`, { body });
              return { ...stripItemSummary(data), success: true };
            } catch (e) {
              return { id: params.id, success: false, error: e instanceof Error ? e.message : String(e) };
            }
          }),
        );
        return toolResult(results);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_item",
    "Permanently delete an item by ID.",
    {
      id: z.string().describe("Item ID (UUID)"),
    },
    async ({ id }) => {
      try {
        await client.request("DELETE", `/entities/${id}`);
        return toolResult({ success: true, message: `Item ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "duplicate_item",
    "Duplicate an item with options to copy attachments, custom fields, and maintenance entries.",
    {
      id: z.string().describe("Item ID to duplicate"),
      copyAttachments: z.boolean().optional().describe("Copy attachments (default false)"),
      copyCustomFields: z.boolean().optional().describe("Copy custom fields (default false)"),
      copyMaintenance: z.boolean().optional().describe("Copy maintenance entries (default false)"),
      copyPrefix: z.string().optional().describe("Prefix for the duplicated item name"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", `/entities/${params.id}/duplicate`, {
          body: {
            copyAttachments: params.copyAttachments ?? false,
            copyCustomFields: params.copyCustomFields ?? false,
            copyMaintenance: params.copyMaintenance ?? false,
            copyPrefix: params.copyPrefix ?? "Copy of ",
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_item_path",
    "Get the full hierarchical location path for an item (e.g., House > Garage > Shelf).",
    {
      id: z.string().describe("Item ID (UUID)"),
    },
    async ({ id }) => {
      try {
        const data = await client.request("GET", `/entities/${id}/path`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_item_by_asset_id",
    "Look up an item by its printed asset ID (e.g., '000-085').",
    {
      assetId: z.string().describe("Asset ID string"),
    },
    async ({ assetId }) => {
      try {
        const data = await client.request("GET", `/assets/${assetId}`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_custom_field_names",
    "Get all custom field names used across all items.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/entities/fields");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_custom_field_values",
    "Get all values used for one custom field. Call get_custom_field_names first to discover field names.",
    {
      field: z.string().describe("Custom field name (required)"),
    },
    async ({ field }) => {
      try {
        const data = await client.request("GET", "/entities/fields/values", {
          params: { field },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "import_items",
    "Import items from CSV content. The CSV should match Homebox export format.",
    {
      csvContent: z.string().describe("CSV file content as a string"),
    },
    async ({ csvContent }) => {
      try {
        const formData = new FormData();
        const blob = new Blob([csvContent], { type: "text/csv" });
        formData.append("csv", blob, "import.csv");
        const data = await client.request("POST", "/entities/import", { formData });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "export_items",
    "Export all items as CSV.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/entities/export");
        return toolResult({ csv: data });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
