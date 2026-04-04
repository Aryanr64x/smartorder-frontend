export interface Message{
  role: "user" | "bot";
  content: string;
  items?: any;
};
