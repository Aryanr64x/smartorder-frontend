"use client";
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Message } from "../../interfaces";
import MenuItemButtons from "../../components/MenuItemButtons";
import CartDrawer from "../../components/CartDrawer";
import { useCart } from "../../components/CartContext";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { totalItems } = useCart();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const typeMessage = (text: string, items: { name: string }[]) => {
    let i = 0;
    setMessages((prev) => [...prev, { role: "bot", content: "", items: [] }]);
    const interval = setInterval(() => {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: text.slice(0, i + 1),
        };
        return updated;
      });
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], items };
          return updated;
        });
      }
    }, 18);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post("https://smartorder-backend.vercel.app/menu", {
        query: userMessage.content,
      });
      setLoading(false);
      typeMessage(res.data.response_text, res.data.items);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Oops 😅 Something went wrong. Please try again." },
      ]);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  const suggestions = ["🌶️ Spicy starters", "🥗 Veg options", "🍮 Desserts under ₹150", "🍗 Non-veg specials"];

  return (
    <main className="min-h-screen bg-orange-500 flex flex-col items-center justify-center p-4">

      {/* Brand */}
      <div className="mb-5 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow">
          WAITER SINGH! <span className="text-orange-900">🍽️</span>
        </h1>
        <p className="text-orange-100 text-xs mt-1.5 tracking-widest uppercase font-semibold">
          AI Waiter at your service !!
        </p>
      </div>

      {/* Chat Card */}
      <div
        className="w-full max-w-2xl bg-orange-50 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ height: "clamp(500px, 75vh, 700px)" }}
      >
        {/* Header */}
        <div className="bg-orange-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-orange-800 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
              🧑‍🍳
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">AI Waiter</p>
              <p className="text-orange-200 text-xs flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
                Online & ready to serve
              </p>
            </div>
          </div>

          {/* Cart Button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white hover:bg-orange-400 active:scale-95 transition-all shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-600 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow border-2 border-orange-600 animate-bounce">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-orange-50 scroll-smooth">

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <span className="text-5xl">🍛</span>
              <p className="text-orange-800 font-bold text-lg">What are you craving today?</p>
              <p className="text-orange-400 text-sm">Ask me anything about our menu!</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="bg-white border-2 border-orange-300 text-orange-600 text-xs font-semibold px-4 py-2 rounded-full hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-200 shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div className={`flex items-end gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-sm flex-shrink-0 shadow">
                    🧑‍🍳
                  </div>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${msg.role === "user"
                      ? "bg-orange-500 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-orange-200 rounded-bl-sm"
                    }`}
                >
                  {msg.content}
                </div>
              </div>

              {msg.role === "bot" && msg.items && msg.items.length > 0 && (
                <div className="ml-9 mt-2">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1.5">
                    🛒 Tap to add to cart
                  </p>
                  <MenuItemButtons
                    items={msg.items.map((item: { name: string }) => item.name)}
                  />
                </div>
              )}
            </div>
          ))}

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

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white border-t-2 border-orange-200 flex items-center gap-3 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like to eat today?"
            className="flex-1 bg-orange-50 border-2 border-orange-200 rounded-full px-5 py-2.5 text-sm text-gray-800 placeholder-orange-300 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-0.5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cart Drawer */}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </main>
  );
}