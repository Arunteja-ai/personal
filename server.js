require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const { initDb } = require("./db/database");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const todoRoutes = require("./routes/todos");
const mealRoutes = require("./routes/meals");
const goalRoutes = require("./routes/goals");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;
const publicDir = path.join(__dirname, "public");

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/api", (_req, res) => {
  res.json({
    success: true,
    message: "PersonalManager API is running",
    version: "1.0.0",
    student: "Charmy Vora",
    endpoints: {
      auth: "/api/auth",
      todos: "/api/todos",
      meals: "/api/meals",
      goals: "/api/goals",
      admin: "/api/admin",
    },
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found." });
});

app.use(errorHandler);

async function boot() {
  try {
    await initDb();

    app.listen(PORT, "0.0.0.0", () => {
      console.log("PersonalManager API");
      console.log(`Port: ${PORT}`);
      console.log(`Env: ${process.env.NODE_ENV || "development"}`);
      console.log(`Database: ${process.env.DB_PATH || "db/personalmanager.db"}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  boot();
}

module.exports = app;
module.exports.app = app;
module.exports.boot = boot;
