import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState } from "../state/SelinaState";
import { reportMissedCheckIn } from "../services/api";

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
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setCheckInStatus, emergencyContact } = useSelinaState();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "counting" && secondsLeft === 0) {
      handleMissed();
    }
  }, [secondsLeft, status]);

  function startCheckIn(durationSeconds: number) {
    setStatus("counting");
    setCheckInStatus("scheduled");
    setMissedMessage(null);
    setSecondsLeft(durationSeconds);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startCustom() {
    const minutes = parseInt(customMinutes, 10);
    if (!minutes || minutes <= 0) return;
    setShowCustom(false);
    setCustomMinutes("");
    startCheckIn(minutes * 60);
  }

  async function handleMissed() {
    setStatus("missed");
    setCheckInStatus("missed");
    setLoadingMessage(true);
    try {
      const message = await reportMissedCheckIn("this evening's check in");
      setMissedMessage(message);
    } catch (err) {
      setMissedMessage(
        "Couldn't reach the server just now, so this is a fallback message. Check that the backend is running."
      );
    } finally {
      setLoadingMessage(false);
    }
  }

  function markSafe() {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("safe");
    setCheckInStatus("safe");
  }

  function backToStart() {
    setStatus("idle");
  }

  function escalate() {
    if (emergencyContact) {
      Alert.alert(
        `Reaching out to ${emergencyContact.name}`,
        `In the full build, Selina contacts them via: ${emergencyContact.reachMethod}. Nothing is sent without your say so.`
      );
    } else {
      Alert.alert(
        "No emergency contact set",
        "Set one up first so Selina knows who to reach.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Set up now", onPress: () => navigation.navigate("EmergencyContact") },
        ]
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="shield" size={22} color={colors.teal} />
      </View>
      <Text style={styles.title}>Evening walk</Text>
      <Text style={styles.subtitle}>
        Selina checks in once, at the time you choose. If you don't respond, your contact is
        offered the chance to step in, nothing happens automatically behind your back.
      </Text>

      <Pressable
        style={styles.contactRow}
        onPress={() => navigation.navigate("EmergencyContact")}
      >
        <Feather name="user" size={14} color={colors.inkSoft} />
        <Text style={styles.contactRowText}>
          {emergencyContact
            ? `Contact: ${emergencyContact.name}`
            : "No emergency contact set, tap to add one"}
        </Text>
      </Pressable>

      {status === "idle" && (
        <View>
          <Text style={styles.pickerLabel}>Check in after</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                style={styles.durationButton}
                onPress={() => startCheckIn(opt.seconds)}
              >
                <Text style={styles.durationLabel}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.durationButton}
              onPress={() => setShowCustom(true)}
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
        </View>
      )}

      {status === "counting" && (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownNumber}>{formatTime(secondsLeft)}</Text>
          <Text style={styles.countdownLabel}>until Selina checks on you</Text>
          <Pressable style={styles.primaryButton} onPress={markSafe}>
            <Text style={styles.primaryLabel}>I'm safe</Text>
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
          <Text style={styles.resultTitle}>Check in missed</Text>

          {loadingMessage ? (
            <ActivityIndicator color={colors.rose} style={{ marginVertical: space.sm }} />
          ) : (
            <Text style={styles.resultDetail}>{missedMessage}</Text>
          )}

          <Pressable style={styles.primaryButton} onPress={markSafe}>
            <Text style={styles.primaryLabel}>I'm safe, false alarm</Text>
          </Pressable>
          <Pressable style={styles.escalateButton} onPress={escalate}>
            <Text style={styles.escalateLabel}>Reach out to my contact</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: space.lg, paddingTop: space.xxl },
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
    marginBottom: space.xl,
  },
  contactRowText: {
    fontFamily: type.body,
    fontSize: 12.5,
    color: colors.inkSoft,
    textDecorationLine: "underline",
  },
  pickerLabel: {
    fontFamily: type.bodySemiBold,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: space.sm,
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
  countdownBox: { alignItems: "center", marginTop: space.lg },
  countdownNumber: { fontFamily: type.display, fontSize: 56, color: colors.teal },
  countdownLabel: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: space.xl,
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
  resultTitle: { fontFamily: type.display, fontSize: 19, color: colors.ink, marginBottom: 4 },
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
