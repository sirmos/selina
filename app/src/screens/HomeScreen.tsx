import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
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

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type CardProps = {
  tag: string;
  title: string;
  detail: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  accent: string;
  accentSoft: string;
  onPress: () => void;
};

function AgentCard({ tag, title, detail, icon, accent, accentSoft, onPress }: CardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
        <Feather name={icon} size={20} color={accent} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.cardTag, { color: accent }]}>{tag}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDetail}>{detail}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.inkSoft} style={styles.chevron} />
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const { checkInStatus, caseEntries } = useSelinaState();
  const safetyCopy = safetyCardCopy(checkInStatus);
  const latestCase = caseEntries[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>{greetingForNow()}</Text>
          <Text style={styles.subtitle}>Here is what Selina is keeping an eye on today.</Text>
        </View>
      </View>

      <AgentCard
        tag="Safety"
        title={safetyCopy.title}
        detail={safetyCopy.detail}
        icon="shield"
        accent={colors.teal}
        accentSoft={colors.tealSoft}
        onPress={() => navigation.navigate("SafetyCheckIn")}
      />

      <AgentCard
        tag="Rights and support"
        title={latestCase?.title ?? "Nothing logged yet"}
        detail={latestCase?.detail ?? "Start a case whenever you need to."}
        icon="file-text"
        accent={colors.rose}
        accentSoft={colors.roseSoft}
        onPress={() => navigation.navigate("RightsSupport")}
      />

      <AgentCard
        tag="Companion"
        title="Just here to talk"
        detail="A private space, whenever you need it."
        icon="message-circle"
        accent={colors.amber}
        accentSoft={colors.amberSoft}
        onPress={() => navigation.navigate("Companion")}
      />

      <Pressable style={styles.plusBanner} onPress={() => navigation.navigate("Paywall")}>
        <View style={styles.plusIconCircle}>
          <Feather name="star" size={18} color={colors.paper} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.plusTitle}>Selina Plus</Text>
          <Text style={styles.plusDetail}>
            Unlock deeper agent support across health, rights and career.
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.paper} style={styles.chevron} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  greetingRow: {
    marginBottom: space.lg,
  },
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
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.md,
  },
  cardText: { flex: 1 },
  cardTag: {
    fontFamily: type.bodySemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: space.xs,
  },
  cardTitle: {
    fontFamily: type.display,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 4,
  },
  cardDetail: {
    fontFamily: type.body,
    fontSize: 13.5,
    color: colors.inkSoft,
    lineHeight: 19,
  },
  chevron: { marginLeft: space.xs, marginTop: space.sm },
  plusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.tealDeep,
    borderRadius: radius.lg,
    padding: space.md,
    marginTop: space.sm,
  },
  plusIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.md,
  },
  plusTitle: {
    fontFamily: type.display,
    fontSize: 18,
    color: colors.paper,
    marginBottom: 4,
  },
  plusDetail: {
    fontFamily: type.body,
    fontSize: 13.5,
    color: colors.paper,
    opacity: 0.85,
    lineHeight: 19,
  },
});
