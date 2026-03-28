#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuthManager } from "./auth.js";
import { HomeboxClient } from "./client.js";
import { createServer } from "./server.js";

const url = process.env.HOMEBOX_URL;
if (!url) {
  console.error("HOMEBOX_URL environment variable is required");
  process.exit(1);
}

const username = process.env.HOMEBOX_USERNAME ?? "";
const password = process.env.HOMEBOX_PASSWORD ?? "";
const token = process.env.HOMEBOX_TOKEN;

if (!token && (!username || !password)) {
  console.error(
    "Either HOMEBOX_TOKEN or both HOMEBOX_USERNAME and HOMEBOX_PASSWORD are required",
  );
  process.exit(1);
}

const auth = new AuthManager(url, username, password, token);
const client = new HomeboxClient(url, auth);
const server = createServer(client);

const transport = new StdioServerTransport();
await server.connect(transport);
