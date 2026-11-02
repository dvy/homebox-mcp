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

// Context control. Every registered tool costs tokens in every session, so clients can trim the set:
//   HOMEBOX_TOOLSETS       comma list of groups to load (default: all). Groups: items, locations, tags,
//                          maintenance, attachments, templates, statistics, groups, notifiers, actions,
//                          users, misc
//   HOMEBOX_EXCLUDE_TOOLS  comma list of individual tool names to leave out
const GROUPS: Record<string, (server: McpServer, client: HomeboxClient) => void> = {
  items: registerItemTools,
  locations: registerLocationTools,
  tags: registerTagTools,
  maintenance: registerMaintenanceTools,
  attachments: registerAttachmentTools,
  templates: registerTemplateTools,
  statistics: registerStatisticsTools,
  groups: registerGroupTools,
  notifiers: registerNotifierTools,
  actions: registerActionTools,
  users: registerUserTools,
  misc: registerMiscTools,
};

function csv(value: string | undefined): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

export function registerAllTools(server: McpServer, client: HomeboxClient) {
  const wanted = csv(process.env.HOMEBOX_TOOLSETS);
  const unknown = wanted.filter((g) => !(g in GROUPS));
  if (unknown.length) {
    throw new Error(`Unknown HOMEBOX_TOOLSETS group(s): ${unknown.join(", ")}. Valid: ${Object.keys(GROUPS).join(", ")}`);
  }
  const groups = wanted.length ? wanted : Object.keys(GROUPS);

  const excluded = new Set(csv(process.env.HOMEBOX_EXCLUDE_TOOLS));
  const target = excluded.size
    ? new Proxy(server, {
        get(obj, prop, receiver) {
          if (prop === "tool") {
            return (name: string, ...rest: unknown[]) =>
              excluded.has(name)
                ? undefined
                : (obj.tool as (...args: unknown[]) => unknown).call(obj, name, ...rest);
          }
          return Reflect.get(obj, prop, receiver);
        },
      })
    : server;

  for (const g of groups) GROUPS[g](target, client);
}
