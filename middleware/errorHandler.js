// middleware/errorHandler.js
// Centralised error handling middleware
// Catches all errors thrown with next(err) across routes

function errorHandler(err, req, res, next) {
  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.error("❌ Error:", err.stack || err.message);
  }

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message    || "Internal Server Error";

  // SQLite unique constraint violation (duplicate email, etc.)
  if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
    statusCode = 409;
    message    = "A record with that value already exists.";
  }

  // SQLite foreign key violation
  if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    statusCode = 400;
    message    = "Referenced record does not exist.";
  }

  // JWT errors (caught in middleware but safety net here)
  if (err.name === "JsonWebTokenError")  { statusCode = 401; message = "Invalid token."; }
  if (err.name === "TokenExpiredError")  { statusCode = 401; message = "Token expired."; }

  res.status(statusCode).json({
    success: false,
    error:   message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

// Async wrapper to avoid try-catch in every route handler
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
