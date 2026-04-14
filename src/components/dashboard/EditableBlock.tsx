"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X, RotateCcw, Copy } from "lucide-react";

interface Props {
  text: string;
  onSave: (newText: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  regenerateCost?: number;
  className?: string;
  mono?: boolean;
}

export function EditableBlock({ text, onSave, onRegenerate, isRegenerating, regenerateCost, className = "", mono = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when text changes externally (e.g. regeneration)
  useEffect(() => { setValue(text); }, [text]);

  // Auto-resize textarea + focus on edit
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  const handleSave = () => {
    onSave(value);
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(text);
    setEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (editing) {
    return (
      <div className={`rounded-lg border border-[#7CB342]/30 bg-zinc-900/80 overflow-hidden ${className}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          className={`w-full bg-transparent text-[13px] text-zinc-200 p-3.5 outline-none resize-none leading-relaxed ${mono ? "font-mono text-[12px]" : ""}`}
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/60 bg-zinc-900/40">
          <span className="text-[11px] text-zinc-500">Editing — your changes are local</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCancel}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              <X size={12} className="inline mr-1" />Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#7CB342] text-zinc-900 hover:bg-[#8BC34A] active:scale-[0.97] transition-all"
            >
              <Check size={12} className="inline mr-1" />Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group/editable relative rounded-lg border border-white/[0.06] bg-zinc-800/40 hover:border-white/[0.1] transition-colors ${className}`}>
      <div className={`p-3.5 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed ${mono ? "font-mono text-[12px]" : ""}`}>
        {value}
      </div>
      {/* Toolbar — appears on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/editable:opacity-100 transition-all">
        <button
          onClick={() => setEditing(true)}
          className="text-[11px] font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200 active:scale-[0.97] transition-all"
          title="Edit"
        >
          <Pencil size={11} className="inline mr-1" />Edit
        </button>
        <button
          onClick={handleCopy}
          className="text-[11px] font-medium px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700 hover:text-zinc-200 active:scale-[0.97] transition-all"
          title="Copy"
        >
          {copied ? <><Check size={11} className="inline mr-1 text-[#7CB342]" />Copied</> : <><Copy size={11} className="inline mr-1" />Copy</>}
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-[11px] font-medium px-2 py-1 rounded-md bg-[#7CB342]/10 text-[#7CB342] border border-[#7CB342]/20 hover:bg-[#7CB342]/20 active:scale-[0.97] transition-all disabled:opacity-40"
            title="Regenerate"
          >
            <RotateCcw size={11} className={`inline mr-1 ${isRegenerating ? "animate-spin" : ""}`} />
            {isRegenerating ? "..." : regenerateCost ? `Redo (${regenerateCost})` : "Redo"}
          </button>
        )}
      </div>
    </div>
  );
}
