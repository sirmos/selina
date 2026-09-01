import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState, CheckInStatus } from "../state/SelinaState";

type Props = {
  navigation: any;
};

function safetyCardCopy(status: CheckInStatus) {
  switch (status) {
    case "scheduled":
      return { title: "Check in in progress", detail: "Selina is waiting to hear from you." };
    case "safe":
      return { title: "You're marked safe", detail: "Nothing else needed right now." };
    case "missed":
      return { title: "Check in missed", detail: "Open this to decide what happens next." };
    default:
      return { title: "No check in set", detail: "Set one before you head out." };
  }
}

export default function HomeScreen({ navigation }: Props) {
  const { checkInStatus, caseEntries } = useSelinaState();
  const safetyCopy = safetyCardCopy(checkInStatus);
  const latestCase = caseEntries[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Good evening</Text>
      <Text style={styles.subtitle}>Here is what Selina is keeping an eye on today.</Text>

      <Pressable style={styles.card} onPress={() => navigation.navigate("SafetyCheckIn")}>
        <Text style={styles.cardTag}>Safety</Text>
        <Text style={styles.cardTitle}>{safetyCopy.title}</Text>
        <Text style={styles.cardDetail}>{safetyCopy.detail}</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => navigation.navigate("RightsSupport")}>
        <Text style={styles.cardTag}>Rights and support</Text>
        <Text style={styles.cardTitle}>{latestCase?.title ?? "Nothing logged yet"}</Text>
        <Text style={styles.cardDetail}>{latestCase?.detail ?? "Start a case whenever you need to."}</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => navigation.navigate("Companion")}>
        <Text style={styles.cardTag}>Companion</Text>
        <Text style={styles.cardTitle}>Just here to talk</Text>
        <Text style={styles.cardDetail}>A private space, whenever you need it.</Text>
      </Pressable>

      <Pressable style={styles.plusBanner} onPress={() => navigation.navigate("Paywall")}>
        <Text style={styles.plusTitle}>Selina Plus</Text>
        <Text style={styles.plusDetail}>
          Unlock deeper agent support across health, rights and career.
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  greeting: {
    fontFamily: type.display,
    fontSize: 30,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: type.body,
    fontSize: 15,
    color: colors.inkSoft,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardTag: {
    fontFamily: type.bodySemiBold,
    fontSize: 11,
    color: colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: space.xs,
  },
  cardTitle: {
    fontFamily: type.display,
    fontSize: 19,
    color: colors.ink,
    marginBottom: 4,
  },
  cardDetail: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  plusBanner: {
    backgroundColor: colors.tealDeep,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
  },
  plusTitle: {
    fontFamily: type.display,
    fontSize: 18,
    color: colors.paper,
    marginBottom: 4,
  },
  plusDetail: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.paper,
    opacity: 0.85,
    lineHeight: 20,
  },
});
