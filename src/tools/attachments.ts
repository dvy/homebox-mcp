import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { HomeboxClient } from "../client.js";
import { toolResult, errorResult } from "./helpers.js";

export function registerAttachmentTools(server: McpServer, client: HomeboxClient) {
  server.tool(
    "get_attachment",
    "Get an item attachment's download token. Use the token to construct a download URL.",
    {
      itemId: z.string().describe("Item ID"),
      attachmentId: z.string().describe("Attachment ID"),
    },
    async ({ itemId, attachmentId }) => {
      try {
        const data = await client.request("GET", `/items/${itemId}/attachments/${attachmentId}`);
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "upload_attachment",
    "Upload a file attachment to an item. Accepts base64-encoded file content.",
    {
      itemId: z.string().describe("Item ID"),
      filename: z.string().describe("Filename with extension"),
      contentBase64: z.string().describe("Base64-encoded file content"),
      type: z.enum(["photo", "manual", "receipt", "warranty", "attachment"]).optional()
        .describe("Attachment type (default: attachment)"),
    },
    async (params) => {
      try {
        const buffer = Buffer.from(params.contentBase64, "base64");
        const blob = new Blob([buffer]);
        const formData = new FormData();
        formData.append("file", blob, params.filename);
        formData.append("type", params.type ?? "attachment");
        formData.append("name", params.filename);
        const data = await client.request("POST", `/items/${params.itemId}/attachments`, { formData });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "update_attachment",
    "Update attachment metadata (name, type, primary status).",
    {
      itemId: z.string().describe("Item ID"),
      attachmentId: z.string().describe("Attachment ID"),
      title: z.string().optional().describe("New attachment title"),
      type: z.enum(["photo", "manual", "receipt", "warranty", "attachment"]).optional().describe("New type"),
      primary: z.boolean().optional().describe("Set as primary attachment"),
    },
    async (params) => {
      try {
        const data = await client.request("PUT", `/items/${params.itemId}/attachments/${params.attachmentId}`, {
          body: {
            title: params.title,
            type: params.type,
            primary: params.primary,
          },
        });
        return toolResult(data);
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  server.tool(
    "delete_attachment",
    "Delete an attachment from an item.",
    {
      itemId: z.string().describe("Item ID"),
      attachmentId: z.string().describe("Attachment ID"),
    },
    async ({ itemId, attachmentId }) => {
      try {
        await client.request("DELETE", `/items/${itemId}/attachments/${attachmentId}`);
        return toolResult({ success: true, message: `Attachment ${attachmentId} deleted` });
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
