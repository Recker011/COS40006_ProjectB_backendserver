// src/server.js
// Minimal Express server with routing, static index.html, CORS, and /api/health.

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");   // request logs
const { ping, query } = require("../db");

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(express.json());
app.use(cors());          // allow cross-origin (React / RN dev servers)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
      },
    },
  })
);
      // basic security headers
app.use(morgan("dev"));   // concise logs

// Serve static files (CSS, JS)
app.use(express.static(process.cwd()));


// example API routing pattern (need to extend later)
const api = express.Router();

// Import authentication routes
const authRoutes = require('./routes/auth');

// Import article routes
const articleRoutes = require('./routes/articles');

// health endpoint: returns server uptime + DB status
api.get("/health", async (req, res) => {
  const started = Date.now();
  try {
    const version = await ping();
    const latencyMs = Date.now() - started;
    res.json({
      ok: true,
      time: new Date().toISOString(),
      uptimeSec: process.uptime(),
      latencyMs,
      db: { ok: true, version },
    });
  } catch (err) {
    const latencyMs = Date.now() - started;
    res.status(500).json({
      ok: false,
      time: new Date().toISOString(),
      uptimeSec: process.uptime(),
      latencyMs,
      db: { ok: false, error: String(err?.message || err) },
    });
  }
});

app.use("/api", api);

// Mount authentication routes
api.use('/auth', authRoutes);

// Mount article routes
api.use('/articles', articleRoutes);


// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

// start server
app.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  
  // Check database connection
  try {
    const version = await ping();
    console.log(`Database connection healthy: MySQL ${version}`);
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
});
