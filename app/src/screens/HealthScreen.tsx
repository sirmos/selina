import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, type, space, radius } from "../theme/tokens";
import { calculateCycle, addMedication as addMedicationApi } from "../services/api";
import { useSelinaState } from "../state/SelinaState";

function CycleCalendar({ computed }: { computed: any }) {
  const periodStart = new Date(computed.period_start);
  const monthStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  const nextPeriodEnd = new Date(computed.next_period.end);
  const monthsToShow = nextPeriodEnd.getMonth() === monthStart.getMonth() ? 1 : 2;

  function dayColor(dateStr: string) {
    const d = new Date(dateStr);
    const inRange = (start: string, end: string) => d >= new Date(start) && d <= new Date(end);

    if (inRange(computed.period_start, computed.period_end)) return colors.rose;
    if (d.toDateString() === new Date(computed.ovulation_day).toDateString()) return colors.plum;
    if (inRange(computed.fertile_window.start, computed.fertile_window.end)) return colors.amber;
    if (computed.safe_days_before_ovulation && inRange(computed.safe_days_before_ovulation.start, computed.safe_days_before_ovulation.end)) return colors.teal;
    if (computed.safe_days_after_ovulation && inRange(computed.safe_days_after_ovulation.start, computed.safe_days_after_ovulation.end)) return colors.teal;
    if (inRange(computed.next_period.start, computed.next_period.end)) return colors.rose;
    return null;
  }

  const months = [];
  for (let m = 0; m < monthsToShow; m++) {
    const monthDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + m, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const firstWeekday = monthDate.getDay();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(day);

    months.push(
      <View key={m} style={{ marginBottom: space.md }}>
        <Text style={styles.calendarMonthLabel}>
          {monthDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <View style={styles.calendarGrid}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={`h${i}`} style={styles.calendarHeaderCell}>{d}</Text>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <View key={i} style={styles.calendarCell} />;
            const dateStr = new Date(monthDate.getFullYear(), monthDate.getMonth(), day).toISOString().split("T")[0];
            const color = dayColor(dateStr);
            return (
              <View key={i} style={styles.calendarCell}>
                <View style={[styles.calendarDay, color && { backgroundColor: color }]}>
                  <Text style={[styles.calendarDayText, color && { color: colors.paper }]}>{day}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: space.md }}>
      {months}
      <View style={styles.legendRow}>
        <LegendDot color={colors.rose} label="Period" />
        <LegendDot color={colors.amber} label="Fertile" />
        <LegendDot color={colors.plum} label="Ovulation" />
        <LegendDot color={colors.teal} label="Safe" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: space.md, marginBottom: space.xs }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 4 }} />
      <Text style={{ fontFamily: type.body, fontSize: 12, color: colors.inkSoft }}>{label}</Text>
    </View>
  );
}

