// routes/goals.js
// Full CRUD for goals (short-term & long-term) scoped per user
//
// GET    /api/goals              – list all goals (filter by type)
// POST   /api/goals              – create goal
// GET    /api/goals/:id          – get single goal
// PUT    /api/goals/:id          – update goal
// PATCH  /api/goals/:id/progress – update progress only
// DELETE /api/goals/:id          – delete goal

const express  = require("express");
const { getDb }        = require("../db/database");
const { protect }      = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();
router.use(protect);

const VALID_TYPES      = ["short", "long"];
const VALID_PRIORITIES = ["high", "medium", "low"];

// ── Validation ────────────────────────────────────────────────────────────────
function validateGoal(body, isUpdate = false) {
  const errors = {};
  const { title, deadline, priority, goal_type, progress } = body;

  if (!isUpdate || title !== undefined) {
    if (!title || title.trim().length < 3)
      errors.title = "Goal title must be at least 3 characters.";
  }
  if (!isUpdate || deadline !== undefined) {
    if (!deadline) errors.deadline = "Deadline is required.";
    else if (new Date(deadline) < new Date() && !isUpdate)
      errors.deadline = "Deadline must be in the future.";
  }
  if (priority && !VALID_PRIORITIES.includes(priority))
    errors.priority = `Priority must be: ${VALID_PRIORITIES.join(", ")}.`;
  if (goal_type && !VALID_TYPES.includes(goal_type))
    errors.goal_type = "goal_type must be 'short' or 'long'.";
  if (progress !== undefined && (isNaN(progress) || progress < 0 || progress > 100))
    errors.progress = "Progress must be a number between 0 and 100.";

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/goals?type=short|long
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const db = getDb();
  const { type } = req.query;

  let sql    = "SELECT * FROM goals WHERE user_id = ?";
  const args = [req.user.id];

  if (type && VALID_TYPES.includes(type)) {
    sql += " AND goal_type = ?"; args.push(type);
  }
  sql += " ORDER BY created_at DESC";

  const goals = db.prepare(sql).all(...args);

  // Group by type for convenience
  const grouped = { short: [], long: [] };
  goals.forEach(g => grouped[g.goal_type].push(g));

  res.json({ success: true, count: goals.length, data: goals, grouped });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/goals
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const errors = validateGoal(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const {
    title,
    description = "",
    progress   = 0,
    deadline,
    priority   = "medium",
    goal_type  = "short",
  } = req.body;

  const db     = getDb();
  const result = db.prepare(`
    INSERT INTO goals (user_id, title, description, progress, deadline, priority, goal_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, title.trim(), description, Number(progress), deadline, priority, goal_type);

  const goal = db.prepare("SELECT * FROM goals WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json({ success: true, message: "Goal created.", data: goal });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/goals/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const goal = db.prepare("SELECT * FROM goals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!goal) return res.status(404).json({ success: false, error: "Goal not found." });

  res.json({ success: true, data: goal });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/goals/:id – full update
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const goal = db.prepare("SELECT * FROM goals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!goal) return res.status(404).json({ success: false, error: "Goal not found." });

  const errors = validateGoal(req.body, true);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const {
    title       = goal.title,
    description = goal.description,
    progress    = goal.progress,
    deadline    = goal.deadline,
    priority    = goal.priority,
    goal_type   = goal.goal_type,
  } = req.body;

  db.prepare(`
    UPDATE goals
    SET title = ?, description = ?, progress = ?, deadline = ?, priority = ?, goal_type = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(title.trim(), description, Number(progress), deadline, priority, goal_type, req.params.id, req.user.id);

  const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(req.params.id);

  res.json({ success: true, message: "Goal updated.", data: updated });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/goals/:id/progress – update progress only
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/progress", asyncHandler(async (req, res) => {
  const { progress } = req.body;

  if (progress === undefined || isNaN(progress) || progress < 0 || progress > 100) {
    return res.status(400).json({ success: false, error: "Progress must be 0–100." });
  }

  const db   = getDb();
  const goal = db.prepare("SELECT * FROM goals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!goal) return res.status(404).json({ success: false, error: "Goal not found." });

  db.prepare(`
    UPDATE goals SET progress = ?, updated_at = datetime('now') WHERE id = ?
  `).run(Number(progress), req.params.id);

  const updated = db.prepare("SELECT * FROM goals WHERE id = ?").get(req.params.id);

  res.json({
    success: true,
    message: `Progress updated to ${progress}%.${progress >= 100 ? " 🎉 Goal achieved!" : ""}`,
    data: updated,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/goals/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const goal = db.prepare("SELECT * FROM goals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!goal) return res.status(404).json({ success: false, error: "Goal not found." });

  db.prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);

  res.json({ success: true, message: "Goal deleted." });
}));

module.exports = router;
