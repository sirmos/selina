import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AppState, AppStateStatus, View, ActivityIndicator } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  useFonts,
  Lora_600SemiBold,
  Lora_500Medium_Italic,
} from "@expo-google-fonts/lora";
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from "@expo-google-fonts/work-sans";

import HomeScreen from "./src/screens/HomeScreen";
import CompanionScreen from "./src/screens/CompanionScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import SafetyCheckInScreen from "./src/screens/SafetyCheckInScreen";
import HealthScreen from "./src/screens/HealthScreen";
import RightsSupportScreen from "./src/screens/RightsSupportScreen";
import AcademicScreen from "./src/screens/AcademicScreen";
import EmergencyContactScreen from "./src/screens/EmergencyContactScreen";
import LockScreen from "./src/screens/LockScreen";
import { colors } from "./src/theme/tokens";
import { configureRevenueCat } from "./src/services/revenuecat";
import { SelinaProvider } from "./src/state/SelinaState";
import { SafeAreaProvider } from "react-native-safe-area-context";

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(true);
  const [fontsLoaded] = useFonts({
    Lora_600SemiBold,
    Lora_500Medium_Italic,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  useEffect(() => {
    configureRevenueCat();
    setReady(true);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <SafeAreaProvider>
      <SelinaProvider>
        <KeyboardProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen
                name="Companion"
                component={CompanionScreen}
                options={{ headerShown: true, title: "Companion" }}
              />
              <Stack.Screen
                name="SafetyCheckIn"
                component={SafetyCheckInScreen}
                options={{ headerShown: true, title: "Safety check in" }}
              />
              <Stack.Screen
                name="Health"
                component={HealthScreen}
                options={{ headerShown: true, title: "Health" }}
              />
              <Stack.Screen
                name="RightsSupport"
                component={RightsSupportScreen}
                options={{ headerShown: true, title: "Your case" }}
              />
              <Stack.Screen
                name="Academic"
                component={AcademicScreen}
                options={{ headerShown: true, title: "Academic" }}
              />
              <Stack.Screen
                name="EmergencyContact"
                component={EmergencyContactScreen}
                options={{ headerShown: true, title: "Emergency contact" }}
              />
              <Stack.Screen
                name="Paywall"
                component={PaywallScreen}
                options={{ headerShown: true, title: "Selina Plus", presentation: "modal" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </KeyboardProvider>
      </SelinaProvider>
    </SafeAreaProvider>
  );
}
