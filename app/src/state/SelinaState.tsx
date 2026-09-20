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
