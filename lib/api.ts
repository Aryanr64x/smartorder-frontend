import axios from "axios";
const BASE = "http://localhost:8000";

export interface MenuResponse {
  response_text: string;
  items: { name: string }[];
  transcript?: string;
  audio_base64?: string;
  audio_mime?: string;
}

// ── Text query (non-streaming, kept for reference) ────────────────
export async function sendTextQuery(query: string): Promise<MenuResponse> {
  const res = await axios.post<MenuResponse>(`${BASE}/menu`, { query });
  return res.data;
}

// ── Text streaming ────────────────────────────────────────────────
export async function sendTextQueryStream(
  query: string,
  onToken: (token: string) => void,
  onDone: (items: { name: string }[]) => void
): Promise<void> {
  const res = await fetch(`${BASE}/menu/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token) onToken(data.token);
        if (data.done)  onDone(data.items ?? []);
      } catch {
        console.warn("Failed to parse SSE:", line);
      }
    }
  }
}

// ── Voice streaming ───────────────────────────────────────────────
export async function sendVoiceQueryStream(
  audioBlob: Blob,
  onTranscript: (text: string) => void,
  onText: (text: string, items: { name: string }[]) => void,
  onAudioChunk: (base64: string) => void,
  onDone: () => void
): Promise<void> {
  const form = new FormData();
  form.append("audio", audioBlob, "voice.webm");

  const res = await fetch(`${BASE}/menu/voice/stream`, {
    method: "POST",
    body: form,
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "transcript")  onTranscript(data.content);
        if (data.type === "text")        onText(data.content, data.items ?? []);
        if (data.type === "audio_chunk") onAudioChunk(data.data);
        if (data.type === "done")        onDone();
      } catch {
        console.warn("Failed to parse SSE:", line);
      }
    }
  }
}

// ── Voice non-streaming (kept, still used as fallback) ────────────
export async function sendVoiceQuery(audioBlob: Blob): Promise<MenuResponse> {
  const form = new FormData();
  form.append("audio", audioBlob, "voice.webm");
  const res = await axios.post<MenuResponse>(`${BASE}/menu/voice`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}