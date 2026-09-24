import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Platform, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { submitDeadline, sendAcademicMessage } from "../services/api";

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

const opening: ChatMessage = {
  id: "0",
  from: "selina",
  text: "Ask me to explain something, quiz you, or help you work through a problem.",
};

export default function AcademicScreen() {
  const [title, setTitle] = useState("");
  const [daysAway, setDaysAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([opening]);
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
      setDeadlines((prev) => [
        {
          id: `${Date.now()}`,
          title: title.trim(),
          daysAway: result.days_remaining ?? days,
          urgent: result.action === "urgent_reminder",
          message: result.message || "",
        },
        ...prev,
      ]);
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

    const userMessage: ChatMessage = { id: Date.now().toString(), from: "user", text };
    setChatMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);

    try {
      const reply = await sendAcademicMessage(text);
      setChatMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), from: "selina", text: reply },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          from: "selina",
          text: "I couldn't reach the server just now. Check that the backend is running and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={20}>
      <View style={styles.iconCircle}>
        <Feather name="book-open" size={22} color={colors.rose} />
      </View>
      <Text style={styles.title}>Academic</Text>
      <Text style={styles.subtitle}>
        Ask for help, work through a problem, or track what's due.
      </Text>

        <FlatList
          data={chatMessages}
          keyExtractor={(m) => m.id}
          style={styles.chatList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
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
          )}
          ListFooterComponent={
            sending ? <ActivityIndicator color={colors.rose} style={{ marginTop: space.sm }} /> : null
          }
        />

        <View style={styles.chatInputRow}>
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

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Deadlines</Text>

        <FlatList
          data={deadlines}
          keyExtractor={(d) => d.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[styles.deadlineCard, item.urgent && styles.deadlineCardUrgent]}>
              <Text style={styles.deadlineTitle}>{item.title}</Text>
              <Text style={styles.deadlineDays}>
                {item.daysAway <= 0 ? "Due today" : `${item.daysAway} day${item.daysAway > 1 ? "s" : ""} away`}
                {item.urgent ? ", urgent" : ""}
              </Text>
              <Text style={styles.deadlineMessage}>{item.message}</Text>
            </View>
          )}
        />

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
    </KeyboardAwareScrollView>
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
  chatList: { maxHeight: 260, marginBottom: space.sm },
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
  bubbleText: { fontFamily: type.body, fontSize: 14, lineHeight: 20 },
  bubbleTextSelina: { color: colors.ink },
  bubbleTextUser: { color: colors.paper },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: space.md,
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
    maxHeight: 100,
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
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.md,
  },
  sectionLabel: {
    fontFamily: type.display,
    fontSize: 16,
    color: colors.ink,
    marginBottom: space.sm,
  },
  list: { maxHeight: 180, marginBottom: space.md },
  deadlineCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  deadlineCardUrgent: { borderColor: colors.rose },
  deadlineTitle: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.ink },
  deadlineDays: { fontFamily: type.bodySemiBold, fontSize: 12, color: colors.rose, marginTop: 2 },
  deadlineMessage: { fontFamily: type.body, fontSize: 13, color: colors.inkSoft, marginTop: 4, lineHeight: 18 },
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
