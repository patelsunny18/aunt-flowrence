// App.tsx
import React, { useEffect } from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import { initDb } from "./src/db/database";

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await initDb();
        console.log("Database initialized");
      } catch (err) {
        console.error("Failed to initialize database", err);
      }
    })();
  }, []);

  return <RootNavigator />;
}
