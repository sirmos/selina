import React, { useState, useLayoutEffect } from "react";
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
import PlusGate from "../components/PlusGate";

type Tab = "chat" | "deadlines" | "scholarships" | "planner";

type Scholarship = {
  id: string;
  title: string;
  region: string;
  level: string;
  deadline: string;
  blurb: string;
};

const SCHOLARSHIPS: Scholarship[] = [
  {
    id: "mastercard-foundation",
    title: "Mastercard Foundation Scholars Program",
    region: "International (Africa-focused)",
    level: "Undergraduate & Graduate",
    deadline: "Varies by partner university",
    blurb: "Full funding for African students, covering tuition, accommodation and mentorship.",
  },
  {
    id: "chevening",
    title: "Chevening Scholarship",
    region: "UK (International)",
    level: "Master's",
    deadline: "Typically closes early November",
    blurb: "UK government-funded, fully-funded one-year master's for future leaders.",
  },
  {
    id: "daad",
    title: "DAAD Scholarship",
    region: "Germany (International)",
    level: "Undergraduate, Master's, PhD",
    deadline: "Varies by programme",
    blurb: "German academic exchange funding covering tuition, stipend and travel.",
  },
  {
    id: "fulbright",
    title: "Fulbright Foreign Student Program",
    region: "USA (International)",
    level: "Master's & PhD",
    deadline: "Typically closes in early spring, check local commission",
    blurb: "US government-funded study and research grants for graduate study.",
  },
  {
    id: "ngx-ceo-scholarship",
    title: "NGX/CEO's Roundtable National Scholarship",
    region: "Nigeria (National)",
    level: "Undergraduate",
    deadline: "Check current cycle dates",
    blurb: "Merit-based scholarship supporting Nigerian undergraduates in local universities.",
  },
  {
    id: "petrobal-nnpc",
    title: "NNPC/Total National Merit Scholarship",
    region: "Nigeria (National)",
    level: "Undergraduate",
    deadline: "Usually opens after WAEC/JAMB results",
    blurb: "Annual Nigerian national scholarship for undergraduates in approved institutions.",
  },
];

