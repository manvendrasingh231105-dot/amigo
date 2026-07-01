import express from "express";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add a simple health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Detect if we are in production
  const isProd = process.env.NODE_ENV === "production" || (typeof __dirname !== "undefined" && __dirname.endsWith("dist"));

  // Vite middleware for development
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, server.cjs is bundled inside /dist, so __dirname matches /dist perfectly
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
