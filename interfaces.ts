export interface Message{
  role: "user" | "bot";
  content: string;
  items?: string[];
};
