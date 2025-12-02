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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const parseDate = (dateStr: string): Date => {
    // Date from "YYYY-MM-DD" without timezone weirdness
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, day);
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

  const loadPrediction = async () => {
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

      // Not enough data → can't compute cycle length
      if (!rows || rows.length < 2) {
        setNextPeriod(null);
        setAvgCycleLength(null);
        setCycleCount(rows.length);
        setLoading(false);
        return;
      }

      // Convert to Date objects
      const dates = rows.map((r) => parseDate(r.date));

      // Compute differences between consecutive period starts
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
        setCycleCount(rows.length);
        setLoading(false);
        return;
      }

      const avg =
        lengths.reduce((sum, v) => sum + v, 0) / lengths.length;

      const lastPeriod = dates[dates.length - 1];
      const predicted = new Date(lastPeriod);
      predicted.setDate(predicted.getDate() + Math.round(avg));

      setAvgCycleLength(Math.round(avg));
      setNextPeriod(formatDate(predicted));
      setCycleCount(rows.length);
    } catch (e: any) {
      console.error("Error computing prediction:", e);
      setError("Could not compute prediction.");
      setNextPeriod(null);
      setAvgCycleLength(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Recalculate prediction whenever Home comes into focus
    const unsubscribe = navigation.addListener("focus", () => {
      loadPrediction();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aunt Flowrence</Text>
      <Text style={styles.subtitle}>
        Private, on-device menstrual cycle tracking.
      </Text>

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
    marginBottom: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardText: { fontSize: 16 },
  cardSubtext: { fontSize: 12, color: "#666", marginTop: 6 },
  buttons: { gap: 12 },
});

export default HomeScreen;
