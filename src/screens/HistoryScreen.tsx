import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

type CycleLog = {
  id: number;
  date: string;
  is_period_day: number;
  mood: number | null;
  energy: number | null;
  stress_level: number | null;
  flow_intensity: string | null;
  symptoms: string | null;
  notes: string | null;
};

const stressText = (level: number | null) => {
  if (level === null || level === undefined) return "None";
  return ["None", "Low", "Medium", "High"][level] ?? "None";
};

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const db = getDb();
  const [logs, setLogs] = useState<CycleLog[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      try {
        const result = await db.getAllAsync<CycleLog>(
          `
          SELECT
            id,
            date,
            is_period_day,
            mood_level      AS mood,
            energy_level    AS energy,
            stress_level,
            flow_intensity,
            symptoms,
            notes
          FROM cycle_logs
          ORDER BY date DESC, id DESC;
          `
        );
        setLogs(result);
      } catch (error: any) {
        console.error("Error fetching logs:", error);
      }
    });

    return unsubscribe;
  }, [navigation, db]);

  const renderItem: ListRenderItem<CycleLog> = ({ item }) => {
    const symptomList = item.symptoms ? JSON.parse(item.symptoms) : [];
    const symptomCount = symptomList.length;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("EditLog", { id: item.id })}
      >
        <View style={styles.logCard}>
          <Text style={styles.logDate}>{item.date}</Text>

          <Text>
            Period day:{" "}
            <Text style={styles.bold}>{item.is_period_day ? "Yes" : "No"}</Text>
          </Text>

          {/* 1-line wellbeing summary */}
          <Text style={{ marginTop: 4, color: "#444" }}>
            Stress: <Text style={styles.bold}>{stressText(item.stress_level)}</Text> ·{" "}
            Flow: <Text style={styles.bold}>{item.flow_intensity ?? "none"}</Text> ·{" "}
            {symptomCount} symptom{symptomCount === 1 ? "" : "s"}
          </Text>

          {item.notes ? <Text style={{ marginTop: 4 }}>Notes: {item.notes}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      {logs.length === 0 ? (
        <Text style={styles.emptyText}>
          No logs yet. Try adding one from Home.
        </Text>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
        />
      )}

      <Button title="Back to home" onPress={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 12 },
  emptyText: { marginBottom: 16, color: "#555" },
  logCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  logDate: { fontWeight: "600", marginBottom: 4 },
  bold: { fontWeight: "600" },
});

export default HistoryScreen;
