import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState } from "../state/SelinaState";
import { reportMissedCheckIn } from "../services/api";

type Status = "idle" | "counting" | "safe" | "missed";

const CHECK_IN_SECONDS = 20; // short window for demo purposes, a real check in
// would be set in minutes or hours by the person, this constant is only here
// so the flow can be demoed quickly on stage or on camera.

export default function SafetyCheckInScreen() {
  const [status, setStatus] = useState<Status>("idle");
  const [secondsLeft, setSecondsLeft] = useState(CHECK_IN_SECONDS);
  const [missedMessage, setMissedMessage] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setCheckInStatus } = useSelinaState();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCheckIn() {
    setStatus("counting");
    setCheckInStatus("scheduled");
    setMissedMessage(null);
    setSecondsLeft(CHECK_IN_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleMissed();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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

  function escalate() {
    Alert.alert(
      "Escalation prepared",
      "In the full build, this notifies your chosen contact and opens the incident timeline. Nothing is sent without your say so."
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Evening walk</Text>
      <Text style={styles.subtitle}>
        Selina checks in once, at the time you choose. If you don't respond, your contact is
        offered the chance to step in, nothing happens automatically behind your back.
      </Text>

      {status === "idle" && (
        <Pressable style={styles.primaryButton} onPress={startCheckIn}>
          <Text style={styles.primaryLabel}>Start check in</Text>
        </Pressable>
      )}

      {status === "counting" && (
        <View style={styles.countdownBox}>
          <Text style={styles.countdownNumber}>{secondsLeft}</Text>
          <Text style={styles.countdownLabel}>seconds until Selina checks on you</Text>
          <Pressable style={styles.primaryButton} onPress={markSafe}>
            <Text style={styles.primaryLabel}>I'm safe</Text>
          </Pressable>
        </View>
      )}

      {status === "safe" && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Good to know</Text>
          <Text style={styles.resultDetail}>Logged as safe. No one else was notified.</Text>
          <Pressable style={styles.secondaryButton} onPress={startCheckIn}>
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
  title: { fontFamily: type.display, fontSize: 26, color: colors.ink },
  subtitle: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: space.xs,
    marginBottom: space.xl,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  primaryLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
  countdownBox: { alignItems: "center", marginTop: space.lg },
  countdownNumber: { fontFamily: type.display, fontSize: 64, color: colors.teal },
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
