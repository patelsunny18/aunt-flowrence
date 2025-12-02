// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type PeriodDayRow = {
  date: string; // "YYYY-MM-DD"
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const db = getDb();

  const [nextPeriod, setNextPeriod] = useState<string | null>(null);
  const [avgCycleLength, setAvgCycleLength] = useState<number | null>(null);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [lastCycleLength, setLastCycleLength] = useState<number | null>(null);
  const [shortestCycle, setShortestCycle] = useState<number | null>(null);
  const [longestCycle, setLongestCycle] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parseDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year!, (month ?? 1) - 1, day ?? 1);
  };

  const diffInDays = (a: Date, b: Date): number => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = b.getTime() - a.getTime();
    return Math.round(diff / msPerDay);
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const loadCycleData = async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await db.getAllAsync<PeriodDayRow>(
        `
        SELECT DISTINCT date
        FROM cycle_logs
        WHERE is_period_day = 1
        ORDER BY date ASC;
        `
      );

      setCycleCount(rows.length);

      // Not enough data to compute cycles
      if (!rows || rows.length < 2) {
        setNextPeriod(null);
        setAvgCycleLength(null);
        setLastCycleLength(null);
        setShortestCycle(null);
        setLongestCycle(null);
        setLoading(false);
        return;
      }

      const dates = rows.map((r) => parseDate(r.date));

      // Compute cycle lengths between consecutive period starts
      const lengths: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const len = diffInDays(dates[i - 1], dates[i]);
        if (len > 0) {
          lengths.push(len);
        }
      }

      if (lengths.length === 0) {
        setNextPeriod(null);
        setAvgCycleLength(null);
        setLastCycleLength(null);
        setShortestCycle(null);
        setLongestCycle(null);
        setLoading(false);
        return;
      }

      const sum = lengths.reduce((s, v) => s + v, 0);
      const avg = sum / lengths.length;
      const lastLen = lengths[lengths.length - 1];
      const shortest = Math.min(...lengths);
      const longest = Math.max(...lengths);

      const lastPeriod = dates[dates.length - 1];
      const predicted = new Date(lastPeriod);
      predicted.setDate(predicted.getDate() + Math.round(avg));

      // Set state for prediction card
      setAvgCycleLength(Math.round(avg));
      setNextPeriod(formatDate(predicted));

      // Set state for insights card
      setLastCycleLength(lastLen);
      setShortestCycle(shortest);
      setLongestCycle(longest);
    } catch (e: any) {
      console.error("Error computing cycle data:", e);
      setError("Could not compute prediction or insights.");
      setNextPeriod(null);
      setAvgCycleLength(null);
      setLastCycleLength(null);
      setShortestCycle(null);
      setLongestCycle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadCycleData();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aunt Flowrence</Text>
      <Text style={styles.subtitle}>
        Private, on-device menstrual cycle tracking.
      </Text>

      {/* Prediction card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next expected period</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : error ? (
          <Text style={[styles.cardText, { color: "red" }]}>{error}</Text>
        ) : nextPeriod && avgCycleLength ? (
          <>
            <Text style={styles.cardText}>{nextPeriod}</Text>
            <Text style={styles.cardSubtext}>
              Based on an average cycle of ~{avgCycleLength} days (
              {cycleCount} period logs).
            </Text>
          </>
        ) : (
          <Text style={styles.cardText}>
            Not enough data yet. Log at least 2 period start days.
          </Text>
        )}
      </View>

      {/* Insights card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cycle insights</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : cycleCount < 2 || !avgCycleLength ? (
          <Text style={styles.cardText}>
            Once you’ve logged at least 2 periods, you’ll see stats about your
            cycle here.
          </Text>
        ) : (
          <>
            <Text style={styles.insightLine}>
              Last cycle length:{" "}
              <Text style={styles.bold}>
                {lastCycleLength} days
              </Text>
            </Text>
            <Text style={styles.insightLine}>
              Average cycle length:{" "}
              <Text style={styles.bold}>
                {avgCycleLength} days
              </Text>
            </Text>
            <Text style={styles.insightLine}>
              Shortest cycle:{" "}
              <Text style={styles.bold}>
                {shortestCycle} days
              </Text>
            </Text>
            <Text style={styles.insightLine}>
              Longest cycle:{" "}
              <Text style={styles.bold}>
                {longestCycle} days
              </Text>
            </Text>
            <Text style={styles.cardSubtext}>
              Based on {cycleCount} logged period starts. Editing or deleting
              logs will update these stats.
            </Text>
          </>
        )}
      </View>

      <View style={styles.buttons}>
        <Button
          title="Log today"
          onPress={() => navigation.navigate("AddLog")}
        />
        <Button
          title="View history"
          onPress={() => navigation.navigate("History")}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  cardText: { fontSize: 16 },
  cardSubtext: { fontSize: 12, color: "#666", marginTop: 8 },
  insightLine: { fontSize: 14, marginBottom: 4 },
  bold: { fontWeight: "600" },
  buttons: { gap: 12, marginTop: 8 },
});

export default HomeScreen;
