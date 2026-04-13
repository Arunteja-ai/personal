// db/database.js  —  sql.js (pure-JS SQLite, no native compilation)

const initSqlJs = require("sql.js");
const fs   = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "personalmanager.db");

let db      = null;
let isReady = false;

function persist() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ── Low-level helpers using sql.js exec (returns [{columns,values}]) ─────────
function execGet(sql, params = []) {
  // sql.js exec() does not accept params directly for SELECTs,
  // so we use a prepared statement the sql.js way
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params.map(p => p == null ? null : p));
  const ok  = stmt.step();
  const row = ok ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

function execAll(sql, params = []) {
  const stmt    = db.prepare(sql);
  const rows    = [];
  if (params.length) stmt.bind(params.map(p => p == null ? null : p));
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function execRun(sql, params = []) {
  // Use db.run for write ops — sql.js style
  db.run(sql, params.map(p => p == null ? null : p));

  // Grab last insert rowid via exec (separate call, same connection)
  const res = db.exec("SELECT last_insert_rowid() AS lid");
  const lastInsertRowid = res.length ? Number(res[0].values[0][0]) : 0;
  const changes = db.getRowsModified();

  persist();
  return { changes, lastInsertRowid };
}

// ── Schema ───────────────────────────────────────────────────────────────────
function createSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'user',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    text       TEXT    NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    priority   TEXT    NOT NULL DEFAULT 'medium',
    category   TEXT    NOT NULL DEFAULT 'Personal',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS meals (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    name       TEXT    NOT NULL,
    calories   INTEGER NOT NULL,
    meal_time  TEXT    NOT NULL,
    meal_type  TEXT    NOT NULL DEFAULT 'Snack',
    meal_date  TEXT    NOT NULL DEFAULT (date('now')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    progress    INTEGER NOT NULL DEFAULT 0,
    deadline    TEXT    NOT NULL,
    priority    TEXT    NOT NULL DEFAULT 'medium',
    goal_type   TEXT    NOT NULL DEFAULT 'short',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`);

  persist();
  console.log("✅  Schema ready");
}

async function initDb() {
  if (isReady) return;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log("✅  Loaded existing DB");
  } else {
    db = new SQL.Database();
    console.log("✅  Created new DB");
  }
  createSchema();
  isReady = true;
}

// ── Public wrapper — same API as better-sqlite3 ────────────────────────────
const dbWrapper = {
  get:  (sql, ...args) => execGet(sql, args.flat()),
  all:  (sql, ...args) => execAll(sql, args.flat()),
  run:  (sql, ...args) => execRun(sql, args.flat()),
  prepare(sql) {
    return {
      get:  (...args) => execGet(sql, args.flat()),
      all:  (...args) => execAll(sql, args.flat()),
      run:  (...args) => execRun(sql, args.flat()),
    };
  },
};

function getDb() {
  if (!isReady) throw new Error("DB not ready – call await initDb() first.");
  return dbWrapper;
}

module.exports = { initDb, getDb };
