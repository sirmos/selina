import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, type, space, radius } from "../theme/tokens";

const PIN_KEY = "selina_lock_pin";

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [mode, setMode] = useState<"loading" | "setup" | "confirm" | "enter">("loading");
  const [pinInput, setPinInput] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [checkingBiometric, setCheckingBiometric] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(PIN_KEY);
      if (!stored) {
        setMode("setup");
      } else {
        setMode("enter");
        tryBiometric();
      }
    })();
  }, []);

  async function tryBiometric() {
    setCheckingBiometric(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Selina",
          fallbackLabel: "Use PIN instead",
        });
        if (result.success) {
          onUnlock();
          return;
        }
      }
    } catch (err) {
      // Falls through to PIN entry
    } finally {
      setCheckingBiometric(false);
    }
  }

  async function handleSetupSubmit() {
    if (pinInput.length < 4) {
      setError("Use at least 4 digits.");
      return;
    }
    setFirstPin(pinInput);
    setPinInput("");
    setError("");
    setMode("confirm");
  }

  async function handleConfirmSubmit() {
    if (pinInput !== firstPin) {
      setError("PINs didn't match, try again.");
      setPinInput("");
      setFirstPin("");
      setMode("setup");
      return;
    }
    await AsyncStorage.setItem(PIN_KEY, pinInput);
    onUnlock();
  }

  async function handleEnterSubmit() {
    const stored = await AsyncStorage.getItem(PIN_KEY);
    if (pinInput === stored) {
      onUnlock();
    } else {
      setError("Wrong PIN, try again.");
      setPinInput("");
    }
  }

  if (mode === "loading" || checkingBiometric) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  const title = mode === "setup" ? "Set a PIN" : mode === "confirm" ? "Confirm your PIN" : "Selina is locked";
  const subtitle =
    mode === "setup"
      ? "This keeps Selina private if someone else picks up your phone."
      : mode === "confirm"
      ? "Enter it once more to confirm."
      : "Enter your PIN to continue.";

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="lock" size={24} color={colors.teal} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TextInput
        style={styles.pinInput}
        value={pinInput}
        onChangeText={(t) => {
          setPinInput(t.replace(/[^0-9]/g, ""));
          setError("");
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        placeholder="••••"
        placeholderTextColor={colors.inkSoft}
        autoFocus
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={styles.submitButton}
        onPress={mode === "setup" ? handleSetupSubmit : mode === "confirm" ? handleConfirmSubmit : handleEnterSubmit}
      >
        <Text style={styles.submitLabel}>{mode === "enter" ? "Unlock" : "Continue"}</Text>
      </Pressable>

      {mode === "enter" && (
        <Pressable onPress={tryBiometric} style={{ marginTop: space.md }}>
          <Text style={styles.biometricRetry}>Try fingerprint or face unlock again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: space.lg },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  title: { fontFamily: type.display, fontSize: 22, color: colors.ink, marginBottom: space.xs },
  subtitle: { fontFamily: type.body, fontSize: 14, color: colors.inkSoft, textAlign: "center", marginBottom: space.lg, paddingHorizontal: space.lg },
  pinInput: {
    fontFamily: type.display,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingVertical: space.md,
    width: 180,
    marginBottom: space.sm,
  },
  error: { fontFamily: type.body, fontSize: 13, color: colors.rose, marginBottom: space.sm },
  submitButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginTop: space.sm,
  },
  submitLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
  biometricRetry: { fontFamily: type.body, fontSize: 13, color: colors.inkSoft, textDecorationLine: "underline" },
});
