import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { sendCompanionMessage } from "../services/api";

type Message = {
  id: string;
  from: "user" | "selina";
  text: string;
};

const opening: Message = {
  id: "0",
  from: "selina",
  text: "I'm here. Take your time, there's no rush to explain everything at once.",
};

export default function CompanionScreen() {
  const [messages, setMessages] = useState<Message[]>([opening]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    const userMessage: Message = { id: Date.now().toString(), from: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setSending(true);

    try {
      const reply = await sendCompanionMessage(text);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), from: "selina", text: reply },
      ]);
    } catch (err) {
      // The backend might not be running yet, this keeps the screen usable
      // in that case instead of failing silently or crashing.
      setMessages((prev) => [
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
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
          sending ? <ActivityIndicator color={colors.teal} style={{ marginTop: space.sm }} /> : null
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write what's on your mind"
          placeholderTextColor={colors.inkSoft}
          multiline
          editable={!sending}
        />
        <Pressable style={styles.sendButton} onPress={send} disabled={sending}>
          <Feather name="send" size={16} color={colors.paper} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: space.lg, paddingBottom: space.md },
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
    backgroundColor: colors.amber,
    alignSelf: "flex-end",
  },
  bubbleText: { fontFamily: type.body, fontSize: 15, lineHeight: 21 },
  bubbleTextSelina: { color: colors.ink },
  bubbleTextUser: { color: colors.paper },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
  input: {
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
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
