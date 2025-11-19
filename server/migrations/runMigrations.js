import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../models/db.js";

// Fix __dirname for Windows + ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  try {
    // Correct relative path to SQL file
    const filePath = path.join(__dirname, "001_create_tables.sql");

    console.log("Using migration file:", filePath);  // helpful log

    const sql = fs.readFileSync(filePath, "utf8");

    await pool.query(sql);

    console.log("✅ Migrations completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
