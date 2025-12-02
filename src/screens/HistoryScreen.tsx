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
  notes: string | null;
};

const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const db = getDb();
  const [logs, setLogs] = useState<CycleLog[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      try {
        const result = await db.getAllAsync<CycleLog>(
          `
          SELECT id, date, is_period_day, mood, energy, notes
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

  const renderItem: ListRenderItem<CycleLog> = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("EditLog", { id: item.id })}
    >
      <View style={styles.logCard}>
        <Text style={styles.logDate}>{item.date}</Text>
        <Text>
          Period day:{" "}
          <Text style={styles.bold}>{item.is_period_day ? "Yes" : "No"}</Text>
        </Text>
        {item.mood != null && <Text>Mood: {item.mood}</Text>}
        {item.energy != null && <Text>Energy: {item.energy}</Text>}
        {item.notes ? <Text>Notes: {item.notes}</Text> : null}
      </View>
    </TouchableOpacity>
  );

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
