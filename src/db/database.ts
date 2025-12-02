import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync("aunt_flowrence.db");

export const initDb = async (): Promise<void> => {
  try {
    await db.execAsync(`
  CREATE TABLE IF NOT EXISTS cycle_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    is_period_day INTEGER NOT NULL,
    energy_level INTEGER,
    mood_level INTEGER,
    next_expected_period TEXT,
    stress_level INTEGER NOT NULL DEFAULT 0,
    flow_intensity TEXT NOT NULL DEFAULT 'none',
    cramp_severity INTEGER NOT NULL DEFAULT 0,
    symptoms TEXT NOT NULL DEFAULT '[]', -- JSON string of symptom keys
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
