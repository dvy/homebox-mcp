import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerTagTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_tags",
    "List all tags.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/tags");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_tag",
    "Get a specific tag by ID, including its items.",
    {
      id: z.string().describe("Tag ID (UUID)"),
    },
    async ({ id }) => {
      try {
        const data = await client.request("GET", `/tags/${id}`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_tag",
    "Create a new tag.",
    {
      name: z.string().describe("Tag name"),
      description: z.string().optional().describe("Tag description"),
      color: z.string().optional().describe("Tag color (hex, e.g. '#ff0000')"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/tags", {
          body: {
            name: params.name,
            description: params.description ?? "",
            color: params.color ?? "",
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_tag",
    "Update a tag's name, description, or color.",
    {
      id: z.string().describe("Tag ID (UUID)"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      color: z.string().optional().describe("New color (hex)"),
    },
    async (params) => {
      try {
        const current = await client.request<Record<string, unknown>>("GET", `/tags/${params.id}`);
        const data = await client.request("PUT", `/tags/${params.id}`, {
          body: {
            id: params.id,
            name: params.name ?? current.name,
            description: params.description ?? current.description,
            color: params.color ?? current.color,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_tag",
    "Delete a tag by ID.",
    {
      id: z.string().describe("Tag ID (UUID)"),
    },
    async ({ id }) => {
      try {
        await client.request("DELETE", `/tags/${id}`);
        return toolResult({ success: true, message: `Tag ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
