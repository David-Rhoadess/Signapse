export interface StoredChatMessage {
  sender: "user" | "bot";
  text: string;
  time: string;
}

export interface StoredChatSession {
  id: string;
  date: string;
  duration: string;
  summary: {
    learned: string[];
    practice: string[];
  };
  messages: StoredChatMessage[];
}

const STORAGE_KEY = "acorn_chat_sessions";

export function getSavedSessions(): StoredChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: StoredChatSession): void {
  const sessions = getSavedSessions();
  sessions.unshift(session); // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getSavedSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

/** Format milliseconds into a human-readable duration string, e.g. "4 minutes" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} seconds`;
  const minutes = Math.round(totalSeconds / 60);
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

/** Format a Date into a readable date string, e.g. "May 2, 2026" */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const DEFAULT_SUMMARY = {
  learned: [
    "How to greet someone with HELLO",
    "Expressing feelings using ME FEEL followed by an emotion",
    "Describing daily routines like ME EAT and ME COOK",
    "Using SELF to mean doing something on your own",
  ],
  practice: [] as string[],
};
