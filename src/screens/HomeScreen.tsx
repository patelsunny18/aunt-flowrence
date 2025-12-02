import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aunt Flowrence</Text>
      <Text style={styles.subtitle}>
        Private, on-device menstrual cycle tracking.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next expected period</Text>
        <Text style={styles.cardText}>Not enough data yet</Text>
      </View>

      <View style={styles.buttons}>
        <Button title="Log today" onPress={() => navigation.navigate("AddLog")} />
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
  subtitle: { fontSize: 14, color: "#555", textAlign: "center", marginBottom: 24 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardText: { fontSize: 16 },
  buttons: { gap: 12 },
});

export default HomeScreen;
