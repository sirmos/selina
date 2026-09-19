import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState } from "../state/SelinaState";

export default function EmergencyContactScreen({ navigation }: { navigation: any }) {
  const { emergencyContact, setEmergencyContact } = useSelinaState();
  const [name, setName] = useState(emergencyContact?.name ?? "");
  const [reachMethod, setReachMethod] = useState(emergencyContact?.reachMethod ?? "");

  function save() {
    if (!name.trim() || !reachMethod.trim()) return;
    setEmergencyContact({ name: name.trim(), reachMethod: reachMethod.trim() });
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="user-plus" size={22} color={colors.rose} />
      </View>
      <Text style={styles.title}>Emergency contact</Text>
      <Text style={styles.subtitle}>
        Whoever you trust most, and however you'd actually want Selina to reach them, a phone
        number, a WhatsApp, whatever's real for you.
      </Text>

      <Text style={styles.label}>Their name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Amara"
        placeholderTextColor={colors.inkSoft}
      />

      <Text style={styles.label}>How Selina should reach them</Text>
      <TextInput
        style={styles.input}
        value={reachMethod}
        onChangeText={setReachMethod}
        placeholder="e.g. WhatsApp +234..., or call this number"
        placeholderTextColor={colors.inkSoft}
      />

      <Pressable style={styles.saveButton} onPress={save}>
        <Text style={styles.saveLabel}>Save contact</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: space.lg, paddingTop: space.xxl },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.roseSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  title: { fontFamily: type.display, fontSize: 24, color: colors.ink },
  subtitle: {
    fontFamily: type.body,
    fontSize: 13.5,
    color: colors.inkSoft,
    marginTop: space.xs,
    marginBottom: space.xl,
    lineHeight: 19,
  },
  label: {
    fontFamily: type.bodySemiBold,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: space.xs,
    marginTop: space.md,
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
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
    marginTop: space.xl,
  },
  saveLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
});
