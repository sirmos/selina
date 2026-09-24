import React, { createContext, useContext, useState, ReactNode } from "react";

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

  companionMessages: ChatMessage[];
  addCompanionMessage: (message: Omit<ChatMessage, "id">) => void;

  academicMessages: ChatMessage[];
  addAcademicMessage: (message: Omit<ChatMessage, "id">) => void;

  cycleResult: CycleResult | null;
  setCycleResult: (result: CycleResult | null) => void;
  medications: Medication[];
  addMedication: (medication: Omit<Medication, "id">) => void;

  deadlines: Deadline[];
  addDeadline: (deadline: Omit<Deadline, "id">) => void;
};

const SelinaContext = createContext<SelinaState | undefined>(undefined);

const companionOpening: ChatMessage = {
  id: "companion-0",
  from: "selina",
  text: "I'm here. Take your time, there's no rush to explain everything at once.",
};

const academicOpening: ChatMessage = {
  id: "academic-0",
  from: "selina",
  text: "Ask me to explain something, quiz you, or help you work through a problem.",
};

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

  const [companionMessages, setCompanionMessages] = useState<ChatMessage[]>([companionOpening]);
  const [academicMessages, setAcademicMessages] = useState<ChatMessage[]>([academicOpening]);
  const [cycleResult, setCycleResult] = useState<CycleResult | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  function addCaseEntry(entry: Omit<CaseEntry, "id" | "date">) {
    setCaseEntries((prev) => [
      { ...entry, id: `c${prev.length}`, date: "Just now" },
      ...prev,
    ]);
  }

  function addEmergencyContact(contact: Omit<EmergencyContact, "id">) {
    setEmergencyContacts((prev) => [...prev, { ...contact, id: `contact${prev.length}-${Date.now()}` }]);
  }

  function removeEmergencyContact(id: string) {
    setEmergencyContacts((prev) => prev.filter((c) => c.id !== id));
  }

  function addCompanionMessage(message: Omit<ChatMessage, "id">) {
    setCompanionMessages((prev) => [...prev, { ...message, id: `${Date.now()}-${prev.length}` }]);
  }

  function addAcademicMessage(message: Omit<ChatMessage, "id">) {
    setAcademicMessages((prev) => [...prev, { ...message, id: `${Date.now()}-${prev.length}` }]);
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
        companionMessages,
        addCompanionMessage,
        academicMessages,
        addAcademicMessage,
        cycleResult,
        setCycleResult,
        medications,
        addMedication,
        deadlines,
        addDeadline,
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