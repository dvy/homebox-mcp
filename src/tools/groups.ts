import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerGroupTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "get_group",
    "Get the current group's details (name, currency).",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/groups");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_group",
    "Update group name or currency.",
    {
      name: z.string().optional().describe("Group name"),
      currency: z.string().optional().describe("Currency code (e.g. 'usd')"),
    },
    async (params) => {
      try {
        const current = await client.request<Record<string, unknown>>("GET", "/groups");
        const data = await client.request("PUT", "/groups", {
          body: {
            name: params.name ?? current.name,
            currency: params.currency ?? current.currency,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "list_group_members",
    "List all members in the current group.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/groups/members");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "add_group_member",
    "Add a user to the current group.",
    {
      userId: z.string().describe("User ID to add"),
    },
    async ({ userId }) => {
      try {
        await client.request("POST", "/groups/members", {
          body: { userId },
        });
        return toolResult({ success: true, message: `User ${userId} added to group` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "remove_group_member",
    "Remove a user from the current group.",
    {
      userId: z.string().describe("User ID to remove"),
    },
    async ({ userId }) => {
      try {
        await client.request("DELETE", `/groups/members/${userId}`);
        return toolResult({ success: true, message: `User ${userId} removed from group` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "list_group_invitations",
    "List pending group invitations.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/groups/invitations");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_group_invitation",
    "Create a group invitation link with expiration and use count.",
    {
      expiresAt: z.string().describe("Expiration date (ISO 8601)"),
      uses: z.number().int().describe("Number of times the invitation can be used"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/groups/invitations", {
          body: {
            expiresAt: params.expiresAt,
            uses: params.uses,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
