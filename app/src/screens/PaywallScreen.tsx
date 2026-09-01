import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { colors, type, space, radius } from "../theme/tokens";
import { getOfferings, purchasePackage, restorePurchases } from "../services/revenuecat";

const perks = [
  "Deeper reasoning across every agent, not just quick replies",
  "Rights and welfare case timelines with full document tracking",
  "Priority safety escalation and check ins",
];

export default function PaywallScreen({ navigation }: { navigation: any }) {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    getOfferings()
      .then(setOffering)
      .catch((err) => console.warn("Could not load offerings", err))
      .finally(() => setLoading(false));
  }, []);

  async function handlePurchase(pkg: PurchasesPackage) {
    try {
      setPurchasing(true);
      await purchasePackage(pkg);
      Alert.alert("Welcome to Selina Plus", "Your deeper agent support is now unlocked.");
      navigation.goBack();
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert("Something went wrong", "The purchase could not be completed.");
      }
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selina Plus</Text>
      <Text style={styles.subtitle}>
        The free version handles the everyday moments. Plus goes deeper when things get
        complicated.
      </Text>

      <View style={styles.perkList}>
        {perks.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <View style={styles.perkDot} />
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>

      {loading && <ActivityIndicator color={colors.teal} style={{ marginTop: space.lg }} />}

      {!loading && offering?.availablePackages?.map((pkg) => (
        <Pressable
          key={pkg.identifier}
          style={styles.packageButton}
          disabled={purchasing}
          onPress={() => handlePurchase(pkg)}
        >
          <Text style={styles.packageTitle}>{pkg.product.title}</Text>
          <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
        </Pressable>
      ))}

      {!loading && !offering && (
        <Text style={styles.emptyState}>
          No offering configured yet. Add a product and offering in your RevenueCat dashboard,
          this screen will pick it up automatically.
        </Text>
      )}

      <Pressable
        style={styles.restoreButton}
        onPress={() => restorePurchases().catch(() => null)}
      >
        <Text style={styles.restoreLabel}>Restore purchases</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: space.lg, paddingTop: space.xxl },
  title: { fontFamily: type.display, fontSize: 28, color: colors.ink },
  subtitle: {
    fontFamily: type.body,
    fontSize: 15,
    color: colors.inkSoft,
    marginTop: space.xs,
    lineHeight: 21,
  },
  perkList: { marginTop: space.lg, marginBottom: space.lg },
  perkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.sm },
  perkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal,
    marginTop: 7,
    marginRight: space.sm,
  },
  perkText: { flex: 1, fontFamily: type.body, fontSize: 14, color: colors.ink, lineHeight: 20 },
  packageButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageTitle: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.ink },
  packagePrice: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.teal },
  emptyState: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: space.md,
    lineHeight: 19,
  },
  restoreButton: { marginTop: space.md, alignSelf: "center" },
  restoreLabel: { fontFamily: type.body, fontSize: 13, color: colors.inkSoft },
});
