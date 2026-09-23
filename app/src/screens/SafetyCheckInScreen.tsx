import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, TextInput, ScrollView, AppState, Platform } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState } from "../state/SelinaState";
import {
  startSafetyCheckIn,
  getSafetyCheckIn,
  markSafetyCheckInSafe,
  triggerSafetyCheckInNow,
} from "../services/api";

type Status = "idle" | "counting" | "safe" | "missed";

const DURATION_OPTIONS = [
  { label: "15 min", seconds: 15 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "2 hours", seconds: 120 * 60 },
];

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SafetyCheckInScreen({ navigation }: { navigation: any }) {
  const [status, setStatus] = useState<Status>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [missedMessage, setMissedMessage] = useState<string | null>(null);
  const [contactsNotified, setContactsNotified] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [destination, setDestination] = useState("");
  const [meetingWho, setMeetingWho] = useState("");
  const [riskNote, setRiskNote] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const {
    setCheckInStatus,
    emergencyContacts,
    activeCheckInId,
    setActiveCheckInId,
  } = useSelinaState();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeCheckInId) {
        syncFromServer(activeCheckInId);
      }
    }, [activeCheckInId])
  );

  // React Navigation's focus only fires when moving between screens
  // inside the app. Minimizing the whole app is a different event, the
  // OS backgrounding it, this is what actually catches that and resyncs
  // against the server's real clock the moment the app comes back.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      if (wasBackground && nextAppState === "active" && activeCheckInId) {
        syncFromServer(activeCheckInId);
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [activeCheckInId]);

  async function syncFromServer(id: string) {
    try {
      const record = await getSafetyCheckIn(id);
      applyServerRecord(record);
    } catch (err) {
      // Server unreachable, keep whatever local state exists rather than
      // wiping the screen, and let the user retry manually.
    }
  }

  function applyServerRecord(record: any) {
    if (timerRef.current) clearInterval(timerRef.current);

    if (record.status === "scheduled") {
      setStatus("counting");
      setCheckInStatus("scheduled");
      setSecondsLeft(record.seconds_left);
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (record.status === "missed") {
      setStatus("missed");
      setCheckInStatus("missed");
      setMissedMessage(record.escalation_message);
      setContactsNotified(record.contacts_notified || []);
    } else if (record.status === "safe") {
      setStatus("safe");
      setCheckInStatus("safe");
    }
  }

  async function startCheckIn(durationSeconds: number) {
    if (emergencyContacts.length === 0) {
      Alert.alert(
        "Add a contact first",
        "Selina needs at least one emergency contact before starting a check in.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Add one now", onPress: () => navigation.navigate("EmergencyContact") },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const record = await startSafetyCheckIn(
        durationSeconds,
        { destination: destination.trim(), meeting_who: meetingWho.trim(), risk_note: riskNote.trim() },
        emergencyContacts.map((c) => ({ name: c.name, reach_method: c.reachMethod }))
      );
      setActiveCheckInId(record.id);
      applyServerRecord(record);
    } catch (err) {
      Alert.alert("Couldn't start check in", "Check that the backend is running and try again.");
    } finally {
      setLoading(false);
    }
  }

  function startCustom() {
    const minutes = parseInt(customMinutes, 10);
    if (!minutes || minutes <= 0) return;
    setShowCustom(false);
    setCustomMinutes("");
    startCheckIn(minutes * 60);
  }

  async function markSafe() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (activeCheckInId) {
      try {
        await markSafetyCheckInSafe(activeCheckInId);
      } catch (err) {
        // Even if the server call fails, still reflect safe locally.
      }
    }
    setStatus("safe");
    setCheckInStatus("safe");
    setActiveCheckInId(null);
  }

  function backToStart() {
    setStatus("idle");
    setDestination("");
    setMeetingWho("");
    setRiskNote("");
  }

  async function escalateNow() {
    if (!activeCheckInId) {
      Alert.alert("No check in active", "Start a check in first.");
      return;
    }
    Alert.alert(
      "Alert your emergency contact now?",
      "This immediately notifies your contact, don't wait for the timer.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, alert them",
          style: "destructive",
          onPress: async () => {
            try {
              const record = await triggerSafetyCheckInNow(activeCheckInId);
              applyServerRecord(record);
            } catch (err) {
              Alert.alert("Couldn't reach the server", "Check that the backend is running.");
            }
          },
        },
      ]
    );
  }

  function escalateFromMissed() {
    Alert.alert(
      contactsNotified.length ? `Contacts notified: ${contactsNotified.join(", ")}` : "Contact notified",
      "In the full build, this is delivered as a real message. Right now it's generated and recorded, actual delivery needs a messaging service wired in on top."
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <Feather name="shield" size={22} color={colors.teal} />
        </View>
        <Text style={styles.title}>Evening walk</Text>
        <Text style={styles.subtitle}>
          Selina checks in once, at the time you choose. If you don't respond, your contacts are
          notified automatically, you don't have to be holding the phone for that to happen.
        </Text>

        <Pressable
          style={styles.contactRow}
          onPress={() => navigation.navigate("EmergencyContact")}
        >
          <Feather name="user" size={14} color={colors.inkSoft} />
          <Text style={styles.contactRowText}>
            {emergencyContacts.length > 0
              ? `${emergencyContacts.length} contact${emergencyContacts.length > 1 ? "s" : ""} set`
              : "No emergency contacts set, tap to add one"}
          </Text>
        </Pressable>

        {status === "idle" && (
          <View>
            <Text style={styles.label}>Where are you headed? (optional)</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. Ade's place"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.label}>Who are you meeting? (optional)</Text>
            <TextInput
              style={styles.input}
              value={meetingWho}
              onChangeText={setMeetingWho}
              placeholder="e.g. a new client"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.label}>Anything that feels off right now? (optional)</Text>
            <TextInput
              style={styles.input}
              value={riskNote}
              onChangeText={setRiskNote}
              placeholder="e.g. taxi driver seemed off"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.pickerLabel}>Check in after</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.label}
                  style={styles.durationButton}
                  onPress={() => startCheckIn(opt.seconds)}
                  disabled={loading}
                >
                  <Text style={styles.durationLabel}>{opt.label}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.durationButton}
                onPress={() => setShowCustom(true)}
                disabled={loading}
              >
                <Text style={styles.durationLabel}>Custom</Text>
              </Pressable>
            </View>

            {showCustom && (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  placeholder="Minutes"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                />
                <Pressable style={styles.customStartButton} onPress={startCustom}>
                  <Text style={styles.customStartLabel}>Start</Text>
                </Pressable>
              </View>
            )}

            {loading && <ActivityIndicator color={colors.teal} style={{ marginTop: space.md }} />}
          </View>
        )}

        {status === "counting" && (
          <View style={styles.countdownBox}>
            <Text style={styles.countdownNumber}>{formatTime(secondsLeft)}</Text>
            <Text style={styles.countdownLabel}>until Selina checks on you</Text>
            <Text style={styles.backgroundNote}>
              This keeps running even if you close the app or your phone is put away.
            </Text>
            <Pressable style={styles.primaryButton} onPress={markSafe}>
              <Text style={styles.primaryLabel}>I'm safe</Text>
            </Pressable>
            <Pressable style={styles.dangerButton} onPress={escalateNow}>
              <Text style={styles.dangerLabel}>I feel unsafe right now</Text>
            </Pressable>
          </View>
        )}

        {status === "safe" && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Good to know</Text>
            <Text style={styles.resultDetail}>Logged as safe. No one else was notified.</Text>
            <Pressable style={styles.secondaryButton} onPress={backToStart}>
              <Text style={styles.secondaryLabel}>Start another check in</Text>
            </Pressable>
          </View>
        )}

        {status === "missed" && (
          <View style={[styles.resultBox, styles.resultBoxAlert]}>
            <Text style={styles.resultTitle}>Check in missed, contacts already notified</Text>
            <Text style={styles.resultDetail}>{missedMessage}</Text>
            <Pressable style={styles.primaryButton} onPress={markSafe}>
              <Text style={styles.primaryLabel}>I'm safe, false alarm</Text>
            </Pressable>
            <Pressable style={styles.escalateButton} onPress={escalateFromMissed}>
              <Text style={styles.escalateLabel}>Who was notified?</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  title: { fontFamily: type.display, fontSize: 26, color: colors.ink },
  subtitle: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: space.xs,
    marginBottom: space.md,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginBottom: space.lg,
  },
  contactRowText: {
    fontFamily: type.body,
    fontSize: 12.5,
    color: colors.inkSoft,
    textDecorationLine: "underline",
  },
  label: {
    fontFamily: type.bodySemiBold,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: space.xs,
    marginTop: space.sm,
  },
  input: {
    fontFamily: type.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  pickerLabel: {
    fontFamily: type.bodySemiBold,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: space.sm,
    marginTop: space.lg,
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  durationButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  durationLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.teal },
  customRow: {
    flexDirection: "row",
    marginTop: space.md,
    gap: space.sm,
  },
  customInput: {
    flex: 1,
    fontFamily: type.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  customStartButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    justifyContent: "center",
  },
  customStartLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.paper },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  primaryLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
  dangerButton: {
    marginTop: space.sm,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.rose,
  },
  dangerLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.rose },
  countdownBox: { alignItems: "center", marginTop: space.lg },
  countdownNumber: { fontFamily: type.display, fontSize: 56, color: colors.teal },
  countdownLabel: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: space.xs,
  },
  backgroundNote: {
    fontFamily: type.body,
    fontSize: 11.5,
    color: colors.inkSoft,
    marginBottom: space.xl,
    textAlign: "center",
    paddingHorizontal: space.lg,
  },
  resultBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  resultBoxAlert: { borderColor: colors.rose },
  resultTitle: { fontFamily: type.display, fontSize: 18, color: colors.ink, marginBottom: 4 },
  resultDetail: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
    marginBottom: space.md,
  },
  secondaryButton: { alignSelf: "flex-start" },
  secondaryLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.teal },
  escalateButton: { marginTop: space.sm, alignSelf: "flex-start" },
  escalateLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.rose },
});
