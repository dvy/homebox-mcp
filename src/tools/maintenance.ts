import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerMaintenanceTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_maintenance",
    "List maintenance entries. If itemId is provided, returns entries for that item only. Otherwise returns all entries across all items.",
    {
      itemId: z.string().optional().describe("Item ID to filter by (omit for all items)"),
      status: z.enum(["scheduled", "completed"]).optional().describe("Filter by status"),
    },
    async (params) => {
      try {
        const path = params.itemId
          ? `/items/${params.itemId}/maintenance`
          : "/maintenance";
        const data = await client.request("GET", path, {
          params: { status: params.status },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_maintenance_entry",
    "Create a maintenance log entry for an item.",
    {
      itemId: z.string().describe("Item ID"),
      name: z.string().describe("Maintenance entry name/title"),
      description: z.string().optional().describe("Description of the maintenance"),
      scheduledDate: z.string().optional().describe("Scheduled date (ISO 8601)"),
      completedDate: z.string().optional().describe("Completion date (ISO 8601)"),
      cost: z.number().optional().describe("Cost of maintenance"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", `/items/${params.itemId}/maintenance`, {
          body: {
            name: params.name,
            description: params.description ?? "",
            scheduledDate: params.scheduledDate ?? "0001-01-01T00:00:00Z",
            completedDate: params.completedDate ?? "0001-01-01T00:00:00Z",
            cost: params.cost !== undefined ? String(params.cost) : "0",
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_maintenance_entry",
    "Update a maintenance entry.",
    {
      id: z.string().describe("Maintenance entry ID"),
      name: z.string().optional().describe("Entry name/title"),
      description: z.string().optional().describe("Description"),
      scheduledDate: z.string().optional().describe("Scheduled date (ISO 8601)"),
      completedDate: z.string().optional().describe("Completion date (ISO 8601)"),
      cost: z.number().optional().describe("Cost"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.description !== undefined) body.description = params.description;
        if (params.scheduledDate !== undefined) body.scheduledDate = params.scheduledDate;
        if (params.completedDate !== undefined) body.completedDate = params.completedDate;
        if (params.cost !== undefined) body.cost = String(params.cost);
        const data = await client.request("PUT", `/maintenance/${params.id}`, { body });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_maintenance_entry",
    "Delete a maintenance entry.",
    {
      id: z.string().describe("Maintenance entry ID"),
    },
    async ({ id }) => {
      try {
        await client.request("DELETE", `/maintenance/${id}`);
        return toolResult({ success: true, message: `Maintenance entry ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
