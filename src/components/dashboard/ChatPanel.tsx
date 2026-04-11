"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";
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

/** Simple markdown-like rendering for **bold** and \n */
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "assistant" ? "bg-emerald-900/50" : "bg-zinc-800"
            }`}>
              {msg.role === "assistant" ? <Bot size={10} className="text-emerald-400" /> : <User size={10} className="text-zinc-400" />}
            </div>
            <div className="text-[13px] text-zinc-300 leading-relaxed min-w-0">
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 items-center">
            <Loader2 size={14} className="text-emerald-400 animate-spin" />
            <span className="text-xs text-zinc-500">Thinking...</span>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-zinc-800 flex-shrink-0">
        <div className="flex gap-1.5">
          <Input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="bg-zinc-800 border-zinc-700 text-[13px] h-8"
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 w-8 p-0">
            <Send size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
