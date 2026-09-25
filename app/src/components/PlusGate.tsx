import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { hasSelinaPlus, addEntitlementListener } from "../services/revenuecat";
import { colors, type, space, radius } from "../theme/tokens";

export default function PlusGate({
  navigation,
  children,
}: {
  navigation: any;
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    hasSelinaPlus().then(setUnlocked);
    const unsubscribe = addEntitlementListener(setUnlocked);
    return () => {
      unsubscribe();
    };
  }, []);

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <View style={styles.lockedCard}>
      <Text style={styles.lockedTitle}>Selina Plus required</Text>
      <Text style={styles.lockedNote}>
        Unlock deeper support and full case tracking with Selina Plus.
      </Text>
      <Pressable style={styles.unlockButton} onPress={() => navigation.navigate("Paywall")}>
        <Text style={styles.unlockLabel}>Unlock Selina Plus</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    marginTop: space.md,
  },
  lockedTitle: { fontFamily: type.display, fontSize: 18, color: colors.ink, marginBottom: 4 },
  lockedNote: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: "center",
    marginBottom: space.md,
  },
  unlockButton: {
    backgroundColor: colors.teal,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  unlockLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.paper },
});