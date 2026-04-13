// middleware/auth.js
// Verifies JWT token and attaches user to req.user
// Also provides role-based access control

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "personalmanager_preview_secret_change_me";

// ── Verify JWT ────────────────────────────────────────────────────────────────
function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email, role }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Token expired. Please login again." });
    }
    return res.status(401).json({ success: false, error: "Invalid token." });
  }
}

// ── Admin-only guard ──────────────────────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden. Admin access required.",
    });
  }
  next();
}

module.exports = { protect, adminOnly };
