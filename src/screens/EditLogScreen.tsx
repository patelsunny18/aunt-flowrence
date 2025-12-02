// src/screens/EditLogScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "EditLog">;

type CycleLogRow = {
  id: number;
  date: string;
  is_period_day: number;
  mood: number | null;
  energy: number | null;
  notes: string | null;
};

const EditLogScreen: React.FC<Props> = ({ navigation, route }) => {
  const db = getDb();
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [notes, setNotes] = useState("");

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year!, (month ?? 1) - 1, day ?? 1);
  };

  // Load existing log
  useEffect(() => {
    const loadLog = async () => {
      try {
        const row = await db.getFirstAsync<CycleLogRow>(
          `
          SELECT id, date, is_period_day, mood, energy, notes
          FROM cycle_logs
          WHERE id = ?;
          `,
          [id]
        );

        if (!row) {
          Alert.alert("Not found", "This log no longer exists.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
          return;
        }

        setDate(parseDate(row.date));
        setIsPeriodDay(row.is_period_day === 1);
        setMood(row.mood != null ? String(row.mood) : "");
        setEnergy(row.energy != null ? String(row.energy) : "");
        setNotes(row.notes ?? "");
      } catch (error) {
        console.error("Error loading log:", error);
        Alert.alert("Error", "Could not load this log.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadLog();
  }, [db, id, navigation]);

  const handleSave = async () => {
    const moodNum = mood ? Number(mood) : null;
    const energyNum = energy ? Number(energy) : null;
    const dateStr = formatDate(date);

    if (mood && (moodNum! < 1 || moodNum! > 5)) {
      Alert.alert("Invalid mood", "Mood should be between 1 and 5.");
      return;
    }

    if (energy && (energyNum! < 1 || energyNum! > 5)) {
      Alert.alert("Invalid energy", "Energy should be between 1 and 5.");
      return;
    }

    try {
      await db.runAsync(
        `
        UPDATE cycle_logs
        SET date = ?, is_period_day = ?, mood = ?, energy = ?, notes = ?
        WHERE id = ?;
        `,
        [dateStr, isPeriodDay ? 1 : 0, moodNum, energyNum, notes || null, id]
      );

      Alert.alert("Updated", "Your changes have been saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error updating log:", error);
      Alert.alert("Error", "Could not update this log.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete log",
      "Are you sure you want to delete this log? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync(
                `DELETE FROM cycle_logs WHERE id = ?;`,
                [id]
              );
              Alert.alert("Deleted", "The log was deleted.", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error("Error deleting log:", error);
              Alert.alert("Error", "Could not delete this log.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text>Loading log...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Log</Text>

        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{formatDate(date)}</Text>
          </View>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(event, selected) => {
              setShowPicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Period day?</Text>
          <Switch value={isPeriodDay} onValueChange={setIsPeriodDay} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Mood (1–5)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={mood}
            onChangeText={setMood}
            placeholder="e.g., 3"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Energy (1–5)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={energy}
            onChangeText={setEnergy}
            placeholder="e.g., 4"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything you want to remember"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Button title="Save changes" onPress={handleSave} />
        </View>

        <View style={{ marginBottom: 40 }}>
          <Button title="Delete log" color="#b00020" onPress={handleDelete} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16 },
  dateBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  dateLabel: { fontSize: 14, color: "#555" },
  dateValue: { fontSize: 16, fontWeight: "600" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: { fontSize: 16, marginBottom: 4 },
  field: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
  },
  notesInput: { height: 80, textAlignVertical: "top" },
});

export default EditLogScreen;
