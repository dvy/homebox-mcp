import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerLocationTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_locations",
    "List all locations with item counts. Optionally filter to show only top-level locations.",
    {
      filterChildren: z.boolean().optional().describe("If true, only return top-level locations"),
    },
    async (params) => {
      try {
        const data = await client.request("GET", "/locations", {
          params: {
            filterChildren: params.filterChildren?.toString(),
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_location",
    "Get a location's details including children locations and total price of items.",
    {
      id: z.string().describe("Location ID (UUID)"),
    },
    async ({ id }) => {
      try {
        const data = await client.request("GET", `/locations/${id}`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_location_tree",
    "Get the full hierarchical location tree. Optionally include items at each location.",
    {
      withItems: z.boolean().optional().describe("Include items in the tree (default false)"),
    },
    async (params) => {
      try {
        const data = await client.request("GET", "/locations/tree", {
          params: {
            withItems: params.withItems?.toString(),
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_location",
    "Create a new location. Optionally nest it under a parent location.",
    {
      name: z.string().describe("Location name"),
      description: z.string().optional().describe("Location description"),
      parentId: z.string().optional().describe("Parent location ID for nesting"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/locations", {
          body: {
            name: params.name,
            description: params.description ?? "",
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
    "update_location",
    "Update a location's name, description, or parent.",
    {
      id: z.string().describe("Location ID (UUID)"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      parentId: z.string().nullable().optional().describe("New parent ID (null to make top-level)"),
    },
    async (params) => {
      try {
        // Get current to merge
        const current = await client.request<Record<string, unknown>>("GET", `/locations/${params.id}`);
        const data = await client.request("PUT", `/locations/${params.id}`, {
          body: {
            id: params.id,
            name: params.name ?? current.name,
            description: params.description ?? current.description,
            parentId: params.parentId !== undefined ? params.parentId : (current.parent as Record<string, unknown>)?.id,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_location",
    "Delete a location by ID. The location must be empty (no items or children).",
    {
      id: z.string().describe("Location ID (UUID)"),
    },
    async ({ id }) => {
      try {
        await client.request("DELETE", `/locations/${id}`);
        return toolResult({ success: true, message: `Location ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
