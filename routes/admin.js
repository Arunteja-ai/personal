// routes/admin.js
// Admin-only routes (role-based access control)
//
// GET  /api/admin/users          – list all users
// GET  /api/admin/users/:id      – get user detail + their data
// DELETE /api/admin/users/:id    – delete a user

const express  = require("express");
const { getDb }        = require("../db/database");
const { protect, adminOnly } = require("../middleware/auth");
const { asyncHandler }       = require("../middleware/errorHandler");

const router = express.Router();

// All admin routes require JWT + admin role
router.use(protect, adminOnly);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users", asyncHandler(async (req, res) => {
  const db = getDb();

  const users = db.prepare(`
    SELECT
      u.id, u.name, u.email, u.role, u.created_at,
      (SELECT COUNT(*) FROM todos  WHERE user_id = u.id) AS todo_count,
      (SELECT COUNT(*) FROM meals  WHERE user_id = u.id) AS meal_count,
      (SELECT COUNT(*) FROM goals  WHERE user_id = u.id) AS goal_count
    FROM users u
    ORDER BY u.created_at DESC
  `).all();

  res.json({ success: true, count: users.length, data: users });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/users/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.params.id);

  if (!user) return res.status(404).json({ success: false, error: "User not found." });

  const todos = db.prepare("SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC").all(req.params.id);
  const meals = db.prepare("SELECT * FROM meals WHERE user_id = ? ORDER BY meal_date DESC").all(req.params.id);
  const goals = db.prepare("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC").all(req.params.id);

  res.json({
    success: true,
    data: {
      user,
      todos: todos.map(t => ({ ...t, done: Boolean(t.done) })),
      meals,
      goals,
    },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/users/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/users/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);

  if (!user) return res.status(404).json({ success: false, error: "User not found." });

  // Prevent admin from deleting themselves
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, error: "Cannot delete your own account via admin panel." });
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  // CASCADE deletes todos, meals, goals automatically (FK constraint)

  res.json({ success: true, message: "User and all their data deleted." });
}));

module.exports = router;
