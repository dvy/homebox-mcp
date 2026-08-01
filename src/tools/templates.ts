import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

const templateFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  textValue: z.string().optional(),
});

export function registerTemplateTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_templates",
    "List all item templates.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/templates");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_template",
    "Get a specific item template with all default values and fields.",
    {
      id: z.string().describe("Template ID (UUID)"),
    },
    async ({ id }) => {
      try {
        const data = await client.request("GET", `/templates/${id}`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_template",
    "Create an item template with default values.",
    {
      name: z.string().describe("Template name"),
      description: z.string().optional().describe("Template description"),
      notes: z.string().optional().describe("Notes"),
      defaultName: z.string().optional().describe("Default item name"),
      defaultDescription: z.string().optional().describe("Default item description"),
      defaultLocationId: z.string().optional().describe("Default location ID"),
      defaultTagIds: z.array(z.string()).optional().describe("Default tag IDs"),
      defaultQuantity: z.number().int().optional().describe("Default quantity"),
      defaultManufacturer: z.string().optional().describe("Default manufacturer"),
      defaultModelNumber: z.string().optional().describe("Default model number"),
      defaultInsured: z.boolean().optional(),
      defaultLifetimeWarranty: z.boolean().optional(),
      defaultWarrantyDetails: z.string().optional(),
      includePurchaseFields: z.boolean().optional(),
      includeSoldFields: z.boolean().optional(),
      includeWarrantyFields: z.boolean().optional(),
      fields: z.array(templateFieldSchema).optional().describe("Template custom fields"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/templates", { body: params });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_template",
    "Update an item template.",
    {
      id: z.string().describe("Template ID (UUID)"),
      name: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
      defaultName: z.string().optional(),
      defaultDescription: z.string().optional(),
      defaultLocationId: z.string().optional(),
      defaultTagIds: z.array(z.string()).optional(),
      defaultQuantity: z.number().int().optional(),
      defaultManufacturer: z.string().optional(),
      defaultModelNumber: z.string().optional(),
      defaultInsured: z.boolean().optional(),
      defaultLifetimeWarranty: z.boolean().optional(),
      defaultWarrantyDetails: z.string().optional(),
      includePurchaseFields: z.boolean().optional(),
      includeSoldFields: z.boolean().optional(),
      includeWarrantyFields: z.boolean().optional(),
      fields: z.array(templateFieldSchema).optional(),
    },
    async (params) => {
      try {
        const data = await client.request("PUT", `/templates/${params.id}`, {
          body: { ...params },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_template",
    "Delete an item template.",
    {
      id: z.string().describe("Template ID (UUID)"),
    },
    async ({ id }) => {
      try {
        await client.request("DELETE", `/templates/${id}`);
        return toolResult({ success: true, message: `Template ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_item_from_template",
    "Create a new item using a template's default values. Override any field as needed.",
    {
      templateId: z.string().describe("Template ID"),
      name: z.string().optional().describe("Item name (overrides template default)"),
      description: z.string().optional().describe("Item description"),
      locationId: z.string().describe("Location ID the new item is placed in (required)"),
      quantity: z.number().int().optional().describe("Quantity"),
      tagIds: z.array(z.string()).optional().describe("Tag IDs"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.description !== undefined) body.description = params.description;
        // The location is the new entity's parent (upstream #1414).
        body.parentId = params.locationId;
        if (params.quantity !== undefined) body.quantity = params.quantity;
        if (params.tagIds !== undefined) body.tagIds = params.tagIds;
        const data = await client.request("POST", `/templates/${params.templateId}/create-item`, { body });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
