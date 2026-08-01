import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import {
  toolResult,
  errorResult,
  buildEntityUpdateBody,
  resolveEntityTypeId,
} from "./helpers.js";

// Locations are entities whose entity type has isLocation=true (upstream #1414
// merged the /locations and /items resources into /entities).
export function registerLocationTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_locations",
    "List all locations with item counts. Optionally filter to show only top-level locations.",
    {
      filterChildren: z.boolean().optional().describe("If true, only return top-level locations"),
      q: z.string().optional().describe("Search query string"),
    },
    async (params) => {
      try {
        const data = await client.request("GET", "/entities", {
          params: {
            isLocation: "true",
            filterChildren: params.filterChildren?.toString(),
            q: params.q,
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
        const data = await client.request("GET", `/entities/${id}`);
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
        const data = await client.request("GET", "/entities/tree", {
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
        // Without an explicit location entity type the server would create an item.
        const entityTypeId = await resolveEntityTypeId(client, true);
        const data = await client.request("POST", "/entities", {
          body: {
            name: params.name,
            description: params.description ?? "",
            parentId: params.parentId,
            entityTypeId,
            quantity: 1,
            tagIds: [],
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
        // PUT /entities/{id} is a full replace, so merge over the current state.
        const current = await client.request<Record<string, unknown>>("GET", `/entities/${params.id}`);
        const body = buildEntityUpdateBody(params, current);
        const data = await client.request("PUT", `/entities/${params.id}`, { body });
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
        await client.request("DELETE", `/entities/${id}`);
        return toolResult({ success: true, message: `Location ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "list_entity_types",
    "List the group's entity types. Each type's isLocation flag decides whether entities of that type are locations or items.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/entity-types");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
