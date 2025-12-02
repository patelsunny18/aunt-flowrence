// src/screens/AddLogScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "AddLog">;

const AddLogScreen: React.FC<Props> = ({ navigation }) => {
  const db = getDb();

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    console.log("Save button pressed");

    const moodNum = mood ? Number(mood) : null;
    const energyNum = energy ? Number(energy) : null;

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
        INSERT INTO cycle_logs (date, is_period_day, mood, energy, notes)
        VALUES (?, ?, ?, ?, ?)
        `,
        [today, isPeriodDay ? 1 : 0, moodNum, energyNum, notes || null]
      );

      console.log("Log inserted successfully");

      Alert.alert("Saved", "Your log for today was saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error inserting log:", error);
      Alert.alert("Error", "Could not save your log.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Today</Text>
      <Text style={styles.dateText}>Date: {today}</Text>

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
          placeholder="Anything you want to remember about today"
        />
      </View>

      <Button title="Save log" onPress={handleSave} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  dateText: { marginBottom: 16, color: "#555" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
});

export default AddLogScreen;
