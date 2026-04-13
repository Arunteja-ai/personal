// routes/meals.js
// Full CRUD for calorie / meal tracking (scoped per authenticated user)
//
// GET    /api/meals              – list meals (filter by date)
// POST   /api/meals              – log a meal
// GET    /api/meals/summary      – daily calorie summary
// GET    /api/meals/:id          – get single meal
// PUT    /api/meals/:id          – update meal
// DELETE /api/meals/:id          – delete meal

const express  = require("express");
const { getDb }        = require("../db/database");
const { protect }      = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();
router.use(protect);

const VALID_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Drink"];

// ── Validation ────────────────────────────────────────────────────────────────
function validateMeal(body) {
  const errors = {};
  const { name, calories, meal_time, meal_type } = body;

  if (!name || name.trim().length < 2)
    errors.name = "Meal name must be at least 2 characters.";
  if (!calories || isNaN(calories) || Number(calories) <= 0)
    errors.calories = "Calories must be a positive number.";
  if (!meal_time)
    errors.meal_time = "Meal time is required (HH:MM).";
  if (meal_type && !VALID_TYPES.includes(meal_type))
    errors.meal_type = `Type must be one of: ${VALID_TYPES.join(", ")}.`;

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meals?date=2026-03-22
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const db   = getDb();
  const date = req.query.date || new Date().toISOString().split("T")[0];

  const meals = db.prepare(`
    SELECT * FROM meals
    WHERE user_id = ? AND meal_date = ?
    ORDER BY meal_time ASC
  `).all(req.user.id, date);

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);

  res.json({
    success: true,
    date,
    totalCalories,
    calorieGoal: 2200,
    remaining: Math.max(0, 2200 - totalCalories),
    count: meals.length,
    data: meals,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meals/summary  – last 7 days calorie summary
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary", asyncHandler(async (req, res) => {
  const db = getDb();

  const summary = db.prepare(`
    SELECT
      meal_date,
      SUM(calories)  AS total_calories,
      COUNT(*)       AS meal_count
    FROM meals
    WHERE user_id = ?
      AND meal_date >= date('now', '-6 days')
    GROUP BY meal_date
    ORDER BY meal_date ASC
  `).all(req.user.id);

  res.json({ success: true, data: summary });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/meals
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const errors = validateMeal(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const {
    name,
    calories,
    meal_time,
    meal_type = "Snack",
    meal_date = new Date().toISOString().split("T")[0],
  } = req.body;

  const db     = getDb();
  const result = db.prepare(`
    INSERT INTO meals (user_id, name, calories, meal_time, meal_type, meal_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name.trim(), Number(calories), meal_time, meal_type, meal_date);

  const meal = db.prepare("SELECT * FROM meals WHERE id = ?").get(result.lastInsertRowid);

  res.status(201).json({ success: true, message: "Meal logged.", data: meal });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/meals/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const meal = db.prepare("SELECT * FROM meals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!meal) return res.status(404).json({ success: false, error: "Meal not found." });

  res.json({ success: true, data: meal });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/meals/:id
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const meal = db.prepare("SELECT * FROM meals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!meal) return res.status(404).json({ success: false, error: "Meal not found." });

  const errors = validateMeal(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const {
    name      = meal.name,
    calories  = meal.calories,
    meal_time = meal.meal_time,
    meal_type = meal.meal_type,
    meal_date = meal.meal_date,
  } = req.body;

  db.prepare(`
    UPDATE meals SET name = ?, calories = ?, meal_time = ?, meal_type = ?, meal_date = ?
    WHERE id = ? AND user_id = ?
  `).run(name.trim(), Number(calories), meal_time, meal_type, meal_date, req.params.id, req.user.id);

  const updated = db.prepare("SELECT * FROM meals WHERE id = ?").get(req.params.id);

  res.json({ success: true, message: "Meal updated.", data: updated });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/meals/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const db   = getDb();
  const meal = db.prepare("SELECT * FROM meals WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);

  if (!meal) return res.status(404).json({ success: false, error: "Meal not found." });

  db.prepare("DELETE FROM meals WHERE id = ?").run(req.params.id);

  res.json({ success: true, message: "Meal deleted." });
}));

module.exports = router;