export default function HealthScreen() {
  const { cycleResult, setCycleResult, medications, addMedication } = useSelinaState();
  const [tab, setTab] = useState<"cycle" | "medication">("cycle");

  const [lastPeriod, setLastPeriod] = useState("");
  const [cycleLength, setCycleLength] = useState("28");
  const [periodLength, setPeriodLength] = useState("5");
  const [calculating, setCalculating] = useState(false);

  const [medName, setMedName] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"interval" | "times">("interval");
  const [intervalHours, setIntervalHours] = useState("8");
  const [doseCount, setDoseCount] = useState("3");
  const [timesOfDay, setTimesOfDay] = useState("08:00, 20:00");
  const [durationDays, setDurationDays] = useState("3");
  const [savingMed, setSavingMed] = useState(false);

  async function handleCalculate() {
    if (!lastPeriod.trim()) return;
    setCalculating(true);
    try {
      const result = await calculateCycle(
        lastPeriod.trim(),
        parseInt(cycleLength, 10) || 28,
        parseInt(periodLength, 10) || 5
      );
      setCycleResult({ computed: result.computed, message: result.message });
    } catch (err) {
      // Stays silent, form remains filled so nothing is lost.
    } finally {
      setCalculating(false);
    }
  }

  async function handleAddMedication() {
    if (!medName.trim()) return;
    setSavingMed(true);
    try {
      const startTime = new Date().toISOString();
      const options =
        scheduleMode === "interval"
          ? { interval_hours: parseInt(intervalHours, 10) || 8, dose_count: parseInt(doseCount, 10) || 3 }
          : {
              times_of_day: timesOfDay.split(",").map((t) => t.trim()),
              duration_days: parseInt(durationDays, 10) || 1,
            };

      const result = await addMedicationApi(
        medName.trim(),
        scheduleMode === "interval" ? "interval_hours" : "times_of_day",
        startTime,
        options
      );
      addMedication({ name: medName.trim(), doses: result.doses || [], message: result.message || "" });
      setMedName("");
    } catch (err) {
      // Stays silent, form remains filled so nothing is lost.
    } finally {
      setSavingMed(false);
    }
  }

  function formatDose(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.flexArea} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <Feather name="heart" size={22} color={colors.plum} />
        </View>
        <Text style={styles.title}>Health</Text>
        <Text style={styles.subtitle}>Cycle tracking and medication reminders.</Text>

        <View style={styles.tabRow}>
          <Pressable style={[styles.tabButton, tab === "cycle" && styles.tabButtonActive]} onPress={() => setTab("cycle")}>
            <Text style={[styles.tabLabel, tab === "cycle" && styles.tabLabelActive]}>Cycle</Text>
          </Pressable>
          <Pressable style={[styles.tabButton, tab === "medication" && styles.tabButtonActive]} onPress={() => setTab("medication")}>
            <Text style={[styles.tabLabel, tab === "medication" && styles.tabLabelActive]}>Medication</Text>
          </Pressable>
        </View>

        {tab === "cycle" ? (
          <View>
            <Text style={styles.label}>First day of last period (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={lastPeriod}
              onChangeText={setLastPeriod}
              placeholder="e.g. 2026-09-10"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.label}>Average cycle length (days)</Text>
            <TextInput
              style={styles.input}
              value={cycleLength}
              onChangeText={setCycleLength}
              placeholder="28"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Period length (days)</Text>
            <TextInput
              style={styles.input}
              value={periodLength}
              onChangeText={setPeriodLength}
              placeholder="5"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
            />

            <Pressable style={styles.saveButton} onPress={handleCalculate} disabled={calculating}>
              {calculating ? <ActivityIndicator color={colors.paper} size="small" /> : <Text style={styles.saveLabel}>Calculate</Text>}
            </Pressable>

            {cycleResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultMessage}>{cycleResult.message}</Text>
                <View style={styles.resultDivider} />
                <CycleCalendar computed={cycleResult.computed} />
                <View style={styles.resultDivider} />
                <ResultRow label="Next period" value={`${cycleResult.computed.next_period.start} to ${cycleResult.computed.next_period.end}`} />
                <ResultRow label="Ovulation day" value={cycleResult.computed.ovulation_day} />
                <ResultRow
                  label="Fertile window"
                  value={`${cycleResult.computed.fertile_window.start} to ${cycleResult.computed.fertile_window.end}`}
                />
                {cycleResult.computed.safe_days_before_ovulation && (
                  <ResultRow
                    label="Safe days"
                    value={`${cycleResult.computed.safe_days_before_ovulation.start} to ${cycleResult.computed.safe_days_before_ovulation.end}`}
                  />
                )}
                {cycleResult.computed.safe_days_after_ovulation && (
                  <ResultRow
                    label="Next safe days"
                    value={`${cycleResult.computed.safe_days_after_ovulation.start} to ${cycleResult.computed.safe_days_after_ovulation.end}`}
                  />
                )}
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Medication name</Text>
            <TextInput
              style={styles.input}
              value={medName}
              onChangeText={setMedName}
              placeholder="e.g. Malaria treatment"
              placeholderTextColor={colors.inkSoft}
            />

            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tabButton, scheduleMode === "interval" && styles.tabButtonActive]}
                onPress={() => setScheduleMode("interval")}
              >
                <Text style={[styles.tabLabel, scheduleMode === "interval" && styles.tabLabelActive]}>Every X hours</Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, scheduleMode === "times" && styles.tabButtonActive]}
                onPress={() => setScheduleMode("times")}
              >
                <Text style={[styles.tabLabel, scheduleMode === "times" && styles.tabLabelActive]}>Times of day</Text>
              </Pressable>
            </View>

            {scheduleMode === "interval" ? (
              <>
                <Text style={styles.label}>Every how many hours</Text>
                <TextInput
                  style={styles.input}
                  value={intervalHours}
                  onChangeText={setIntervalHours}
                  placeholder="e.g. 8"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                />
                <Text style={styles.label}>Number of doses</Text>
                <TextInput
                  style={styles.input}
                  value={doseCount}
                  onChangeText={setDoseCount}
                  placeholder="e.g. 3"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Times of day (comma separated, 24hr)</Text>
                <TextInput
                  style={styles.input}
                  value={timesOfDay}
                  onChangeText={setTimesOfDay}
                  placeholder="e.g. 08:00, 20:00"
                  placeholderTextColor={colors.inkSoft}
                />
                <Text style={styles.label}>For how many days</Text>
                <TextInput
                  style={styles.input}
                  value={durationDays}
                  onChangeText={setDurationDays}
                  placeholder="e.g. 3"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                />
              </>
            )}

            <Pressable style={styles.saveButton} onPress={handleAddMedication} disabled={savingMed}>
              {savingMed ? <ActivityIndicator color={colors.paper} size="small" /> : <Text style={styles.saveLabel}>Add reminder</Text>}
            </Pressable>

            <Text style={styles.noteText}>
              This schedules and displays your dose times. Actual phone notifications at those times are coming in a future update.
            </Text>

            <View style={styles.resultDivider} />

            {medications.length === 0 ? (
              <Text style={styles.emptyText}>No medication schedules yet.</Text>
            ) : (
              medications.map((med) => (
                <View key={med.id} style={styles.resultCard}>
                  <Text style={styles.resultMessage}>{med.message}</Text>
                  <View style={styles.resultDivider} />
                  {med.doses.map((dose, i) => (
                    <ResultRow key={i} label={`Dose ${i + 1}`} value={formatDose(dose)} />
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flexArea: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.plumSoft,
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
    marginBottom: space.md,
  },
  tabButton: { flex: 1, paddingVertical: space.sm, borderRadius: radius.pill, alignItems: "center" },
  tabButtonActive: { backgroundColor: colors.plum },
  tabLabel: { fontFamily: type.bodySemiBold, fontSize: 12.5, color: colors.inkSoft },
  tabLabelActive: { color: colors.paper },
  label: { fontFamily: type.bodySemiBold, fontSize: 13, color: colors.inkSoft, marginBottom: space.xs, marginTop: space.sm },
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
  saveButton: { backgroundColor: colors.plum, borderRadius: radius.md, paddingVertical: space.md, alignItems: "center", marginTop: space.lg },
  saveLabel: { fontFamily: type.bodySemiBold, fontSize: 15, color: colors.paper },
  noteText: { fontFamily: type.body, fontSize: 12.5, color: colors.inkSoft, marginTop: space.sm, lineHeight: 17, fontStyle: "italic" },
  resultDivider: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
  calendarMonthLabel: { fontFamily: type.bodySemiBold, fontSize: 14, color: colors.ink, marginBottom: space.sm },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarHeaderCell: { width: "14.28%", textAlign: "center", fontFamily: type.bodySemiBold, fontSize: 11, color: colors.inkSoft, marginBottom: 4 },
  calendarCell: { width: "14.28%", alignItems: "center", marginBottom: 4 },
  calendarDay: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  calendarDayText: { fontFamily: type.body, fontSize: 12, color: colors.ink },
  legendRow: { flexDirection: "row", flexWrap: "wrap", marginTop: space.sm },
  resultCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  resultMessage: { fontFamily: type.body, fontSize: 14, color: colors.ink, lineHeight: 20 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  resultLabel: { fontFamily: type.bodySemiBold, fontSize: 13, color: colors.inkSoft },
  resultValue: { fontFamily: type.bodySemiBold, fontSize: 13, color: colors.plum, textAlign: "right", flexShrink: 1, marginLeft: space.sm },
  emptyText: { fontFamily: type.body, fontSize: 14, color: colors.inkSoft, textAlign: "center", marginTop: space.md },
});
