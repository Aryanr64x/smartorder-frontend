"use client";
import { useRef, useEffect } from "react";
import { Message, VoiceState,  } from "../interfaces";
import MenuItemButtons from "./MenuItemButtons";
import SpeakingAnimation from "./SpeakingAnimation";

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  voiceState: VoiceState;
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "🌶️ Spicy starters",
  "🥗 Veg options",
  "🍮 Desserts under ₹150",
  "🍗 Non-veg specials",
];

export default function ChatMessages({ messages, loading, voiceState, onSuggestion }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const isSpeaking = voiceState === "speaking";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-orange-50 scroll-smooth">
      {/* Empty state */}
      {messages.length === 0 && voiceState === "idle" && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
          <span className="text-5xl">🍛</span>
          <p className="text-orange-800 font-bold text-lg">What are you craving today?</p>
          <p className="text-orange-400 text-sm">Ask me anything about our menu!</p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="bg-white border-2 border-orange-300 text-orange-600 text-xs font-semibold px-4 py-2 rounded-full hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message list */}
      {messages.map((msg, idx) => {
        const isLastBot = msg.role === "bot" && idx === messages.length - 1;
        const showSpeaking = isLastBot && isSpeaking;

        return (
          <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "bot" && (
                <div
                  className={`w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-sm flex-shrink-0 shadow transition-all duration-300 ${
                    showSpeaking ? "ring-2 ring-orange-400 ring-offset-1 scale-110" : ""
                  }`}
                >
                  🧑‍🍳
                </div>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${msg.role === "user"
                    ? "bg-orange-500 text-white rounded-br-sm"
                    : "bg-white text-gray-800 border border-orange-200 rounded-bl-sm"
                  }
                  ${showSpeaking ? "border-orange-400 shadow-orange-200 shadow-md" : ""}
                `}
              >
                {msg.content}
                {/* Speaking animation inline after text */}
                {showSpeaking && (
                  <span className="inline-flex items-center ml-2 translate-y-[2px]">
                    <SpeakingAnimation size="sm" />
                  </span>
                )}
              </div>
            </div>

            {msg.role === "bot" && msg.items && msg.items.length > 0 && (
              <div className="ml-9 mt-2">
                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1.5">
                  🛒 Tap to add to cart
                </p>
                <MenuItemButtons items={msg.items.map((item) => item.name)} />
              </div>
            )}
          </div>
        );
      })}

      {/* Loading dots */}
      {loading && (
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-sm flex-shrink-0 shadow">
            🧑‍🍳
          </div>
          <div className="bg-white border border-orange-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1.5 items-center">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}