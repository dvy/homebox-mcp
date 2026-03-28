import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HomeboxClient } from "../client.js";
import { registerItemTools } from "./items.js";
import { registerLocationTools } from "./locations.js";
import { registerTagTools } from "./tags.js";
import { registerMaintenanceTools } from "./maintenance.js";
import { registerAttachmentTools } from "./attachments.js";
import { registerTemplateTools } from "./templates.js";
import { registerStatisticsTools } from "./statistics.js";
import { registerGroupTools } from "./groups.js";
import { registerNotifierTools } from "./notifiers.js";
import { registerActionTools } from "./actions.js";
import { registerUserTools } from "./users.js";
import { registerMiscTools } from "./misc.js";

export function registerAllTools(server: McpServer, client: HomeboxClient) {
  registerItemTools(server, client);
  registerLocationTools(server, client);
  registerTagTools(server, client);
  registerMaintenanceTools(server, client);
  registerAttachmentTools(server, client);
  registerTemplateTools(server, client);
  registerStatisticsTools(server, client);
  registerGroupTools(server, client);
  registerNotifierTools(server, client);
  registerActionTools(server, client);
  registerUserTools(server, client);
  registerMiscTools(server, client);
}
