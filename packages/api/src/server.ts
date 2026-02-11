import { serve } from "@hono/node-server";
import app from "./index";
import { loadConfig } from "./config";

const config = loadConfig();

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`Player1 API running on http://localhost:${info.port}`);
  console.log(`Chain: ${config.chainId} | Relay: loaded`);
});
