// Talks to the Selina backend (backend/api.py). During local development
// this points at your machine or Codespace running the Flask server, see
// .env.example for how to set it.
//
// A note on local URLs: "localhost" from inside an Android emulator does
// not reach your host machine, use 10.0.2.2 instead. From a physical
// phone on the same network, use your machine's LAN IP. A Codespace
// forwarded port URL works from anywhere once the port is public.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5000";

async function postEvent(event: Record<string, unknown>): Promise<any> {
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

export async function sendCompanionMessage(text: string): Promise<string> {
  const data = await postEvent({ type: "message", text });
  return data.message as string;
}

export async function reportMissedCheckIn(plannedTime: string): Promise<string> {
  const data = await postEvent({ type: "checkin_missed", planned_time: plannedTime });
  return data.message as string;
}

export async function submitCaseEntry(detail: string): Promise<{ message: string; flagged: boolean }> {
  const data = await postEvent({ type: "case_entry_added", detail });
  return { message: data.message as string, flagged: data.action === "flag_for_review" };
}
