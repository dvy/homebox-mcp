import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerUserTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "get_user_self",
    "Get the current authenticated user's profile.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/users/self");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_user_self",
    "Update the current user's name or email.",
    {
      name: z.string().optional().describe("New display name"),
      email: z.string().optional().describe("New email address"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.email !== undefined) body.email = params.email;
        const data = await client.request("PUT", "/users/self", { body });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "change_password",
    "Change the current user's password.",
    {
      current: z.string().describe("Current password"),
      new: z.string().describe("New password"),
    },
    async (params) => {
      try {
        await client.request("PUT", "/users/change-password", {
          body: {
            current: params.current,
            new: params.new,
          },
        });
        return toolResult({ success: true, message: "Password changed" });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
