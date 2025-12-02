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
  mood: string | null;    // emoji like "😐"
  energy: string | null;  // emoji like "⚡"
  stress_level: number | null;
  flow_intensity: string | null;
  symptoms: string | null; // JSON string
  notes: string | null;
};

const stressText = (level: number | null) => {
  if (level === null || level === undefined) return "None";
  return ["None", "Low", "Medium", "High"][level] ?? "None";
};

const SYMPTOM_LABELS: Record<string, string> = {
  acne: "Acne",
  bloating: "Bloating",
  headache: "Headache",
  cravings: "Cravings",
  back_pain: "Back pain",
  nausea: "Nausea",
  tender_breasts: "Tender breasts",
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

  // ----- INSIGHTS DERIVED FROM LOGS -----
  const totalLogs = logs.length;
  const periodDays = logs.filter((l) => l.is_period_day === 1).length;
  const highStressDays = logs.filter(
    (l) => (l.stress_level ?? 0) >= 2 // Medium or High
  ).length;
  const heavyFlowDays = logs.filter((l) => l.flow_intensity === "heavy").length;

  // Symptom frequency
  const symptomCounts: Record<string, number> = {};
  logs.forEach((l) => {
    if (!l.symptoms) return;
    try {
      const parsed = JSON.parse(l.symptoms);
      if (Array.isArray(parsed)) {
        parsed.forEach((sym) => {
          if (typeof sym === "string") {
            symptomCounts[sym] = (symptomCounts[sym] ?? 0) + 1;
          }
        });
      }
    } catch {
      // ignore bad JSON
    }
  });

  let topSymptomKey: string | null = null;
  let topSymptomCount = 0;
  for (const [key, count] of Object.entries(symptomCounts)) {
    if (count > topSymptomCount) {
      topSymptomKey = key;
      topSymptomCount = count;
    }
  }
  const topSymptomLabel =
    topSymptomKey != null
      ? SYMPTOM_LABELS[topSymptomKey] ?? topSymptomKey
      : null;

  const renderItem: ListRenderItem<CycleLog> = ({ item }) => {
    const symptomList = item.symptoms ? JSON.parse(item.symptoms) : [];
    const symptomCount = Array.isArray(symptomList) ? symptomList.length : 0;

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

          {/* Mood/Energy emojis if present */}
          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {item.mood && (
              <Text style={{ marginRight: 12 }}>
                Mood: <Text style={styles.bold}>{item.mood}</Text>
              </Text>
            )}
            {item.energy && (
              <Text>
                Energy: <Text style={styles.bold}>{item.energy}</Text>
              </Text>
            )}
          </View>

          {/* 1-line wellbeing summary */}
          <Text style={{ marginTop: 4, color: "#444" }}>
            Stress:{" "}
            <Text style={styles.bold}>{stressText(item.stress_level)}</Text> ·{" "}
            Flow:{" "}
            <Text style={styles.bold}>{item.flow_intensity ?? "none"}</Text> ·{" "}
            {symptomCount} symptom{symptomCount === 1 ? "" : "s"}
          </Text>

          {item.notes ? (
            <Text style={{ marginTop: 4 }}>Notes: {item.notes}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>

      {/* INSIGHTS CARD */}
      <View style={styles.insightsCard}>
        {totalLogs === 0 ? (
          <Text style={styles.insightsText}>
            Once you log a few days, you&apos;ll see summary insights here.
          </Text>
        ) : (
          <>
            <Text style={styles.insightsHeading}>Overview</Text>
            <Text style={styles.insightsText}>
              Total logs: <Text style={styles.bold}>{totalLogs}</Text>
            </Text>
            <Text style={styles.insightsText}>
              Period days logged: <Text style={styles.bold}>{periodDays}</Text>
            </Text>
            <Text style={styles.insightsText}>
              High-stress days (medium or high):{" "}
              <Text style={styles.bold}>{highStressDays}</Text>
            </Text>
            <Text style={styles.insightsText}>
              Heavy flow days:{" "}
              <Text style={styles.bold}>{heavyFlowDays}</Text>
            </Text>
            {topSymptomLabel && (
              <Text style={styles.insightsText}>
                Most common symptom:{" "}
                <Text style={styles.bold}>
                  {topSymptomLabel} ({topSymptomCount} day
                  {topSymptomCount === 1 ? "" : "s"})
                </Text>
              </Text>
            )}
          </>
        )}
      </View>

      {/* LOG LIST */}
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
  insightsCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  insightsHeading: { fontWeight: "600", marginBottom: 4 },
  insightsText: { fontSize: 14, marginBottom: 2 },
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
