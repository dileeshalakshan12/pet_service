// db/connection.js — SQLite connection using Node's built-in node:sqlite.
// A real file-backed database: data survives restarts, is not tied to any
// one browser, and every query below is parameterized (no string-built SQL),
// which is what actually prevents SQL injection.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, 'pawstop.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
