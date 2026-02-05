"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableSectionProps {
  title: string;
  content: string;
  children: React.ReactNode;
}

export function CopyableSection({ title, content, children }: CopyableSectionProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <div className="group relative">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-semibold text-primary">{title}</h4>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  );
}

interface CopyButtonProps {
  content: string;
  label?: string;
  className?: string;
}

export function CopyButton({ content, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function CopyAllButton({ content, className = "" }: { content: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-600">Copied to clipboard!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>Copy All Sections</span>
        </>
      )}
    </button>
  );
}
