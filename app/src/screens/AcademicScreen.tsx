import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAvoidingView, KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type, space, radius } from "../theme/tokens";
import { submitDeadline, sendAcademicMessage } from "../services/api";
import { useSelinaState } from "../state/SelinaState";

type Deadline = {
  id: string;
  title: string;
  daysAway: number;
  urgent: boolean;
  message: string;
};

type ChatMessage = {
  id: string;
  from: "user" | "selina";
  text: string;
};

export default function AcademicScreen() {
  const insets = useSafeAreaInsets();
  const { academicMessages, addAcademicMessage, deadlines, addDeadline: addStoredDeadline } = useSelinaState();
  const [tab, setTab] = useState<"chat" | "deadlines">("chat");

  const [title, setTitle] = useState("");
  const [daysAway, setDaysAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function addDeadline() {
    const days = parseInt(daysAway, 10);
    if (!title.trim() || !days || days < 0) return;

    setSaving(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      const isoDate = dueDate.toISOString().split("T")[0];

      const result = await submitDeadline(title.trim(), isoDate);
      addStoredDeadline({
        title: title.trim(),
        dueDateISO: isoDate,
        message: result.message || "",
      });
      setTitle("");
      setDaysAway("");
    } catch (err) {
      // Keep it simple, entry just doesn't get added if the backend's
      // unreachable, the form stays filled so nothing is lost.
    } finally {
      setSaving(false);
    }
  }

  async function sendChat() {
    const text = draft.trim();
    if (!text || sending) return;

    const history = academicMessages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", text: m.text }));
    addAcademicMessage({ from: "user", text });
    setDraft("");
    setSending(true);

    try {
      const reply = await sendAcademicMessage(text, history);
      addAcademicMessage({ from: "selina", text: reply });
    } catch (err) {
      addAcademicMessage({
        from: "selina",
        text: "I couldn't reach the server just now. Check that the backend is running and try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Feather name="book-open" size={22} color={colors.rose} />
        </View>
        <Text style={styles.title}>Academic</Text>
        <Text style={styles.subtitle}>
          Ask for help, work through a problem, or track what's due.
        </Text>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, tab === "chat" && styles.tabButtonActive]}
            onPress={() => setTab("chat")}
          >
            <Text style={[styles.tabLabel, tab === "chat" && styles.tabLabelActive]}>Chat</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tab === "deadlines" && styles.tabButtonActive]}
            onPress={() => setTab("deadlines")}
          >
            <Text style={[styles.tabLabel, tab === "deadlines" && styles.tabLabelActive]}>Deadlines</Text>
          </Pressable>
        </View>
      </View>

      {tab === "chat" ? (
        <KeyboardAvoidingView style={styles.flexArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            data={academicMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.chatListContent}
            style={styles.flexArea}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onLongPress={() => Clipboard.setStringAsync(item.text).then(() => Alert.alert("Copied", "Message copied to clipboard."))}>
                <View
                  style={[
                    styles.bubble,
                    item.from === "user" ? styles.bubbleUser : styles.bubbleSelina,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      item.from === "user" ? styles.bubbleTextUser : styles.bubbleTextSelina,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              </Pressable>
            )}
            ListFooterComponent={
              sending ? <ActivityIndicator color={colors.rose} style={{ marginTop: space.sm }} /> : null
            }
          />
          <KeyboardStickyView>
            <View style={[styles.chatInputRow, { paddingBottom: insets.bottom + space.sm }]}>
              <TextInput
                style={styles.chatInput}
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask a question or paste a problem"
                placeholderTextColor={colors.inkSoft}
                multiline
                editable={!sending}
              />
              <Pressable style={styles.sendButton} onPress={sendChat} disabled={sending}>
                <Feather name="send" size={16} color={colors.paper} />
              </Pressable>
            </View>
          </KeyboardStickyView>
        </KeyboardAvoidingView>
      ) : (
        <KeyboardAwareScrollView
          style={styles.flexArea}
          contentContainerStyle={styles.deadlinesContent}
          bottomOffset={20}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>What's due?</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Statistics assignment"
            placeholderTextColor={colors.inkSoft}
          />

          <Text style={styles.label}>Days from now</Text>
          <TextInput
            style={styles.input}
            value={daysAway}
            onChangeText={setDaysAway}
            placeholder="e.g. 3"
            placeholderTextColor={colors.inkSoft}
            keyboardType="number-pad"
          />

          <Pressable style={styles.saveButton} onPress={addDeadline} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.paper} size="small" />
            ) : (
              <Text style={styles.saveLabel}>Add deadline</Text>
            )}
          </Pressable>

          <View style={styles.divider} />

          {deadlines.length === 0 ? (
            <Text style={styles.emptyText}>Nothing tracked yet, add your first deadline above.</Text>
          ) : (
            deadlines.map((item) => {
              const daysAway = Math.ceil((new Date(item.dueDateISO).getTime() - Date.now()) / 86400000);
              const urgent = daysAway <= 2;

              return (
                <View
                  key={item.id}
                  style={[styles.deadlineCard, urgent && styles.deadlineCardUrgent]}
                >
                  <Text style={styles.deadlineTitle}>{item.title}</Text>
                  <Text style={styles.deadlineDays}>
                    {daysAway <= 0 ? "Due today" : `${daysAway} day${daysAway > 1 ? "s" : ""} away`}
                    {urgent ? ", urgent" : ""}
                  </Text>
                  <Text style={styles.deadlineMessage}>{item.message}</Text>
                </View>
              );
            })
          )}
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flexArea: { flex: 1 },
  header: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.sm },
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
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: colors.rose,
  },
  tabLabel: {
    fontFamily: type.bodySemiBold,
    fontSize: 13.5,
    color: colors.inkSoft,
  },
  tabLabelActive: {
    color: colors.paper,
  },
  chatListContent: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  bubble: {
    maxWidth: "82%",
    borderRadius: radius.lg,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  bubbleSelina: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignSelf: "flex-start",
  },
  bubbleUser: {
    backgroundColor: colors.rose,
    alignSelf: "flex-end",
  },
  bubbleText: { fontFamily: type.body, fontSize: 15, lineHeight: 21 },
  bubbleTextSelina: { color: colors.ink },
  bubbleTextUser: { color: colors.paper },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  chatInput: {
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
    maxHeight: 120,
  },
  sendButton: {
    marginLeft: space.sm,
    backgroundColor: colors.rose,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    alignItems: "center",
    justifyContent: "center",
  },
  deadlinesContent: { padding: space.lg, paddingTop: space.md, paddingBottom: space.xxl },
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
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.lg,
  },
  emptyText: {
    fontFamily: type.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    marginTop: space.md,
  },
  deadlineCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  deadlineCardUrgent: { borderColor: colors.rose },
  deadlineTitle: { fontFamily: type.bodySemiBold, fontSize: 16, color: colors.ink },
  deadlineDays: { fontFamily: type.bodySemiBold, fontSize: 13, color: colors.rose, marginTop: 2 },
  deadlineMessage: { fontFamily: type.body, fontSize: 14, color: colors.inkSoft, marginTop: 4, lineHeight: 19 },
});