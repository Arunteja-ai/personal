// server.js
// PersonalManager Backend — Charmy Vora
// Node.js + Express REST API | SQLite (sql.js) | JWT Auth
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

const express = require("express");
const cors    = require("cors");

const { initDb }         = require("./db/database");
const { errorHandler }   = require("./middleware/errorHandler");

const authRoutes  = require("./routes/auth");
const todoRoutes  = require("./routes/todos");
const mealRoutes  = require("./routes/meals");
const goalRoutes  = require("./routes/goals");
const adminRoutes = require("./routes/admin");

const app  = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ],
  methods:      ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials:  true,
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "PersonalManager API is running 🚀",
    version: "1.0.0",
    student: "Charmy Vora",
    endpoints: {
      auth:  "/api/auth",
      todos: "/api/todos",
      meals: "/api/meals",
      goals: "/api/goals",
      admin: "/api/admin",
    },
  });
});

app.use("/api/auth",  authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found." });
});

// Global error handler (must be last)
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// BOOT — initialise DB first, then start HTTP server
// ─────────────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    await initDb();   // loads / creates SQLite file, runs schema

    app.listen(PORT, () => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🚀  PersonalManager API`);
      console.log(`📦  Port     : ${PORT}`);
      console.log(`🌍  Env      : ${process.env.NODE_ENV || "development"}`);
      console.log(`🗄️  Database : SQLite → db/personalmanager.db`);
      console.log(`👤  Student  : Charmy Vora`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  boot();
}

module.exports = app;
module.exports.app = app;
module.exports.boot = boot;
