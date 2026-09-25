import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CheckInStatus = "none" | "scheduled" | "safe" | "missed";

export type CaseEntry = {
  id: string;
  title: string;
  detail: string;
  date: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  reachMethod: string;
};

export type ChatMessage = {
  id: string;
  from: "user" | "selina";
  text: string;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export type Deadline = {
  id: string;
  title: string;
  dueDateISO: string;
  message: string;
};

export type CycleResult = {
  computed: any;
  message: string;
};

export type Medication = {
  id: string;
  name: string;
  doses: string[];
  message: string;
};

const COMPANION_OPENING_TEXT = "I'm here. Take your time, there's no rush to explain everything at once.";
const ACADEMIC_OPENING_TEXT = "Ask me to explain something, quiz you, or help you work through a problem.";

function makeNewThread(openingText: string): ChatThread {
  return {
    id: `${Date.now()}`,
    title: "New chat",
    messages: [{ id: `${Date.now()}-0`, from: "selina", text: openingText }],
    updatedAt: Date.now(),
  };
}

function titleFromFirstMessage(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 32 ? trimmed.slice(0, 32) + "…" : trimmed;
}

type SelinaState = {
  checkInStatus: CheckInStatus;
  setCheckInStatus: (status: CheckInStatus) => void;
  caseEntries: CaseEntry[];
  addCaseEntry: (entry: Omit<CaseEntry, "id" | "date">) => void;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: Omit<EmergencyContact, "id">) => void;
  removeEmergencyContact: (id: string) => void;
  activeCheckInId: string | null;
  setActiveCheckInId: (id: string | null) => void;

  companionThreads: ChatThread[];
  activeCompanionThreadId: string;
  setActiveCompanionThreadId: (id: string) => void;
  createCompanionThread: () => void;
  renameCompanionThread: (id: string, title: string) => void;
  deleteCompanionThread: (id: string) => void;
  addCompanionMessage: (message: Omit<ChatMessage, "id">) => void;

  academicThreads: ChatThread[];
  activeAcademicThreadId: string;
  setActiveAcademicThreadId: (id: string) => void;
  createAcademicThread: () => void;
  renameAcademicThread: (id: string, title: string) => void;
  deleteAcademicThread: (id: string) => void;
  addAcademicMessage: (message: Omit<ChatMessage, "id">) => void;

  deadlines: Deadline[];
  addDeadline: (deadline: Omit<Deadline, "id">) => void;

  cycleResult: CycleResult | null;
  setCycleResult: (result: CycleResult | null) => void;
  medications: Medication[];
  addMedication: (medication: Omit<Medication, "id">) => void;
};

const SelinaContext = createContext<SelinaState | undefined>(undefined);

