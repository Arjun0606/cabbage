"use client";

import { Send, Bot, User, Loader2, Paperclip, AtSign } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  company: any;
  auditResult: any;
  aiVisResult: any;
}

function renderContent(text: string) {
  return text.split("\n").map((line, i) => (
    <div key={i} className={line === "" ? "h-2" : ""}>
      {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="text-zinc-100 font-medium">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      })}
    </div>
  ));
}

const CHAT_STORAGE_KEY = "cabbge_chat_history";
const WELCOME: Message = {
  role: "assistant",
  content: `hi, i'm your cmo.\n\ni'll scan for your highest-leverage growth opportunities and keep your actions feed fresh.\n\npick any item from your actions feed or ask me what to tackle first.`,
};

function loadChatHistory(): Message[] {
  if (typeof window === "undefined") return [WELCOME];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [WELCOME];
}

function saveChatHistory(messages: Message[]) {
  try {
    // Keep last 50 messages to avoid localStorage bloat
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch { /* ignore */ }
}

export function ChatPanel({ company, auditResult, aiVisResult }: Props) {
  const [messages, setMessages] = useState<Message[]>(loadChatHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist chat history on every change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, company, auditResult, aiVisResult, history: messages.slice(-10) }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#7CB342]/10 flex items-center justify-center">
            <Bot size={12} className="text-[#7CB342]" />
          </div>
          <h3 className="text-[13px] font-semibold text-zinc-200">Talk to AI CMO</h3>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "assistant" ? "bg-[#7CB342]/10 border border-[#7CB342]/20" : "bg-zinc-800 border border-white/[0.06]"
            }`}>
              {msg.role === "assistant" ? <Bot size={13} className="text-[#7CB342]" /> : <User size={13} className="text-zinc-400" />}
            </div>
            <div className={`text-[13px] leading-relaxed min-w-0 pt-1 ${msg.role === "user" ? "text-zinc-400" : "text-zinc-300"}`}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#7CB342]/10 border border-[#7CB342]/20">
              <Loader2 size={13} className="text-[#7CB342] animate-spin" />
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-white/[0.06] rounded-xl px-3 py-1.5 focus-within:border-[#7CB342]/30 transition-colors duration-150">
          <button className="text-zinc-600 hover:text-zinc-400 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
            <Paperclip size={15} />
          </button>
          <button className="text-zinc-600 hover:text-zinc-400 active:scale-[0.97] transition-all duration-150 flex-shrink-0">
            <AtSign size={15} />
          </button>
          <input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-500 outline-none h-8"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="w-7 h-7 rounded-lg bg-[#7CB342] hover:bg-[#8BC34A] disabled:opacity-30 disabled:hover:bg-[#7CB342] flex items-center justify-center active:scale-[0.97] transition-all duration-150 flex-shrink-0"
          >
            <Send size={12} className="text-zinc-900" />
          </button>
        </div>
      </div>
    </div>
  );
}
