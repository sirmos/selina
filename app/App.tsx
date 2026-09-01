import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_500Medium_Italic,
} from "@expo-google-fonts/fraunces";
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from "@expo-google-fonts/work-sans";

import HomeScreen from "./src/screens/HomeScreen";
import CompanionScreen from "./src/screens/CompanionScreen";
import PaywallScreen from "./src/screens/PaywallScreen";
import SafetyCheckInScreen from "./src/screens/SafetyCheckInScreen";
import RightsSupportScreen from "./src/screens/RightsSupportScreen";
import { colors } from "./src/theme/tokens";
import { configureRevenueCat } from "./src/services/revenuecat";
import { SelinaProvider } from "./src/state/SelinaState";

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  useEffect(() => {
    configureRevenueCat();
    setReady(true);
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <SelinaProvider>
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
            name="RightsSupport"
            component={RightsSupportScreen}
            options={{ headerShown: true, title: "Your case" }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ headerShown: true, title: "Selina Plus", presentation: "modal" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SelinaProvider>
  );
}
