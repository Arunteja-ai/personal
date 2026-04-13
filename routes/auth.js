// routes/auth.js
// POST /api/auth/register  – create account
// POST /api/auth/login     – get JWT token
// GET  /api/auth/me        – get logged-in user profile
// PUT  /api/auth/me        – update profile

const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { getDb }        = require("../db/database");
const { protect }      = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// ── Helper: generate JWT ──────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ── Helper: validate email ────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
router.post("/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // ── Validation ──
  const errors = {};
  if (!name  || name.trim().length < 2)       errors.name     = "Name must be at least 2 characters.";
  if (!email || !isValidEmail(email))          errors.email    = "Valid email is required.";
  if (!password || password.length < 6)        errors.password = "Password must be at least 6 characters.";
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  const db = getDb();

  // Check duplicate email
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, error: "Email already registered." });
  }

  // Hash password (salt rounds = 12)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Insert user
  const stmt   = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
  const result = stmt.run(name.trim(), email.toLowerCase(), hashedPassword);

  const newUser = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
  const token   = signToken(newUser);

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    token,
    user: newUser,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login and receive JWT
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ── Validation ──
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required." });
  }

  const db   = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  // Compare hashed password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, error: "Invalid email or password." });
  }

  const token = signToken(user);

  // Return user without password
  const { password: _pw, ...safeUser } = user;

  res.json({
    success: true,
    message: "Login successful.",
    token,
    user: safeUser,
  });
}));

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", protect, asyncHandler(async (req, res) => {
  const db   = getDb();
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  res.json({ success: true, user });
}));

// ─────────────────────────────────────────────────────────────────────────────
// @route   PUT /api/auth/me
// @desc    Update user name or password
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
router.put("/me", protect, asyncHandler(async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const db   = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found." });
  }

  let updatedName     = user.name;
  let updatedPassword = user.password;

  // Update name
  if (name && name.trim().length >= 2) {
    updatedName = name.trim();
  }

  // Update password
  if (currentPassword && newPassword) {
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Current password is incorrect." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters." });
    }
    updatedPassword = await bcrypt.hash(newPassword, 12);
  }

  db.prepare(`
    UPDATE users SET name = ?, password = ?, updated_at = datetime('now') WHERE id = ?
  `).run(updatedName, updatedPassword, req.user.id);

  const updated = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.user.id);

  res.json({ success: true, message: "Profile updated.", user: updated });
}));

module.exports = router;
