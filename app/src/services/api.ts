const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

async function postEvent(event) {
  const response = await fetch(`${API_BASE_URL}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendCompanionMessage(text) {
  const data = await postEvent({ type: "message", text });
  return data.message;
}

export async function sendAcademicMessage(text) {
  const data = await postEvent({ type: "academic_message", text });
  return data.message;
}

export async function reportMissedCheckIn(plannedTime) {
  const data = await postEvent({ type: "checkin_missed", planned_time: plannedTime });
  return data.message;
}

export async function submitDeadline(title, dueDateISO) {
  const response = await fetch(`${API_BASE_URL}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "deadline_added", title, due_date: dueDateISO }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function submitCaseEntry(detail) {
  const data = await postEvent({ type: "case_entry_added", detail });
  return { message: data.message, flagged: data.action === "flag_for_review" };
}

export async function startSafetyCheckIn(durationSeconds, tripDetails, contacts) {
  const response = await fetch(`${API_BASE_URL}/safety/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      duration_seconds: durationSeconds,
      trip_details: tripDetails,
      contacts,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getSafetyCheckIn(checkInId) {
  const response = await fetch(`${API_BASE_URL}/safety/checkin/${checkInId}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function markSafetyCheckInSafe(checkInId) {
  const response = await fetch(`${API_BASE_URL}/safety/checkin/${checkInId}/safe`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function triggerSafetyCheckInNow(checkInId) {
  const response = await fetch(`${API_BASE_URL}/safety/checkin/${checkInId}/trigger`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
