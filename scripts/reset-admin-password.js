const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const Database = require("./sqlite-compat");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..");
const APP_DATA_ROOT = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "LaxminarayanGroup");
const PERSISTENT_DATA_DIR = path.join(APP_DATA_ROOT, "data");
const CONFIGURED_DB = process.env.DB_FILE || "./data/laxminarayan.db";
const LEGACY_DB_FILE = path.resolve(ROOT, CONFIGURED_DB);
const DB_FILE = path.isAbsolute(CONFIGURED_DB) ? CONFIGURED_DB : path.join(PERSISTENT_DATA_DIR, "laxminarayan.db");
const MARKER = path.join(ROOT, ".admin-password-reset-used");
const SCHEMA = path.join(ROOT, "schema.sql");

function fail(message) {
  console.error(`\nERROR: ${message}\n`);
  process.exitCode = 1;
}

function question(prompt, hidden = false) {
  return new Promise((resolve) => {
    if (!hidden) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }

    process.stdout.write(prompt);
    const stdin = process.stdin;
    let answer = "";
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (key) => {
      if (key === "\u0003") {
        cleanup();
        process.exit(130);
      }
      if (key === "\r" || key === "\n") {
        cleanup();
        process.stdout.write("\n");
        resolve(answer);
      } else if (key === "\u007f" || key === "\b") {
        if (answer.length) answer = answer.slice(0, -1);
      } else if (key >= " " && key !== "\u007f") {
        answer += key;
      }
    };
    function cleanup() {
      stdin.removeListener("data", onData);
      if (stdin.setRawMode) stdin.setRawMode(Boolean(wasRaw));
      stdin.pause();
    }
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("\nLAXMINARAYAN GROUP — ONE-TIME ADMIN PASSWORD RESET");
  console.log("This utility changes only the selected admin user's bcrypt password hash.");
  console.log(`Database: ${DB_FILE}`);

  if (!fs.existsSync(SCHEMA)) return fail("schema.sql was not found. Run this utility from the project folder.");

  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!path.isAbsolute(CONFIGURED_DB) && !fs.existsSync(DB_FILE)) {
    const roots = [path.dirname(ROOT), path.dirname(path.dirname(ROOT))];
    const candidates = [];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const candidate = path.join(root, entry.name, "data", "laxminarayan.db");
        if (candidate === DB_FILE || !fs.existsSync(candidate)) continue;
        try { candidates.push({ path: candidate, mtime: fs.statSync(candidate).mtimeMs }); } catch (_) {}
      }
    }
    if (fs.existsSync(LEGACY_DB_FILE)) candidates.push({ path: LEGACY_DB_FILE, mtime: fs.statSync(LEGACY_DB_FILE).mtimeMs });
    candidates.sort((a,b) => b.mtime - a.mtime);
    const sourceDb = candidates[0]?.path;
    if (sourceDb) {
      fs.copyFileSync(sourceDb, DB_FILE);
      for (const sidecar of [sourceDb + "-wal", sourceDb + "-shm"]) {
        if (fs.existsSync(sidecar)) fs.copyFileSync(sidecar, DB_FILE + sidecar.slice(sourceDb.length));
      }
      console.log(`Imported existing database from ${sourceDb}`);
    }
  }
  const db = new Database(DB_FILE);
  try {
    db.exec(fs.readFileSync(SCHEMA, "utf8"));
    const cols = new Set(db.prepare("PRAGMA table_info(users)").all().map(x => x.name));
    if (!cols.has("status")) db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    if (!cols.has("session_version")) db.exec("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0");
    if (!cols.has("updated_at")) { db.exec("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''"); db.exec("UPDATE users SET updated_at=created_at WHERE updated_at='' "); }

    const configuredEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    let email = (process.argv[2] || "").trim().toLowerCase();
    if (!email) {
      email = (await question(`Admin email [${configuredEmail || "enter email"}]: `)).toLowerCase() || configuredEmail;
    }
    if (!email) return fail("Admin email is required.");

    const user = db.prepare("SELECT id,name,email,role,status FROM users WHERE lower(email)=? LIMIT 1").get(email);
    if (!user) return fail(`No user with email ${email} was found in this database. Start the server once so the configured admin account can be seeded, then run this utility again.`);
    if (user.role !== "admin") return fail(`The account ${email} exists but is not an admin account. No changes were made.`);

    let password = (process.argv[3] || "").trim();
    if (!password) {
      password = await question("New admin password (8–128 chars): ", true);
      if (password.length < 8 || password.length > 128) return fail("Password must be 8–128 characters. No changes were made.");
      const confirm = await question("Confirm new admin password: ", true);
      if (password !== confirm) return fail("Passwords do not match. No changes were made.");
    } else {
      if (password.length < 8 || password.length > 128) return fail("Password must be 8–128 characters. No changes were made.");
    }

    const hash = bcrypt.hashSync(password, 12);
    const update = db.prepare("UPDATE users SET password_hash=?, status='active', session_version=session_version+1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND role='admin'").run(hash, user.id);
    if (!update.changes) return fail("The admin password was not changed.");

    // Keep .env in sync so the developer always has the right credentials
    try {
      const envPath = path.join(ROOT, ".env");
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, "utf8");
        if (envContent.includes("ADMIN_PASSWORD=")) {
          envContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD="${password}"`);
        } else {
          envContent += `\nADMIN_PASSWORD="${password}"\n`;
        }
        if (envContent.includes("ADMIN_EMAIL=")) {
          envContent = envContent.replace(/^ADMIN_EMAIL=.*$/m, `ADMIN_EMAIL=${email}`);
        }
        fs.writeFileSync(envPath, envContent, "utf8");
      }
    } catch (_) {}

    try {
      fs.writeFileSync(MARKER, `Last reset on ${new Date().toISOString()} for admin id ${user.id}.\n`, "utf8");
    } catch (_) {}
    console.log("\nSUCCESS: Admin password reset.");
    console.log(`Admin email: ${email}`);
    console.log("Any existing admin sessions were invalidated.");
    console.log("Credentials synchronized in .env and SQLite database.");
    console.log("You can now log in through /login.html.");
  } finally {
    db.close();
  }
}

main().catch((err) => fail(err.message || String(err)));
