"use client";

import { useState } from "react";
import axios from "axios";
import { Message } from "../../interfaces";
import MenuItemButtons from "../../components/MenuItemButtons";
export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/menu", {
        query: userMessage.content,
      });

      const botMessage: Message = {
        role: "bot",
        content: res.data.response_text,
        items: res.data.items,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Oops 😅 Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-2xl flex flex-col h-[80vh] bg-white rounded-xl shadow-md">

        {/* Header */}
        <div className="p-4 border-b text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, welcome to Exotica 🍽️
          </h1>
          <p className="text-sm text-gray-600">
            Talk with our menu and order your favourite food
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-1">
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${msg.role === "user"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200 text-gray-800"
                    }`}
                >
                  {msg.content}
                </div>
              </div>

             
              {msg.role === "bot" && msg.items && msg.items.length > 0 && (
                <div>
                  Add to cart ....
                  <div className="flex justify-start">
                  <MenuItemButtons items={msg.items} />
                </div>
                </div>
              )}
            </div>
          ))}


          {loading && (
            <div className="text-sm text-gray-500">Exotica is thinking… 🍳</div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to eat today?"
            className="w-full rounded-lg border border-gray-300 px-4 py-3
                       focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>
    </main>
  );
}