export default function AcademicScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    academicThreads,
    activeAcademicThreadId,
    addAcademicMessage,
    createAcademicThread,
    deadlines,
    addDeadline: addStoredDeadline,
  } = useSelinaState();
  const [tab, setTab] = useState<Tab>("chat");

  const activeThread = academicThreads.find((t) => t.id === activeAcademicThreadId);
  const messages = activeThread?.messages || [];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <Pressable onPress={createAcademicThread} style={{ marginRight: space.md }}>
            <Feather name="plus" size={20} color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("ChatThreads", { agentType: "academic" })}>
            <Feather name="clock" size={20} color={colors.ink} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const [title, setTitle] = useState("");
  const [daysAway, setDaysAway] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Scholarships tab state
  const [scholarshipGuidance, setScholarshipGuidance] = useState<Record<string, string>>({});
  const [loadingGuidance, setLoadingGuidance] = useState<string | null>(null);

  // Planner tab state
  const [examName, setExamName] = useState("");
  const [examDaysAway, setExamDaysAway] = useState("");
  const [subjects, setSubjects] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("2");
  const [plan, setPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

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

    const history = messages.map((m) => ({ role: m.from === "user" ? "user" : "assistant", text: m.text }));
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

  async function getScholarshipGuidance(scholarship: Scholarship) {
    setLoadingGuidance(scholarship.id);
    try {
      const prompt = `Give practical, step by step guidance on how to prepare a strong application for the "${scholarship.title}" (${scholarship.region}, ${scholarship.level}). Cover eligibility basics, documents typically needed, and 2-3 tips to stand out. Keep it concise.`;
      const reply = await sendAcademicMessage(prompt, []);
      setScholarshipGuidance((prev) => ({ ...prev, [scholarship.id]: reply }));
    } catch (err) {
      setScholarshipGuidance((prev) => ({
        ...prev,
        [scholarship.id]: "Couldn't reach the server just now, try again in a moment.",
      }));
    } finally {
      setLoadingGuidance(null);
    }
  }

  async function generatePlan() {
    const days = parseInt(examDaysAway, 10);
    const hours = parseFloat(hoursPerDay);
    if (!examName.trim() || !subjects.trim() || !days || days < 1 || !hours || hours <= 0) return;

    setGeneratingPlan(true);
    setPlan(null);
    try {
      const prompt = `Create a day by day study timetable for "${examName.trim()}" happening in ${days} day(s). Subjects/topics to cover: ${subjects.trim()}. I can study about ${hours} hour(s) per day. Spread topics across the available days, include short revision and rest days near the end, and keep it realistic and easy to follow.`;
      const reply = await sendAcademicMessage(prompt, []);
      setPlan(reply);
    } catch (err) {
      setPlan("Couldn't reach the server just now, try again in a moment.");
    } finally {
      setGeneratingPlan(false);
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
          <Pressable
            style={[styles.tabButton, tab === "scholarships" && styles.tabButtonActive]}
            onPress={() => setTab("scholarships")}
          >
            <Text style={[styles.tabLabel, tab === "scholarships" && styles.tabLabelActive]}>Scholarships</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, tab === "planner" && styles.tabButtonActive]}
            onPress={() => setTab("planner")}
          >
            <Text style={[styles.tabLabel, tab === "planner" && styles.tabLabelActive]}>Planner</Text>
          </Pressable>
        </View>
      </View>

      {tab === "chat" && (
        <KeyboardAvoidingView style={styles.flexArea} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            data={messages}
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
      )}

      {tab === "deadlines" && (
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
              const daysAwayCalc = Math.ceil((new Date(item.dueDateISO).getTime() - Date.now()) / 86400000);
              const urgent = daysAwayCalc <= 2;

              return (
                <View
                  key={item.id}
                  style={[styles.deadlineCard, urgent && styles.deadlineCardUrgent]}
                >
                  <Text style={styles.deadlineTitle}>{item.title}</Text>
                  <Text style={styles.deadlineDays}>
                    {daysAwayCalc <= 0 ? "Due today" : `${daysAwayCalc} day${daysAwayCalc > 1 ? "s" : ""} away`}
                    {urgent ? ", urgent" : ""}
                  </Text>
                  <Text style={styles.deadlineMessage}>{item.message}</Text>
                </View>
              );
            })
          )}
        </KeyboardAwareScrollView>
      )}

      {tab === "scholarships" && (
        <PlusGate navigation={navigation}>
          <KeyboardAwareScrollView
            style={styles.flexArea}
            contentContainerStyle={styles.deadlinesContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionIntro}>
              National and international scholarships worth exploring. Tap one for tailored
              application guidance.
            </Text>
            {SCHOLARSHIPS.map((s) => (
              <View key={s.id} style={styles.scholarshipCard}>
                <Text style={styles.deadlineTitle}>{s.title}</Text>
                <Text style={styles.scholarshipMeta}>{s.region} • {s.level}</Text>
                <Text style={styles.scholarshipMeta}>Deadline: {s.deadline}</Text>
                <Text style={styles.deadlineMessage}>{s.blurb}</Text>

                {scholarshipGuidance[s.id] ? (
                  <Text style={styles.guidanceText}>{scholarshipGuidance[s.id]}</Text>
                ) : (
                  <Pressable
                    style={styles.guidanceButton}
                    onPress={() => getScholarshipGuidance(s)}
                    disabled={loadingGuidance === s.id}
                  >
                    {loadingGuidance === s.id ? (
                      <ActivityIndicator color={colors.paper} size="small" />
                    ) : (
                      <Text style={styles.saveLabel}>Get application guidance</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
          </KeyboardAwareScrollView>
        </PlusGate>
      )}

      {tab === "planner" && (
        <PlusGate navigation={navigation}>
          <KeyboardAwareScrollView
            style={styles.flexArea}
            contentContainerStyle={styles.deadlinesContent}
            bottomOffset={20}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>Exam or test name</Text>
            <TextInput
              style={styles.input}
              value={examName}
              onChangeText={setExamName}
              placeholder="e.g. Chemistry final"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.label}>Days until exam</Text>
            <TextInput
              style={styles.input}
              value={examDaysAway}
              onChangeText={setExamDaysAway}
              placeholder="e.g. 10"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Subjects or topics (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={subjects}
              onChangeText={setSubjects}
              placeholder="e.g. Organic chemistry, stoichiometry, lab safety"
              placeholderTextColor={colors.inkSoft}
              multiline
            />

            <Text style={styles.label}>Hours you can study per day</Text>
            <TextInput
              style={styles.input}
              value={hoursPerDay}
              onChangeText={setHoursPerDay}
              placeholder="e.g. 2"
              placeholderTextColor={colors.inkSoft}
              keyboardType="numeric"
            />

            <Pressable style={styles.saveButton} onPress={generatePlan} disabled={generatingPlan}>
              {generatingPlan ? (
                <ActivityIndicator color={colors.paper} size="small" />
              ) : (
                <Text style={styles.saveLabel}>Generate study plan</Text>
              )}
            </Pressable>

            {plan && (
              <View style={styles.planCard}>
                <Text style={styles.deadlineTitle}>Your study plan</Text>
                <Text style={styles.guidanceText}>{plan}</Text>
              </View>
            )}
          </KeyboardAwareScrollView>
        </PlusGate>
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
    flexWrap: "wrap",
  },
  tabButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    marginVertical: 2,
  },
  tabButtonActive: {
    backgroundColor: colors.rose,
  },
  tabLabel: {
    fontFamily: type.bodySemiBold,
    fontSize: 12.5,
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
  sectionIntro: {
    fontFamily: type.body,
    fontSize: 13.5,
    color: colors.inkSoft,
    marginBottom: space.md,
    lineHeight: 19,
  },
  scholarshipCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  scholarshipMeta: {
    fontFamily: type.body,
    fontSize: 12.5,
    color: colors.teal,
    marginTop: 2,
  },
  guidanceButton: {
    backgroundColor: colors.rose,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: "center",
    marginTop: space.sm,
  },
  guidanceText: {
    fontFamily: type.body,
    fontSize: 13.5,
    color: colors.ink,
    marginTop: space.sm,
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
  },
});