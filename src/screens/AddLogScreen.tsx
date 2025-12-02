import React, { useState } from "react";
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
  ScrollView
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "AddLog">;

const AddLogScreen: React.FC<Props> = ({ navigation }) => {
  const db = getDb();

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

  const handleSave = async () => {
    console.log("Save button pressed");

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
        INSERT INTO cycle_logs (date, is_period_day, mood, energy, notes)
        VALUES (?, ?, ?, ?, ?)
        `,
        [dateStr, isPeriodDay ? 1 : 0, moodNum, energyNum, notes || null]
      );

      console.log("Log inserted successfully");
      Alert.alert("Saved", "Your log was saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error inserting log:", error);
      Alert.alert("Error", "Could not save your log.");
    }
  };

  return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Log Entry</Text>

      {/* DATE PICKER */}
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

      {/* BUTTON ALWAYS ACCESSIBLE */}
      <View style={{ marginBottom: 40 }}>
        <Button title="Save log" onPress={handleSave} />
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
);

};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
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

export default AddLogScreen;
