// routes/todos.js
// Full CRUD for to-do items (scoped per authenticated user)
//
// GET    /api/todos          – list all todos (with filter/search)
// POST   /api/todos          – create todo
// GET    /api/todos/:id      – get single todo
// PUT    /api/todos/:id      – update todo
// PATCH  /api/todos/:id/done – toggle done status
// DELETE /api/todos/:id      – delete todo
// DELETE /api/todos          – delete all completed todos (bulk)

const express  = require("express");
const { getDb }        = require("../db/database");
const { protect }      = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// All todo routes require authentication
router.use(protect);

const VALID_PRIORITIES = ["high", "medium", "low"];
const VALID_CATEGORIES = ["Study", "College", "Health", "Personal", "Work", "Other"];

// ── Validation helper ─────────────────────────────────────────────────────────
function validateTodo(body) {
  const errors = {};
  const { text, priority, category } = body;

  if (!text || text.trim().length < 3)
    errors.text = "Task text must be at least 3 characters.";
  if (priority && !VALID_PRIORITIES.includes(priority))
    errors.priority = `Priority must be one of: ${VALID_PRIORITIES.join(", ")}.`;
  if (category && !VALID_CATEGORIES.includes(category))
    errors.category = `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`;

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/todos
// Query params: ?priority=high&category=Study&done=false&search=gym
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const db = getDb();
  const { priority, category, done, search } = req.query;

  let sql    = "SELECT * FROM todos WHERE user_id = ?";
  const args = [req.user.id];

  if (priority && VALID_PRIORITIES.includes(priority)) {
    sql += " AND priority = ?"; args.push(priority);
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    sql += " AND category = ?"; args.push(category);
  }
  if (done === "true" || done === "false") {
    sql += " AND done = ?"; args.push(done === "true" ? 1 : 0);
  }
  if (search) {
    sql += " AND text LIKE ?"; args.push(`%${search}%`);
  }

  sql += " ORDER BY created_at DESC";

  const todos = db.prepare(sql).all(...args).map(t => ({ ...t, done: Boolean(t.done) }));

  res.json({ success: true, count: todos.length, data: todos });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/todos  – create
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const errors = validateTodo(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const { text, priority = "medium", category = "Personal" } = req.body;
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO todos (user_id, text, priority, category)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, text.trim(), priority, category);

  const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json({ success: true, message: "Todo created.", data: { ...todo, done: Boolean(todo.done) } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/todos/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const todo = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!todo) return res.status(404).json({ success: false, error: "Todo not found." });

  res.json({ success: true, data: { ...todo, done: Boolean(todo.done) } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/todos/:id  – full update
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const todo = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!todo) return res.status(404).json({ success: false, error: "Todo not found." });

  const errors = validateTodo(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const { text, priority = todo.priority, category = todo.category, done = todo.done } = req.body;

  db.prepare(`
    UPDATE todos SET text = ?, priority = ?, category = ?, done = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(text.trim(), priority, category, done ? 1 : 0, req.params.id, req.user.id);

  const updated = db.prepare("SELECT * FROM todos WHERE id = ?").get(req.params.id);

  res.json({ success: true, message: "Todo updated.", data: { ...updated, done: Boolean(updated.done) } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/todos/:id/done  – toggle done
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/done", asyncHandler(async (req, res) => {
  const db   = getDb();
  const todo = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!todo) return res.status(404).json({ success: false, error: "Todo not found." });

  const newDone = todo.done ? 0 : 1;
  db.prepare("UPDATE todos SET done = ?, updated_at = datetime('now') WHERE id = ?").run(newDone, todo.id);

  res.json({
    success: true,
    message: `Todo marked as ${newDone ? "done" : "pending"}.`,
    data: { ...todo, done: Boolean(newDone) },
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/todos/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const todo = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!todo) return res.status(404).json({ success: false, error: "Todo not found." });

  db.prepare("DELETE FROM todos WHERE id = ?").run(req.params.id);

  res.json({ success: true, message: "Todo deleted." });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/todos  – bulk delete all completed
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/", asyncHandler(async (req, res) => {
  const db     = getDb();
  const result = db.prepare("DELETE FROM todos WHERE user_id = ? AND done = 1").run(req.user.id);

  res.json({ success: true, message: `${result.changes} completed todo(s) deleted.` });
}));

module.exports = router;
