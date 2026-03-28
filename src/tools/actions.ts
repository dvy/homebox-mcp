import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerActionTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "ensure_asset_ids",
    "Assign sequential asset IDs to all items that lack one. Idempotent - existing IDs are not changed.",
    {},
    async () => {
      try {
        const data = await client.request("POST", "/actions/ensure-asset-ids");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "ensure_import_refs",
    "Assign import refs to all items that lack one.",
    {},
    async () => {
      try {
        const data = await client.request("POST", "/actions/ensure-import-refs");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "create_missing_thumbnails",
    "Generate thumbnails for items that are missing them.",
    {},
    async () => {
      try {
        const data = await client.request("POST", "/actions/create-missing-thumbnails");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "set_primary_photos",
    "Set the first photo of each item as the primary photo.",
    {},
    async () => {
      try {
        const data = await client.request("POST", "/actions/set-primary-photos");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "zero_item_time_fields",
    "Reset all item date/time fields to the beginning of the day (zeroes out time components).",
    {},
    async () => {
      try {
        const data = await client.request("POST", "/actions/zero-item-time-fields");
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "wipe_inventory",
    "DESTRUCTIVE: Wipe the entire inventory. Optionally also wipe locations, tags, and maintenance entries.",
    {
      wipeLocations: z.boolean().optional().describe("Also delete all locations"),
      wipeTags: z.boolean().optional().describe("Also delete all tags"),
      wipeMaintenance: z.boolean().optional().describe("Also delete all maintenance entries"),
    },
    async (params) => {
      try {
        const data = await client.request("POST", "/actions/wipe-inventory", {
          body: {
            wipeLocations: params.wipeLocations ?? false,
            wipeTags: params.wipeTags ?? false,
            wipeMaintenance: params.wipeMaintenance ?? false,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
