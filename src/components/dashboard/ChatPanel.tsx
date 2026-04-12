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

export function ChatPanel({ company, auditResult, aiVisResult }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Welcome to CabbageSEO! I'm your AI CMO.\n\nI can help you with:\n- **Review your SEO audit** and surface top issues\n- **Walk through AI/GEO recommendations** by priority\n- **Suggest content or technical action plans**\n- **Analyze your competitors' positioning**\n\nRun a full scan to get started!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      <div className="px-4 py-3 border-b border-zinc-800/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-emerald-400" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Talk to AI CMO</h3>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "assistant" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-zinc-800 border border-zinc-700/50"
            }`}>
              {msg.role === "assistant" ? <Bot size={13} className="text-emerald-400" /> : <User size={13} className="text-zinc-400" />}
            </div>
            <div className="text-[13px] text-zinc-300 leading-relaxed min-w-0 pt-1">
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
              <Loader2 size={13} className="text-emerald-400 animate-spin" />
            </div>
            <span className="text-[13px] text-zinc-500">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800/60 flex-shrink-0">
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-1.5">
          <button className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
            <Paperclip size={15} />
          </button>
          <button className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0">
            <AtSign size={15} />
          </button>
          <input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none h-8"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 flex items-center justify-center transition-all flex-shrink-0"
          >
            <Send size={12} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
