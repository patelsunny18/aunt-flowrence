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
  ScrollView,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { getDb } from "../db/database";

type Props = NativeStackScreenProps<RootStackParamList, "AddLog">;

type FlowIntensity = "none" | "light" | "medium" | "heavy";

type SymptomKey =
  | "acne"
  | "bloating"
  | "headache"
  | "cravings"
  | "back_pain"
  | "nausea"
  | "tender_breasts";

const SYMPTOM_OPTIONS: { key: SymptomKey; label: string }[] = [
  { key: "acne", label: "Acne" },
  { key: "bloating", label: "Bloating" },
  { key: "headache", label: "Headache" },
  { key: "cravings", label: "Cravings" },
  { key: "back_pain", label: "Back pain" },
  { key: "nausea", label: "Nausea" },
  { key: "tender_breasts", label: "Tender breasts" },
];

// Mood + energy emojis (we store these directly)
const MOOD_EMOJIS = ["😞", "🙁", "😐", "🙂", "😄"];
const ENERGY_EMOJIS = ["🥱", "😐", "⚡", "🔥"];

const AddLogScreen: React.FC<Props> = ({ navigation }) => {
  const db = getDb();

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [notes, setNotes] = useState("");

  // NEW: mood + energy as emoji (stored as TEXT in DB)
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<string | null>(null);

  // Existing extra markers
  const [stressLevel, setStressLevel] = useState<number>(0); // 0–3
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>("none");
  const [crampSeverity, setCrampSeverity] = useState<number>(0); // 0–3
  const [symptoms, setSymptoms] = useState<SymptomKey[]>([]);

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const toggleSymptom = (key: SymptomKey) => {
    setSymptoms((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    console.log("Save button pressed");

    const dateStr = formatDate(date);

    try {
      await db.runAsync(
        `
        INSERT INTO cycle_logs (
          date,
          is_period_day,
          energy_level,
          mood_level,
          stress_level,
          flow_intensity,
          cramp_severity,
          symptoms,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          dateStr,
          isPeriodDay ? 1 : 0,
          energy || null, // store emoji or null
          mood || null,   // store emoji or null
          stressLevel,
          flowIntensity,
          crampSeverity,
          JSON.stringify(symptoms),
          notes || null,
        ]
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* MOOD (emoji chips) */}
        <View style={styles.field}>
          <Text style={styles.label}>Mood</Text>
          <View style={styles.chipRow}>
            {MOOD_EMOJIS.map((emoji) => {
              const selected = mood === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setMood(emoji)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : null,
                  ]}
                >
                  <Text style={styles.chipEmoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ENERGY (emoji chips) */}
        <View style={styles.field}>
          <Text style={styles.label}>Energy</Text>
          <View style={styles.chipRow}>
            {ENERGY_EMOJIS.map((emoji) => {
              const selected = energy === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setEnergy(emoji)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : null,
                  ]}
                >
                  <Text style={styles.chipEmoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* STRESS */}
        <View style={styles.field}>
          <Text style={styles.label}>Stress</Text>
          <View style={styles.chipRow}>
            {[0, 1, 2, 3].map((level) => {
              const selected = stressLevel === level;
              const label =
                level === 0
                  ? "None"
                  : level === 1
                  ? "Low"
                  : level === 2
                  ? "Medium"
                  : "High";
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => setStressLevel(level)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : null,
                  ]}
                >
                  <Text>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* CRAMPS */}
        <View style={styles.field}>
          <Text style={styles.label}>Cramps</Text>
          <View style={styles.chipRow}>
            {[0, 1, 2, 3].map((level) => {
              const selected = crampSeverity === level;
              const label =
                level === 0
                  ? "None"
                  : level === 1
                  ? "Mild"
                  : level === 2
                  ? "Moderate"
                  : "Severe";
              return (
                <TouchableOpacity
                  key={level}
                  onPress={() => setCrampSeverity(level)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : null,
                  ]}
                >
                  <Text>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FLOW INTENSITY */}
        <View style={styles.field}>
          <Text style={styles.label}>Flow intensity</Text>
          <View style={styles.chipRow}>
            {(["none", "light", "medium", "heavy"] as FlowIntensity[]).map(
              (value) => {
                const selected = flowIntensity === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setFlowIntensity(value)}
                    style={[
                      styles.chip,
                      selected ? styles.chipSelected : null,
                    ]}
                  >
                    <Text style={{ textTransform: "capitalize" }}>{value}</Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>
        </View>

        {/* SYMPTOMS */}
        <View style={styles.field}>
          <Text style={styles.label}>Symptoms</Text>
          <View style={styles.chipRow}>
            {SYMPTOM_OPTIONS.map((option) => {
              const selected = symptoms.includes(option.key);
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => toggleSymptom(option.key)}
                  style={[
                    styles.chip,
                    selected ? styles.chipSelected : null,
                  ]}
                >
                  <Text>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* NOTES */}
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    borderColor: "#e11d48",
    backgroundColor: "#ffe4ea",
  },
  chipEmoji: {
    fontSize: 20,
  },
});

export default AddLogScreen;
