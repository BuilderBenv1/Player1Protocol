import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "./config";
import { getClient } from "./client";
import { errorHandler } from "./middleware/error-handler";
import { statsRoutes } from "./routes/stats";
import { playerRoutes } from "./routes/players";
import { tournamentRoutes } from "./routes/tournaments";
import { achievementRoutes } from "./routes/achievements";

const config = loadConfig();
const client = getClient(config);

const app = new Hono();

// Global middleware
app.use("*", cors());
app.onError(errorHandler);

// Health check
app.get("/health", (c) => c.json({ ok: true, chain: config.chainId, relay: client.relayAddress }));

// Mount routes
app.route("/stats", statsRoutes(client));
app.route("/players", playerRoutes(client));
app.route("/tournaments", tournamentRoutes(client, config));
app.route("/achievements", achievementRoutes(client, config));

export default app;
