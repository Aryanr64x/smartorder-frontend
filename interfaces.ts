export interface Message {
  role: "user" | "bot";
  content: string;
  items?: { name: string }[];
  isVoice?: boolean; // was this message triggered by voice?
}
 
export type VoiceState = "idle" | "listening" | "processing" | "speaking";
