import React, { useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, TextInput, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { useSelinaState, ChatThread } from "../state/SelinaState";

export default function ChatThreadListScreen({ route, navigation }: any) {
  const agentType: "companion" | "academic" = route.params?.agentType;
  const state = useSelinaState();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const threads = agentType === "companion" ? state.companionThreads : state.academicThreads;
  const activeId = agentType === "companion" ? state.activeCompanionThreadId : state.activeAcademicThreadId;
  const setActiveId = agentType === "companion" ? state.setActiveCompanionThreadId : state.setActiveAcademicThreadId;
  const createThread = agentType === "companion" ? state.createCompanionThread : state.createAcademicThread;
  const renameThread = agentType === "companion" ? state.renameCompanionThread : state.renameAcademicThread;
  const deleteThread = agentType === "companion" ? state.deleteCompanionThread : state.deleteAcademicThread;

  const accent = agentType === "companion" ? colors.amber : colors.rose;

  function openThread(id: string) {
    setActiveId(id);
    navigation.goBack();
  }

  function startNewChat() {
    createThread();
    navigation.goBack();
  }

  function confirmDelete(thread: ChatThread) {
    Alert.alert("Delete chat", `Delete "${thread.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteThread(thread.id) },
    ]);
  }

  function startRename(thread: ChatThread) {
    setRenamingId(thread.id);
    setRenameText(thread.title);
  }

  function submitRename() {
    if (renamingId && renameText.trim()) {
      renameThread(renamingId, renameText.trim());
    }
    setRenamingId(null);
  }

  const sorted = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <View style={styles.screen}>
      <Pressable style={[styles.newChatButton, { backgroundColor: accent }]} onPress={startNewChat}>
        <Feather name="plus" size={16} color={colors.paper} />
        <Text style={styles.newChatLabel}>New chat</Text>
      </Pressable>

      <FlatList
        data={sorted}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: space.lg, paddingTop: space.sm }}
        renderItem={({ item }) => (
          <View style={[styles.threadRow, item.id === activeId && { borderColor: accent }]}>
            {renamingId === item.id ? (
              <TextInput
                style={styles.renameInput}
                value={renameText}
                onChangeText={setRenameText}
                autoFocus
                onSubmitEditing={submitRename}
                onBlur={submitRename}
              />
            ) : (
              <Pressable style={styles.threadTextArea} onPress={() => openThread(item.id)}>
                <Text style={styles.threadTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.threadPreview} numberOfLines={1}>
                  {item.messages[item.messages.length - 1]?.text || ""}
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.iconButton} onPress={() => startRename(item)}>
              <Feather name="edit-2" size={15} color={colors.inkSoft} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => confirmDelete(item)}>
              <Feather name="trash-2" size={15} color={colors.inkSoft} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: space.lg,
    marginBottom: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  newChatLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper, marginLeft: space.sm },
  threadRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  threadTextArea: { flex: 1, marginRight: space.sm },
  threadTitle: { fontFamily: type.bodySemiBold, fontSize: 14.5, color: colors.ink },
  threadPreview: { fontFamily: type.body, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  renameInput: {
    flex: 1,
    fontFamily: type.bodySemiBold,
    fontSize: 14.5,
    color: colors.ink,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    paddingVertical: 2,
    marginRight: space.sm,
  },
  iconButton: { padding: space.xs, marginLeft: space.xs },
});