import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync("aunt_flowrence.db");

export const initDb = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cycle_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        is_period_day INTEGER NOT NULL,
        mood INTEGER,
        energy INTEGER,
        notes TEXT
      );
    `);
    console.log("cycle_logs table ready");
  } catch (error) {
    console.error("Error creating cycle_logs table:", error);
    throw error;
  }
};

export const getDb = () => db;
