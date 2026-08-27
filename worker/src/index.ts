import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";

const app = new Hono<{ Bindings: Env }>();

// frontend runs on a separate origin (Vite dev server) only in local dev;
// in production both are served from the same Worker origin, so this is a no-op there.
app.use(
  "/api/*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

export default app;
