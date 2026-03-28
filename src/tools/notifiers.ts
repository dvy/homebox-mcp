import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerNotifierTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "list_notifiers",
    "List all configured notifiers.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/notifiers");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_notifier",
    "Create a notification endpoint using an Apprise URL.",
    {
      name: z.string().describe("Notifier name"),
      url: z.string().describe("Apprise notification URL"),
      isActive: z.boolean().optional().describe("Whether the notifier is active (default true)"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/notifiers", {
          body: {
            name: params.name,
            url: params.url,
            isActive: params.isActive ?? true,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_notifier",
    "Update a notifier's name, URL, or active status.",
    {
      id: z.string().describe("Notifier ID"),
      name: z.string().optional().describe("New name"),
      url: z.string().optional().describe("New Apprise URL"),
      isActive: z.boolean().optional().describe("Active status"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.url !== undefined) body.url = params.url;
        if (params.isActive !== undefined) body.isActive = params.isActive;
        const data = await client.request("PUT", `/notifiers/${params.id}`, { body });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_notifier",
    "Delete a notifier.",
    {
      id: z.string().describe("Notifier ID"),
    },
    async ({ id }) => {
      try {
        await client.request("DELETE", `/notifiers/${id}`);
        return toolResult({ success: true, message: `Notifier ${id} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "test_notifier",
    "Send a test notification to a URL.",
    {
      url: z.string().describe("Apprise URL to test"),
    },
    async ({ url }) => {
      try {
        await client.request("POST", "/notifiers/test", {
          params: { url },
        });
        return toolResult({ success: true, message: "Test notification sent" });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
