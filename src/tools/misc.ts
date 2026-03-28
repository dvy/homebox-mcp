import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerMiscTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "get_status",
    "Get Homebox server status, version, and configuration (registration, demo mode, OIDC, etc.).",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/status");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "get_currencies",
    "List all supported currencies.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/currency");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "search_barcode",
    "Look up a product by barcode/EAN. Returns product info (manufacturer, model, description) that can be used to create an item.",
    {
      barcode: z.string().describe("Barcode/EAN string"),
    },
    async ({ barcode }) => {
      try {
        const data = await client.request("GET", "/products/search-from-barcode", {
          params: { data: barcode },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "export_bill_of_materials",
    "Export a bill of materials report as CSV.",
    {},
    async () => {
      try {
        const data = await client.request("GET", "/reporting/bill-of-materials");
        return toolResult({ csv: data });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
