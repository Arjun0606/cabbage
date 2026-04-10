"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
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

export function ChatPanel({ company, auditResult, aiVisResult }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Welcome to CabbageSEO! I'm your AI marketing assistant, specialized in Indian residential real estate.\n\nI can help you with:\n- **Review your SEO audit** and surface top issues\n- **Walk through AI/GEO recommendations** by priority\n- **Suggest content or technical action plans**\n- **Analyze your competitors' positioning**\n\nSet up your company details in the left panel and run an audit to get started!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
        body: JSON.stringify({
          message: userMessage,
          company,
          auditResult,
          aiVisResult,
          history: messages.slice(-10),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Sorry, I couldn't process that." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 border-l border-zinc-800 flex flex-col">
      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <Bot size={14} className="text-emerald-400" />
        <span className="text-sm font-medium">Talk to CabbageSEO</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "assistant" ? "bg-emerald-900/50" : "bg-zinc-800"
            }`}>
              {msg.role === "assistant" ? (
                <Bot size={12} className="text-emerald-400" />
              ) : (
                <User size={12} className="text-zinc-400" />
              )}
            </div>
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
              <Loader2 size={12} className="text-emerald-400 animate-spin" />
            </div>
            <span className="text-sm text-zinc-500">Thinking...</span>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="bg-zinc-800 border-zinc-700 text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
