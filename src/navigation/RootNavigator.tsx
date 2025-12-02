import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import AddLogScreen from "../screens/AddLogScreen";
import HistoryScreen from "../screens/HistoryScreen";
import EditLogScreen from "../screens/EditLogScreen";
import InsightsScreen from "../screens/InsightsScreen";

export type RootStackParamList = {
  Home: undefined;
  AddLog: undefined;
  History: undefined;
  EditLog: { id: number };
  Insights: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Aunt Flowrence" }}
        />
        <Stack.Screen
          name="AddLog"
          component={AddLogScreen}
          options={{ title: "Log Entry" }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: "History" }}
        />
        <Stack.Screen
          name="EditLog"
          component={EditLogScreen}
          options={{ title: "Edit Log" }}
        />
        <Stack.Screen
          name="Insights"
          component={InsightsScreen}
          options={{ title: "Insights" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
