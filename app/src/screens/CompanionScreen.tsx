import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAvoidingView, KeyboardStickyView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors, type, space, radius } from "../theme/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendCompanionMessage } from "../services/api";
import { useSelinaState } from "../state/SelinaState";

export default function CompanionScreen() {
  const insets = useSafeAreaInsets();
  const { companionMessages, addCompanionMessage } = useSelinaState();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function copyMessage(text: string) {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Message copied to clipboard.");
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    const history = companionMessages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", text: m.text }));

    addCompanionMessage({ from: "user", text });
    setDraft("");
    setSending(true);

    try {
      const reply = await sendCompanionMessage(text, history);
      addCompanionMessage({ from: "selina", text: reply });
    } catch (err) {
      addCompanionMessage({
        from: "selina",
        text: "I couldn't reach the server just now. Check that the backend is running and try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={companionMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => copyMessage(item.text)}>
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
          sending ? <ActivityIndicator color={colors.teal} style={{ marginTop: space.sm }} /> : null
        }
      />
      <KeyboardStickyView>
        <View style={[styles.inputRow, { paddingBottom: insets.bottom + space.sm }]}>
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
      </KeyboardStickyView>
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