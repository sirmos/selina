import "dotenv/config";
import { Spectrum } from "spectrum-ts";
import { imessage } from "@spectrum-ts/imessage";

// Spectrum bridges a single agent loop to many messaging interfaces.
// Each provider in `providers` adds an interface (terminal TUI, iMessage, …).
// Docs: https://photon.codes/docs/spectrum-ts

// The Python backend running the actual Life Orchestrator and all nine
// agents, see ../api.py. This bridge stays thin on purpose: it only
// relays messages back and forth, all the real intelligence lives there.
const BACKEND_URL = process.env.SELINA_BACKEND_URL ?? "http://localhost:5000";

const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [
    // imessage
    imessage.config(),
  ],
});

// `app.messages` is an async iterable. Each tick yields a `space` (the
// conversation) and an inbound `message`. Reply by awaiting `space.send(...)`.
for await (const [space, message] of app.messages) {
  if (message.content.type !== "text") continue;

  try {
    const response = await fetch(`${BACKEND_URL}/selina/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.content.text }),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    await space.send(data.message ?? "I'm here, tell me more about what's going on.");
  } catch (err) {
    console.error("Could not reach Selina backend:", err);
    await space.send("I couldn't process that just now, please try again in a moment.");
  }
}
