const { DatabaseSync } = require("node:sqlite");

// Keeps the application's existing better-sqlite3-style database calls while
// using Node's bundled SQLite engine. This removes the native addon install
// that prevented the backend from starting on this computer.
class Statement {
  constructor(statement) {
    this.statement = statement;
  }

  get(...params) {
    return this.statement.get(...params);
  }

  all(...params) {
    return this.statement.all(...params);
  }

  run(...params) {
    const result = this.statement.run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }
}

class Database {
  constructor(filename, options = {}) {
    this.database = new DatabaseSync(filename, { readOnly: Boolean(options.readonly) });
  }

  pragma(value) {
    this.database.exec(`PRAGMA ${value}`);
  }

  exec(sql) {
    this.database.exec(sql);
  }

  prepare(sql) {
    return new Statement(this.database.prepare(sql));
  }

  transaction(callback) {
    return (...args) => {
      this.database.exec("BEGIN");
      try {
        const result = callback(...args);
        this.database.exec("COMMIT");
        return result;
      } catch (error) {
        try { this.database.exec("ROLLBACK"); } catch (_) {}
        throw error;
      }
    };
  }

  close() {
    this.database.close();
  }
}

module.exports = Database;
