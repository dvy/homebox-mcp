import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerStatisticsTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "get_statistics",
    "Get overall inventory statistics: total items, total value, locations count, tags count, users count, items with warranty.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/groups/statistics");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_statistics_by_location",
    "Get item counts and values grouped by location.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/groups/statistics/locations");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_statistics_by_tag",
    "Get item counts and values grouped by tag.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/groups/statistics/tags");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_purchase_price_statistics",
    "Get purchase price trends over time. Optionally filter by date range.",
    {
      start: z.string().optional().describe("Start date (ISO 8601)"),
      end: z.string().optional().describe("End date (ISO 8601)"),
    },
    async (params) => {
      try {
        const data = await client.request("GET", "/groups/statistics/purchase-price", {
          params: { start: params.start, end: params.end },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
