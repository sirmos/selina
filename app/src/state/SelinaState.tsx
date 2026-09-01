import React, { createContext, useContext, useState, ReactNode } from "react";

export type CheckInStatus = "none" | "scheduled" | "safe" | "missed";

export type CaseEntry = {
  id: string;
  title: string;
  detail: string;
  date: string;
};

type SelinaState = {
  checkInStatus: CheckInStatus;
  setCheckInStatus: (status: CheckInStatus) => void;
  caseEntries: CaseEntry[];
  addCaseEntry: (entry: Omit<CaseEntry, "id" | "date">) => void;
};

const SelinaContext = createContext<SelinaState | undefined>(undefined);

export function SelinaProvider({ children }: { children: ReactNode }) {
  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>("none");
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

  return (
    <SelinaContext.Provider
      value={{ checkInStatus, setCheckInStatus, caseEntries, addCaseEntry }}
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
