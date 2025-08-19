// src/server.js
// Minimal Express server with routing, static index.html, CORS, and /api/health.

const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan"); // request logs
const { ping } = require("../db");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse cookies
app.use(cookieParser());

// Parse JSON with size limit
app.use(express.json({ limit: "1mb" }));

// Request logging
app.use(morgan("dev"));

// Rate limiter for login endpoint ONLY
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window per IP
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// serve the dashboard at /
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// example API routing pattern (need to extend later)
const api = express.Router();

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

// ---- AUTH ROUTES (correctly mounted) ----
const authRouter = require("./routes/auth"); // adjust path if your file lives elsewhere
app.use("/auth/login", loginLimiter); // apply limiter to login only
app.use("/auth", authRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

// Centralized error handler
app.use((err, req, res, next) => {
  // Log error with message and stack in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", err.message, "\nStack:", err.stack);
  } else {
    console.error("Error:", err.message);
  }

  // If error is meant to be exposed and has a status, use it
  if (err.expose === true && err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Otherwise return generic 500 error
  return res.status(500).json({ error: "Internal server error" });
});

// start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