export function SelinaProvider({ children }: { children: ReactNode }) {
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("none");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(null);
  const [caseEntries, setCaseEntries] = useState<CaseEntry[]>([
    {
      id: "c0",
      title: "Case opened",
      detail: "Started tracking hours and pay against what was agreed.",
      date: "3 days ago",
    },
  ]);

  const [companionThreads, setCompanionThreads] = useState<ChatThread[]>([]);
  const [activeCompanionThreadId, setActiveCompanionThreadId] = useState<string>("");
  const [academicThreads, setAcademicThreads] = useState<ChatThread[]>([]);
  const [activeAcademicThreadId, setActiveAcademicThreadId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [cycleResult, setCycleResult] = useState<CycleResult | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);

  // Load persisted threads once on startup
  useEffect(() => {
    (async () => {
      try {
        const [storedCompanion, storedCompanionActive, storedAcademic, storedAcademicActive] = await Promise.all([
          AsyncStorage.getItem("selina_companion_threads"),
          AsyncStorage.getItem("selina_companion_active"),
          AsyncStorage.getItem("selina_academic_threads"),
          AsyncStorage.getItem("selina_academic_active"),
        ]);

        const companionParsed: ChatThread[] = storedCompanion ? JSON.parse(storedCompanion) : [];
        const academicParsed: ChatThread[] = storedAcademic ? JSON.parse(storedAcademic) : [];

        const initialCompanion = companionParsed.length > 0 ? companionParsed : [makeNewThread(COMPANION_OPENING_TEXT)];
        const initialAcademic = academicParsed.length > 0 ? academicParsed : [makeNewThread(ACADEMIC_OPENING_TEXT)];

        setCompanionThreads(initialCompanion);
        setActiveCompanionThreadId(
          storedCompanionActive && initialCompanion.some((t) => t.id === storedCompanionActive)
            ? storedCompanionActive
            : initialCompanion[0].id
        );

        setAcademicThreads(initialAcademic);
        setActiveAcademicThreadId(
          storedAcademicActive && initialAcademic.some((t) => t.id === storedAcademicActive)
            ? storedAcademicActive
            : initialAcademic[0].id
        );
      } catch (err) {
        setCompanionThreads([makeNewThread(COMPANION_OPENING_TEXT)]);
        setAcademicThreads([makeNewThread(ACADEMIC_OPENING_TEXT)]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist on every change, once initial load has finished
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("selina_companion_threads", JSON.stringify(companionThreads)).catch(() => null);
  }, [companionThreads, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("selina_companion_active", activeCompanionThreadId).catch(() => null);
  }, [activeCompanionThreadId, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("selina_academic_threads", JSON.stringify(academicThreads)).catch(() => null);
  }, [academicThreads, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("selina_academic_active", activeAcademicThreadId).catch(() => null);
  }, [activeAcademicThreadId, loaded]);

  function addCaseEntry(entry: Omit<CaseEntry, "id" | "date">) {
    setCaseEntries((prev) => [{ ...entry, id: `c${prev.length}`, date: "Just now" }, ...prev]);
  }

  function addEmergencyContact(contact: Omit<EmergencyContact, "id">) {
    setEmergencyContacts((prev) => [...prev, { ...contact, id: `contact${prev.length}-${Date.now()}` }]);
  }

  function removeEmergencyContact(id: string) {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
  }

  function createCompanionThread() {
    const thread = makeNewThread(COMPANION_OPENING_TEXT);
    setCompanionThreads((prev) => [thread, ...prev]);
    setActiveCompanionThreadId(thread.id);
  }

  function renameCompanionThread(id: string, title: string) {
    setCompanionThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  function deleteCompanionThread(id: string) {
    setCompanionThreads((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = makeNewThread(COMPANION_OPENING_TEXT);
        setActiveCompanionThreadId(fresh.id);
        return [fresh];
      }
      if (id === activeCompanionThreadId) {
        setActiveCompanionThreadId(remaining[0].id);
      }
      return remaining;
    });
  }

  function addCompanionMessage(message: Omit<ChatMessage, "id">) {
    setCompanionThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeCompanionThreadId) return t;
        const newMessages = [...t.messages, { ...message, id: `${Date.now()}-${t.messages.length}` }];
        const shouldRetitle = t.title === "New chat" && message.from === "user";
        return {
          ...t,
          messages: newMessages,
          title: shouldRetitle ? titleFromFirstMessage(message.text) : t.title,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function createAcademicThread() {
    const thread = makeNewThread(ACADEMIC_OPENING_TEXT);
    setAcademicThreads((prev) => [thread, ...prev]);
    setActiveAcademicThreadId(thread.id);
  }

  function renameAcademicThread(id: string, title: string) {
    setAcademicThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }

  function deleteAcademicThread(id: string) {
    setAcademicThreads((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) {
        const fresh = makeNewThread(ACADEMIC_OPENING_TEXT);
        setActiveAcademicThreadId(fresh.id);
        return [fresh];
      }
      if (id === activeAcademicThreadId) {
        setActiveAcademicThreadId(remaining[0].id);
      }
      return remaining;
    });
  }

  function addAcademicMessage(message: Omit<ChatMessage, "id">) {
    setAcademicThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeAcademicThreadId) return t;
        const newMessages = [...t.messages, { ...message, id: `${Date.now()}-${t.messages.length}` }];
        const shouldRetitle = t.title === "New chat" && message.from === "user";
        return {
          ...t,
          messages: newMessages,
          title: shouldRetitle ? titleFromFirstMessage(message.text) : t.title,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function addDeadline(deadline: Omit<Deadline, "id">) {
    setDeadlines((prev) => [{ ...deadline, id: `${Date.now()}` }, ...prev]);
  }

  function addMedication(medication: Omit<Medication, "id">) {
    setMedications((prev) => [{ ...medication, id: `${Date.now()}` }, ...prev]);
  }

  return (
    <SelinaContext.Provider
      value={{
        checkInStatus,
        setCheckInStatus,
        caseEntries,
        addCaseEntry,
        emergencyContacts,
        addEmergencyContact,
        removeEmergencyContact,
        activeCheckInId,
        setActiveCheckInId,
        companionThreads,
        activeCompanionThreadId,
        setActiveCompanionThreadId,
        createCompanionThread,
        renameCompanionThread,
        deleteCompanionThread,
        addCompanionMessage,
        academicThreads,
        activeAcademicThreadId,
        setActiveAcademicThreadId,
        createAcademicThread,
        renameAcademicThread,
        deleteAcademicThread,
        addAcademicMessage,
        deadlines,
        addDeadline,
        cycleResult,
        setCycleResult,
        medications,
        addMedication,
      }}
    >
      {children}
    </SelinaContext.Provider>
  );
}

export function useSelinaState() {
  const context = useContext(SelinaContext);
  if (!context) {
    throw new Error("useSelinaState must be used within a SelinaProvider");
  }
  return context;
}