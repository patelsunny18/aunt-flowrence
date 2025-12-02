// src/screens/InsightsScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "Insights">;

type CycleLogRow = {
  id: number;
  date: string; // "YYYY-MM-DD"
  is_period_day: number;
  stress_level: number | null;
  flow_intensity: string | null;
  cramp_severity: number | null;
  symptoms: string | null; // JSON string
  mood_level: string | null; // emoji or null
  energy_level: string | null; // emoji or null
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

const InsightsScreen: React.FC<Props> = () => {
  const db = getDb();
  const [logs, setLogs] = useState<CycleLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rows = await db.getAllAsync<CycleLogRow>(
          `
          SELECT
            id,
            date,
            is_period_day,
            stress_level,
            flow_intensity,
            cramp_severity,
            symptoms,
            mood_level,
            energy_level
          FROM cycle_logs
          ORDER BY date ASC, id ASC;
          `
        );
        setLogs(rows);
      } catch (e) {
        console.error("Error loading logs for insights:", e);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [db]);

  // ---------- helpers ----------
  const parseDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year!, (month ?? 1) - 1, day ?? 1);
  };

  const diffInDays = (a: Date, b: Date): number => {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((b.getTime() - a.getTime()) / msPerDay);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading insights…</Text>
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={styles.title}>Insights</Text>
        <Text style={{ textAlign: "center", color: "#555" }}>
          Once you’ve logged a few days, you’ll see patterns about your cycle,
          symptoms, and mood here.
        </Text>
      </View>
    );
  }

  // ---------- cycle stats ----------
  const periodStarts = logs.filter((l) => l.is_period_day === 1);
  let cycleCount = 0;
  let avgCycleLength: number | null = null;
  let shortestCycle: number | null = null;
  let longestCycle: number | null = null;
  let cycleStdDev: number | null = null;

  if (periodStarts.length >= 2) {
    const sorted = [...periodStarts].sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );
    const lengths: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const len = diffInDays(parseDate(sorted[i - 1].date), parseDate(sorted[i].date));
      if (len > 0) lengths.push(len);
    }

    if (lengths.length > 0) {
      cycleCount = lengths.length;
      const sum = lengths.reduce((s, v) => s + v, 0);
      const mean = sum / lengths.length;
      avgCycleLength = Math.round(mean);
      shortestCycle = Math.min(...lengths);
      longestCycle = Math.max(...lengths);
      const variance =
        lengths.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / lengths.length;
      cycleStdDev = Math.round(Math.sqrt(variance));
    }
  }

  // ---------- stress & cramps ----------
  let stressCounts = { none: 0, low: 0, medium: 0, high: 0 };
  let highStressOnPeriod = 0;
  let highStressOffPeriod = 0;

  let crampCounts = { none: 0, mild: 0, moderate: 0, severe: 0 };

  logs.forEach((l) => {
    const s = l.stress_level ?? 0;
    if (s <= 0) stressCounts.none++;
    else if (s === 1) stressCounts.low++;
    else if (s === 2) {
      stressCounts.medium++;
      if (l.is_period_day === 1) highStressOnPeriod++;
      else highStressOffPeriod++;
    } else if (s >= 3) {
      stressCounts.high++;
      if (l.is_period_day === 1) highStressOnPeriod++;
      else highStressOffPeriod++;
    }

    const c = l.cramp_severity ?? 0;
    if (c <= 0) crampCounts.none++;
    else if (c === 1) crampCounts.mild++;
    else if (c === 2) crampCounts.moderate++;
    else if (c >= 3) crampCounts.severe++;
  });

  const totalDays = logs.length;
  const pct = (n: number) =>
    totalDays === 0 ? "0%" : `${Math.round((n / totalDays) * 100)}%`;

  // ---------- symptoms ----------
  const symptomCounts: Record<string, number> = {};
  const symptomCountsPeriod: Record<string, number> = {};
  const symptomCountsNonPeriod: Record<string, number> = {};

  logs.forEach((l) => {
    if (!l.symptoms) return;
    try {
      const parsed = JSON.parse(l.symptoms);
      if (Array.isArray(parsed)) {
        parsed.forEach((sym) => {
          if (typeof sym !== "string") return;
          symptomCounts[sym] = (symptomCounts[sym] ?? 0) + 1;
          if (l.is_period_day === 1) {
            symptomCountsPeriod[sym] = (symptomCountsPeriod[sym] ?? 0) + 1;
          } else {
            symptomCountsNonPeriod[sym] = (symptomCountsNonPeriod[sym] ?? 0) + 1;
          }
        });
      }
    } catch {
      // ignore
    }
  });

  const sortCounts = (m: Record<string, number>) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]);

  const topSymptoms = sortCounts(symptomCounts).slice(0, 3);
  const topPeriodSymptoms = sortCounts(symptomCountsPeriod).slice(0, 3);
  const topNonPeriodSymptoms = sortCounts(symptomCountsNonPeriod).slice(0, 3);

  // ---------- mood & energy ----------
  const moodCounts: Record<string, number> = {};
  const energyCounts: Record<string, number> = {};

  logs.forEach((l) => {
    if (l.mood_level) {
      moodCounts[l.mood_level] = (moodCounts[l.mood_level] ?? 0) + 1;
    }
    if (l.energy_level) {
      energyCounts[l.energy_level] = (energyCounts[l.energy_level] ?? 0) + 1;
    }
  });

  const moodList = sortCounts(moodCounts);
  const energyList = sortCounts(energyCounts);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>Insights</Text>

      {/* Cycle overview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cycle overview</Text>
        {avgCycleLength == null ? (
          <Text style={styles.text}>
            Not enough period logs yet. Log at least 2 period starts to see cycle
            patterns.
          </Text>
        ) : (
          <>
            <Text style={styles.text}>
              Average cycle length:{" "}
              <Text style={styles.bold}>{avgCycleLength} days</Text>
            </Text>
            <Text style={styles.text}>
              Shortest cycle:{" "}
              <Text style={styles.bold}>{shortestCycle} days</Text>
            </Text>
            <Text style={styles.text}>
              Longest cycle:{" "}
              <Text style={styles.bold}>{longestCycle} days</Text>
            </Text>
            {cycleStdDev != null && (
              <Text style={styles.text}>
                Variability (std dev):{" "}
                <Text style={styles.bold}>{cycleStdDev} days</Text>
              </Text>
            )}
            <Text style={styles.subtext}>
              Based on {cycleCount} cycles from {periodStarts.length} logged period
              starts.
            </Text>
          </>
        )}
      </View>

      {/* Stress & cramps */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stress & cramps</Text>
        <Text style={styles.text}>
          Low/none stress days:{" "}
          <Text style={styles.bold}>
            {stressCounts.none + stressCounts.low} ({pct(
              stressCounts.none + stressCounts.low
            )})
          </Text>
        </Text>
        <Text style={styles.text}>
          Medium stress days:{" "}
          <Text style={styles.bold}>
            {stressCounts.medium} ({pct(stressCounts.medium)})
          </Text>
        </Text>
        <Text style={styles.text}>
          High stress days:{" "}
          <Text style={styles.bold}>
            {stressCounts.high} ({pct(stressCounts.high)})
          </Text>
        </Text>
        <Text style={styles.subtext}>
          High stress days on period:{" "}
          <Text style={styles.bold}>{highStressOnPeriod}</Text>, off period:{" "}
          <Text style={styles.bold}>{highStressOffPeriod}</Text>
        </Text>

        <Text style={[styles.text, { marginTop: 8 }]}>
          Days with any cramps:{" "}
          <Text style={styles.bold}>
            {totalDays - crampCounts.none} ({pct(totalDays - crampCounts.none)})
          </Text>
        </Text>
        <Text style={styles.subtext}>
          Mild: {crampCounts.mild}, Moderate: {crampCounts.moderate}, Severe:{" "}
          {crampCounts.severe}
        </Text>
      </View>

      {/* Symptoms */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Symptoms</Text>
        {topSymptoms.length === 0 ? (
          <Text style={styles.text}>
            You haven&apos;t logged any symptoms yet.
          </Text>
        ) : (
          <>
            <Text style={styles.text}>Most common overall:</Text>
            {topSymptoms.map(([key, count]) => (
              <Text key={key} style={styles.subtext}>
                • {SYMPTOM_LABELS[key] ?? key}:{" "}
                <Text style={styles.bold}>
                  {count} day{count === 1 ? "" : "s"}
                </Text>
              </Text>
            ))}

            {topPeriodSymptoms.length > 0 && (
              <>
                <Text style={[styles.text, { marginTop: 8 }]}>
                  Common on period days:
                </Text>
                {topPeriodSymptoms.map(([key, count]) => (
                  <Text key={key} style={styles.subtext}>
                    • {SYMPTOM_LABELS[key] ?? key}:{" "}
                    <Text style={styles.bold}>
                      {count} day{count === 1 ? "" : "s"}
                    </Text>
                  </Text>
                ))}
              </>
            )}

            {topNonPeriodSymptoms.length > 0 && (
              <>
                <Text style={[styles.text, { marginTop: 8 }]}>
                  Common on non-period days:
                </Text>
                {topNonPeriodSymptoms.map(([key, count]) => (
                  <Text key={key} style={styles.subtext}>
                    • {SYMPTOM_LABELS[key] ?? key}:{" "}
                    <Text style={styles.bold}>
                      {count} day{count === 1 ? "" : "s"}
                    </Text>
                  </Text>
                ))}
              </>
            )}
          </>
        )}
      </View>

      {/* Mood & energy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood & energy</Text>
        {moodList.length === 0 && energyList.length === 0 ? (
          <Text style={styles.text}>
            You haven&apos;t logged mood or energy yet.
          </Text>
        ) : (
          <>
            {moodList.length > 0 && (
              <>
                <Text style={styles.text}>Most common moods:</Text>
                {moodList.map(([emoji, count]) => (
                  <Text key={emoji} style={styles.subtext}>
                    • {emoji} –{" "}
                    <Text style={styles.bold}>
                      {count} day{count === 1 ? "" : "s"}
                    </Text>
                  </Text>
                ))}
              </>
            )}

            {energyList.length > 0 && (
              <>
                <Text style={[styles.text, { marginTop: 8 }]}>
                  Most common energy levels:
                </Text>
                {energyList.map(([emoji, count]) => (
                  <Text key={emoji} style={styles.subtext}>
                    • {emoji} –{" "}
                    <Text style={styles.bold}>
                      {count} day{count === 1 ? "" : "s"}
                    </Text>
                  </Text>
                ))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  text: { fontSize: 14, marginBottom: 2 },
  subtext: { fontSize: 13, color: "#555" },
  bold: { fontWeight: "600" },
});

export default InsightsScreen;
