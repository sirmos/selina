import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState } from "../state/SelinaState";

export default function EmergencyContactScreen() {
  const { emergencyContacts, addEmergencyContact, removeEmergencyContact } = useSelinaState();
  const [name, setName] = useState("");
  const [reachMethod, setReachMethod] = useState("");

  function save() {
    if (!name.trim() || !reachMethod.trim()) return;
    addEmergencyContact({ name: name.trim(), reachMethod: reachMethod.trim() });
    setName("");
    setReachMethod("");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Feather name="user-plus" size={22} color={colors.rose} />
        </View>
        <Text style={styles.title}>Emergency contacts</Text>
        <Text style={styles.subtitle}>
          Add as many people as you'd actually want reached, and however you'd want Selina to
          reach them, a phone number, a WhatsApp, whatever's real for you.
        </Text>

        <FlatList
          data={emergencyContacts}
          keyExtractor={(c) => c.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactMethod}>{item.reachMethod}</Text>
              </View>
              <Pressable onPress={() => removeEmergencyContact(item.id)}>
                <Feather name="x" size={18} color={colors.inkSoft} />
              </Pressable>
            </View>
          )}
        />

        <Text style={styles.label}>Name</Text>
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
          <Text style={styles.saveLabel}>Add contact</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: space.md,
    lineHeight: 19,
  },
  list: { maxHeight: 180, marginBottom: space.md },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  contactName: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.ink },
  contactMethod: { fontFamily: type.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
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
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
    marginTop: space.lg,
  },
  saveLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
});
