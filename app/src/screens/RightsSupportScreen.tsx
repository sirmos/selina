import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState } from "../state/SelinaState";
import { submitCaseEntry } from "../services/api";

export default function RightsSupportScreen() {
  const { caseEntries, addCaseEntry } = useSelinaState();
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submitEntry() {
    const detail = draft.trim();
    if (!detail || saving) return;

    setSaving(true);
    try {
      const { message, flagged } = await submitCaseEntry(detail);
      addCaseEntry({
        title: flagged ? "Flagged for review" : "Note added",
        detail: message,
      });
    } catch (err) {
      // Backend not reachable, still save the entry locally so nothing the
      // person wrote is lost, just without the agent's acknowledgment.
      addCaseEntry({ title: "Note added (offline)", detail });
    } finally {
      setSaving(false);
      setDraft("");
      setAdding(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your case</Text>
      <Text style={styles.subtitle}>
        A private record of what's been agreed and what's actually happened, in case you need
        it later.
      </Text>

      <FlatList
        data={caseEntries}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={{ paddingBottom: space.xl }}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Text style={styles.entryDate}>{item.date}</Text>
            <Text style={styles.entryTitle}>{item.title}</Text>
            <Text style={styles.entryDetail}>{item.detail}</Text>
          </View>
        )}
      />

      {adding ? (
        <View style={styles.addBox}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="What happened?"
            placeholderTextColor={colors.inkSoft}
            multiline
            autoFocus
            editable={!saving}
          />
          <View style={styles.addRow}>
            <Pressable style={styles.cancelButton} onPress={() => setAdding(false)} disabled={saving}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={submitEntry} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.paper} size="small" />
              ) : (
                <Text style={styles.saveLabel}>Save to case</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
          <Text style={styles.addLabel}>Add to case</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, padding: space.lg, paddingTop: space.xl },
  title: { fontFamily: type.display, fontSize: 24, color: colors.ink },
  subtitle: {
    fontFamily: type.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: space.xs,
    marginBottom: space.lg,
    lineHeight: 19,
  },
  entry: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  entryDate: {
    fontFamily: type.bodySemiBold,
    fontSize: 10.5,
    color: colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  entryTitle: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.ink, marginBottom: 2 },
  entryDetail: { fontFamily: type.body, fontSize: 13.5, color: colors.inkSoft, lineHeight: 19 },
  addButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
  },
  addLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
  addBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
  },
  input: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.ink,
    minHeight: 60,
    textAlignVertical: "top",
  },
  addRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: space.sm },
  cancelButton: { paddingVertical: space.sm, paddingHorizontal: space.md },
  cancelLabel: { fontFamily: type.body, fontSize: 14, color: colors.inkSoft },
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    minWidth: 96,
    alignItems: "center",
  },
  saveLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.paper },
});
