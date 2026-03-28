import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HomeboxClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";

export function createServer(client: HomeboxClient): McpServer {
  const server = new McpServer({
    name: "homebox",
    version: "0.1.0",
  });

  registerAllTools(server, client);

  return server;
}
