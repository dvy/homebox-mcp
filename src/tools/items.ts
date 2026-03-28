import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

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
    },
    async (params) => {
      try {
        const data = await client.request("GET", "/items", {
          params: {
            q: params.q,
            page: params.page?.toString(),
            pageSize: (params.pageSize ?? 50).toString(),
            locations: params.locations,
            tags: params.tags,
            parentIds: params.parentIds,
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
    "Get full item details by ID, including all fields, attachments, location, tags, and custom fields.",
    {
      id: z.string().describe("Item ID (UUID)"),
    },
    async ({ id }) => {
      try {
        const data = await client.request("GET", `/items/${id}`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_item",
    "Create a new item. Returns the created item summary.",
    {
      name: z.string().describe("Item name"),
      locationId: z.string().describe("Location ID to place the item in"),
      description: z.string().optional().describe("Item description"),
      quantity: z.number().int().optional().describe("Quantity (default 1)"),
      tagIds: z.array(z.string()).optional().describe("Tag IDs to assign"),
      parentId: z.string().optional().describe("Parent item ID for hierarchical items"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/items", {
          body: {
            name: params.name,
            locationId: params.locationId,
            description: params.description ?? "",
            quantity: params.quantity ?? 1,
            tagIds: params.tagIds ?? [],
            parentId: params.parentId,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_item",
    "Full update of an item. Supports all fields: name, description, location, tags, manufacturer, model number, serial number, purchase info, warranty info, sold info, notes, custom fields, archived status.",
    {
      id: z.string().describe("Item ID (UUID)"),
      name: z.string().optional().describe("Item name"),
      description: z.string().optional().describe("Description"),
      locationId: z.string().optional().describe("Location ID"),
      tagIds: z.array(z.string()).optional().describe("Tag IDs (replaces all tags)"),
      parentId: z.string().nullable().optional().describe("Parent item ID (null to clear)"),
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
      syncChildItemsLocations: z.boolean().optional().describe("Sync child items to same location"),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        textValue: z.string().optional(),
        numberValue: z.number().optional(),
        booleanValue: z.boolean().optional(),
      })).optional().describe("Custom fields"),
    },
    async (params) => {
      try {
        // First get the current item to merge with updates
        const current = await client.request<Record<string, unknown>>("GET", `/items/${params.id}`);

        const body: Record<string, unknown> = {
          id: params.id,
          name: params.name ?? current.name,
          description: params.description ?? current.description,
          locationId: params.locationId ?? (current.location as Record<string, unknown>)?.id,
          tagIds: params.tagIds ?? ((current.tags as Array<Record<string, unknown>>) ?? []).map((t) => t.id),
          parentId: params.parentId !== undefined ? params.parentId : (current.parent as Record<string, unknown>)?.id,
          quantity: params.quantity ?? current.quantity,
          insured: params.insured ?? current.insured,
          archived: params.archived ?? current.archived,
          manufacturer: params.manufacturer ?? current.manufacturer,
          modelNumber: params.modelNumber ?? current.modelNumber,
          serialNumber: params.serialNumber ?? current.serialNumber,
          purchaseFrom: params.purchaseFrom ?? current.purchaseFrom,
          purchasePrice: params.purchasePrice !== undefined ? String(params.purchasePrice) : current.purchasePrice,
          purchaseTime: params.purchaseTime ?? current.purchaseTime,
          soldTo: params.soldTo ?? current.soldTo,
          soldPrice: params.soldPrice !== undefined ? String(params.soldPrice) : current.soldPrice,
          soldTime: params.soldTime ?? current.soldTime,
          soldNotes: params.soldNotes ?? current.soldNotes,
          notes: params.notes ?? current.notes,
          lifetimeWarranty: params.lifetimeWarranty ?? current.lifetimeWarranty,
          warrantyExpires: params.warrantyExpires ?? current.warrantyExpires,
          warrantyDetails: params.warrantyDetails ?? current.warrantyDetails,
          syncChildItemsLocations: params.syncChildItemsLocations ?? current.syncChildItemsLocations,
          assetId: current.assetId,
          fields: params.fields ?? current.fields,
        };

        const data = await client.request("PUT", `/items/${params.id}`, { body });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "patch_item",
    "Partial item update - only location, quantity, and tags. Lighter alternative to full update.",
    {
      id: z.string().describe("Item ID (UUID)"),
      locationId: z.string().optional().describe("New location ID"),
      quantity: z.number().int().optional().describe("New quantity"),
      tagIds: z.array(z.string()).optional().describe("New tag IDs (replaces all)"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = { id: params.id };
        if (params.locationId !== undefined) body.locationId = params.locationId;
        if (params.quantity !== undefined) body.quantity = params.quantity;
        if (params.tagIds !== undefined) body.tagIds = params.tagIds;
        const data = await client.request("PATCH", `/items/${params.id}`, { body });
        return toolResult(data);
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
        await client.request("DELETE", `/items/${id}`);
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
        const data = await client.request("POST", `/items/${params.id}/duplicate`, {
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
        const data = await client.request("GET", `/items/${id}/path`);
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
        const data = await client.request("GET", "/items/fields");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_custom_field_values",
    "Get all custom field name/value pairs used across all items.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/items/fields/values");
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
        const data = await client.request("POST", "/items/import", { formData });
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
        const data = await client.request("GET", "/items/export");
        return toolResult({ csv: data });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
